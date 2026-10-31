import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Button from './Button/Button';
import { ModernAlert } from './ModernAlert';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';

interface Booking {
    id: string;
    token_number: string;
    status: string;
    product: string;
    quantity: number;
    shop_name: string;
    retailer_address: string;
    booking_date: string;
    total_price?: number;
}

interface BookingDetailModalProps {
    visible: boolean;
    booking: any | null; // using any to accommodate snake_case API response
    onClose: () => void;
}

const getFertilizerInfo = (product?: string, nameHindi?: string) => {
    const raw = (product || '').trim();
    const lower = raw.toLowerCase();

    if (lower === 'urea' || raw === 'यूरिया') {
        return {
            nameHindi: 'यूरिया',
            nameEng: 'Urea',
            badgeBg: '#EFF6FF',
            badgeBorder: '#BFDBFE',
            badgeText: '#1D4ED8',
            dotColor: '#2563EB',
        };
    }
    if (lower === 'dap' || raw === 'डीएपी' || raw === 'डी.ए.पी.') {
        return {
            nameHindi: 'डी.ए.पी.',
            nameEng: 'DAP',
            badgeBg: '#FEF2F2',
            badgeBorder: '#FECACA',
            badgeText: '#DC2626',
            dotColor: '#DC2626',
        };
    }
    if (lower === 'npk' || raw === 'एनपीके' || raw === 'एन.पी.के.') {
        return {
            nameHindi: 'एन.पी.के.',
            nameEng: 'NPK',
            badgeBg: '#FFFBEB',
            badgeBorder: '#FDE68A',
            badgeText: '#D97706',
            dotColor: '#D97706',
        };
    }
    if (lower === 'mop' || raw === 'एमओपी' || raw === 'एम.ओ.पी.') {
        return {
            nameHindi: 'एम.ओ.पी.',
            nameEng: 'MOP',
            badgeBg: '#FDF2F8',
            badgeBorder: '#FBCFE8',
            badgeText: '#BE185D',
            dotColor: '#92400E',
        };
    }
    if (lower === 'tsp' || raw === 'टीएसपी' || raw === 'टी.एस.पी.') {
        return {
            nameHindi: 'टी.एस.पी.',
            nameEng: 'TSP',
            badgeBg: '#F3F4F6',
            badgeBorder: '#E5E7EB',
            badgeText: '#374151',
            dotColor: '#4B5563',
        };
    }
    if (lower === 'ssp' || raw === 'एसएसपी' || raw === 'एस.एस.पी.') {
        return {
            nameHindi: 'एस.एस.पी.',
            nameEng: 'SSP',
            badgeBg: '#F0FDF4',
            badgeBorder: '#BBF7D0',
            badgeText: '#15803D',
            dotColor: '#16A34A',
        };
    }

    return {
        nameHindi: nameHindi || raw.toUpperCase(),
        nameEng: raw ? raw.toUpperCase() : 'FERTILIZER',
        badgeBg: '#F0FDF4',
        badgeBorder: '#BBF7D0',
        badgeText: '#15803D',
        dotColor: '#16A34A',
    };
};

