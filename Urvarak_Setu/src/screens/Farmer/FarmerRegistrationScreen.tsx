import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    Easing,
    Pressable,
    Modal,
    StatusBar,
    ActivityIndicator,
    Keyboard,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input, Dropdown, WhatsAppIcon, OTPInput } from '../../components';
import BackButton from '../../components/BackButton';
import ParticleBackground from '../../components/ParticleBackground';
import {
    UserIcon,
    PhoneIcon,
    IdCardIcon,
    MapPinIcon,
    DocumentIcon,
    AreaIcon,
} from '../../components/FormIcons';
import {
    HINDI_TEXT,
    COLORS,
    SPACING,
} from '../../constants';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import { pickFarmerPhoto, pickAadhaarPhoto, pickDocument, compressImage, pickMultipleDocuments, pickMultipleKhatauniPhotos } from '../../utils/imagePickerUtils';
import { ModernAlert } from '../../components/ModernAlert';
import { CameraIcon, CheckCircleIcon } from '../../components/PhotoUploadIcons';
import { scale, verticalScale, moderateScale, isTablet, useResponsive } from '../../utils/responsive';
import { useSettings } from '../../contexts/SettingsContext';
import { resolveAppImage } from '../../utils/imageResolver';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Open local or remote PDF file via dedicated viewer or fallback
const openPdfFile = async (uri: string) => {
    if (!uri) return;
    try {
        // 1. If it's already a remote URL (http/https):
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
            const match = uri.match(/uploads\/[^\s\?#]+/i);
            const viewerUrl = match
                ? `${API_BASE_URL}/view_pdf.php?file=${encodeURIComponent(match[0])}`
                : uri;
            await Linking.openURL(viewerUrl);
            return;
        }

        // 2. For local files (file:// or content://):
        // Upload to temp preview endpoint so view_pdf.php can render it seamlessly
        try {
            const formData = new FormData();
            const fileName = uri.split('/').pop()?.split('?')[0] || `doc_${Date.now()}.pdf`;
            formData.append('pdf', {
                uri,
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
        } catch (uploadErr) {
            console.warn('Temp upload failed, trying fallback:', uploadErr);
        }

        // 3. Fallback: Sharing.shareAsync grants Intent.FLAG_GRANT_READ_URI_PERMISSION so PDF viewer apps can read it
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'PDF दस्तावेज़ खोलें और देखें',
                UTI: 'com.adobe.pdf'
            });
        }
    } catch (err) {
        console.warn('Error opening PDF:', err);
    }
};


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MUSTARD = '#F9A825';
const MUSTARD_DARK = '#E67C00';

interface LocationOption {
    label: string;
    value: string;
}


// Picker Option Modal
const ImageSourceSelector = ({
    visible,
    onSelect,
    onClose,
    showPDF = false
}: {
    visible: boolean,
    onSelect: (source: 'camera' | 'gallery' | 'pdf') => void,
    onClose: () => void,
    showPDF?: boolean
}) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
            <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>दस्तावेज़ कहाँ से चुनें?</Text>
                <View style={styles.pickerRow}>
                    <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect('camera'); onClose(); }}>
                        <View style={[styles.pickerIconWrap, { backgroundColor: '#E3F2FD' }]}>
                            <MaterialCommunityIcons name="camera" size={28} color="#1976D2" />
                        </View>
                        <Text style={styles.pickerText}>कैमरा</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect('gallery'); onClose(); }}>
                        <View style={[styles.pickerIconWrap, { backgroundColor: '#F1F8E9' }]}>
                            <MaterialCommunityIcons name="image" size={28} color="#388E3C" />
                        </View>
                        <Text style={styles.pickerText}>गैलरी</Text>
                    </TouchableOpacity>
                    {showPDF && (
                        <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect('pdf'); onClose(); }}>
                            <View style={[styles.pickerIconWrap, { backgroundColor: '#FFF3E0' }]}>
                                <MaterialCommunityIcons name="file-pdf-box" size={28} color="#F57C00" />
                            </View>
                            <Text style={styles.pickerText}>PDF फ़ाइल</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Pressable>
    </Modal>
);

