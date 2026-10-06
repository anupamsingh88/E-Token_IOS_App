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
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, ModernAlert } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants';
import { LogOutIcon } from '../../components/FormIcons';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import ParticleBackground from '../../components/ParticleBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressImage } from '../../utils/imagePickerUtils';
import CustomImageCropper from '../../components/CustomImageCropper';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';


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
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingProfile, setFetchingProfile] = useState(true);

    // Modern Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

    // Profile data from API
    const [profile, setProfile] = useState({
        name: farmerName || '',
        mobile: '',
        village: '',
        village_en: '',
        block: '',
        block_en: '',
        tehsil: '',
        tehsil_en: '',
        district: '',
        district_en: '',
        khatauniNumber: '',
        landArea: '',
        profile_photo: null as string | null,
        aadhaar_photo: null as string | null,
        selected_retailer_id: null as string | null,
        selected_retailer_name: null as string | null,
    });

    const [editedProfile, setEditedProfile] = useState(profile);
    const [cropperVisible, setCropperVisible] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

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
                    const profileData = {
                        name: data.name || farmerName,
                        mobile: data.mobile || '',
                        village: data.village || '',
                        village_en: data.village_en || '',
                        block: data.block || '',
                        block_en: data.block_en || '',
                        tehsil: data.tehsil || '',
                        tehsil_en: data.tehsil_en || '',
                        district: data.district || '',
                        district_en: data.district_en || '',
                        khatauniNumber: data.khatauni_number || data.khasra_number || '',
                        landArea: data.land_area ? data.land_area.toString() : '',
                        profile_photo: data.profile_photo || null,
                        aadhaar_photo: data.aadhaar_photo || null,
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
            setIsEditing(false);
        } else {
            // Start editing
            setEditedProfile(profile);
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.updateFarmerProfile, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    farmer_id: farmerId,
                    name: editedProfile.name,
                }),
            });
            const data = await response.json();

            if (data.success) {
                setProfile(editedProfile);
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
                AsyncStorage.getItem('user_session').then(session => {
                    if (session) {
                        const userData = JSON.parse(session);
                        userData.name = editedProfile.name;
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
        setEditedProfile(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('अनुमति आवश्यक', 'फोटो बदलने के लिए गैलरी की अनुमति दें।');
            return;
        }

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
            return (
                <View style={styles.fieldContainer}>
                    <TextInput
                        placeholder={label}
                        placeholderTextColor={COLORS.textSecondary}
                        value={editedProfile[fieldKey as keyof typeof editedProfile] || ''}
                        onChangeText={(text: string) => handleChange(fieldKey, text)}
                        style={styles.editInput}
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

    return (
        <ParticleBackground>
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
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
                                    {isEditing && renderField('नाम', profile.name, 'name', '', true)}
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
                                        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.privacyButtonText}>गोपनीयता नीति (Privacy Policy)</Text>
                                        <Feather name="external-link" size={16} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
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
        fontSize: FONT_SIZES.md,
        color: COLORS.white,
        opacity: 0.9,
    },
    headerNameLarge: {
        fontSize: moderateScale(26),
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 4,
    },
    headerSubText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.white,
        opacity: 0.8,
        marginTop: 4,
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
        marginBottom: SPACING.sm,
    },
    userStatusText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    floatingEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0FF',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0FF',
    },
    floatingEditText: {
        color: COLORS.primary,
        fontWeight: '600',
        marginLeft: 5,
        fontSize: FONT_SIZES.sm,
    },

    // Card Styles
    cardContainer: {
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SPACING.lg,
        ...SHADOWS.small,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: SPACING.sm,
        gap: 8,
    },
    cardTitleNew: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardContent: {
        gap: 12,
    },

    // Detail Item Styles
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailRowVertical: {
        flexDirection: 'column',
        gap: 4,
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
        gap: 6,
    },
    detailValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    detailValueLarge: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    valueWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        marginVertical: 4,
    },

    // Land Details Specific
    iconLabelRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    smallIconBg: {
        width: moderateScale(26),
        height: verticalScale(26),
        borderRadius: 6,
        backgroundColor: '#E0F2F1', // Light teal
        justifyContent: 'center',
        alignItems: 'center',
    },
    landDetailLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 2,
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
    }
});
