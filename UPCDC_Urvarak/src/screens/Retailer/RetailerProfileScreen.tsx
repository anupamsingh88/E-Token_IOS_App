import { apiFetch } from '../../utils/apiClient';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    TextInput,
    Alert,
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    StatusBar,
    Switch,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { COLORS, SHADOWS, SPACING, BORDER_RADIUS } from '../../constants';
import AlertModal from '../../components/AlertModal';
import { API_ENDPOINTS, API_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRetailerData } from '../../contexts/RetailerDataContext';
import appJson from '../../../app.json';


const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
    retailerName: string;
    retailerId: string;
    onLogout: () => void;
}

type ActiveSection = null | 'password' | 'personal' | 'help' | 'mobile';

interface HelpItem {
    id: number;
    help_key: string;
    label_hi: string;
    label_en: string;
    value: string;
    icon_name: string;
    help_type: 'phone' | 'whatsapp' | 'link' | 'text';
}

interface RetailerDetails {
    id: string;
    name: string;
    shop_name: string;
    retailer_id: string;
    total_capacity: number;
    daily_visitor_capacity: number;
    loading: boolean;
}

const RetailerProfileScreen: React.FC<ProfileScreenProps> = ({
    retailerName,
    retailerId,
    onLogout,
}) => {
    const { retailerDetails: contextDetails, refreshData } = useRetailerData();

    const [activeSection, setActiveSection] = useState<ActiveSection>(null);
    const [stats, setStats] = useState({
        pendingReg: 0,
        totalBookings: 0,
        pendingChanges: 0,
        loading: true
    });

    const [details, setDetails] = useState<RetailerDetails>(() => {
        if (contextDetails) {
            return {
                id: contextDetails.id || '',
                name: contextDetails.name || '',
                shop_name: contextDetails.shop_name || '',
                retailer_id: contextDetails.retailer_id || '',
                total_capacity: parseInt(contextDetails.total_bori_capacity) || 0,
                daily_visitor_capacity: parseInt(contextDetails.daily_visitor_capacity) || 0,
                loading: false
            };
        }
        return {
            id: '',
            name: '',
            shop_name: '',
            retailer_id: '',
            total_capacity: 0,
            daily_visitor_capacity: 0,
            loading: true
        };
    });

    const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
    const [helpLoading, setHelpLoading] = useState(true);

    // Password form state
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;

    const [mobileNumber, setMobileNumber] = useState(() => {
        return (contextDetails?.mobile && contextDetails.mobile.length === 10) ? contextDetails.mobile : '';
    });
    const [isMobileVerified, setIsMobileVerified] = useState(() => {
        return !!(contextDetails?.mobile && contextDetails.mobile.length === 10);
    });

    const [alertModal, setAlertModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info',
        onClose: undefined as (() => void) | undefined
    });

    const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
        setAlertModal({ visible: true, type, title, message, onClose });
    };

    const hideAlert = () => {
        if (alertModal.onClose) alertModal.onClose();
        setAlertModal(prev => ({ ...prev, visible: false }));
    };


    const loadMobileData = useCallback(async (activeFlag = { active: true }) => {
        try {
            const savedMobile = await AsyncStorage.getItem(`mobile_${retailerId}`);
            if (!activeFlag.active) return;
            if (savedMobile && savedMobile.length === 10) {
                setMobileNumber(savedMobile);
                setIsMobileVerified(true);
            }
        } catch (e) {
            console.error('Error loading mobile data:', e);
        }
    }, [retailerId]);

    const handleSaveMobile = async () => {
        if (mobileNumber.length !== 10) {
            showAlert('error', 'त्रुटि', 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें');
            return;
        }
        try {
            // First, update on Backend
            const response = await apiFetch(API_ENDPOINTS.updateProfile, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId,
                    mobile: mobileNumber
                })
            });

            const result = await response.json();

            if (result.success) {
                // Then save locally for fast UI check
                await AsyncStorage.setItem(`mobile_${retailerId}`, mobileNumber);
                setIsMobileVerified(true);
                // Refresh global context to update other screens/headers
                refreshData(retailerId).catch(() => {});
                showAlert('success', 'सफलता', 'मोबाइल नंबर अपडेट कर दिया गया है। आपकी प्रोफ़ाइल 100% पूर्ण है।');
                openSection(null);
            } else {
                showAlert('error', 'त्रुटि', result.message || 'प्रोफ़ाइल अपडेट करने में विफल');
            }
        } catch (e) {
            console.error('Mobile update failed:', e);
            showAlert('error', 'त्रुटि', 'सर्वर से कनेक्ट नहीं हो पा रहा है');
        }
    };

    const fetchHelpCenter = useCallback(async (activeFlag = { active: true }) => {
        try {
            // First try fetching from app_settings
            const settingsRes = await apiFetch(API_ENDPOINTS.getSettings);
            const settingsResult = await settingsRes.json();

            if (!activeFlag.active) return;

            if (settingsResult.success && settingsResult.data) {
                const s = settingsResult.data;
                const mappedHelp: HelpItem[] = [];

                if (s.support_phone) {
                    mappedHelp.push({
                        id: 1, help_key: 'phone', label_hi: 'हेल्पलाइन', label_en: 'Helpline',
                        value: s.support_phone, icon_name: 'call', help_type: 'phone'
                    });
                }
                if (s.support_whatsapp) {
                    mappedHelp.push({
                        id: 2, help_key: 'whatsapp', label_hi: 'व्हाट्सएप सहायता', label_en: 'WhatsApp Support',
                        value: s.support_whatsapp, icon_name: 'logo-whatsapp', help_type: 'whatsapp'
                    });
                }
                if (s.office_address) {
                    mappedHelp.push({
                        id: 3, help_key: 'office_address', label_hi: 'कार्यालय का पता', label_en: 'Office Address',
                        value: s.office_address, icon_name: 'location', help_type: 'text'
                    });
                }

                if (mappedHelp.length > 0) {
                    setHelpItems(mappedHelp);
                    setHelpLoading(false);
                    await AsyncStorage.setItem('profile_help_items', JSON.stringify(mappedHelp));
                    return;
                }
            }

            // Fallback to existing getHelp if app_settings doesn't have it
            const responseHelp = await apiFetch(API_ENDPOINTS.getHelp);
            const result = await responseHelp.json();
            
            if (!activeFlag.active) return;
            
            if (result.success) {
                setHelpItems(result.data);
                await AsyncStorage.setItem('profile_help_items', JSON.stringify(result.data));
            }
        } catch (error) {
            console.error('Error fetching help center:', error);
        } finally {
            if (activeFlag.active) {
                setHelpLoading(false);
            }
        }
    }, []);

    const fetchDetails = useCallback(async (activeFlag = { active: true }) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.getLocations}?type=retailer_details&parent_id=${retailerId}`);
            const result = await response.json();
            
            if (!activeFlag.active) return;
            
            if (result.success && result.data) {
                setDetails({
                    id: result.data.id || '',
                    name: result.data.name || '',
                    shop_name: result.data.shop_name || '',
                    retailer_id: result.data.retailer_id || '',
                    total_capacity: parseInt(result.data.total_bori_capacity) || 0,
                    daily_visitor_capacity: parseInt(result.data.daily_visitor_capacity) || 0,
                    loading: false
                });

                // If database has mobile number, use it!
                if (result.data.mobile && result.data.mobile.length === 10) {
                    setMobileNumber(result.data.mobile);
                    setIsMobileVerified(true);
                }
            } else {
                setDetails(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            if (activeFlag.active) {
                setDetails(prev => ({ ...prev, loading: false }));
            }
        }
    }, [retailerId]);

    useEffect(() => {
        const backAction = () => {
            if (activeSection !== null) {
                openSection(null);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [activeSection]);

    const fetchStats = useCallback(async (activeFlag = { active: true }) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.getRetailerRequests, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retailer_id: retailerId }),
            });
            const result = await response.json();
            
            if (!activeFlag.active) return;

            if (result.status === 'success') {
                const pendingReg = result.data.registrations?.pending?.length || 0;
                const totalBookings = result.data.bookings?.length || 0;
                const pendingChanges = result.data.changes?.pending?.length || 0;
                const newStats = { pendingReg, totalBookings, pendingChanges, loading: false };
                setStats(newStats);
                await AsyncStorage.setItem(`profile_stats_${retailerId}`, JSON.stringify(newStats));
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            if (activeFlag.active) {
                setStats(prev => ({ ...prev, loading: false }));
            }
        }
    }, [retailerId]);

    const loadCachedData = useCallback(async (activeFlag = { active: true }) => {
        try {
            const [cachedStatsStr, cachedHelpStr] = await Promise.all([
                AsyncStorage.getItem(`profile_stats_${retailerId}`),
                AsyncStorage.getItem('profile_help_items')
            ]);
            if (!activeFlag.active) return;
            if (cachedStatsStr) {
                setStats(JSON.parse(cachedStatsStr));
            }
            if (cachedHelpStr) {
                setHelpItems(JSON.parse(cachedHelpStr));
                setHelpLoading(false);
            }
        } catch (e) {
            console.error('Error loading cached profile data:', e);
        }
    }, [retailerId]);

    useEffect(() => {
        if (contextDetails) {
            setDetails({
                id: contextDetails.id || '',
                name: contextDetails.name || '',
                shop_name: contextDetails.shop_name || '',
                retailer_id: contextDetails.retailer_id || '',
                total_capacity: parseInt(contextDetails.total_bori_capacity) || 0,
                daily_visitor_capacity: parseInt(contextDetails.daily_visitor_capacity) || 0,
                loading: false
            });
            if (contextDetails.mobile && contextDetails.mobile.length === 10) {
                setMobileNumber(contextDetails.mobile);
                setIsMobileVerified(true);
            }
        }
    }, [contextDetails]);

    useEffect(() => {
        let active = true;
        const activeFlag = { active };

        // Do NOT reset states to empty / loading immediately, to prevent visual flashing.
        // Instead, load the cached values first, and then fetch fresh data in the background.
        loadCachedData(activeFlag).then(() => {
            if (!active) return;
            fetchStats(activeFlag);
            fetchDetails(activeFlag);
            fetchHelpCenter(activeFlag);
            loadMobileData(activeFlag);
        });

        return () => {
            active = false;
            activeFlag.active = false;
        };
    }, [retailerId, fetchStats, fetchDetails, fetchHelpCenter, loadMobileData, loadCachedData]);

    const openSection = (section: ActiveSection) => {
        if (activeSection === section) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setActiveSection(null));
        } else {
            setActiveSection(section);
            slideAnim.setValue(0);
            Animated.spring(slideAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            showAlert('error', 'त्रुटि', 'सभी फ़ील्ड भरें');
            return;
        }
        if (newPass !== confirmPass) {
            showAlert('error', 'त्रुटि', 'पासवर्ड मेल नहीं खाते');
            return;
        }
        setPassLoading(true);
        try {
            const formData = new FormData();
            formData.append('retailer_id', retailerId);
            formData.append('current_password', currentPass);
            formData.append('new_password', newPass);
            formData.append('confirm_password', confirmPass);

            const response = await apiFetch(API_ENDPOINTS.changePassword, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                showAlert('success', 'सफलता', 'पासवर्ड बदल दिया गया', () => {
                    openSection(null);
                    setCurrentPass('');
                    setNewPass('');
                    setConfirmPass('');
                });
            } else {
                showAlert('error', 'त्रुटि', result.message || 'पासवर्ड नहीं बदला जा सका');
            }
        } catch (error) {
            showAlert('error', 'त्रुटि', 'सर्वर एरर');
        } finally {
            setPassLoading(false);
        }
    };

    const handleHelpAction = (item: HelpItem) => {
        switch (item.help_type) {
            case 'phone':
                Linking.openURL(`tel:${item.value}`);
                break;
            case 'whatsapp':
                Linking.openURL(`whatsapp://send?phone=${item.value}`);
                break;
            case 'link':
                Linking.openURL(item.value);
                break;
            default:
                break;
        }
    };

    const initials = retailerName.charAt(0).toUpperCase();

    return (
        <View style={styles.container}>
            <AlertModal
                visible={alertModal.visible}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={hideAlert}
            />
            <LinearGradient
                colors={['#FFEDD5', '#FFF7ED']}
                style={styles.backgroundGradient}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={{ height: 20 }} />

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarShadow}>
                                <LinearGradient
                                    colors={['#f97316', '#ea580c']}
                                    style={styles.avatar}
                                >
                                    <Text style={styles.avatarText}>{initials}</Text>
                                </LinearGradient>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <MaterialCommunityIcons name="check-decagram" size={24} color="#38bdf8" />
                            </View>
                        </View>

                        <Text style={styles.userName}>{details.loading ? retailerName : details.name}</Text>
                        <Text style={styles.userId}>ID: {details.loading ? (retailerId === '1' ? 'RET001' : retailerId) : details.retailer_id}</Text>

                        {/* Profile Strength */}
                        <View style={styles.strengthContainer}>
                            <View style={styles.strengthHeader}>
                                <Text style={styles.strengthLabel}>प्रोफ़ाइल स्ट्रेंथ</Text>
                                <Text style={[styles.strengthValue, isMobileVerified && { color: '#059669' }]}>
                                    {isMobileVerified ? '100%' : '90%'}
                                </Text>
                            </View>
                            <View style={styles.strengthBarBg}>
                                <View style={[
                                    styles.strengthBarFill,
                                    { width: isMobileVerified ? '100%' : '90%' },
                                    isMobileVerified && { backgroundColor: '#10b981' }
                                ]} />
                            </View>
                        </View>

                        <View style={styles.statsDivider} />

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.loading ? '--' : stats.totalBookings}</Text>
                                <Text style={styles.statLabel}>कुल बुकिंग</Text>
                            </View>
                            <View style={styles.vDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.loading ? '--' : stats.pendingReg}</Text>
                                <Text style={styles.statLabel}>पेंडिंग अनुरोध</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.menuItem, activeSection === 'personal' && styles.menuItemActive]}
                        onPress={() => openSection('personal')}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: '#eff6ff' }]}>
                            <Ionicons name="person-outline" size={22} color="#3b82f6" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuLabel}>व्यक्तिगत जानकारी</Text>
                            <Text style={styles.menuSubLabel}>{details.shop_name || 'दुकान और क्षमता की जानकारी'}</Text>
                        </View>
                        <Ionicons
                            name={activeSection === 'personal' ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>

                    {/* Personal Info Panel */}
                    {activeSection === 'personal' && (
                        <Animated.View style={[styles.expandablePanel, { opacity: slideAnim }]}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>दुकान का नाम:</Text>
                                <Text style={styles.infoValue}>{details.shop_name || '--'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>रिटेलर ID:</Text>
                                <Text style={styles.infoValue}>{details.retailer_id || '--'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>कुल स्टॉक क्षमता:</Text>
                                <Text style={styles.infoValue}>{details.total_capacity} बोरी</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>प्रतिदिन किसान क्षमता:</Text>
                                <Text style={styles.infoValue}>{details.daily_visitor_capacity} किसान</Text>
                            </View>
                        </Animated.View>
                    )}

                    <TouchableOpacity
                        style={[styles.menuItem, activeSection === 'mobile' && styles.menuItemActive]}
                        onPress={() => openSection('mobile')}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: '#f0f9ff' }]}>
                            <Ionicons name="call-outline" size={22} color="#0284c7" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuLabel}>मोबाइल नंबर</Text>
                            <Text style={styles.menuSubLabel}>{isMobileVerified ? mobileNumber : 'प्रोफ़ाइल पूर्ण करने के लिए दर्ज करें'}</Text>
                        </View>
                        <Ionicons
                            name={activeSection === 'mobile' ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>

                    {/* Mobile Panel */}
                    {activeSection === 'mobile' && (
                        <Animated.View style={[styles.expandablePanel, { opacity: slideAnim }]}>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>मोबाइल नंबर (10 अंक)</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="phone-portrait-outline" size={18} color="#64748b" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="अपना मोबाइल नंबर दर्ज करें"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={mobileNumber}
                                        onChangeText={setMobileNumber}
                                    />
                                    {isMobileVerified && (
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.updateBtn, { backgroundColor: '#0284c7' }]}
                                onPress={handleSaveMobile}
                            >
                                <Text style={styles.updateBtnText}>नंबर सेव करें</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <TouchableOpacity
                        style={[styles.menuItem, activeSection === 'password' && styles.menuItemActive]}
                        onPress={() => openSection('password')}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: '#ecfdf5' }]}>
                            <Ionicons name="shield-checkmark-outline" size={22} color="#10b981" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuLabel}>सुरक्षा और पासवर्ड</Text>
                            <Text style={styles.menuSubLabel}>अपने अकाउंट को सुरक्षित रखें</Text>
                        </View>
                        <Ionicons
                            name={activeSection === 'password' ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>

                    {/* Password Panel (Expandable) */}
                    {activeSection === 'password' && (
                        <Animated.View style={[styles.expandablePanel, { opacity: slideAnim }]}>
                            {/* App Lock section removed as per user request */}

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>वर्तमान पासवर्ड</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="*******"
                                        secureTextEntry={!showCurrent}
                                        value={currentPass}
                                        onChangeText={setCurrentPass}
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                        <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>नया पासवर्ड</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="key-outline" size={18} color="#64748b" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="नया पासवर्ड दर्ज करें"
                                        secureTextEntry={!showNew}
                                        value={newPass}
                                        onChangeText={setNewPass}
                                    />
                                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                        <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>पासवर्ड की पुष्टि करें</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#64748b" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="दोबारा दर्ज करें"
                                        secureTextEntry={!showConfirm}
                                        value={confirmPass}
                                        onChangeText={setConfirmPass}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                        <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.updateBtn}
                                onPress={handleChangePassword}
                                disabled={passLoading}
                            >
                                {passLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.updateBtnText}>पासवर्ड अपडेट करें</Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <TouchableOpacity
                        style={[styles.menuItem, activeSection === 'help' && styles.menuItemActive]}
                        onPress={() => openSection('help')}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: '#fef3c7' }]}>
                            <Ionicons name="help-buoy-outline" size={22} color="#d97706" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuLabel}>सहायता केंद्र</Text>
                            <Text style={styles.menuSubLabel}>हेल्पलाइन और कस्टमर सपोर्ट</Text>
                        </View>
                        <Ionicons
                            name={activeSection === 'help' ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>

                    {/* Help Center Panel */}
                    {activeSection === 'help' && (
                        <Animated.View style={[styles.expandablePanel, { opacity: slideAnim }]}>
                            {helpLoading ? (
                                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 10 }} />
                            ) : helpItems.length > 0 ? (
                                helpItems.map((item) => (
                                    <View key={item.id} style={styles.infoRow}>
                                        <View style={styles.helpItemLeft}>
                                            <Ionicons name={item.icon_name as any} size={20} color="#64748b" style={{ marginRight: 10 }} />
                                            <Text style={styles.infoLabel}>{item.label_hi}:</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={{ flex: 1, marginLeft: 10 }}
                                            onPress={() => handleHelpAction(item)}
                                            disabled={item.help_type === 'text'}
                                        >
                                            <Text style={[
                                                styles.infoValue,
                                                item.help_type !== 'text' && { color: COLORS.primary },
                                                { textAlign: 'right' }
                                            ]}>
                                                {item.help_key === 'office_address'
                                                    ? item.value.replace('Uttar Pradesh', '\nUttar Pradesh')
                                                    : item.value}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>सहायता उपलब्ध नहीं है</Text>
                            )}
                        </Animated.View>
                    )}

                    {/* Privacy Policy */}
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => Linking.openURL('https://ayodhyatourist.in/Urvarak/upcdc_privacy')}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: '#e0f2fe' }]}>
                            <Ionicons name="shield-checkmark-outline" size={22} color="#0284c7" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuLabel}>गोपनीयता नीति</Text>
                            <Text style={styles.menuSubLabel}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#cbd5e1" />
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <MaterialCommunityIcons name="logout-variant" size={24} color="#ef4444" />
                        <Text style={styles.logoutBtnText}>लॉगआउट करें</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>v{appJson?.expo?.version || '1.0.0'} • {appJson?.expo?.name || 'UPCDC'}</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF7ED',
    },
    flex: {
        flex: 1,
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
    },
    scrollContent: {
        paddingBottom: 50,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        ...SHADOWS.medium,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#FFEDD5',
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarShadow: {
        ...SHADOWS.medium,
        borderRadius: 50,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '900',
        color: '#ffffff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 20,
    },
    strengthContainer: {
        width: '100%',
        marginBottom: 24,
    },
    strengthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    strengthValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#059669',
    },
    strengthBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    strengthBarFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 3,
    },
    statsDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2,
    },
    vDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
    },
    menuContainer: {
        marginTop: 30,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#94a3b8',
        marginBottom: 16,
        paddingLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        width: '88%',
        alignSelf: 'center',
        ...SHADOWS.small,
    },
    menuItemActive: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginBottom: 0,
    },
    menuIconBg: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1e293b',
    },
    menuSubLabel: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 2,
    },
    expandablePanel: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderTopWidth: 0,
        width: '89%',
        alignSelf: 'center',
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569fc',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    textInput: {
        flex: 1,
        fontSize: 20,
        color: '#1e293bff',
        paddingHorizontal: 10,
        fontWeight: '600',
    },
    updateBtn: {
        backgroundColor: '#1e293b',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        ...SHADOWS.medium,
    },
    updateBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        padding: 11,
        marginHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutBtnText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#ef4444',
        marginLeft: 10,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 24,
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
        flexShrink: 1,
    },
    helpItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noDataText: {
        textAlign: 'center',
        paddingVertical: 10,
        color: '#94a3b8',
        fontSize: 14,
    }
});

export default RetailerProfileScreen;