// Local Document Viewer Modal Component
const LocalDocumentViewerModal = ({
    visible,
    title,
    files,
    initialIndex = 0,
    onClose,
    onReplace,
}: {
    visible: boolean;
    title: string;
    files: { uri: string; name?: string; isPDF?: boolean }[];
    initialIndex?: number;
    onClose: () => void;
    onReplace?: () => void;
}) => {
    const [page, setPage] = useState(initialIndex);

    useEffect(() => {
        if (visible) setPage(initialIndex);
    }, [visible, initialIndex]);

    if (!visible || !files || files.length === 0) return null;

    const currentFile = files[Math.min(page, files.length - 1)];
    const uri = currentFile ? (typeof currentFile === 'string' ? currentFile : currentFile.uri) : '';
    const isPDF = currentFile && typeof currentFile === 'object' ? currentFile.isPDF : false;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.viewerOverlay}>
                <View style={styles.viewerHeaderSafeArea}>
                    <View style={styles.viewerHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.viewerTitle} numberOfLines={1}>{title}</Text>
                            {files.length > 1 && (
                                <Text style={styles.viewerSubtitle}>
                                    पेज {page + 1} / {files.length}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.viewerCloseBtn} onPress={onClose} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.viewerBody}>
                    {isPDF ? (
                        <TouchableOpacity
                            style={styles.viewerPdfCard}
                            activeOpacity={0.85}
                            onPress={() => openPdfFile(uri)}
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={68} color="#DC2626" />
                            <Text style={styles.viewerPdfTitle} numberOfLines={2}>
                                {(currentFile as any)?.name || 'PDF दस्तावेज़'}
                            </Text>
                            <Text style={styles.viewerPdfDesc}>
                                पूरा दस्तावेज़ व सभी पृष्ठ देखने के लिए नीचे दिए गए बटन पर टैप करें:
                            </Text>
                            <View style={styles.openPdfPrimaryBtn}>
                                <MaterialCommunityIcons name="open-in-app" size={20} color="#FFFFFF" />
                                <Text style={styles.openPdfPrimaryBtnText}>पूरा PDF खोलें और देखें</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <Image
                            source={{ uri }}
                            style={styles.viewerImage}
                            resizeMode="contain"
                        />
                    )}
                </View>

                <View style={styles.viewerFooterSafeArea}>
                    <View style={styles.viewerFooter}>
                        {files.length > 1 && (
                            <View style={styles.paginationRow}>
                                <TouchableOpacity
                                    style={[styles.pageNavBtn, page === 0 && styles.pageNavBtnDisabled]}
                                    disabled={page === 0}
                                    onPress={() => setPage(p => Math.max(0, p - 1))}
                                >
                                    <MaterialCommunityIcons name="chevron-left" size={20} color={page === 0 ? '#64748B' : '#FFFFFF'} />
                                    <Text style={[styles.pageNavText, page === 0 && { color: '#64748B' }]}>पिछला</Text>
                                </TouchableOpacity>

                                <View style={styles.dotsContainer}>
                                    {files.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[styles.dot, i === page && styles.activeDot]}
                                        />
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.pageNavBtn, page === files.length - 1 && styles.pageNavBtnDisabled]}
                                    disabled={page === files.length - 1}
                                    onPress={() => setPage(p => Math.min(files.length - 1, p + 1))}
                                >
                                    <Text style={[styles.pageNavText, page === files.length - 1 && { color: '#64748B' }]}>अगला</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={page === files.length - 1 ? '#64748B' : '#FFFFFF'} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.viewerActionRow}>
                            {onReplace && (
                                <TouchableOpacity
                                    style={styles.viewerSecondaryBtn}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => onReplace(), 250);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="camera-retake-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.viewerSecondaryBtnText}>दस्तावेज़ बदलें</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.viewerPrimaryBtn} onPress={onClose} activeOpacity={0.8}>
                                <Text style={styles.viewerPrimaryBtnText}>ठीक है</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Premium Upload Card Component with Rich Image Preview
const PremiumUploadCard = ({
    label,
    icon,
    value,
    onPress,
    error,
    isPDF = false,
    fileCount = 1,
    onView,
    onClear,
}: {
    label: string;
    icon: (size: number, color: string) => React.ReactNode;
    value: any;
    onPress: () => void;
    error?: string;
    isPDF?: boolean;
    fileCount?: number;
    onView?: () => void;
    onClear?: () => void;
}) => {
    const uri = value ? (typeof value === 'string' ? value : value.uri) : null;
    const fileName = value && typeof value === 'object' ? value.name : '';

    return (
        <View style={styles.uploadCardWrapper}>
            <View style={[styles.uploadCard, value && styles.uploadCardSelected, error && styles.uploadCardError]}>
                {value ? (
                    // Uploaded State with Large, Clear Preview
                    <View style={styles.uploadedContainer}>
                        <TouchableOpacity
                            style={styles.previewImageContainer}
                            activeOpacity={0.85}
                            onPress={isPDF ? () => openPdfFile(uri) : (onView || onPress)}
                        >
                            {isPDF ? (
                                <View style={styles.pdfPreviewBox}>
                                    <MaterialCommunityIcons name="file-pdf-box" size={38} color="#DC2626" />
                                    <Text style={styles.pdfFileName} numberOfLines={1}>
                                        {fileName || 'PDF दस्तावेज़'}
                                    </Text>
                                    <View style={styles.viewBadge}>
                                        <MaterialCommunityIcons name="open-in-new" size={12} color="#0284C7" />
                                        <Text style={styles.viewBadgeText}>PDF खोलें</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={{ width: '100%', height: '100%' }}>
                                    <Image
                                        source={{ uri }}
                                        style={styles.cardImagePreview}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.previewOverlayPill}>
                                        <MaterialCommunityIcons name="eye" size={12} color="#FFFFFF" />
                                        <Text style={styles.previewOverlayText}>बड़ा देखें</Text>
                                    </View>
                                </View>
                            )}

                            {fileCount > 1 && (
                                <View style={styles.multiFileBadge}>
                                    <MaterialCommunityIcons name="layers" size={11} color="#FFFFFF" />
                                    <Text style={styles.multiFileBadgeText}>{fileCount} पेज</Text>
                                </View>
                            )}

                            <View style={styles.checkBadge}>
                                <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.cardInfoRow}>
                            <Text style={styles.uploadCardLabel} numberOfLines={1}>{label}</Text>
                        </View>

                        <View style={styles.cardActionRow}>
                            {!isPDF && (
                                <TouchableOpacity style={styles.actionBtnSmall} onPress={onView || onPress}>
                                    <MaterialCommunityIcons name="eye-outline" size={14} color="#0284C7" />
                                    <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>देखें</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.actionBtnSmall, isPDF && { flex: 1 }]} onPress={onPress}>
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#15803D" />
                                <Text style={[styles.actionBtnText, { color: '#15803D' }]}>बदलें</Text>
                            </TouchableOpacity>
                            {onClear && (
                                <TouchableOpacity style={styles.actionBtnSmallDanger} onPress={onClear}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={14} color="#DC2626" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : (
                    // Empty State
                    <TouchableOpacity
                        style={styles.emptyUploadBtn}
                        onPress={onPress}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.uploadCardIconBG, error && { backgroundColor: '#FFEBEE' }]}>
                            {icon(26, error ? '#D32F2F' : MUSTARD)}
                        </View>
                        <Text style={styles.uploadCardLabel} numberOfLines={1}>{label}</Text>
                        <View style={styles.uploadCtaPill}>
                            <MaterialCommunityIcons name="plus" size={13} color={MUSTARD_DARK} />
                            <Text style={styles.uploadCtaText}>अपलोड करें</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
            {error ? <Text style={styles.errorText} numberOfLines={1}>{error}</Text> : null}
        </View>
    );
};

// Premium Button Component
const PremiumButton = ({ title, onPress, loading, disabled }: { title: string, onPress: () => void, loading?: boolean, disabled?: boolean }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.premiumButton,
                pressed && { backgroundColor: MUSTARD_DARK },
                (disabled || loading) && styles.buttonDisabled
            ]}
        >
            <Animated.View style={{ transform: [{ scale }], width: '100%', alignItems: 'center' }}>
                <Text style={styles.premiumButtonText}>
                    {loading ? "पंजीकरण हो रहा है..." : title}
                </Text>
            </Animated.View>
        </Pressable>
    );
};

