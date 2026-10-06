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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input, Dropdown, WhatsAppIcon } from '../../components';
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
} from '../../constants';
import { API_ENDPOINTS } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import { pickFarmerPhoto, pickAadhaarPhoto, pickDocument, compressImage, pickMultipleDocuments, pickMultipleKhatauniPhotos } from '../../utils/imagePickerUtils';
import { ModernAlert } from '../../components/ModernAlert';
import { CameraIcon, CheckCircleIcon } from '../../components/PhotoUploadIcons';
import { scale, verticalScale, moderateScale, isTablet, useResponsive } from '../../utils/responsive';


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

// Premium Upload Card Component
const PremiumUploadCard = ({
    label,
    icon,
    value,
    onPress,
    error,
    isPDF = false,
    onClear,
}: {
    label: string,
    icon: (size: number, color: string) => React.ReactNode,
    value: any,
    onPress: () => void,
    error?: string,
    isPDF?: boolean,
    fileName?: string,
    onClear?: () => void
}) => (
    <View style={styles.uploadCardWrapper}>
        <TouchableOpacity
            style={[styles.uploadCard, value && styles.uploadCardSelected, error && styles.uploadCardError]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.uploadCardInner}>
                {value && !isPDF ? (
                    <Image 
                        source={{ uri: typeof value === 'string' ? value : value.uri }} 
                        style={styles.uploadCardFullPreview} 
                    />
                ) : (
                    <View style={[styles.uploadCardIconBG, value && styles.uploadCardIconBGSelected]}>
                        {value && isPDF ? (
                            <MaterialCommunityIcons name="file-pdf-box" size={28} color="#D32F2F" />
                        ) : (
                            icon(26, error ? '#D32F2F' : MUSTARD)
                        )}
                    </View>
                )}
                
                <View style={styles.uploadCardContent}>
                    <Text style={styles.uploadCardLabel} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.uploadCardStatus, value && styles.uploadCardStatusSelected]}>
                        {value ? "चुन लिया गया" : "अपलोड करें"}
                    </Text>
                </View>

                {value && (
                    <View style={styles.checkmarkBadge}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
        {onClear && value && (
            <TouchableOpacity onPress={onClear} style={{ marginTop: 8, padding: 4 }}>
                <Text style={{ textAlign: 'center', color: '#D32F2F', fontSize: 13, fontWeight: 'bold' }}>हटाएं</Text>
            </TouchableOpacity>
        )}
        {error ? <Text style={styles.errorText} numberOfLines={1}>{error}</Text> : null}
    </View>
);

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
        khatauni_number: '',
        land_area: '',
        wa_notification: false,
    });

    const [farmerPhoto, setFarmerPhoto] = useState<string | null>(null);
    const [aadhaarFile, setAadhaarFile] = useState<{ uri: string, name: string, isPDF: boolean } | null>(null);
    const [khatauniFiles, setKhatauniFiles] = useState<{ uri: string, name: string, isPDF: boolean }[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // UI Local States
    const [pickerType, setPickerType] = useState<'photo' | 'aadhaar' | 'khatauni' | null>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean, title: string, message: string, type: 'success' | 'error' | 'warning' | 'info',
        buttons?: any[], onClose?: () => void
    }>({ visible: false, title: '', message: '', type: 'info' });

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
        if (/[^0-9]/.test(text)) {
            setErrors((prev) => ({ ...prev, ['aadhaar']: 'आधार नंबर में केवल अंक होने चाहिए' }));
            setFormData((prev) => ({ ...prev, aadhaar: text.replace(/[^0-9]/g, '') }));
        } else {
            setFormData((prev) => ({ ...prev, aadhaar: text }));
            if (errors['aadhaar']) setErrors((prev) => ({ ...prev, ['aadhaar']: '' }));
        }
    };

    const handleLandAreaChange = (text: string) => {
        if (/[^0-9.]/.test(text)) {
            setErrors((prev) => ({ ...prev, ['land_area']: 'केवल अंक और दशमलव की अनुमति है' }));
            setFormData((prev) => ({ ...prev, land_area: text.replace(/[^0-9.]/g, '') }));
        } else {
            setFormData((prev) => ({ ...prev, land_area: text }));
            if (errors['land_area']) setErrors((prev) => ({ ...prev, ['land_area']: '' }));
        }
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
        if (!formData.land_area.trim()) newErrors['land_area'] = 'क्षेत्रफल आवश्यक है';
        if (!farmerPhoto) newErrors['farmerPhoto'] = 'फोटो आवश्यक है';
        if (!aadhaarFile) newErrors['aadhaarPhoto'] = 'आधार फोटो आवश्यक है';
        if (khatauniFiles.length === 0) newErrors['khatauniPhoto'] = 'खतौनी / गाटा फोटो आवश्यक है';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            showAlert('त्रुटि', 'कृपया सभी आवश्यक फ़ील्ड भरें।', 'error');
            return;
        }

        setLoading(true);

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
                land_area: 'land_area',
            };

            Object.entries(fieldMap).forEach(([formKey, apiKey]) => {
                const value = (formData as any)[formKey];
                formDataToSubmit.append(apiKey, value ? String(value) : '');
            });

            formDataToSubmit.append('wa_notification', formData.wa_notification ? '1' : '0');

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
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = await response.json();
            if (result.status === 'success' || result.success) {
                showAlert('सफल', '24-48 घंटे में सत्यापन होगा', 'success', onBack);
            } else {
                showAlert('त्रुटि', result.message || 'पंजीकरण विफल रहा।', 'error');
            }
        } catch (error) {
            showAlert('त्रुटि', 'सर्वर से संपर्क करने में समस्या आई।', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string, type: any, onClose?: () => void) => {
        setAlertConfig({ visible: true, title, message, type, onClose });
    };

    return (
        <View style={styles.container}>
            <Image
                source={require('../../../assets/Farmer in golden wheat field.png')}
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
                                    <Image source={require('../../../assets/icon.png')} style={styles.headerLogo} />
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
                                                        keyboardType="phone-pad"
                                                        maxLength={10}
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
                                                        keyboardType="number-pad"
                                                        maxLength={12}
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
                                                        icon={icon}
                                                        containerStyle={styles.inputOverrides}
                                                        activeColor={MUSTARD}
                                                        height={inputHeight}
                                                        fontSize={inputFontSize}
                                                    />
                                                )}
                                            </LabeledField>
                                        </View>

                                        <View style={isTabletMode ? [styles.formCol, { justifyContent: 'flex-start', paddingTop: 22 }] : undefined}>
                                            <TouchableOpacity
                                                style={[styles.whatsappRow, formData.wa_notification && styles.whatsappActive, isTabletMode && { height: inputHeight, marginBottom: 10 }]}
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
                                    </View>

                                    <View style={styles.divider} />
                                    <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 15 }]}>दस्तावेज़ अपलोड</Text>

                                    <View style={[styles.uploadRow, isTabletMode && { gap: 14 }]}>
                                        <PremiumUploadCard
                                            label="फोटो"
                                            icon={(s, c) => <CameraIcon size={s} color={c} />}
                                            value={farmerPhoto}
                                            onPress={() => setPickerType('photo')}
                                            error={errors.farmerPhoto}
                                        />

                                        <PremiumUploadCard
                                            label="आधार"
                                            icon={(s, c) => <IdCardIcon size={s} color={c} />}
                                            value={aadhaarFile}
                                            onPress={() => setPickerType('aadhaar')}
                                            error={errors.aadhaarPhoto}
                                            isPDF={aadhaarFile?.isPDF}
                                        />

                                        <View style={{ flex: 1 }}>
                                            <PremiumUploadCard
                                                label="खतौनी"
                                                icon={(s, c) => <DocumentIcon size={s} color={c} />}
                                                value={khatauniFiles.length > 0 ? khatauniFiles[0] : null}
                                                onPress={() => setPickerType('khatauni')}
                                                error={errors.khatauniPhoto}
                                                isPDF={khatauniFiles.length > 0 && khatauniFiles[0].isPDF}
                                                onClear={() => setKhatauniFiles([])}
                                            />
                                            {khatauniFiles.length > 0 && (
                                                <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#4CAF50', fontWeight: 'bold' }}>
                                                    {khatauniFiles.length} दस्तावेज़ चयनित
                                                </Text>
                                            )}
                                        </View>
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
                showPDF={pickerType === 'aadhaar' || pickerType === 'khatauni'}
                onSelect={handleImageSelect}
                onClose={() => setPickerType(null)}
            />

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
        padding: 4,
        borderWidth: 1.5,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        minHeight: isTablet ? 120 : 110,
    },
    uploadCardSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#F1F8E9',
    },
    uploadCardError: {
        borderColor: '#FFCDD2',
        backgroundColor: '#FFEBEE',
    },
    uploadCardInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadCardIconBG: {
        width: moderateScale(46),
        height: verticalScale(46),
        borderRadius: 12,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    uploadCardIconBGSelected: {
        backgroundColor: '#E8F5E9',
    },
    uploadCardContent: {
        alignItems: 'center',
    },
    uploadCardLabel: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#212121',
        marginBottom: 1,
    },
    uploadCardStatus: {
        fontSize: moderateScale(11),
        color: '#757575',
        fontWeight: '500',
    },
    uploadCardStatusSelected: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    uploadCardFullPreview: {
        width: moderateScale(46),
        height: verticalScale(46),
        borderRadius: 12,
        marginBottom: 6,
        backgroundColor: '#FAFAFA',
    },
    checkmarkBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: moderateScale(22),
        height: verticalScale(22),
        borderRadius: 11,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
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
});