export default function BookingDetailModal({ visible, booking, onClose }: BookingDetailModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isMultiItem = !!(booking?.items && booking.items.length > 2);
    const qrSize = Math.min(Math.round(windowWidth * (isMultiItem ? 0.31 : 0.36)), isMultiItem ? 122 : 155);
    const qrRef = useRef<any>(null);
    const [status, requestPermission] = MediaLibrary.usePermissions({ writeOnly: true });

    // Styled alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>(undefined);

    if (!booking) return null;

    const handleSave = async () => {
        try {
            let permissionStatus = status;

            if (!permissionStatus || permissionStatus.status !== 'granted') {
                permissionStatus = await MediaLibrary.requestPermissionsAsync(true);
            }

            if (permissionStatus.status !== 'granted') {
                setAlertTitle('अनुमति आवश्यक');
                setAlertMessage('QR कोड सेव करने के लिए गैलरी की अनुमति दें।');
                setAlertType('warning');
                setAlertOnOk(undefined);
                setAlertVisible(true);
                return;
            }

            const uri = await captureRef(qrRef, {
                format: 'png',
                quality: 0.8,
            });

            await MediaLibrary.saveToLibraryAsync(uri);

            setAlertTitle('सफलता ✅');
            setAlertMessage('QR कोड आपकी गैलरी में सेव हो गया है!');
            setAlertType('success');
            setAlertOnOk(() => () => {
                setAlertVisible(false);
                onClose(); // Close modal → returns to home screen
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('Error saving QR:', error);
            setAlertTitle('त्रुटि');
            setAlertMessage('QR कोड सेव करने में विफल। कृपया पुनः प्रयास करें।');
            setAlertType('error');
            setAlertOnOk(undefined);
            setAlertVisible(true);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.blurContainer}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

                <View style={[styles.modalContent, { maxHeight: Math.round(windowHeight * (isTablet ? 0.85 : 0.88)) }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={[styles.scrollContent, isMultiItem && { paddingBottom: SPACING.lg }]}
                        bounces={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >

                        <ViewShot ref={qrRef} options={{ format: "png", quality: 0.9, result: "tmpfile" }}>
                            <View style={[styles.captureArea, isMultiItem && { paddingVertical: moderateScale(10), paddingHorizontal: moderateScale(12) }]}>
                                <Text style={[styles.headerTitle, isMultiItem && { marginBottom: SPACING.xs }]}>बुकिंग विवरण</Text>

                                <View style={[styles.qrSection, isMultiItem && { marginBottom: 6 }]}>
                                    <View style={[styles.qrWrapper, isMultiItem && { padding: 4, marginBottom: 2 }]}>
                                        <QRCode
                                            value={JSON.stringify({
                                                id: booking.id || booking.booking_id,
                                                token: booking.token_number,
                                                product: booking.product
                                            })}
                                            size={qrSize}
                                            color={COLORS.black}
                                            backgroundColor="transparent"
                                        />

                                        {booking.status === 'Cancelled' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>❌</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: COLORS.error, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>
                                                    {(booking.cancelled_by === 'SYSTEM_AUTO' || booking.cancellation_reason?.includes('स्वतः रद्द') || booking.cancellation_reason?.includes('किसान के न पहुँचने'))
                                                        ? 'स्वतः रद्द हुआ'
                                                        : 'रद्द किया गया'}
                                                </Text>
                                            </View>
                                        )}
                                        {booking.status === 'Pending' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>⏳</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: COLORS.warning, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>लंबित</Text>
                                            </View>
                                        )}
                                        {booking.status === 'Extended' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>⏰</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: '#D97706', fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>विस्तारित</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.tokenLabel}>टोकन नंबर</Text>
                                    <Text style={[styles.tokenValue, isMultiItem && { fontSize: moderateScale(22), marginTop: 1 }]}>{booking.token_number || (booking.status === 'Cancelled' ? 'लागू नहीं (रद्द)' : 'जारी नहीं हुआ')}</Text>
                                </View>

                                <View style={[styles.detailsContainer, isMultiItem && { padding: moderateScale(10) }]}>
                                    <View style={{ marginBottom: isMultiItem ? 4 : SPACING.sm }}>
                                        <View style={[styles.labelCol, { marginBottom: isMultiItem ? 4 : 6 }]}>
                                            <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>चयनित उर्वरक</Text>
                                            <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Selected Fertilizers</Text>
                                        </View>
                                        <View style={styles.fertilizerListWrapper}>
                                            {(booking.items && booking.items.length > 0) ? (
                                                booking.items.map((item: any, idx: number) => {
                                                    const info = getFertilizerInfo(item.product, item.nameHindi);
                                                    return (
                                                        <View key={idx} style={[styles.fertilizerItemRow, isMultiItem && { paddingVertical: verticalScale(4.5) }]}>
                                                            <View style={styles.fertilizerLeftCol}>
                                                                <View style={[styles.fertilizerDot, { backgroundColor: info.dotColor }]} />
                                                                <Text style={styles.fertilizerNameHindi} maxFontSizeMultiplier={1.3}>
                                                                    {info.nameHindi}
                                                                </Text>
                                                                <Text style={styles.fertilizerNameEng} maxFontSizeMultiplier={1.3}>
                                                                    ({info.nameEng})
                                                                </Text>
                                                            </View>
                                                            <View style={[styles.quantityBadge, { backgroundColor: info.badgeBg, borderColor: info.badgeBorder }]}>
                                                                <Text style={[styles.quantityBadgeText, { color: info.badgeText }]} maxFontSizeMultiplier={1.3}>
                                                                    {item.quantity} बोरी
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })
                                            ) : (
                                                (() => {
                                                    const info = getFertilizerInfo(booking.product, booking.nameHindi);
                                                    return (
                                                        <View style={styles.fertilizerItemRow}>
                                                            <View style={styles.fertilizerLeftCol}>
                                                                <View style={[styles.fertilizerDot, { backgroundColor: info.dotColor }]} />
                                                                <Text style={styles.fertilizerNameHindi} maxFontSizeMultiplier={1.3}>
                                                                    {info.nameHindi}
                                                                </Text>
                                                                <Text style={styles.fertilizerNameEng} maxFontSizeMultiplier={1.3}>
                                                                    ({info.nameEng})
                                                                </Text>
                                                            </View>
                                                            <View style={[styles.quantityBadge, { backgroundColor: info.badgeBg, borderColor: info.badgeBorder }]}>
                                                                <Text style={[styles.quantityBadgeText, { color: info.badgeText }]} maxFontSizeMultiplier={1.3}>
                                                                    {booking.quantity || 1} बोरी
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })()
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.divider, isMultiItem && { marginVertical: verticalScale(5) }]} />

                                    <View style={[styles.detailRow, isMultiItem && { marginBottom: verticalScale(4), paddingVertical: 1 }]}>
                                        <View style={styles.labelCol}>
                                            <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>कुल कीमत</Text>
                                            <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Total Price</Text>
                                        </View>
                                        <Text style={[styles.value, styles.priceValue]} maxFontSizeMultiplier={1.3}>
                                            ₹{booking.totalPrice || booking.total_price || (booking.price_per_bag && booking.quantity ? booking.price_per_bag * booking.quantity : 'N/A')}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailRow, isMultiItem && { marginBottom: verticalScale(4), paddingVertical: 1 }]}>
                                        <View style={styles.labelCol}>
                                            <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>तारीख</Text>
                                            <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Date</Text>
                                        </View>
                                        <Text style={styles.value} maxFontSizeMultiplier={1.3}>
                                            {new Date(booking.booking_date || booking.bookingDate).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailRow, isMultiItem && { marginBottom: verticalScale(4), paddingVertical: 1 }]}>
                                        <View style={styles.labelCol}>
                                            <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>स्थिति</Text>
                                            <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Status</Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.value,
                                                {
                                                    color: booking.status === 'Collected' ? COLORS.success :
                                                        booking.status === 'Cancelled' ? COLORS.error :
                                                            booking.status === 'Pending' ? COLORS.warning : COLORS.primary,
                                                    fontSize: moderateScale(14.5),
                                                }
                                            ]}
                                            maxFontSizeMultiplier={1.3}
                                        >
                                            {booking.status === 'Collected' ? 'प्राप्त' :
                                                booking.status === 'Cancelled' ? 'रद्द' :
                                                    booking.status === 'Pending' ? 'लंबित' :
                                                        booking.status === 'Extended' ? 'विस्तारित' :
                                                            (booking.status === 'Approved' || booking.status === 'Confirmed') ? 'पुष्टि' : booking.status}
                                        </Text>
                                    </View>

                                    {(booking.status === 'Cancelled' || !!booking.cancellation_reason) && (
                                        <View style={styles.reasonCardCancelled}>
                                            <Text style={styles.reasonTitleCancelled}>❌ रद्द करने का कारण:</Text>
                                            <Text style={styles.reasonTextCancelled}>
                                                {booking.cancellation_reason || 'दुकानदार द्वारा रद्द किया गया'}
                                            </Text>
                                        </View>
                                    )}

                                    {(booking.status === 'Extended' || !!booking.extension_reason) && (
                                        <View style={styles.reasonCardExtended}>
                                            <Text style={styles.reasonTitleExtended}>📅 तारीख बढ़ाने का कारण:</Text>
                                            <Text style={styles.reasonTextExtended}>
                                                {booking.extension_reason || 'दुकानदार द्वारा तारीख बढ़ाई गई'}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={[styles.divider, isMultiItem && { marginVertical: verticalScale(5) }]} />

                                    {!!(booking.kisan_panjikaran_number || booking.kisan_code) && (
                                        <View style={[styles.detailRow, isMultiItem && { marginBottom: verticalScale(4), paddingVertical: 1 }]}>
                                            <View style={styles.labelCol}>
                                                <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>किसान कोड</Text>
                                                <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Kisan Code</Text>
                                            </View>
                                            <Text style={[styles.value, styles.kisanCodeValue]} maxFontSizeMultiplier={1.3}>
                                                {booking.kisan_panjikaran_number || booking.kisan_code}
                                            </Text>
                                        </View>
                                    )}
                                    {!!booking.registry_id && (
                                        <View style={[styles.detailRow, isMultiItem && { marginBottom: verticalScale(4), paddingVertical: 1 }]}>
                                            <View style={styles.labelCol}>
                                                <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>रजिस्ट्री आईडी</Text>
                                                <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Registry ID</Text>
                                            </View>
                                            <Text style={styles.value} maxFontSizeMultiplier={1.3}>
                                                {booking.registry_id}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={[styles.shopSection, isMultiItem && { marginTop: verticalScale(5) }]}>
                                        <View style={styles.labelCol}>
                                            <Text style={styles.labelPrimary} maxFontSizeMultiplier={1.3}>दुकान का विवरण</Text>
                                            <Text style={styles.labelSub} maxFontSizeMultiplier={1.3}>Shop Details</Text>
                                        </View>
                                        <View style={[styles.shopDetails, isMultiItem && { padding: moderateScale(8), marginTop: 3 }]}>
                                            <Text style={styles.shopName} maxFontSizeMultiplier={1.3}>{booking.shop_name}</Text>
                                            <Text style={styles.shopAddress} maxFontSizeMultiplier={1.3}>{booking.retailer_address}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ViewShot>

                        <View style={[styles.buttonContainer, isMultiItem && { marginTop: SPACING.xs, marginBottom: SPACING.md }]}>
                            {(() => {
                                const isPending = booking.status === 'Pending';
                                const isCancelled = booking.status === 'Cancelled';
                                const isExtended = booking.status === 'Extended';

                                if (isPending || isCancelled || isExtended) {
                                    return (
                                        <View style={[
                                            styles.saveBtn,
                                            styles.statusBtn,
                                            isPending ? { backgroundColor: '#FEF9C3', borderColor: COLORS.warning } :
                                                isExtended ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' } :
                                                    { backgroundColor: '#FEE2E2', borderColor: COLORS.error },
                                        ] as any}>
                                            <Text style={[
                                                styles.statusBtnText,
                                                isPending ? { color: COLORS.warning } :
                                                    isExtended ? { color: '#D97706' } :
                                                        { color: COLORS.error },
                                            ]}>
                                                {isPending ? '⏳ लंबित' : isExtended ? '⏰ विस्तारित' : ((booking.cancelled_by === 'SYSTEM_AUTO' || booking.cancellation_reason?.includes('स्वतः रद्द') || booking.cancellation_reason?.includes('किसान के न पहुँचने')) ? '❌ स्वतः रद्द हुआ' : '❌ रद्द किया गया')}
                                            </Text>
                                        </View>
                                    );
                                }

                                return (
                                    <Button
                                        title=" डिवाइस में सेव करें"
                                        onPress={handleSave}
                                        style={styles.saveBtn}
                                        icon={<Ionicons name="download-outline" size={20} color={COLORS.white} />}
                                    />
                                );
                            })()}
                        </View>
                    </ScrollView>
                </View>
            </View>

            {/* Styled Alert for Save Feedback */}
            <ModernAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                onClose={() => {
                    setAlertVisible(false);
                    if (alertOnOk) alertOnOk();
                }}
                buttons={[{
                    text: 'ठीक है',
                    onPress: () => {
                        if (alertOnOk) alertOnOk();
                        else setAlertVisible(false);
                    },
                    style: 'default',
                }]}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: isTablet ? SPACING.xxl : SPACING.xs,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '95%',
        maxWidth: isTablet ? 560 : 430,
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 28 : BORDER_RADIUS.xl,
        ...SHADOWS.large,
        overflow: 'hidden',
        flexDirection: 'column',
    },
    scrollView: {
        width: '100%',
        flexShrink: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.md,
    },
    captureArea: {
        backgroundColor: COLORS.white,
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(16),
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        zIndex: 10,
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: BORDER_RADIUS.round,
    },
    headerTitle: {
        fontSize: moderateScale(19),
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    qrSection: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    qrWrapper: {
        padding: SPACING.sm,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.grayLight,
        marginBottom: SPACING.xs,
        position: 'relative',
    },
    tokenLabel: {
        fontSize: moderateScale(12.5),
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    tokenValue: {
        fontSize: moderateScale(26),
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 2,
        letterSpacing: 1,
    },
    detailsContainer: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: BORDER_RADIUS.lg,
        padding: moderateScale(12),
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: verticalScale(3),
        marginBottom: verticalScale(6),
    },
    labelCol: {
        flexDirection: 'column',
        justifyContent: 'center',
        flexShrink: 0,
        marginRight: SPACING.xs,
    },
    labelPrimary: {
        fontSize: moderateScale(14),
        color: '#1F2937',
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    labelSub: {
        fontSize: moderateScale(11.5),
        color: '#6B7280',
        fontWeight: '500',
        letterSpacing: -0.1,
        marginTop: 1,
    },
    value: {
        fontSize: moderateScale(14),
        color: '#111827',
        fontWeight: '700',
        letterSpacing: -0.2,
        textAlign: 'right',
        flexShrink: 1,
    },
    priceValue: {
        fontSize: moderateScale(17),
        fontWeight: '800',
        color: COLORS.primary,
    },
    kisanCodeValue: {
        fontSize: moderateScale(14.5),
        fontWeight: '800',
        color: '#15803D',
    },
    fertilizerListWrapper: {
        gap: 6,
    },
    fertilizerItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        paddingVertical: verticalScale(6),
        paddingHorizontal: moderateScale(10),
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fertilizerLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: SPACING.xs,
    },
    fertilizerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 7,
    },
    fertilizerNameHindi: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#111827',
        marginRight: 4,
    },
    fertilizerNameEng: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        color: '#6B7280',
    },
    quantityBadge: {
        paddingHorizontal: moderateScale(9),
        paddingVertical: verticalScale(2.5),
        borderRadius: 6,
        borderWidth: 1,
        alignSelf: 'center',
    },
    quantityBadgeText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: verticalScale(8),
    },
    reasonCardCancelled: {
        marginTop: 6,
        marginBottom: 4,
        backgroundColor: '#FEF2F2',
        padding: moderateScale(10),
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    reasonTitleCancelled: {
        fontSize: moderateScale(12.5),
        color: COLORS.error,
        fontWeight: 'bold',
    },
    reasonTextCancelled: {
        fontSize: moderateScale(13.5),
        color: '#991B1B',
        marginTop: 2,
        fontWeight: '500',
    },
    reasonCardExtended: {
        marginTop: 6,
        marginBottom: 4,
        backgroundColor: '#FFFBEB',
        padding: moderateScale(10),
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    reasonTitleExtended: {
        fontSize: moderateScale(12.5),
        color: '#D97706',
        fontWeight: 'bold',
    },
    reasonTextExtended: {
        fontSize: moderateScale(13.5),
        color: '#92400E',
        marginTop: 2,
        fontWeight: '500',
    },
    shopSection: {
        marginTop: verticalScale(8),
    },
    shopDetails: {
        backgroundColor: COLORS.white,
        padding: moderateScale(10),
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 6,
    },
    shopName: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#111827',
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    shopAddress: {
        fontSize: moderateScale(12.5),
        color: '#4B5563',
        letterSpacing: -0.2,
        lineHeight: moderateScale(17),
    },
    saveBtn: {
        width: '100%',
    },
    statusBtn: {
        paddingVertical: verticalScale(12),
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBtnText: {
        fontSize: moderateScale(15),
        fontWeight: 'bold',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    }
});