// LabeledField
const LabeledField = ({
    label,
    icon,
    children,
    required = false,
    error = '',
}: {
    label: string,
    icon: (color: string) => React.ReactNode,
    children: (iconComponent: React.ReactNode) => React.ReactNode,
    required?: boolean,
    error?: string,
}) => {
    return (
        <View style={styles.fieldWrapper}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={{ color: '#D32F2F' }}> *</Text>}
            </Text>
            {children(icon('#757575'))}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

export default function FarmerRegistrationScreen({
    onBack,
}: {
    onRegister?: (data: any) => void;
    onBack: () => void;
}) {
    const { isTablet: isTabletMode, isLandscape } = useResponsive();
    const { settings } = useSettings();
    const defaultBg = require('../../../assets/Farmer in golden wheat field.png');
    const defaultLogo = require('../../../assets/icon.png');
    const bgSource = resolveAppImage(settings?.farmer_app_bg_image_url || settings?.bg_image_url, defaultBg);
    const logoSource = resolveAppImage(settings?.farmer_app_logo_url || settings?.farmer_app_icon_url || settings?.logo_url, defaultLogo);
    const inputHeight = isTabletMode ? 56 : 52;
    const inputFontSize = isTabletMode ? 17 : 16;
    const iconSize = isTabletMode ? 20 : 18;

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        aadhaar: '',
        village_id: '',
        district: '',
        tehsil: '',
        block: '',
        retailer_id: '',
        retailer_name: '',
        registry_id: '',
        kisan_panjikaran_number: '',
        khatauni_number: '',
        land_area: '',
        wa_notification: false,
    });

    const [farmerPhoto, setFarmerPhoto] = useState<string | null>(null);
    const [aadhaarFile, setAadhaarFile] = useState<{ uri: string, name: string, isPDF: boolean } | null>(null);
    const [khatauniFiles, setKhatauniFiles] = useState<{ uri: string, name: string, isPDF: boolean }[]>([]);
    const [kisanPanjikaranFiles, setKisanPanjikaranFiles] = useState<{ uri: string, name: string, isPDF: boolean }[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // UI Local States
    const [pickerType, setPickerType] = useState<'photo' | 'aadhaar' | 'khatauni' | 'kisan_panjikaran' | null>(null);
    const [previewModal, setPreviewModal] = useState<{
        visible: boolean;
        title: string;
        files: { uri: string; name?: string; isPDF?: boolean }[];
        index: number;
        pickerKey?: 'photo' | 'aadhaar' | 'khatauni' | 'kisan_panjikaran';
    }>({ visible: false, title: '', files: [], index: 0 });

    // Registration OTP States
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpSubmitting, setOtpSubmitting] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startResendTimer = () => {
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean, title: string, message: string, type: 'success' | 'error' | 'warning' | 'info',
        buttons?: any[], onClose?: () => void
    }>({ visible: false, title: '', message: '', type: 'info' });

    const lastCheckedStatusRef = useRef({ mobile: '', aadhaar: '', registry_id: '', kisan_panjikaran_number: '' });
    const hasShownStatusAlertRef = useRef(false);

    // Location Data States
    const [districts, setDistricts] = useState<LocationOption[]>([]);
    const [tehsils, setTehsils] = useState<LocationOption[]>([]);
    const [blocks, setBlocks] = useState<LocationOption[]>([]);
    const [gramPanchayats, setGramPanchayats] = useState<LocationOption[]>([]);
    const [retailers, setRetailers] = useState<LocationOption[]>([]);
    const [loadingTehsils, setLoadingTehsils] = useState(false);
    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [loadingPanchayats, setLoadingPanchayats] = useState(false);
    const [loadingRetailers, setLoadingRetailers] = useState(false);
    const [masterData, setMasterData] = useState<any[]>([]);

    useEffect(() => {
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        try {
            const response = await apiFetch(API_ENDPOINTS.getDistricts);
            const result = await response.json();
            if (result.success && result.data) {
                setDistricts([
                    { label: 'अपना जिला चुनें', value: '' },
                    ...result.data
                ]);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const handleDistrictChange = async (value: string | number) => {
        const val = String(value).trim();
        updateField('district', val);
        updateField('tehsil', '');
        updateField('block', '');
        updateField('village_id', '');
        updateField('retailer_id', '');

        if (!val) {
            setMasterData([]);
            setTehsils([]);
            return;
        }

        try {
            setLoadingTehsils(true);
            const districtObj = districts.find(d => d.value === val);
            const districtId = districtObj ? (districtObj as any).id : val;

            const response = await apiFetch(`${API_ENDPOINTS.getMasterLocations}?district_id=${districtId}`);
            const result = await response.json();

            if (result.status && result.data) {
                setMasterData(result.data);
                const uniqueTehsils = Array.from(new Set(
                    result.data.map((item: any) => String(item.tehseel_name).trim())
                )).sort();

                setTehsils([
                    { label: 'अपनी तहसील चुनें', value: '' },
                    ...uniqueTehsils.map(name => ({ label: name as string, value: name as string }))
                ]);
            } else {
                setMasterData([]);
                setTehsils([]);
            }
        } catch (error) {
            console.error('Error fetching district data:', error);
            setMasterData([]);
            setTehsils([]);
        } finally {
            setLoadingTehsils(false);
        }

        setBlocks([]);
        setGramPanchayats([]);
        setRetailers([]);
    };

    const handleTehsilChange = (value: string | number) => {
        const val = String(value).trim();
        updateField('tehsil', val);
        updateField('block', '');
        updateField('village_id', '');
        updateField('retailer_id', '');

        if (!val) {
            setBlocks([]);
            return;
        }

        setLoadingBlocks(true);
        setTimeout(() => {
            const blocksForTehsil = Array.from(new Set(
                masterData
                    .filter(item => String(item.tehseel_name).trim() === val)
                    .map(item => String(item.block_name).trim())
            )).sort();

            setBlocks([
                { label: 'अपना ब्लॉक चुनें', value: '' },
                ...blocksForTehsil.map(name => ({ label: name as string, value: name as string }))
            ]);
            setGramPanchayats([]);
            setRetailers([]);
            setLoadingBlocks(false);
        }, 600);
    };

    const handleBlockChange = async (value: string | number) => {
        const val = String(value).trim();
        updateField('block', val);
        updateField('village_id', '');
        updateField('retailer_id', '');

        if (!val) {
            setGramPanchayats([]);
            setRetailers([]);
            return;
        }

        setLoadingPanchayats(true);
        setLoadingRetailers(true);

        setTimeout(() => {
            const blockRecords = masterData.filter(item =>
                String(item.tehseel_name).trim() === formData.tehsil &&
                String(item.block_name).trim() === val
            );

            const retailerIds = Array.from(new Set(
                blockRecords
                    .filter(item => item.retailer_id)
                    .map(item => String(item.retailer_id))
            ));

            if (retailerIds.length > 0) {
                const retailerOptions = retailerIds.map((id) => {
                    const record = blockRecords.find(item => String(item.retailer_id) === id);
                    const name = record?.society_name || `Retailer ${id}`;
                    return { label: `${id} - ${name}`, value: id, shop_name: name };
                });
                setRetailers([
                    { label: 'अपना रिटेलर चुनें', value: '' },
                    ...retailerOptions
                ]);
            } else {
                setRetailers([]);
            }

            const allGPs: { id: string, name: string }[] = [];
            blockRecords.forEach(item => {
                if (item.gram_panchayats && Array.isArray(item.gram_panchayats)) {
                    item.gram_panchayats.forEach((gp: any) => {
                        if (!allGPs.find(g => g.id === gp.id)) {
                            allGPs.push({ id: String(gp.id), name: String(gp.name).trim() });
                        }
                    });
                }
            });

            if (allGPs.length > 0) {
                setGramPanchayats([
                    { label: 'ग्राम पंचायत चुनें', value: '' },
                    ...allGPs.sort((a, b) => a.name.localeCompare(b.name)).map(gp => ({
                        label: gp.name,
                        value: gp.name
                    }))
                ]);
            } else {
                setGramPanchayats([{ label: 'लागू नहीं (N/A)', value: 'NA' }]);
                updateField('village_id', 'NA');
            }

            setLoadingPanchayats(false);
            setLoadingRetailers(false);
        }, 600);
    };

    const updateField = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof typeof errors]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const handleNameChange = (text: string) => {
        if (/[0-9]/.test(text)) {
            setErrors((prev) => ({ ...prev, ['name']: 'नाम में अंक नहीं हो सकते' }));
            setFormData((prev) => ({ ...prev, name: text.replace(/[0-9]/g, '') }));
        } else {
            setFormData((prev) => ({ ...prev, name: text }));
            if (errors['name']) setErrors((prev) => ({ ...prev, ['name']: '' }));
        }
    };

    const handleAadhaarChange = (text: string) => {
        const clean = text.replace(/[^0-9]/g, '');
        if (/[^0-9]/.test(text)) {
            setErrors((prev) => ({ ...prev, ['aadhaar']: 'आधार नंबर में केवल अंक होने चाहिए' }));
            setFormData((prev) => ({ ...prev, aadhaar: clean }));
        } else {
            setFormData((prev) => ({ ...prev, aadhaar: text }));
            if (errors['aadhaar']) setErrors((prev) => ({ ...prev, ['aadhaar']: '' }));
        }
        if (clean.length === 12) {
            Keyboard.dismiss();
        }
    };

    const handleLandAreaChange = (text: string) => {
        let cleaned = text.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        if (parts[0] && parts[0].length > 4) {
            cleaned = parts[0].slice(0, 4) + (parts.length > 1 ? '.' + parts[1] : '');
        }
        if (cleaned.length > 8) {
            cleaned = cleaned.slice(0, 8);
        }

        if (/[^0-9.]/.test(text)) {
            setErrors((prev) => ({ ...prev, ['land_area']: 'केवल अंक और दशमलव की अनुमति है' }));
        } else if (text.length >= 10 || /^[6-9][0-9]{9}$/.test(text.trim())) {
            setErrors((prev) => ({ ...prev, ['land_area']: 'यहाँ मोबाइल नंबर नहीं, जमीन का क्षेत्रफल (हेक्टेयर) दर्ज करें' }));
        } else {
            const num = parseFloat(cleaned);
            if (num > 1000) {
                setErrors((prev) => ({ ...prev, ['land_area']: 'अधिकतम 1000 हेक्टेयर दर्ज कर सकते हैं' }));
            } else if (errors['land_area']) {
                setErrors((prev) => ({ ...prev, ['land_area']: '' }));
            }
        }
        setFormData((prev) => ({ ...prev, land_area: cleaned }));
    };

    const handleImageSelect = (source: 'camera' | 'gallery' | 'pdf') => {
        const type = pickerType;
        if (!type) return;

        if (source === 'pdf') {
            if (type === 'khatauni') {
                pickMultipleDocuments((files) => {
                    setKhatauniFiles(prev => [...prev, ...files.map(f => ({ ...f, isPDF: true }))]);
                }, (m) => showAlert('Error', m, 'error'));
                return;
            }
            if (type === 'kisan_panjikaran') {
                pickMultipleDocuments((files) => {
                    setKisanPanjikaranFiles(prev => [...prev, ...files.map(f => ({ ...f, isPDF: true }))]);
                }, (m) => showAlert('Error', m, 'error'));
                return;
            }
            pickDocument((uri, name) => {
                if (type === 'aadhaar') setAadhaarFile({ uri, name, isPDF: true });
            }, (m) => showAlert('Error', m, 'error'));
            return;
        }

        if (type === 'khatauni') {
            pickMultipleKhatauniPhotos(source, async (uris: string[]) => {
                const compressedUris = await Promise.all(uris.map(uri => compressImage(uri)));
                setKhatauniFiles(prev => [
                    ...prev,
                    ...compressedUris.map((compressed, i) => ({ uri: compressed, name: `Khatauni_${Date.now()}_${i}.jpg`, isPDF: false }))
                ]);
            }, (m) => showAlert('Error', m, 'error'));
            return;
        }

        if (type === 'kisan_panjikaran') {
            pickMultipleKhatauniPhotos(source, async (uris: string[]) => {
                const compressedUris = await Promise.all(uris.map(uri => compressImage(uri)));
                setKisanPanjikaranFiles(prev => [
                    ...prev,
                    ...compressedUris.map((compressed, i) => ({ uri: compressed, name: `Kisan_Panjikaran_${Date.now()}_${i}.jpg`, isPDF: false }))
                ]);
            }, (m) => showAlert('Error', m, 'error'));
            return;
        }

        const pickFn = type === 'photo' ? pickFarmerPhoto : pickAadhaarPhoto;

        pickFn(source, async (uri: string) => {
            const compressed = await compressImage(uri);
            if (type === 'photo') setFarmerPhoto(compressed);
            else if (type === 'aadhaar') setAadhaarFile({ uri: compressed, name: 'Aadhaar.jpg', isPDF: false });
        }, (m) => showAlert('Error', m, 'error'));
    };


    const validateForm = () => {
        const newErrors: any = {};
        if (!formData.name.trim()) newErrors['name'] = 'नाम आवश्यक है';
        if (!formData.mobile.trim()) newErrors['mobile'] = 'मोबाइल नंबर आवश्यक है';
        else if (!/^[0-9]{10}$/.test(formData.mobile)) newErrors['mobile'] = 'मोबाइल नंबर 10 अंकों का होना चाहिए';
        if (!formData.aadhaar.trim()) newErrors['aadhaar'] = 'आधार नंबर आवश्यक है';
        else if (!/^[0-9]{12}$/.test(formData.aadhaar)) newErrors['aadhaar'] = 'आधार नंबर 12 अंकों का होना चाहिए';
        if (!formData.district.trim()) newErrors['district'] = 'जिला आवश्यक है';
        if (!formData.tehsil.trim()) newErrors['tehsil'] = 'तहसील आवश्यक है';
        if (!formData.block.trim()) newErrors['block'] = 'ब्लॉक आवश्यक है';
        if (!formData.village_id.trim()) newErrors['village_id'] = 'ग्राम पंचायत आवश्यक है';
        if (!formData.retailer_id) newErrors['retailer_id'] = 'रिटेलर आवश्यक है';
        if (!formData.khatauni_number.trim()) newErrors['khatauni_number'] = 'खतौनी / गाटा संख्या आवश्यक है';
        if (!formData.registry_id.trim()) newErrors['registry_id'] = 'रजिस्ट्री आईडी आवश्यक है';
        if (!formData.kisan_panjikaran_number.trim()) {
            newErrors['kisan_panjikaran_number'] = 'कृषक पंजिका कोड आवश्यक है';
        } else if (formData.kisan_panjikaran_number.trim().length !== 10) {
            newErrors['kisan_panjikaran_number'] = 'कृषक पंजिका कोड ठीक 10 अंकों का होना चाहिए';
        }
        if (!formData.land_area.trim()) {
            newErrors['land_area'] = 'क्षेत्रफल आवश्यक है';
        } else {
            const cleanArea = formData.land_area.trim();
            const areaNum = parseFloat(cleanArea);
            if (isNaN(areaNum) || areaNum <= 0) {
                newErrors['land_area'] = 'क्षेत्रफल 0 से अधिक होना चाहिए';
            } else if (cleanArea.length >= 10 || /^[6-9][0-9]{9}$/.test(cleanArea)) {
                newErrors['land_area'] = 'यहाँ मोबाइल नंबर नहीं, हेक्टेयर में जमीन का क्षेत्रफल दर्ज करें';
            } else if (areaNum > 1000) {
                newErrors['land_area'] = 'कृपया मान्य क्षेत्रफल दर्ज करें (अधिकतम 1000 हेक्टेयर)';
            }
        }
        if (!farmerPhoto) newErrors['farmerPhoto'] = 'फोटो आवश्यक है';
        if (!aadhaarFile) newErrors['aadhaarPhoto'] = 'आधार फोटो आवश्यक है';
        if (khatauniFiles.length === 0) newErrors['khatauniPhoto'] = 'खतौनी / गाटा फोटो आवश्यक है';
        if (kisanPanjikaranFiles.length === 0) newErrors['kisanPanjikaranPhoto'] = 'पंजीकरण पर्ची आवश्यक है';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkPreRegistrationStatus = async () => {
        const m = formData.mobile.trim();
        const a = formData.aadhaar.trim();
        const r = formData.registry_id.trim();
        const k = formData.kisan_panjikaran_number.trim();

        if (m.length < 10 && a.length < 12 && r.length === 0 && k.length === 0) return;
        if (hasShownStatusAlertRef.current) return;

        const lastChecked = lastCheckedStatusRef.current;
        if (lastChecked.mobile === m && lastChecked.aadhaar === a && lastChecked.registry_id === r && lastChecked.kisan_panjikaran_number === k) {
            return;
        }

        lastCheckedStatusRef.current = { mobile: m, aadhaar: a, registry_id: r, kisan_panjikaran_number: k };

        try {
            const response = await apiFetch(API_ENDPOINTS.checkFarmerStatus, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mobile: m,
                    aadhaar: a,
                    registry_id: r,
                    kisan_panjikaran_number: k
                })
            });
            const result = await response.json();
            
            if (result.status === 'blocked') {
                showAlert('पंजीकरण सीमा समाप्त', result.message, 'error');
                hasShownStatusAlertRef.current = true;
            } else if (result.status === 'rejected') {
                showAlert('अस्वीकृत', `${result.message}\n\nकारण: ${result.rejection_reason}`, 'error');
                hasShownStatusAlertRef.current = true;
            }
        } catch (error) {
            console.error('Check status error:', error);
        }
    };

    // Step 1: Validate form and send OTP before submission
    const handleRegister = async () => {
        if (!validateForm()) {
            showAlert('त्रुटि', 'कृपया सभी आवश्यक फ़ील्ड भरें।', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch(API_ENDPOINTS.sendRegistrationOtp, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: formData.mobile.trim() }),
            });

            const result = await response.json();
            if (result.success) {
                setOtp('');
                setOtpError('');
                setShowOtpModal(true);
                startResendTimer();
            } else {
                showAlert('पंजीकरण सूचना', result.message || 'OTP भेजने में विफल।', 'error');
            }
        } catch (error) {
            showAlert('नेटवर्क त्रुटि', 'OTP सर्वर से संपर्क नहीं हो सका। कृपया इंटरनेट कनेक्शन जांचें।', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Resend OTP handler with cooldown protection
    const handleResendOtp = async () => {
        if (resendTimer > 0 || otpSubmitting) return;

        try {
            const response = await apiFetch(API_ENDPOINTS.sendRegistrationOtp, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: formData.mobile.trim() }),
            });

            const result = await response.json();
            if (result.success) {
                setOtp('');
                setOtpError('');
                startResendTimer();
                showAlert('सफल', 'नया OTP आपके मोबाइल नंबर पर भेज दिया गया है।', 'success');
            } else {
                setOtpError(result.message || 'OTP पुनः भेजने में समस्या आई।');
            }
        } catch (error) {
            setOtpError('नेटवर्क त्रुटि: OTP नहीं भेजा जा सका।');
        }
    };

    // Step 3: Final verification & multipart submission
    const handleVerifyAndSubmit = async () => {
        const cleanOtp = otp.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            setOtpError('कृपया 6 अंकों का सही OTP दर्ज करें');
            return;
        }

        setOtpSubmitting(true);
        setOtpError('');

        try {
            const formDataToSubmit = new FormData();
            const fieldMap: Record<string, string> = {
                name: 'name',
                mobile: 'mobile',
                aadhaar: 'aadhaar',
                district: 'district_id',
                tehsil: 'tehsil_id',
                block: 'block_id',
                village_id: 'village_id',
                retailer_id: 'selected_retailer_id',
                retailer_name: 'selected_retailer_name',
                khatauni_number: 'khatauni_number',
                registry_id: 'registry_id',
                kisan_panjikaran_number: 'kisan_panjikaran_number',
                land_area: 'land_area',
            };

            Object.entries(fieldMap).forEach(([formKey, apiKey]) => {
                const value = (formData as any)[formKey];
                formDataToSubmit.append(apiKey, value ? String(value) : '');
            });

            formDataToSubmit.append('wa_notification', formData.wa_notification ? '1' : '0');
            formDataToSubmit.append('otp', cleanOtp);

            if (farmerPhoto) {
                formDataToSubmit.append('farmer_photo', {
                    uri: farmerPhoto,
                    name: `farmer_${formData.mobile}_${Date.now()}.jpg`,
                    type: 'image/jpeg',
                } as any);
            }

            if (aadhaarFile) {
                formDataToSubmit.append('aadhaar_photo', {
                    uri: aadhaarFile.uri,
                    name: aadhaarFile.name,
                    type: aadhaarFile.isPDF ? 'application/pdf' : 'image/jpeg',
                } as any);
            }

            if (kisanPanjikaranFiles.length > 0) {
                kisanPanjikaranFiles.forEach((file, index) => {
                    formDataToSubmit.append('kisan_panjikaran_photo[]', {
                        uri: file.uri,
                        name: file.name,
                        type: file.isPDF ? 'application/pdf' : 'image/jpeg',
                    } as any);
                });
            }

            if (khatauniFiles.length > 0) {
                khatauniFiles.forEach((file, index) => {
                    formDataToSubmit.append('khatauni_photo[]', {
                        uri: file.uri,
                        name: file.name,
                        type: file.isPDF ? 'application/pdf' : 'image/jpeg',
                    } as any);
                });
            }

            const response = await apiFetch(API_ENDPOINTS.registerFarmer, {
                method: 'POST',
                body: formDataToSubmit,
            });

            const result = await response.json();
            if (result.status === 'success' || result.success) {
                setShowOtpModal(false);
                showAlert('सफल', 'अपने सभी दस्तावेज़ अपने रिटेलर के पास ले जाकर पुष्टि कराएं।', 'success', onBack);
            } else {
                let errorMsg = result.message || 'पंजीकरण विफल रहा।';
                if (/SQLSTATE|Database error|khasra_rukba|column|table|syntax error/i.test(errorMsg)) {
                    errorMsg = 'पंजीकरण में समस्या आई। कृपया दर्ज की गई जानकारी (जैसे क्षेत्रफल) जांचें।';
                }
                setOtpError(errorMsg);
            }
        } catch (error) {
            setOtpError('सर्वर से संपर्क करने में समस्या आई। पुनः प्रयास करें।');
        } finally {
            setOtpSubmitting(false);
        }
    };

    const showAlert = (title: string, message: string, type: any, onClose?: () => void) => {
        setAlertConfig({ visible: true, title, message, type, onClose });
    };

    return (
        <View style={styles.container}>
            <Image
                source={bgSource}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />

            <ParticleBackground
                transparent={true}
                bubbleColors={[MUSTARD, '#FFFFFF', '#FFD54F', 'rgba(255,255,255,0.3)']}
            >
                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        <LinearGradient
                            colors={[MUSTARD, MUSTARD_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.header, isTabletMode && { height: 68 }]}
                        >
                            <View style={styles.headerContent}>
                                <BackButton onPress={onBack} color="#FFFFFF" style={styles.headerBack} />
                                <Text style={[styles.headerTitle, isTabletMode && { fontSize: 28 }]}>किसान पंजीकरण</Text>
                                <View style={styles.logoContainer}>
                                    <Image source={logoSource} style={styles.headerLogo} />
                                </View>
                            </View>
                        </LinearGradient>

                        <ScrollView
                            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={[styles.card, isTabletMode && { maxWidth: isLandscape ? 880 : 740, width: '92%', paddingVertical: 26 }]}>

                                <View style={[styles.narrowContent, isTabletMode && { paddingHorizontal: 30 }]}>
                                    {/* Row 1: Name & Mobile */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label={HINDI_TEXT.name} icon={(c) => <UserIcon size={iconSize} color={c} />} required error={errors.name}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="अपना पूरा नाम दर्ज करें"
                                                        required={false}
                                                        value={formData.name}
                                                        onChangeText={handleNameChange}
                                                        autoComplete="name"
                                                        textContentType="name"
                                                        importantForAutofill="yes"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label={HINDI_TEXT.mobileNumber} icon={(c) => <PhoneIcon size={iconSize} color={c} />} required error={errors.mobile}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="10 अंकों का मोबाइल नंबर"
                                                        required={false}
                                                        value={formData.mobile}
                                                        onChangeText={(v) => updateField('mobile', v.replace(/[^0-9]/g, ''))}
                                                        onBlur={checkPreRegistrationStatus}
                                                        keyboardType="phone-pad"
                                                        maxLength={10}
                                                        autoComplete="tel"
                                                        textContentType="telephoneNumber"
                                                        importantForAutofill="yes"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 2: Aadhaar & District */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label={HINDI_TEXT.aadhaarNumber} icon={(c) => <IdCardIcon size={iconSize} color={c} />} required error={errors.aadhaar}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="12 अंकों का आधार नंबर"
                                                        required={false}
                                                        value={formData.aadhaar}
                                                        onChangeText={handleAadhaarChange}
                                                        onBlur={checkPreRegistrationStatus}
                                                        keyboardType="number-pad"
                                                        maxLength={12}
                                                        autoComplete="off"
                                                        textContentType="none"
                                                        importantForAutofill="no"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="जिला" icon={(c) => <MapPinIcon size={iconSize} color={c} />} required error={errors.district}>
                                                {(icon) => (
                                                    <Dropdown
                                                        label=""
                                                        options={districts.length > 0 ? districts : [{ label: 'लोड हो रहा है...', value: '' }]}
                                                        value={formData.district}
                                                        onSelect={handleDistrictChange}
                                                        icon={icon}
                                                        placeholder="अपना जिला चुनें"
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 3: Tehsil & Block */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="तहसील" icon={(c) => <MapPinIcon size={iconSize} color={c} />} required error={errors.tehsil}>
                                                {(icon) => (
                                                    <Dropdown
                                                        label=""
                                                        options={loadingTehsils ? [{ label: 'लोड हो रहा है...', value: '' }] : tehsils}
                                                        value={formData.tehsil}
                                                        onSelect={handleTehsilChange}
                                                        disabled={!formData.district || loadingTehsils}
                                                        icon={icon}
                                                        placeholder="अपनी तहसील चुनें"
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="ब्लॉक" icon={(c) => <MapPinIcon size={iconSize} color={c} />} required error={errors.block}>
                                                {(icon) => (
                                                    <Dropdown
                                                        label=""
                                                        options={loadingBlocks ? [{ label: 'लोड हो रहा है...', value: '' }] : blocks}
                                                        value={formData.block}
                                                        onSelect={handleBlockChange}
                                                        disabled={!formData.tehsil || loadingBlocks}
                                                        icon={icon}
                                                        placeholder="अपना ब्लॉक चुनें"
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 4: Gram Panchayat & Retailer */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="ग्राम पंचायत" icon={(c) => <MapPinIcon size={iconSize} color={c} />} required error={errors.village_id}>
                                                {(icon) => (
                                                    <Dropdown
                                                        label=""
                                                        options={loadingPanchayats ? [{ label: 'लोड हो रहा है...', value: '' }] : gramPanchayats}
                                                        value={formData.village_id}
                                                        onSelect={(val) => updateField('village_id', String(val))}
                                                        disabled={!formData.block || loadingPanchayats}
                                                        icon={icon}
                                                        placeholder="ग्राम पंचायत चुनें"
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="रिटेलर / दुकान" icon={(c) => <UserIcon size={iconSize} color={c} />} required error={errors.retailer_id}>
                                                {(icon) => (
                                                    <Dropdown
                                                        label=""
                                                        options={loadingRetailers ? [{ label: 'लोड हो रहा है...', value: '' }] : retailers}
                                                        value={formData.retailer_id}
                                                        onSelect={(val) => {
                                                            const selected = retailers.find(r => r.value === val);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                retailer_id: String(val),
                                                                retailer_name: selected ? (selected as any).shop_name : ''
                                                            }));
                                                        }}
                                                        disabled={loadingRetailers || !formData.block}
                                                        icon={icon}
                                                        placeholder="अपना रिटेलर चुनें"
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 5: Khatauni & Registry ID */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="खतौनी / गाटा नं॰" icon={(c) => <DocumentIcon size={iconSize} color={c} />} required error={errors.khatauni_number}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="खतौनी / गाटा संख्या दर्ज करें"
                                                        required={false}
                                                        value={formData.khatauni_number}
                                                        onChangeText={(v) => updateField('khatauni_number', v)}
                                                        autoComplete="off"
                                                        textContentType="none"
                                                        importantForAutofill="no"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="रजिस्ट्री आईडी" icon={(c) => <IdCardIcon size={iconSize} color={c} />} required error={errors.registry_id}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="रजिस्ट्री आईडी दर्ज करें"
                                                        required={true}
                                                        value={formData.registry_id}
                                                        onChangeText={(v) => updateField('registry_id', v)}
                                                        onBlur={checkPreRegistrationStatus}
                                                        autoComplete="off"
                                                        textContentType="none"
                                                        importantForAutofill="no"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 5B: Krishak Panjika Code (Right after Registry ID) */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label="कृषक पंजिका कोड (10 अंक)" icon={(c) => <IdCardIcon size={iconSize} color={c} />} required error={errors.kisan_panjikaran_number}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="10 अंकों का कृषक पंजिका कोड दर्ज करें"
                                                        required={true}
                                                        value={formData.kisan_panjikaran_number}
                                                        onChangeText={(v) => updateField('kisan_panjikaran_number', v.replace(/[^0-9]/g, ''))}
                                                        keyboardType="numeric"
                                                        maxLength={10}
                                                        onBlur={checkPreRegistrationStatus}
                                                        autoComplete="off"
                                                        textContentType="none"
                                                        importantForAutofill="no"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>
                                    </View>

                                    {/* Row 6: Land Area & WhatsApp Updates */}
                                    <View style={isTabletMode ? styles.formRow : undefined}>
                                        <View style={isTabletMode ? styles.formCol : undefined}>
                                            <LabeledField label={HINDI_TEXT.landArea + ' (हेक्टेयर में)'} icon={(c) => <AreaIcon size={iconSize} color={c} />} required error={errors.land_area}>
                                                {(icon) => (
                                                    <Input
                                                        label=""
                                                        placeholder="कुल क्षेत्रफल (हेक्टेयर)"
                                                        required={false}
                                                        value={formData.land_area}
                                                        onChangeText={handleLandAreaChange}
                                                        keyboardType="decimal-pad"
                                                        maxLength={8}
                                                        autoComplete="off"
                                                        textContentType="none"
                                                        importantForAutofill="no"
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        {isTabletMode && (
                                            <View style={[styles.formCol, { justifyContent: 'flex-start', paddingTop: 22 }]}>
                                                <TouchableOpacity
                                                    style={[styles.whatsappRow, formData.wa_notification && styles.whatsappActive, { height: inputHeight, marginBottom: 10 }]}
                                                    onPress={() => updateField('wa_notification', !formData.wa_notification)}
                                                    activeOpacity={0.7}
                                                >
                                                    <WhatsAppIcon size={22} color="#25D366" />
                                                    <Text style={styles.whatsappLabel}>WhatsApp अपडेट पाएँ</Text>
                                                    <View style={[styles.switch, formData.wa_notification && styles.switchActive]}>
                                                        <View style={[styles.switchBall, formData.wa_notification && styles.switchBallActive]} />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.divider} />
                                    <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 15 }]}>दस्तावेज़ अपलोड</Text>

                                    <View style={[styles.uploadRow, isTabletMode && { gap: 14 }]}>
                                        <PremiumUploadCard
                                            label="फोटो"
                                            icon={(s, c) => <CameraIcon size={s} color={c} />}
                                            value={farmerPhoto}
                                            onPress={() => setPickerType('photo')}
                                            onView={() => setPreviewModal({
                                                visible: true,
                                                title: 'किसान की फोटो',
                                                files: [{ uri: farmerPhoto! }],
                                                index: 0,
                                                pickerKey: 'photo',
                                            })}
                                            onClear={() => setFarmerPhoto(null)}
                                            error={errors.farmerPhoto}
                                        />

                                        <PremiumUploadCard
                                            label="आधार कार्ड"
                                            icon={(s, c) => <IdCardIcon size={s} color={c} />}
                                            value={aadhaarFile}
                                            onPress={() => setPickerType('aadhaar')}
                                            onView={() => {
                                                if (aadhaarFile?.isPDF) {
                                                    openPdfFile(aadhaarFile.uri);
                                                } else {
                                                    setPreviewModal({
                                                        visible: true,
                                                        title: 'आधार कार्ड',
                                                        files: [aadhaarFile!],
                                                        index: 0,
                                                        pickerKey: 'aadhaar',
                                                    });
                                                }
                                            }}
                                            onClear={() => setAadhaarFile(null)}
                                            error={errors.aadhaarPhoto}
                                            isPDF={aadhaarFile?.isPDF}
                                        />
                                    </View>

                                    <View style={[styles.uploadRow, isTabletMode && { gap: 14 }]}>
                                        <PremiumUploadCard
                                            label="खतौनी कॉपी"
                                            icon={(s, c) => <DocumentIcon size={s} color={c} />}
                                            value={khatauniFiles.length > 0 ? khatauniFiles[0] : null}
                                            fileCount={khatauniFiles.length}
                                            onPress={() => setPickerType('khatauni')}
                                            onView={() => {
                                                if (khatauniFiles.length === 1 && khatauniFiles[0].isPDF) {
                                                    openPdfFile(khatauniFiles[0].uri);
                                                } else {
                                                    setPreviewModal({
                                                        visible: true,
                                                        title: 'खतौनी कॉपी',
                                                        files: khatauniFiles,
                                                        index: 0,
                                                        pickerKey: 'khatauni',
                                                    });
                                                }
                                            }}
                                            error={errors.khatauniPhoto}
                                            isPDF={khatauniFiles.length > 0 && khatauniFiles[0].isPDF}
                                            onClear={() => setKhatauniFiles([])}
                                        />

                                        <PremiumUploadCard
                                            label="पंजीकरण पर्ची"
                                            icon={(s, c) => <MaterialCommunityIcons name="receipt-text-outline" size={s} color={c} />}
                                            value={kisanPanjikaranFiles.length > 0 ? kisanPanjikaranFiles[0] : null}
                                            fileCount={kisanPanjikaranFiles.length}
                                            onPress={() => setPickerType('kisan_panjikaran')}
                                            onView={() => {
                                                if (kisanPanjikaranFiles.length === 1 && kisanPanjikaranFiles[0].isPDF) {
                                                    openPdfFile(kisanPanjikaranFiles[0].uri);
                                                } else {
                                                    setPreviewModal({
                                                        visible: true,
                                                        title: 'किसान पंजीकरण पर्ची',
                                                        files: kisanPanjikaranFiles,
                                                        index: 0,
                                                        pickerKey: 'kisan_panjikaran',
                                                    });
                                                }
                                            }}
                                            error={errors.kisanPanjikaranPhoto}
                                            isPDF={kisanPanjikaranFiles.length > 0 && kisanPanjikaranFiles[0].isPDF}
                                            onClear={() => setKisanPanjikaranFiles([])}
                                        />
                                    </View>

                                    {!isTabletMode && (
                                        <>
                                            <View style={{ height: 10 }} />
                                            <TouchableOpacity
                                                style={[styles.whatsappRow, formData.wa_notification && styles.whatsappActive]}
                                                onPress={() => updateField('wa_notification', !formData.wa_notification)}
                                                activeOpacity={0.7}
                                            >
                                                <WhatsAppIcon size={22} color="#25D366" />
                                                <Text style={styles.whatsappLabel}>WhatsApp अपडेट पाएँ</Text>
                                                <View style={[styles.switch, formData.wa_notification && styles.switchActive]}>
                                                    <View style={[styles.switchBall, formData.wa_notification && styles.switchBallActive]} />
                                                </View>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <View style={styles.securityBadge}>
                                        <MaterialCommunityIcons name="shield-check" size={12} color="#616161" />
                                        <Text style={styles.securityText}>आपका डेटा सुरक्षित एवं एन्क्रिप्टेड है</Text>
                                    </View>

                                    <View style={{ marginTop: 20 }}>
                                        <PremiumButton
                                            title="पंजीकरण करें"
                                            onPress={handleRegister}
                                            loading={loading}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                    </KeyboardAvoidingView>
                </SafeAreaView>
            </ParticleBackground>

            <ImageSourceSelector
                visible={!!pickerType}
                showPDF={pickerType === 'aadhaar' || pickerType === 'khatauni' || pickerType === 'kisan_panjikaran'}
                onSelect={handleImageSelect}
                onClose={() => setPickerType(null)}
            />

            <LocalDocumentViewerModal
                visible={previewModal.visible}
                title={previewModal.title}
                files={previewModal.files}
                initialIndex={previewModal.index}
                onClose={() => setPreviewModal(prev => ({ ...prev, visible: false }))}
                onReplace={previewModal.pickerKey ? () => setPickerType(previewModal.pickerKey!) : undefined}
            />

            {/* Registration OTP Modal */}
            <Modal
                visible={showOtpModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!otpSubmitting) setShowOtpModal(false);
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.otpModalOverlay}
                >
                    <View style={styles.otpModalContainer}>
                        <View style={styles.otpHeaderRow}>
                            <View style={styles.otpIconBadge}>
                                <MaterialCommunityIcons name="shield-check" size={28} color={MUSTARD_DARK} />
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!otpSubmitting) setShowOtpModal(false);
                                }}
                                style={styles.otpCloseBtn}
                                disabled={otpSubmitting}
                            >
                                <MaterialCommunityIcons name="close" size={22} color="#757575" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.otpTitle} maxFontSizeMultiplier={1.3}>मोबाइल नंबर सत्यापन</Text>
                        <Text style={styles.otpSubtitle} maxFontSizeMultiplier={1.3}>
                            पंजीकरण पूरा करने हेतु आपके मोबाइल नंबर <Text style={styles.otpMobileHighlight}>+91 {formData.mobile}</Text> पर 6-अंकों का OTP भेजा गया है।
                        </Text>

                        <View style={{ marginVertical: 12 }}>
                            <OTPInput
                                value={otp}
                                onChange={(value) => {
                                    setOtp(value);
                                    if (otpError) setOtpError('');
                                }}
                                error={otpError}
                            />
                        </View>

                        <View style={styles.otpTimerRow}>
                            {resendTimer > 0 ? (
                                <Text style={styles.otpTimerText} maxFontSizeMultiplier={1.3}>
                                    पुनः OTP भेजें ({resendTimer}s)
                                </Text>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleResendOtp}
                                    disabled={otpSubmitting}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.otpResendBtnText} maxFontSizeMultiplier={1.3}>पुनः OTP भेजें</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.otpActions}>
                            <TouchableOpacity
                                style={styles.otpCancelBtn}
                                onPress={() => setShowOtpModal(false)}
                                disabled={otpSubmitting}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.otpCancelBtnText} maxFontSizeMultiplier={1.3}>रद्द करें</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.otpSubmitBtn, otpSubmitting && styles.buttonDisabled]}
                                onPress={handleVerifyAndSubmit}
                                disabled={otpSubmitting}
                                activeOpacity={0.8}
                            >
                                {otpSubmitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text
                                        style={styles.otpSubmitBtnText}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.8}
                                        maxFontSizeMultiplier={1.3}
                                    >
                                        सत्यापित एवं जमा करें
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <ModernAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    if (alertConfig.onClose) alertConfig.onClose();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: verticalScale(60),
        marginTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight || 24) + 10,
        borderRadius: 20,
        marginHorizontal: 8,
        overflow: 'visible',
        elevation: 10,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: moderateScale(0), height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        height: '100%',
        width: '100%',
    },
    headerBack: {
        width: moderateScale(44),
        height: verticalScale(44),
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: moderateScale(25),
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        flex: 1,
        letterSpacing: 0.5,
        paddingHorizontal: 0,
    },
    logoContainer: {
        width: moderateScale(80),
        height: verticalScale(90),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: -10,
    },
    headerLogo: {
        width: moderateScale(55),
        height: verticalScale(60),
        resizeMode: 'contain',
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 40 : 100, // Generous padding for Android nav bar
        paddingHorizontal: 10,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        borderRadius: 24,
        paddingVertical: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        alignSelf: 'center',
        width: '94%',
        maxWidth: 450,
    },
    narrowContent: {
        paddingHorizontal: 22,
    },
    formRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    formCol: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: isTablet ? 22 : moderateScale(19),
        fontWeight: '800',
        color: MUSTARD_DARK,
        marginBottom: 16,
        textAlign: 'center',
    },
    fieldWrapper: {
        marginBottom: 10,
    },
    label: {
        fontSize: isTablet ? 14 : moderateScale(12),
        color: '#424242',
        marginBottom: 4,
        fontWeight: '700',
        marginLeft: 2,
    },
    inputOverrides: {
        marginBottom: 0,
    },
    errorText: {
        color: '#D32F2F',
        fontSize: isTablet ? 13 : moderateScale(11),
        marginTop: 2,
        marginLeft: 4,
        fontWeight: '600',
    },
    divider: {
        height: verticalScale(1),
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginVertical: 14,
    },
    uploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 12,
    },
    uploadCardWrapper: {
        flex: 1,
    },
    uploadCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 6,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 140,
        justifyContent: 'center',
    },
    uploadCardSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    uploadCardError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    emptyUploadBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    uploadedContainer: {
        width: '100%',
    },
    previewImageContainer: {
        width: '100%',
        height: 90,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        position: 'relative',
    },
    cardImagePreview: {
        width: '100%',
        height: '100%',
    },
    previewOverlayPill: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    previewOverlayText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    pdfPreviewBox: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    pdfFileName: {
        fontSize: 10,
        color: '#991B1B',
        fontWeight: '700',
        marginTop: 2,
        maxWidth: '90%',
    },
    viewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 3,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    viewBadgeText: {
        fontSize: 10,
        color: '#0284C7',
        fontWeight: '700',
    },
    multiFileBadge: {
        position: 'absolute',
        top: 5,
        left: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#0F766E',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        elevation: 2,
    },
    multiFileBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    checkBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        elevation: 2,
    },
    cardInfoRow: {
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 3,
    },
    cardActionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        paddingTop: 2,
    },
    actionBtnSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnSmallDanger: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    actionBtnText: {
        fontSize: 10,
        fontWeight: '700',
    },
    uploadCtaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
    },
    uploadCtaText: {
        fontSize: 11,
        fontWeight: '700',
        color: MUSTARD_DARK,
    },
    uploadCardIconBG: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    uploadCardLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
    },
    // Viewer Modal Styles
    viewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        justifyContent: 'space-between',
    },
    viewerHeaderSafeArea: {
        backgroundColor: 'transparent',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    viewerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    viewerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 2,
    },
    viewerCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },
    viewerImage: {
        width: SCREEN_WIDTH - 24,
        height: SCREEN_HEIGHT * 0.65,
    },
    viewerPdfCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        maxWidth: 320,
        width: '90%',
    },
    viewerPdfTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 12,
        textAlign: 'center',
    },
    viewerPdfDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 19,
    },
    openPdfPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 16,
        width: '100%',
    },
    openPdfPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    viewerFooterSafeArea: {
        backgroundColor: 'transparent',
        paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    },
    viewerFooter: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    paginationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pageNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        gap: 4,
    },
    pageNavBtnDisabled: {
        opacity: 0.4,
    },
    pageNavText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        width: 18,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    viewerActionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    viewerSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    viewerSecondaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    viewerPrimaryBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: MUSTARD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerPrimaryBtnText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '800',
    },
    whatsappRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        height: verticalScale(52),
    },
    whatsappActive: {
        borderColor: '#25D366',
        backgroundColor: '#F0FBF2',
    },
    whatsappLabel: {
        flex: 1,
        fontSize: moderateScale(13),
        color: '#424242',
        marginLeft: 10,
        fontWeight: '700',
    },
    switch: {
        width: moderateScale(40),
        height: verticalScale(20),
        borderRadius: 10,
        backgroundColor: '#CCC',
        padding: 2,
        justifyContent: 'center',
    },
    switchActive: {
        backgroundColor: '#25D366',
    },
    switchBall: {
        width: moderateScale(16),
        height: verticalScale(16),
        borderRadius: 8,
        backgroundColor: '#FFF',
    },
    switchBallActive: {
        transform: [{ translateX: 20 }],
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingVertical: 8,
        borderRadius: 10,
    },
    securityText: {
        fontSize: moderateScale(11),
        color: '#757575',
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 50,
        backgroundColor: 'transparent',
    },
    premiumButton: {
        backgroundColor: MUSTARD,
        height: verticalScale(54),
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: MUSTARD,
        shadowOffset: { width: moderateScale(0), height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    buttonDisabled: {
        backgroundColor: '#BDBDBD',
        elevation: 0,
        shadowOpacity: 0,
    },
    premiumButtonText: {
        color: '#FFF',
        fontSize: moderateScale(18),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 24,
        width: '90%',
        maxWidth: 420,
    },
    pickerTitle: {
        fontSize: moderateScale(18),
        fontWeight: '800',
        color: '#212121',
        marginBottom: 20,
        textAlign: 'center',
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    pickerOption: {
        alignItems: 'center',
        gap: 8,
    },
    pickerIconWrap: {
        width: moderateScale(60),
        height: verticalScale(60),
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    pickerText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#424242',
    },
    otpModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    otpModalContainer: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: SPACING.md,
        width: '92%',
        maxWidth: 380,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    otpHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    otpIconBadge: {
        width: moderateScale(42),
        height: verticalScale(42),
        borderRadius: 21,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpCloseBtn: {
        padding: 6,
    },
    otpTitle: {
        fontSize: moderateScale(18),
        fontWeight: '800',
        color: '#212121',
        marginBottom: 6,
    },
    otpSubtitle: {
        fontSize: moderateScale(13),
        color: '#616161',
        lineHeight: moderateScale(19),
    },
    otpMobileHighlight: {
        fontWeight: '700',
        color: '#212121',
    },
    otpTimerRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    otpTimerText: {
        fontSize: moderateScale(13),
        color: '#9E9E9E',
        fontWeight: '600',
    },
    otpResendBtnText: {
        fontSize: moderateScale(13),
        color: MUSTARD_DARK,
        fontWeight: '700',
    },
    otpActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    otpCancelBtn: {
        flex: 1,
        minHeight: verticalScale(46),
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpCancelBtnText: {
        fontSize: moderateScale(13.5),
        fontWeight: '700',
        color: '#616161',
    },
    otpSubmitBtn: {
        flex: 2,
        minHeight: verticalScale(46),
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: MUSTARD_DARK,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: MUSTARD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    otpSubmitBtnText: {
        fontSize: moderateScale(13.5),
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
});
