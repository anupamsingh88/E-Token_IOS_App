import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    Platform,
    Alert,
    Animated,
    ScrollView,
    Linking,
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { API_BASE_URL } from '../config/config';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DocumentViewerModalProps {
    visible: boolean;
    onClose: () => void;
    documents?: string | string[] | null;
    title?: string;
    initialIndex?: number;
}

export default function DocumentViewerModal({
    visible,
    onClose,
    documents,
    title = 'दस्तावेज़',
    initialIndex = 0,
}: DocumentViewerModalProps) {
    // 1. Parse & Normalize Document URLs (handles comma-separated strings or arrays)
    const parseDocuments = useCallback((): string[] => {
        if (!documents) return [];
        let list: string[] = [];
        if (Array.isArray(documents)) {
            list = documents;
        } else if (typeof documents === 'string') {
            list = documents
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return list.map((item) => {
            if (item.startsWith('http://') || item.startsWith('https://')) {
                return item;
            }
            const cleanPath = item.startsWith('/') ? item.substring(1) : item;
            return `${API_BASE_URL}/${cleanPath}`;
        });
    }, [documents]);

    const docList = parseDocuments();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [openingPdf, setOpeningPdf] = useState(false);

    // Zoom state for images
    const [scaleFactor, setScaleFactor] = useState(1);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(Math.min(initialIndex, Math.max(0, docList.length - 1)));
            setImageLoading(true);
            setImageError(false);
            setScaleFactor(1);
        }
    }, [visible, initialIndex, docList.length]);

    const currentDocUrl = docList[currentIndex] || '';
    const isPdf = Boolean(
        currentDocUrl &&
        (currentDocUrl.toLowerCase().split('?')[0].endsWith('.pdf') ||
            currentDocUrl.toLowerCase().includes('.pdf'))
    );

    const getFileName = (url: string) => {
        if (!url) return 'दस्तावेज़';
        const parts = url.split('/');
        return parts[parts.length - 1]?.split('?')[0] || 'दस्तावेज़';
    };

    // Open PDF directly in dedicated mobile-optimized viewer (view_pdf.php)
    const handleViewPdf = async (url: string) => {
        if (!url) return;
        setOpeningPdf(true);
        try {
            // 1. If it's on the server (under uploads/)
            const match = url.match(/uploads\/[^\s\?#]+/i);
            if (match) {
                const viewerUrl = `${API_BASE_URL}/view_pdf.php?file=${encodeURIComponent(match[0])}`;
                await Linking.openURL(viewerUrl);
                return;
            }

            // 2. If it's a local file (file:// or content://)
            if (url.startsWith('file://') || url.startsWith('content://')) {
                const formData = new FormData();
                const fileName = getFileName(url);
                formData.append('pdf', {
                    uri: url,
                    name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
                    type: 'application/pdf',
                } as any);

                const uploadRes = await fetch(`${API_BASE_URL}/upload_temp_pdf.php`, {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.file_path) {
                    const viewerUrl = `${API_BASE_URL}/view_pdf.php?file=${encodeURIComponent(uploadData.file_path)}`;
                    await Linking.openURL(viewerUrl);
                    return;
                }
            }

            // 3. Fallback direct open
            await Linking.openURL(url);
        } catch (err: any) {
            console.error('Error opening PDF viewer:', err);
            Alert.alert('त्रुटि', 'दस्तावेज़ खोलने में समस्या आई: ' + (err?.message || 'अज्ञात त्रुटि'));
        } finally {
            setOpeningPdf(false);
        }
    };

    // Dedicated sharing function (only called when user explicitly taps share icon)
    const handleShareDocument = async (url: string) => {
        if (!url) return;
        try {
            let targetUri = url;
            const fileName = getFileName(url);

            if (url.startsWith('http://') || url.startsWith('https://')) {
                const localCachePath = `${FileSystem.cacheDirectory}${fileName}`;
                const fileInfo = await FileSystem.getInfoAsync(localCachePath);

                if (!fileInfo.exists) {
                    const downloadRes = await FileSystem.downloadAsync(url, localCachePath);
                    targetUri = downloadRes.uri;
                } else {
                    targetUri = localCachePath;
                }
            }

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(targetUri, {
                    mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
                    dialogTitle: `${title} शेयर करें`,
                });
            } else {
                await Linking.openURL(url);
            }
        } catch (err: any) {
            console.error('Error sharing document:', err);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                {/* Header Bar */}
                <View style={styles.header}>
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {title}
                        </Text>
                        {docList.length > 1 && (
                            <View style={styles.pageBadge}>
                                <Text style={styles.pageBadgeText}>
                                    पृष्ठ {currentIndex + 1} / {docList.length}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerActions}>
                        {currentDocUrl ? (
                            <TouchableOpacity
                                style={styles.headerIconBtn}
                                onPress={() => handleShareDocument(currentDocUrl)}
                                activeOpacity={0.7}
                            >
                                <Feather name="share-2" size={moderateScale(18)} color="#FFFFFF" />
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={moderateScale(22)} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Multiple Documents / Pages Thumbnail Navigation Bar */}
                {docList.length > 1 && (
                    <View style={styles.paginationStrip}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.paginationStripContent}
                        >
                            {docList.map((item, idx) => {
                                const isItemPdf = item.toLowerCase().includes('.pdf');
                                const isSelected = idx === currentIndex;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.pageTab,
                                            isSelected && styles.pageTabActive,
                                        ]}
                                        onPress={() => {
                                            setCurrentIndex(idx);
                                            setImageLoading(true);
                                            setImageError(false);
                                            setScaleFactor(1);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons
                                            name={isItemPdf ? 'file-pdf-box' : 'file-image'}
                                            size={moderateScale(15)}
                                            color={isSelected ? '#FFFFFF' : '#94A3B8'}
                                        />
                                        <Text
                                            style={[
                                                styles.pageTabText,
                                                isSelected && styles.pageTabTextActive,
                                            ]}
                                        >
                                            दस्तावेज़ {idx + 1}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Main Content Area */}
                <View style={styles.contentBody}>
                    {docList.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons
                                name="file-remove-outline"
                                size={moderateScale(54)}
                                color="#64748B"
                            />
                            <Text style={styles.emptyTitle}>कोई दस्तावेज़ उपलब्ध नहीं है</Text>
                            <Text style={styles.emptySubtitle}>
                                इस किसान द्वारा कोई दस्तावेज़ फ़ाइल अपलोड नहीं की गई है।
                            </Text>
                        </View>
                    ) : isPdf ? (
                        /* PDF Card View */
                        <View style={styles.pdfContainer}>
                            <View style={styles.pdfCard}>
                                <View style={styles.pdfIconBg}>
                                    <MaterialCommunityIcons
                                        name="file-pdf-box"
                                        size={moderateScale(64)}
                                        color="#EF4444"
                                    />
                                </View>

                                <Text style={styles.pdfCardTitle} numberOfLines={2}>
                                    {getFileName(currentDocUrl)}
                                </Text>

                                <View style={styles.pdfMetaBadge}>
                                    <MaterialCommunityIcons name="shield-check" size={14} color="#15803D" />
                                    <Text style={styles.pdfMetaText}>प्रमाणित PDF दस्तावेज़</Text>
                                </View>

                                <Text style={styles.pdfHint}>
                                    इस दस्तावेज़ को अपने फ़ोन के PDF व्यूअर में पूर्ण आकार में देखने के लिए नीचे दिए गए बटन पर टैप करें।
                                </Text>

                                <TouchableOpacity
                                    style={styles.openPdfButton}
                                    onPress={() => handleViewPdf(currentDocUrl)}
                                    disabled={openingPdf}
                                    activeOpacity={0.8}
                                >
                                    {openingPdf ? (
                                        <>
                                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                            <Text style={styles.openPdfButtonText}>दस्तावेज़ खोला जा रहा है...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons
                                                name="file-eye-outline"
                                                size={moderateScale(20)}
                                                color="#FFFFFF"
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.openPdfButtonText}>पूरा PDF खोलें और देखें</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* Image Viewer */
                        <View style={styles.imageViewerContainer}>
                            {imageLoading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                    <Text style={styles.loadingText}>दस्तावेज़ लोड हो रहा है...</Text>
                                </View>
                            )}

                            {imageError ? (
                                <View style={styles.errorContainer}>
                                    <MaterialCommunityIcons
                                        name="image-broken-variant"
                                        size={moderateScale(48)}
                                        color="#EF4444"
                                    />
                                    <Text style={styles.errorText}>छवि लोड करने में असमर्थ</Text>
                                    <TouchableOpacity
                                        style={styles.retryBtn}
                                        onPress={() => {
                                            setImageLoading(true);
                                            setImageError(false);
                                        }}
                                    >
                                        <Text style={styles.retryBtnText}>पुनः प्रयास करें</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Image
                                    source={{
                                        uri: currentDocUrl,
                                        cache: 'force-cache',
                                    }}
                                    style={[
                                        styles.previewImage,
                                        {
                                            transform: [{ scale: scaleFactor }],
                                        },
                                    ]}
                                    resizeMode="contain"
                                    onLoadEnd={() => setImageLoading(false)}
                                    onError={() => {
                                        setImageLoading(false);
                                        setImageError(true);
                                    }}
                                />
                            )}

                            {/* Image Zoom Floating Controls */}
                            {!imageError && !imageLoading && (
                                <View style={styles.zoomControlBar}>
                                    <TouchableOpacity
                                        style={styles.zoomBtn}
                                        onPress={() => setScaleFactor(Math.max(1, scaleFactor - 0.25))}
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="minus" size={moderateScale(16)} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.zoomBtnReset}
                                        onPress={() => setScaleFactor(1)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.zoomResetText}>{Math.round(scaleFactor * 100)}%</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.zoomBtn}
                                        onPress={() => setScaleFactor(Math.min(3, scaleFactor + 0.25))}
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="plus" size={moderateScale(16)} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Footer Controls: Prev/Next (if multiple docs) & Close */}
                <View style={styles.footer}>
                    {docList.length > 1 ? (
                        <View style={styles.navButtonGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.navBtn,
                                    currentIndex === 0 && styles.navBtnDisabled,
                                ]}
                                disabled={currentIndex === 0}
                                onPress={() => {
                                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                                    setImageLoading(true);
                                    setImageError(false);
                                    setScaleFactor(1);
                                }}
                                activeOpacity={0.7}
                            >
                                <Feather name="chevron-left" size={moderateScale(18)} color={currentIndex === 0 ? '#475569' : '#FFFFFF'} />
                                <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
                                    पिछला
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.navBtn,
                                    currentIndex === docList.length - 1 && styles.navBtnDisabled,
                                ]}
                                disabled={currentIndex === docList.length - 1}
                                onPress={() => {
                                    setCurrentIndex((prev) => Math.min(docList.length - 1, prev + 1));
                                    setImageLoading(true);
                                    setImageError(false);
                                    setScaleFactor(1);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.navBtnText, currentIndex === docList.length - 1 && styles.navBtnTextDisabled]}>
                                    अगला
                                </Text>
                                <Feather name="chevron-right" size={moderateScale(18)} color={currentIndex === docList.length - 1 ? '#475569' : '#FFFFFF'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}

                    <TouchableOpacity
                        style={styles.bottomCloseButton}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.bottomCloseButtonText}>बंद करें</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(35),
        paddingBottom: verticalScale(12),
        paddingHorizontal: SPACING.md,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    headerTitleGroup: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    headerTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    pageBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#334155',
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(10),
        marginTop: verticalScale(3),
    },
    pageBadgeText: {
        fontSize: FONT_SIZES.xs,
        color: '#94A3B8',
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(10),
    },
    headerIconBtn: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationStrip: {
        backgroundColor: '#1E293B',
        paddingVertical: verticalScale(8),
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    paginationStripContent: {
        paddingHorizontal: SPACING.md,
        gap: moderateScale(8),
    },
    pageTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(20),
        backgroundColor: '#334155',
        gap: moderateScale(6),
    },
    pageTabActive: {
        backgroundColor: '#2563EB',
    },
    pageTabText: {
        fontSize: FONT_SIZES.xs,
        color: '#94A3B8',
        fontWeight: '600',
    },
    pageTabTextActive: {
        color: '#FFFFFF',
    },
    contentBody: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.7,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        zIndex: 10,
    },
    loadingText: {
        marginTop: verticalScale(10),
        fontSize: FONT_SIZES.sm,
        color: '#E2E8F0',
        fontWeight: '500',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    errorText: {
        marginTop: verticalScale(10),
        fontSize: FONT_SIZES.sm,
        color: '#EF4444',
        fontWeight: '600',
    },
    retryBtn: {
        marginTop: verticalScale(12),
        paddingHorizontal: moderateScale(16),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(8),
        backgroundColor: '#334155',
    },
    retryBtnText: {
        fontSize: FONT_SIZES.xs,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    zoomControlBar: {
        position: 'absolute',
        bottom: verticalScale(20),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: moderateScale(24),
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(4),
        gap: moderateScale(6),
        borderWidth: 1,
        borderColor: '#475569',
    },
    zoomBtn: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: '#475569',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomBtnReset: {
        paddingHorizontal: moderateScale(8),
    },
    zoomResetText: {
        fontSize: FONT_SIZES.xs,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    emptyTitle: {
        marginTop: verticalScale(12),
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: '#E2E8F0',
    },
    emptySubtitle: {
        marginTop: verticalScale(6),
        fontSize: FONT_SIZES.xs,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: moderateScale(18),
    },
    pdfContainer: {
        width: '100%',
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#1E293B',
        borderRadius: moderateScale(16),
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        ...SHADOWS.medium,
    },
    pdfIconBg: {
        width: moderateScale(90),
        height: moderateScale(90),
        borderRadius: moderateScale(45),
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    pdfCardTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: verticalScale(8),
    },
    pdfMetaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        gap: moderateScale(4),
        marginBottom: verticalScale(12),
    },
    pdfMetaText: {
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        fontWeight: '600',
    },
    pdfHint: {
        fontSize: FONT_SIZES.xs,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: moderateScale(18),
        marginBottom: verticalScale(20),
    },
    openPdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: verticalScale(12),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(10),
        width: '100%',
    },
    openPdfButtonText: {
        fontSize: FONT_SIZES.sm,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: verticalScale(14),
        backgroundColor: '#1E293B',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    navButtonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
    },
    navBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(8),
        gap: moderateScale(4),
    },
    navBtnDisabled: {
        opacity: 0.4,
    },
    navBtnText: {
        fontSize: FONT_SIZES.xs,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    navBtnTextDisabled: {
        color: '#64748B',
    },
    bottomCloseButton: {
        backgroundColor: '#475569',
        paddingHorizontal: moderateScale(18),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(8),
    },
    bottomCloseButtonText: {
        fontSize: FONT_SIZES.xs,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});
