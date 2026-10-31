import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Image,
    SafeAreaView,
    Switch,
    Linking,
    Dimensions,
    TextInput,
    ActivityIndicator,
    Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, ModernAlert, DocumentViewerModal } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants';
import { LogOutIcon } from '../../components/FormIcons';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import ParticleBackground from '../../components/ParticleBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressImage, ensureCameraPermission } from '../../utils/imagePickerUtils';
import CustomImageCropper from '../../components/CustomImageCropper';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { useFarmerData } from '../../contexts/FarmerDataContext';

const { width } = Dimensions.get('window');

interface FarmerProfileScreenProps {
    farmerName: string;
    farmerId: string;
    onLogout?: () => void;
    onBack?: () => void;
    onNameChange?: (newName: string) => void;
    onPhotoChange?: (newPhotoUrl: string) => void;
}

export default function FarmerProfileScreen({ farmerName, farmerId, onLogout, onBack, onNameChange, onPhotoChange }: FarmerProfileScreenProps) {
    const { prefetchedData } = useFarmerData();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingProfile, setFetchingProfile] = useState(true);

    // Modern Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

    // Document Viewer Modal State
    const [docViewerVisible, setDocViewerVisible] = useState(false);
    const [docViewerTitle, setDocViewerTitle] = useState('');
    const [docViewerDocs, setDocViewerDocs] = useState<string | string[] | null>(null);

    // Profile data from API
    const [profile, setProfile] = useState({
        name: farmerName || '',
        mobile: '',
        aadhaar: '',
        village: '',
        village_en: '',
        block: '',
        block_en: '',
        tehsil: '',
        tehsil_en: '',
        district: '',
        district_en: '',
        khatauniNumber: '',
        landArea: (prefetchedData?.landArea !== undefined && prefetchedData?.landArea !== null) ? prefetchedData.landArea.toString() : '',
        registry_id: prefetchedData?.registry_id || '',
        kisan_panjikaran_number: prefetchedData?.kisan_panjikaran_number || '',
        profile_photo: null as string | null,
        aadhaar_photo: null as string | null,
        khatauni_photo: null as string | null,
        kisan_panjikaran_photo: null as string | null,
        selected_retailer_id: null as string | null,
        selected_retailer_name: null as string | null,
    });

    const [editedProfile, setEditedProfile] = useState(profile);
    const [cropperVisible, setCropperVisible] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    // Pending Kisan Card File (Image/PDF) for upload
    const [pendingKisanCard, setPendingKisanCard] = useState<{ uri: string; name: string; isPDF: boolean } | null>(null);
    const [pickerModalVisible, setPickerModalVisible] = useState(false);

    // Fetch profile data from API
    useEffect(() => {
        const fetchProfile = async () => {
            if (!farmerId || farmerId.trim() === '') {
                setFetchingProfile(false);
                return;
            }

            try {
                setFetchingProfile(true);
                const response = await apiFetch(API_ENDPOINTS.getFarmerProfile, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ farmer_id: farmerId }),
                });
                const result = await response.json();

                if (result.success && result.data) {
                    const data = result.data;
                    const parsedLand = (data.land_area !== undefined && data.land_area !== null && data.land_area !== '')
                        ? data.land_area.toString()
                        : (data.khasra_rukba ? data.khasra_rukba.toString() : (prefetchedData?.landArea !== undefined ? prefetchedData.landArea.toString() : ''));

                    const profileData = {
                        name: data.name || farmerName,
                        mobile: data.mobile || '',
                        aadhaar: data.aadhaar || '',
                        village: data.village || '',
                        village_en: data.village_en || '',
                        block: data.block || '',
                        block_en: data.block_en || '',
                        tehsil: data.tehsil || '',
                        tehsil_en: data.tehsil_en || '',
                        district: data.district || '',
                        district_en: data.district_en || '',
                        khatauniNumber: data.khatauni_number || data.khasra_number || '',
                        landArea: parsedLand,
                        registry_id: data.registry_id || prefetchedData?.registry_id || '',
                        kisan_panjikaran_number: data.kisan_panjikaran_number || data.kisan_code || prefetchedData?.kisan_panjikaran_number || '',
                        profile_photo: data.profile_photo || null,
                        aadhaar_photo: data.aadhaar_photo || null,
                        khatauni_photo: data.khatauni_photo || null,
                        kisan_panjikaran_photo: data.kisan_panjikaran_photo || null,
                        selected_retailer_id: data.selected_retailer_id || null,
                        selected_retailer_name: data.selected_retailer_name || null,
                    };
                    setProfile(profileData);
                    setEditedProfile(profileData);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setFetchingProfile(false);
            }
        };

        fetchProfile();
    }, [farmerId, farmerName]);

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing
            setEditedProfile(profile);
            setPendingKisanCard(null);
            setIsEditing(false);
        } else {
            // Start editing
            setEditedProfile(profile);
            setPendingKisanCard(null);
            setIsEditing(true);
        }
    };

    const handlePickCamera = async () => {
        setPickerModalVisible(false);
        const hasPerm = await ensureCameraPermission();
        if (!hasPerm) return;
        try {
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                const compressed = await compressImage(result.assets[0].uri);
                setPendingKisanCard({
                    uri: compressed,
                    name: `kisan_slip_${Date.now()}.jpg`,
                    isPDF: false,
                });
            }
        } catch (e) {
            console.warn('Camera launch error:', e);
        }
    };

    const handlePickGallery = async () => {
        setPickerModalVisible(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                const compressed = await compressImage(result.assets[0].uri);
                setPendingKisanCard({
                    uri: compressed,
                    name: `kisan_slip_${Date.now()}.jpg`,
                    isPDF: false,
                });
            }
        } catch (e) {
            console.warn('Gallery launch error:', e);
        }
    };

    const handlePickPdf = async () => {
        setPickerModalVisible(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                setPendingKisanCard({
                    uri: result.assets[0].uri,
                    name: result.assets[0].name || `kisan_slip_${Date.now()}.pdf`,
                    isPDF: true,
                });
            }
        } catch (e) {
            console.warn('PDF pick error:', e);
        }
    };

    const handleSave = async () => {
        if (editedProfile.kisan_panjikaran_number && editedProfile.kisan_panjikaran_number.trim().length !== 10) {
            setAlertTitle('त्रुटि');
            setAlertMessage('कृषक पंजिका कोड ठीक 10 अंकों का होना चाहिए।');
            setAlertType('error');
            setAlertVisible(true);
            return;
        }

        setLoading(true);
        try {
            let data: any;
            if (pendingKisanCard) {
                const formData = new FormData();
                formData.append('farmer_id', farmerId);
                if (editedProfile.name) formData.append('name', editedProfile.name);
                if (editedProfile.kisan_panjikaran_number) {
                    formData.append('kisan_panjikaran_number', editedProfile.kisan_panjikaran_number);
                }
                if (editedProfile.registry_id) {
                    formData.append('registry_id', editedProfile.registry_id);
                }
                formData.append('kisan_panjikaran_photo', {
                    uri: pendingKisanCard.uri,
                    name: pendingKisanCard.name,
                    type: pendingKisanCard.isPDF ? 'application/pdf' : 'image/jpeg',
                } as any);

                const response = await fetch(API_ENDPOINTS.updateFarmerProfile, {
                    method: 'POST',
                    body: formData,
                });
                data = await response.json();
            } else {
                const response = await apiFetch(API_ENDPOINTS.updateFarmerProfile, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        farmer_id: farmerId,
                        name: editedProfile.name,
                        kisan_panjikaran_number: editedProfile.kisan_panjikaran_number,
                        registry_id: editedProfile.registry_id,
                    }),
                });
                data = await response.json();
            }

            if (data.success) {
                const updatedProfile = { ...editedProfile };
                if (data.data?.kisan_panjikaran_photo) {
                    updatedProfile.kisan_panjikaran_photo = data.data.kisan_panjikaran_photo;
                }
                setProfile(updatedProfile);
                setEditedProfile(updatedProfile);
                setPendingKisanCard(null);
                setIsEditing(false);
                // Propagate name change to parent
                if (editedProfile.name && editedProfile.name !== profile.name) {
                    onNameChange?.(editedProfile.name);
                }

                setAlertTitle('सफल');
                setAlertMessage('प्रोफाइल सफलतापूर्वक अपडेट हो गई!');
                setAlertType('success');
                setAlertVisible(true);

                // Update AsyncStorage for persistence across reloads
                if (farmerId && editedProfile.kisan_panjikaran_number) {
                    AsyncStorage.setItem(`kisan_code_submitted_${farmerId}`, 'true').catch(() => {});
                }
                AsyncStorage.getItem('user_session').then(session => {
                    if (session) {
                        const userData = JSON.parse(session);
                        userData.name = editedProfile.name;
                        userData.kisan_panjikaran_number = editedProfile.kisan_panjikaran_number;
                        AsyncStorage.setItem('user_session', JSON.stringify(userData));
                    }
                });
            } else {
                setAlertTitle('त्रुटि');
                setAlertMessage(data.message || 'अपडेट नहीं हो सका।');
                setAlertType('error');
                setAlertVisible(true);
            }
        } catch (error) {
            setAlertTitle('त्रुटि');
            setAlertMessage('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
            setAlertType('error');
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        let val = value;
        if (field === 'kisan_panjikaran_number') {
            val = value.replace(/[^0-9]/g, '').slice(0, 10);
        }
        setEditedProfile(prev => ({ ...prev, [field]: val }));
    };

    const handlePhotoChange = async () => {
        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, // Disabling native crop
            quality: 0.9,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        setImageToCrop(asset.uri);
        setCropperVisible(true);
    };

    const handleCropDone = async (croppedUri: string) => {
        console.log('Update photo - Crop success:', croppedUri);
        setCropperVisible(false);
        setLoading(true);

        try {
            const compressedUri = await compressImage(croppedUri);
            console.log('Update photo - Compression success:', compressedUri);

            // Use XMLHttpRequest — more reliable than fetch for file uploads in React Native
            const uploadResult = await new Promise<{ success: boolean; photo_url?: string; message?: string }>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', API_ENDPOINTS.uploadFarmerPhoto);

                xhr.onload = () => {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid server response: ' + xhr.responseText));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Request timed out'));
                xhr.timeout = 30000;

                const formData = new FormData();
                formData.append('farmer_id', farmerId);
                formData.append('photo', {
                    uri: compressedUri,
                    name: 'photo_' + farmerId + '.jpg',
                    type: 'image/jpeg',
                } as any);

                xhr.send(formData);
            });

            if (uploadResult.success && uploadResult.photo_url) {
                // Update local profile photo state
                setProfile(prev => ({ ...prev, profile_photo: uploadResult.photo_url! }));
                setEditedProfile(prev => ({ ...prev, profile_photo: uploadResult.photo_url! }));

                // Notify parent (App.tsx) so dashboard hero avatar updates immediately
                onPhotoChange?.(uploadResult.photo_url!);

                setAlertTitle('सफल');
                setAlertMessage('फोटो सफलतापूर्वक अपडेट हो गई!');
                setAlertType('success');
                setAlertVisible(true);

                // Update AsyncStorage for persistence across reloads
                AsyncStorage.getItem('user_session').then(session => {
                    if (session) {
                        const userData = JSON.parse(session);
                        userData.profile_photo = uploadResult.photo_url;
                        AsyncStorage.setItem('user_session', JSON.stringify(userData));
                    }
                });
            } else {
                setAlertTitle('त्रुटि');
                setAlertMessage(uploadResult.message || 'फोटो अपलोड नहीं हो सकी।');
                setAlertType('error');
                setAlertVisible(true);
            }
        } catch (error: any) {
            setAlertTitle('त्रुटि');
            setAlertMessage('अपलोड विफल: ' + (error?.message || 'नेटवर्क त्रुटि'));
            setAlertType('error');
            setAlertVisible(true);
        } finally {
            setLoading(false);
            setImageToCrop(null);
        }
    };

    const renderField = (label: string, value: string, fieldKey: string, icon: string, editable: boolean = true) => {
        if (isEditing && editable) {
            const isNumeric = fieldKey === 'kisan_panjikaran_number';
            return (
                <View style={styles.fieldContainer}>
                    <TextInput
                        placeholder={label}
                        placeholderTextColor={COLORS.textSecondary}
                        value={editedProfile[fieldKey as keyof typeof editedProfile] || ''}
                        onChangeText={(text: string) => handleChange(fieldKey, text)}
                        style={styles.editInput}
                        keyboardType={isNumeric ? 'numeric' : 'default'}
                        maxLength={isNumeric ? 10 : undefined}
                    />
                </View>
            );
        }
        return (
            <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{icon} {label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
            </View>
        );
    };

    const insets = useSafeAreaInsets();

    return (
        <ParticleBackground>
            <SafeAreaView style={styles.container}>
                <ScrollView
                    contentContainerStyle={[
                        styles.contentContainer,
                        { paddingBottom: 80 + insets.bottom + SPACING.lg }
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                >
                    {fetchingProfile ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>प्रोफाइल लोड हो रहा है...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Profile Header - matches FarmerHero style */}
                            <View style={styles.headerContainer}>
                                {/* Gradient background with text */}
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.headerGradient}
                                >
                                    {/* Decorative background circles */}
                                    <View style={styles.headerPattern}>
                                        <View style={[styles.headerCircle, styles.headerCircle1]} />
                                        <View style={[styles.headerCircle, styles.headerCircle2]} />
                                        <View style={[styles.headerCircle, styles.headerCircle3]} />
                                    </View>

                                    {/* Back button */}
                                    {onBack && (
                                        <TouchableOpacity style={styles.headerBackButton} onPress={onBack}>
                                            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                                        </TouchableOpacity>
                                    )}

                                    {/* Text + emoji row */}
                                    <View style={styles.headerContentRow}>
                                        <View style={styles.headerTitleContainer}>
                                            <Text style={styles.namasteText}>नमस्ते 🙏</Text>
                                            <Text style={styles.headerNameLarge}>{profile.name ? profile.name.split(' ')[0] : (farmerName ? farmerName.split(' ')[0] : 'किसान')}</Text>
                                        </View>
                                        <Text style={styles.headerDecorEmoji}>🌾</Text>
                                    </View>
                                </LinearGradient>

                                {/* Avatar overlapping the gradient bottom — positioned absolutely */}
                                <View style={styles.avatarOverlapWrapper}>
                                    <View style={styles.avatarRing}>
                                        <Image
                                            source={profile.profile_photo && typeof profile.profile_photo === 'string' && profile.profile_photo.trim().length > 0
                                                ? {
                                                    uri: profile.profile_photo.startsWith('http')
                                                        ? profile.profile_photo
                                                        : `${API_BASE_URL}/${profile.profile_photo.startsWith('/') ? profile.profile_photo.substring(1) : profile.profile_photo}`
                                                }
                                                : { uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name || farmerName || 'Farmer') + '&background=7C3AED&color=fff&size=150' }}
                                            style={styles.avatarLarge}
                                            resizeMode="cover"
                                            onError={(e) => console.log('❌ Image Load Error:', e.nativeEvent.error, 'URL:', profile.profile_photo ? `${API_BASE_URL}/${profile.profile_photo}` : 'null')}
                                        />
                                        <TouchableOpacity
                                            style={styles.cameraCircle}
                                            onPress={handlePhotoChange}
                                        >
                                            <Ionicons name="camera" size={18} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Status + Edit below avatar */}
                                <View style={styles.belowAvatarSection}>
                                    <View style={styles.statusRow}>
                                        <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.success} />
                                        <Text style={styles.userStatusText}>पंजीकृत किसान</Text>
                                    </View>
                                    <TouchableOpacity style={styles.floatingEditButton} onPress={handleEditToggle}>
                                        <Feather name={isEditing ? "x" : "edit-3"} size={15} color={COLORS.primary} />
                                        <Text style={styles.floatingEditText}>{isEditing ? 'रद्द करें' : 'संपादित करें'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Personal Details Card */}
                            <View style={styles.cardContainer}>
                                <View style={styles.cardHeaderRow}>
                                    <Feather name="user" size={20} color={COLORS.primary} />
                                    <Text style={styles.cardTitleNew}>व्यक्तिगत विवरण</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    {isEditing ? (
                                        <>
                                            <View style={styles.detailRowVertical}>
                                                <Text style={styles.detailLabel}>नाम *</Text>
                                                {renderField('नाम', editedProfile.name, 'name', '', true)}
                                            </View>
                                            <View style={styles.divider} />
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <Feather name="phone" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>मोबाइल नंबर</Text>
                                                </View>
                                                <Text style={styles.detailValue}>{profile.mobile}</Text>
                                            </View>
                                            {!!profile.aadhaar && (
                                                <View style={styles.detailRow}>
                                                    <View style={styles.labelWithIcon}>
                                                        <MaterialCommunityIcons name="card-account-details-outline" size={14} color={COLORS.textSecondary} />
                                                        <Text style={styles.detailLabel}>आधार नंबर</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>
                                                        {profile.aadhaar.length === 12
                                                            ? `XXXX-XXXX-${profile.aadhaar.slice(-4)}`
                                                            : profile.aadhaar}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <MaterialCommunityIcons name="card-bulleted-outline" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>रजिस्ट्री आईडी</Text>
                                                </View>
                                                <Text style={[styles.detailValue, { fontWeight: '700' }]}>{profile.registry_id || 'उपलब्ध नहीं'}</Text>
                                            </View>
                                            {!profile.kisan_panjikaran_number ? (
                                                <View style={styles.detailRowVertical}>
                                                    <Text style={styles.detailLabel}>कृषक पंजिका कोड (10 अंक)</Text>
                                                    {renderField('कृषक पंजिका कोड दर्ज करें', editedProfile.kisan_panjikaran_number, 'kisan_panjikaran_number', '', true)}
                                                </View>
                                            ) : (
                                                <View style={styles.detailRow}>
                                                    <View style={styles.labelWithIcon}>
                                                        <MaterialCommunityIcons name="badge-account-outline" size={14} color={COLORS.textSecondary} />
                                                        <Text style={styles.detailLabel}>कृषक पंजिका कोड</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <MaterialCommunityIcons name="lock" size={13} color="#15803D" style={{ marginRight: 4 }} />
                                                        <Text style={[styles.detailValue, { fontWeight: '700', color: '#15803D' }]}>
                                                            {profile.kisan_panjikaran_number}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Kisan Panjikaran Slip Upload in Edit Mode */}
                                            <View style={styles.uploadSectionBox}>
                                                <View style={styles.uploadSectionHeader}>
                                                    <MaterialCommunityIcons name="file-certificate-outline" size={moderateScale(17)} color="#15803D" />
                                                    <Text style={styles.uploadSectionTitle}>किसान पंजीकरण पर्ची (दस्तावेज़ जोड़ें)</Text>
                                                </View>
                                                <Text style={styles.uploadSectionSubtitle}>
                                                    कृषि विभाग द्वारा जारी 10 अंकों के पंजीकरण की पर्ची (फोटो या PDF)
                                                </Text>

                                                {pendingKisanCard ? (
                                                    <View style={styles.uploadedFilePill}>
                                                        <MaterialCommunityIcons
                                                            name={pendingKisanCard.isPDF ? "file-pdf-box" : "file-image"}
                                                            size={moderateScale(22)}
                                                            color={pendingKisanCard.isPDF ? "#EF4444" : "#15803D"}
                                                        />
                                                        <View style={styles.uploadedFileTextGroup}>
                                                            <Text style={styles.uploadedFileName} numberOfLines={1}>
                                                                {pendingKisanCard.name}
                                                            </Text>
                                                            <Text style={styles.uploadedFileStatus}>अपलोड के लिए तैयार ✓ (सेव करें दबाएं)</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.removeFileBtn}
                                                            onPress={() => setPendingKisanCard(null)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Feather name="x" size={moderateScale(16)} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : profile.kisan_panjikaran_photo ? (
                                                    <View style={styles.existingDocNotice}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                                                            <MaterialCommunityIcons name="check-circle" size={16} color="#15803D" />
                                                            <Text style={styles.existingDocText}>पंजीकरण पर्ची पहले से अपलोड है</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.changeDocBtn}
                                                            onPress={() => setPickerModalVisible(true)}
                                                        >
                                                            <Text style={styles.changeDocText}>बदलें</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.uploadTriggerBtn}
                                                        onPress={() => setPickerModalVisible(true)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.uploadTriggerIconBg}>
                                                            <Feather name="upload-cloud" size={moderateScale(18)} color="#15803D" />
                                                        </View>
                                                        <View style={styles.uploadTriggerTextCol}>
                                                            <Text style={styles.uploadTriggerTitle}>पर्ची या रसीद अपलोड करें</Text>
                                                            <Text style={styles.uploadTriggerHint}>कैमरा, गैलरी या PDF फ़ाइल चुनें</Text>
                                                        </View>
                                                        <Feather name="plus-circle" size={moderateScale(18)} color="#15803D" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <Feather name="user" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>नाम</Text>
                                                </View>
                                                <Text style={styles.detailValue}>{profile.name}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <Feather name="phone" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>मोबाइल नंबर</Text>
                                                </View>
                                                <Text style={styles.detailValue}>{profile.mobile}</Text>
                                            </View>
                                            {!!profile.aadhaar && (
                                                <View style={styles.detailRow}>
                                                    <View style={styles.labelWithIcon}>
                                                        <MaterialCommunityIcons name="card-account-details-outline" size={14} color={COLORS.textSecondary} />
                                                        <Text style={styles.detailLabel}>आधार नंबर</Text>
                                                    </View>
                                                    <Text style={styles.detailValue}>
                                                        {profile.aadhaar.length === 12
                                                            ? `XXXX-XXXX-${profile.aadhaar.slice(-4)}`
                                                            : profile.aadhaar}
                                                    </Text>
                                                </View>
                                            )}
                                            {!!profile.aadhaar_photo && (
                                                <View style={styles.detailRow}>
                                                    <View style={styles.labelWithIcon}>
                                                        <MaterialCommunityIcons name="card-account-details-outline" size={14} color={COLORS.textSecondary} />
                                                        <Text style={styles.detailLabel}>आधार कार्ड प्रति</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.viewDocBadge, { backgroundColor: '#EFF6FF' }]}
                                                        onPress={() => {
                                                            setDocViewerTitle('आधार कार्ड (Aadhaar Card)');
                                                            setDocViewerDocs(profile.aadhaar_photo);
                                                            setDocViewerVisible(true);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Feather name="eye" size={moderateScale(12)} color="#2563EB" />
                                                        <Text style={[styles.viewDocText, { color: '#2563EB' }]}>देखें</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <MaterialCommunityIcons name="card-bulleted-outline" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>रजिस्ट्री आईडी</Text>
                                                </View>
                                                <Text style={[styles.detailValue, { fontWeight: '700' }]}>{profile.registry_id || 'उपलब्ध नहीं'}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <View style={styles.labelWithIcon}>
                                                    <MaterialCommunityIcons name="badge-account-outline" size={14} color={COLORS.textSecondary} />
                                                    <Text style={styles.detailLabel}>कृषक पंजिका कोड</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {profile.kisan_panjikaran_number ? (
                                                        <MaterialCommunityIcons name="lock" size={13} color="#15803D" style={{ marginRight: 4 }} />
                                                    ) : null}
                                                    <Text style={[styles.detailValue, { fontWeight: '700', color: profile.kisan_panjikaran_number ? '#15803D' : '#D97706' }]}>
                                                        {profile.kisan_panjikaran_number || 'उपलब्ध नहीं (अपडेट करें)'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Land & Agriculture Details Card */}
                            <View style={styles.cardContainer}>
                                <View style={styles.cardHeaderRow}>
                                    <MaterialCommunityIcons name="sprout" size={moderateScale(18)} color="#15803D" />
                                    <Text style={[styles.cardTitleNew, { color: '#15803D' }]}>कृषि भूमि विवरण (Land Details)</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    {/* Row 1: Total Land Area */}
                                    <View style={styles.landDetailRow}>
                                        <View style={styles.landRowLeft}>
                                            <View style={styles.smallIconBg}>
                                                <MaterialCommunityIcons name="texture-box" size={moderateScale(16)} color="#0D9488" />
                                            </View>
                                            <View style={styles.landRowTextGroup}>
                                                <Text style={styles.landDetailLabel}>कुल जमीन (रकबा)</Text>
                                                <Text style={styles.landDetailSub}>राजस्व अभिलेख अनुसार</Text>
                                            </View>
                                        </View>
                                        <View style={styles.landRowRight}>
                                            <Text style={styles.landAreaValue}>
                                                {profile.landArea && parseFloat(profile.landArea) > 0
                                                    ? `${profile.landArea} हेक्टेयर`
                                                    : (profile.landArea ? `${profile.landArea} हेक्टेयर` : '0.00 हेक्टेयर')}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Row 2: Khatauni Number */}
                                    <View style={styles.landDetailRow}>
                                        <View style={styles.landRowLeft}>
                                            <View style={[styles.smallIconBg, { backgroundColor: '#FEF3C7' }]}>
                                                <MaterialCommunityIcons name="file-document-outline" size={moderateScale(16)} color="#D97706" />
                                            </View>
                                            <View style={styles.landRowTextGroup}>
                                                <Text style={styles.landDetailLabel}>खतौनी संख्या</Text>
                                                <Text style={styles.landDetailSub}>गाटा / खाता संख्या</Text>
                                            </View>
                                        </View>
                                        <View style={styles.landRowRight}>
                                            <Text style={styles.landKhatauniValue}>
                                                {profile.khatauniNumber || 'उपलब्ध नहीं'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Row 3: Khatauni Document (if uploaded) */}
                                    {!!profile.khatauni_photo && (
                                        <>
                                            <View style={styles.divider} />
                                            <View style={styles.landDetailRow}>
                                                <View style={styles.landRowLeft}>
                                                    <View style={[styles.smallIconBg, { backgroundColor: '#EDE9FE' }]}>
                                                        <MaterialCommunityIcons name="file-eye-outline" size={moderateScale(16)} color="#7C3AED" />
                                                    </View>
                                                    <View style={styles.landRowTextGroup}>
                                                        <Text style={styles.landDetailLabel}>खतौनी दस्तावेज़</Text>
                                                        <Text style={styles.landDetailSub}>
                                                            {profile.khatauni_photo.includes(',')
                                                                ? `${profile.khatauni_photo.split(',').length} दस्तावेज़ अपलोड किए गए`
                                                                : 'अपलोड की गई प्रति'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.viewDocBadge}
                                                    onPress={() => {
                                                        setDocViewerTitle('खतौनी दस्तावेज़ (Khatauni Document)');
                                                        setDocViewerDocs(profile.khatauni_photo);
                                                        setDocViewerVisible(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Feather name="eye" size={moderateScale(12)} color="#7C3AED" />
                                                    <Text style={styles.viewDocText}>देखें</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}

                                    {/* Row 4: Kisan Panjikaran Slip */}
                                    <View style={styles.divider} />
                                    <View style={styles.landDetailRow}>
                                        <View style={styles.landRowLeft}>
                                            <View style={[styles.smallIconBg, { backgroundColor: '#DCFCE7' }]}>
                                                <MaterialCommunityIcons name="file-certificate-outline" size={moderateScale(16)} color="#15803D" />
                                            </View>
                                            <View style={styles.landRowTextGroup}>
                                                <Text style={styles.landDetailLabel}>किसान पंजीकरण पर्ची</Text>
                                                <Text style={styles.landDetailSub}>
                                                    {profile.kisan_panjikaran_photo
                                                        ? (profile.kisan_panjikaran_photo.includes(',')
                                                            ? `${profile.kisan_panjikaran_photo.split(',').length} दस्तावेज़ अपलोड किए गए`
                                                            : 'अपलोड की गई प्रति')
                                                        : 'अपलोड नहीं है (अपलोड करें)'}
                                                </Text>
                                            </View>
                                        </View>
                                        {profile.kisan_panjikaran_photo ? (
                                            <TouchableOpacity
                                                style={[styles.viewDocBadge, { backgroundColor: '#DCFCE7' }]}
                                                onPress={() => {
                                                    setDocViewerTitle('किसान पंजीकरण पर्ची (Kisan Slip)');
                                                    setDocViewerDocs(profile.kisan_panjikaran_photo);
                                                    setDocViewerVisible(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Feather name="eye" size={moderateScale(12)} color="#15803D" />
                                                <Text style={[styles.viewDocText, { color: '#15803D' }]}>देखें</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.viewDocBadge, { backgroundColor: '#FEF3C7' }]}
                                                onPress={() => {
                                                    setIsEditing(true);
                                                    setPickerModalVisible(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Feather name="upload" size={moderateScale(12)} color="#D97706" />
                                                <Text style={[styles.viewDocText, { color: '#D97706' }]}>अपलोड करें</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Quota Notice Banner */}
                                    <View style={styles.landQuotaBanner}>
                                        <MaterialCommunityIcons name="shield-check" size={moderateScale(14)} color="#15803D" />
                                        <Text style={styles.landQuotaText}>
                                            प्रमाणित रकबे के अनुसार उर्वरक कोटा निर्धारित होता है
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Address Details Card */}
                            <View style={styles.cardContainer}>
                                <View style={styles.cardHeaderRow}>
                                    <Ionicons name="location-sharp" size={20} color={COLORS.error} />
                                    <Text style={styles.cardTitleNew}>पता और स्थान</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.row}>
                                        <View style={styles.halfWidth}>
                                            <Text style={styles.detailLabel}>गाँव</Text>
                                            <Text style={styles.detailValueLarge}>{profile.village}</Text>
                                        </View>
                                        <View style={styles.halfWidth}>
                                            <Text style={styles.detailLabel}>ब्लॉक</Text>
                                            <Text style={styles.detailValueLarge}>{profile.block}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.row}>
                                        <View style={styles.halfWidth}>
                                            <Text style={styles.detailLabel}>तहसील</Text>
                                            <Text style={styles.detailValueLarge}>{profile.tehsil}</Text>
                                        </View>
                                        <View style={styles.halfWidth}>
                                            <Text style={styles.detailLabel}>जिला</Text>
                                            <Text style={styles.detailValueLarge}>{profile.district}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Samiti Details Card */}
                            {profile.selected_retailer_name && (
                                <View style={styles.cardContainer}>
                                    <View style={styles.cardHeaderRow}>
                                        <MaterialCommunityIcons name="storefront-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.cardTitleNew}>आपकी समिति (Retailer)</Text>
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={styles.detailRowVertical}>
                                            <View style={styles.labelWithIcon}>
                                                <MaterialCommunityIcons name="office-building" size={14} color={COLORS.textSecondary} />
                                                <Text style={styles.detailLabel}>समिति का नाम</Text>
                                            </View>
                                            <Text style={styles.detailValueWrap}>{profile.selected_retailer_name}</Text>
                                        </View>
                                        <View style={styles.detailRowVertical}>
                                            <View style={styles.labelWithIcon}>
                                                <MaterialCommunityIcons name="identifier" size={14} color={COLORS.textSecondary} />
                                                <Text style={styles.detailLabel}>समिति कोड</Text>
                                            </View>
                                            <Text style={styles.detailValueWrap}>{profile.selected_retailer_id}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}



                            {/* Save Button (Only in Edit Mode) */}
                            {isEditing && (
                                <View style={styles.actionContainer}>
                                    <Button
                                        title={loading ? "सहेज रहा है..." : "सुरक्षित करें (Save)"}
                                        onPress={handleSave}
                                        disabled={loading}
                                        size="large"
                                    />
                                </View>
                            )}

                            {/* Privacy Policy Link */}
                            {!isEditing && (
                                <View style={styles.privacyContainer}>
                                    <TouchableOpacity
                                        style={styles.privacyButton}
                                        onPress={() => Linking.openURL('https://risingayodhya.com/Urvarak/upcdc_urvarak_privacy/')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} style={{ flexShrink: 0 }} />
                                        <Text style={styles.privacyButtonText} maxFontSizeMultiplier={1.3}>गोपनीयता नीति (Privacy Policy)</Text>
                                        <Feather name="external-link" size={16} color={COLORS.textSecondary} style={{ flexShrink: 0 }} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Logout Button */}
                            {onLogout && !isEditing && (
                                <View style={styles.logoutContainer}>
                                    <TouchableOpacity
                                        style={styles.logoutButton}
                                        onPress={onLogout}
                                        activeOpacity={0.7}
                                    >
                                        <LogOutIcon size={24} color={COLORS.error} />
                                        <Text style={styles.logoutButtonText}>लॉगआउट (Logout)</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView >
            </SafeAreaView >
            {/* Modern Alert */}
            <ModernAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                onClose={() => setAlertVisible(false)}
            />

            <CustomImageCropper
                visible={cropperVisible}
                imageUri={imageToCrop}
                onCrop={handleCropDone}
                onCancel={() => {
                    setCropperVisible(false);
                    setImageToCrop(null);
                }}
            />

            <DocumentViewerModal
                visible={docViewerVisible}
                title={docViewerTitle}
                documents={docViewerDocs}
                onClose={() => setDocViewerVisible(false)}
            />

            {/* Document Picker Modal (Camera / Gallery / PDF) */}
            <Modal
                visible={pickerModalVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setPickerModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.pickerModalOverlay}
                    activeOpacity={1}
                    onPress={() => setPickerModalVisible(false)}
                >
                    <View style={styles.pickerModalCard}>
                        <View style={styles.pickerModalHeader}>
                            <MaterialCommunityIcons name="file-upload-outline" size={moderateScale(24)} color="#15803D" />
                            <Text style={styles.pickerModalTitle}>दस्तावेज़ का माध्यम चुनें</Text>
                        </View>
                        <Text style={styles.pickerModalSubtitle}>
                            किसान पंजीकरण पर्ची की स्पष्ट फोटो या PDF फ़ाइल चुनें
                        </Text>

                        <View style={styles.pickerOptionsRow}>
                            {/* Camera */}
                            <TouchableOpacity
                                style={styles.pickerOptionCard}
                                onPress={handlePickCamera}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.pickerIconCircle, { backgroundColor: '#EFF6FF' }]}>
                                    <Feather name="camera" size={moderateScale(22)} color="#2563EB" />
                                </View>
                                <Text style={styles.pickerOptionLabel}>कैमरा</Text>
                                <Text style={styles.pickerOptionSub}>फोटो खींचें</Text>
                            </TouchableOpacity>

                            {/* Gallery */}
                            <TouchableOpacity
                                style={styles.pickerOptionCard}
                                onPress={handlePickGallery}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.pickerIconCircle, { backgroundColor: '#F0FDF4' }]}>
                                    <MaterialCommunityIcons name="image-multiple-outline" size={moderateScale(22)} color="#15803D" />
                                </View>
                                <Text style={styles.pickerOptionLabel}>गैलरी</Text>
                                <Text style={styles.pickerOptionSub}>फोटो चुनें</Text>
                            </TouchableOpacity>

                            {/* PDF */}
                            <TouchableOpacity
                                style={styles.pickerOptionCard}
                                onPress={handlePickPdf}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.pickerIconCircle, { backgroundColor: '#FEF2F2' }]}>
                                    <MaterialCommunityIcons name="file-pdf-box" size={moderateScale(24)} color="#EF4444" />
                                </View>
                                <Text style={styles.pickerOptionLabel}>PDF</Text>
                                <Text style={styles.pickerOptionSub}>दस्तावेज़</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.pickerCancelBtn}
                            onPress={() => setPickerModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.pickerCancelText}>रद्द करें</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ParticleBackground >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: SPACING.xxl + 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xxl,
        minHeight: 200,
    },
    loadingText: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.textSecondary,
    },

    // Header Styles
    headerContainer: {
        marginBottom: SPACING.md,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'android' ? 35 : 20,
        paddingBottom: SPACING.lg,
        paddingHorizontal: SPACING.md,
        borderBottomLeftRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    // Decorative circles (same as FarmerHero)
    headerPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    headerCircle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerCircle1: {
        width: moderateScale(120),
        height: verticalScale(120),
        top: -40,
        right: -20,
    },
    headerCircle2: {
        width: moderateScale(80),
        height: verticalScale(80),
        bottom: -30,
        left: 40,
    },
    headerCircle3: {
        width: moderateScale(60),
        height: verticalScale(60),
        top: 60,
        right: width * 0.3,
    },
    // Content row (text + emoji)
    headerContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
        marginTop: SPACING.sm,
    },
    headerDecorEmoji: {
        fontSize: moderateScale(40),
        opacity: 0.8,
        marginLeft: SPACING.sm,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 2,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 0, // Removed margin to align strictly left if back button is not present, or just adjust padding
        paddingLeft: SPACING.sm,
    },
    namasteText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.white,
        opacity: 0.9,
    },
    headerNameLarge: {
        fontSize: moderateScale(22),
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 4,
    },
    headerSubText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.white,
        opacity: 0.8,
        marginTop: 2,
    },
    // Avatar centered inside gradient
    avatarCenterRow: {
        alignItems: 'center',
        marginTop: SPACING.md,
        marginBottom: -55, // Pull down to overlap below gradient
    },

    // Avatar overlapping the gradient — sits half inside, half outside
    avatarOverlapWrapper: {
        alignItems: 'center',
        marginTop: -45, // Reduced from -60 because paddingBottom is smaller
        zIndex: 10,
    },
    avatarRing: {
        padding: 3,
        backgroundColor: COLORS.white,
        borderRadius: 50,
        ...SHADOWS.medium,
    },
    avatarLarge: {
        width: moderateScale(90),
        height: verticalScale(90),
        borderRadius: 45,
    },
    cameraCircle: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: COLORS.white,
        width: moderateScale(32),
        height: verticalScale(32),
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    // Section below avatar: status + edit button
    belowAvatarSection: {
        alignItems: 'center',
        paddingTop: SPACING.sm,
        paddingBottom: 0,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.xs,
    },
    userStatusText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    floatingEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0FF',
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(5),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0FF',
    },
    floatingEditText: {
        color: COLORS.primary,
        fontWeight: '600',
        marginLeft: 5,
        fontSize: FONT_SIZES.xs,
    },

    // Card Styles
    cardContainer: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(14),
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: SPACING.xs,
        gap: moderateScale(8),
    },
    cardTitleNew: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardContent: {
        gap: moderateScale(10),
    },

    // Detail Item Styles
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: verticalScale(24),
    },
    detailRowVertical: {
        flexDirection: 'column',
        gap: 2,
    },
    detailValueWrap: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flexWrap: 'wrap',
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    labelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
    },
    detailValue: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    detailValueLarge: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    valueWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
    },
    iconButtonSmall: {
        width: moderateScale(24),
        height: verticalScale(24),
        borderRadius: 12,
        backgroundColor: '#F0EFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Grid/Row Styles
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    divider: {
        height: verticalScale(1),
        backgroundColor: '#F0F0F0',
        marginVertical: moderateScale(4),
    },

    // Land Details Specific (Full-Width Rows)
    landDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: moderateScale(3),
    },
    landRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.sm,
        gap: moderateScale(8),
    },
    landRowTextGroup: {
        flex: 1,
    },
    landRowRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    landDetailLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    landDetailSub: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginTop: 1,
    },
    landAreaValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    landKhatauniValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    landSubText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 1,
        fontWeight: '500',
    },
    viewDocBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(6),
        gap: 4,
    },
    viewDocText: {
        fontSize: FONT_SIZES.xs,
        color: '#7C3AED',
        fontWeight: '700',
    },
    smallIconBg: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: moderateScale(7),
        backgroundColor: '#E0F2F1', // Light teal
        justifyContent: 'center',
        alignItems: 'center',
    },
    landQuotaBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: moderateScale(8),
        paddingHorizontal: SPACING.sm,
        paddingVertical: verticalScale(6),
        gap: moderateScale(6),
        marginTop: SPACING.xs,
    },
    landQuotaText: {
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        fontWeight: '500',
        flex: 1,
    },

    // Documents
    documentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 12,
    },
    docIconContainer: {
        marginRight: 12,
    },
    docInfo: {
        flex: 1,
    },
    docTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    docSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    downloadButton: {
        padding: 8,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        ...SHADOWS.small,
    },

    // Legacy/Shared
    actionContainer: {
        marginTop: SPACING.md,
        marginBottom: SPACING.xxl,
        marginHorizontal: SPACING.lg,
    },
    logoutContainer: {
        marginTop: SPACING.md,
        marginBottom: SPACING.xxl,
        marginHorizontal: SPACING.lg,
    },
    privacyContainer: {
        marginTop: SPACING.xl,
        marginHorizontal: SPACING.lg,
    },
    privacyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
        ...SHADOWS.small,
    },
    privacyButtonText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
        flexShrink: 1,
        lineHeight: moderateScale(22),
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF0F0',
        borderWidth: 1,
        borderColor: COLORS.error,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    logoutButtonText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.error,
    },

    // Retained for compatibility if needed
    fieldContainer: {
        marginBottom: SPACING.md,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    fieldValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    inputLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    editInput: {
        fontSize: moderateScale(18),
        color: COLORS.textPrimary,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
        minHeight: 52,
    },
    input: {
        marginBottom: 0,
    },

    // Map Styles
    mapContainer: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    mapHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    mapTitle: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    mapWrapper: {
        height: verticalScale(150),
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F5F5F7',
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    mapStatusText: {
        fontSize: moderateScale(12),
        color: COLORS.textLight,
    },
    openMapsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.sm,
        paddingVertical: 8,
        backgroundColor: COLORS.primary + '10',
        borderRadius: 8,
        gap: 6,
    },
    openMapsText: {
        fontSize: moderateScale(13),
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerInner: {
        width: moderateScale(24),
        height: verticalScale(24),
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    markerPointer: {
        width: moderateScale(0),
        height: verticalScale(0),
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderBottomWidth: 0,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderTopColor: COLORS.primary,
        marginTop: -1,
    },

    // Document Upload & Picker in Profile
    uploadSectionBox: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: moderateScale(10),
        padding: moderateScale(12),
        marginTop: verticalScale(10),
    },
    uploadSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
    },
    uploadSectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: '#15803D',
    },
    uploadSectionSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: '#64748B',
        marginTop: 2,
        marginBottom: verticalScale(10),
    },
    uploadedFilePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    uploadedFileTextGroup: {
        flex: 1,
        marginLeft: moderateScale(8),
    },
    uploadedFileName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    uploadedFileStatus: {
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        fontWeight: '600',
        marginTop: 2,
    },
    removeFileBtn: {
        padding: moderateScale(4),
    },
    uploadTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderStyle: 'dashed',
    },
    uploadTriggerIconBg: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(10),
    },
    uploadTriggerTextCol: {
        flex: 1,
    },
    uploadTriggerTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    uploadTriggerHint: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    existingDocNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: moderateScale(8),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    existingDocText: {
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        fontWeight: '600',
    },
    changeDocBtn: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(6),
    },
    changeDocText: {
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        fontWeight: '700',
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerModalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? verticalScale(35) : verticalScale(20),
    },
    pickerModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        justifyContent: 'center',
    },
    pickerModalTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    pickerModalSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: verticalScale(16),
    },
    pickerOptionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: verticalScale(16),
    },
    pickerOptionCard: {
        alignItems: 'center',
        paddingVertical: verticalScale(8),
        paddingHorizontal: moderateScale(12),
    },
    pickerIconCircle: {
        width: moderateScale(52),
        height: moderateScale(52),
        borderRadius: moderateScale(26),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(6),
    },
    pickerOptionLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    pickerOptionSub: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    pickerCancelBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(12),
        alignItems: 'center',
    },
    pickerCancelText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: '#64748B',
    }
});
