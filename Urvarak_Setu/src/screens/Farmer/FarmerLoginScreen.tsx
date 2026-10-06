import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Image,
    Alert,
    ImageBackground,
    TextInput,
    Dimensions
} from 'react-native';

import CustomAlert from '../../components/CustomAlert';
import OTPInput from '../../components/OTPInput/OTPInput';
import SetMpinModal from '../../components/SetMpinModal';
import { PhoneIcon, LockIcon } from '../../components/FormIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    HINDI_TEXT,
    SHADOWS,
    BORDER_RADIUS,
} from '../../constants';
// ParticleBackground replaced by custom ImageBackground
import { API_ENDPOINTS } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';


interface FarmerLoginScreenProps {
    onLogin: (farmer: any, token: string) => void;
    onBack: () => void;
    onRegister: () => void;
}

export default function FarmerLoginScreen({
    onLogin,
    onBack,
    onRegister,
}: FarmerLoginScreenProps) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [mpin, setMpin] = useState('');
    const [loginMode, setLoginMode] = useState<'mpin' | 'otp'>('otp');
    const [hasMpin, setHasMpin] = useState<boolean | null>(null);
    const [showSetMpinModal, setShowSetMpinModal] = useState(false);
    const [pendingAuth, setPendingAuth] = useState<{ farmer: any; token: string } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mpinInputRef = useRef<TextInput | null>(null);

    // Auto-load last mobile and check if MPIN is set
    useEffect(() => {
        const loadSavedState = async () => {
            try {
                const lastMobile = await AsyncStorage.getItem('@last_farmer_mobile');
                if (lastMobile && /^[0-9]{10}$/.test(lastMobile)) {
                    setMobileNumber(lastMobile);
                    checkMpinStatus(lastMobile);
                }
            } catch (e) {
                console.error('Error loading saved mobile:', e);
            }
        };
        loadSavedState();
    }, []);

    const checkMpinStatus = async (phone: string) => {
        const clean = phone.replace(/[^0-9]/g, '');
        if (clean.length !== 10) return;

        // 1. Instant check in local phone storage
        const localPin = await AsyncStorage.getItem(`@farmer_mpin_${clean}`);
        if (localPin) {
            setHasMpin(true);
            setLoginMode('mpin');
            return;
        }

        // 2. Check with backend
        try {
            const res = await apiFetch(API_ENDPOINTS.loginFarmer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_status',
                    mobile: clean,
                }),
            });
            const data = await res.json();
            if (data.success && data.has_mpin) {
                setHasMpin(true);
                setLoginMode('mpin');
            } else {
                setHasMpin(false);
                setLoginMode('otp');
            }
        } catch (e) {
            setHasMpin(false);
            setLoginMode('otp');
        }
    };

    const handleMobileChange = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '');
        setMobileNumber(clean);
        if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: '' }));
        if (clean.length === 10) {
            checkMpinStatus(clean);
        } else {
            setHasMpin(null);
            setLoginMode('otp');
            setMpin('');
        }
    };

    const startResendTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setResendTimer(60);
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
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!mobileNumber.trim()) {
            newErrors.mobileNumber = 'मोबाइल नंबर आवश्यक है';
        } else if (!/^[0-9]{10}$/.test(mobileNumber)) {
            newErrors.mobileNumber = 'मोबाइल नंबर 10 अंकों का होना चाहिए';
        }

        if (loginMode === 'mpin' && !otpSent) {
            if (!mpin.trim() || mpin.length < 4) {
                newErrors.mpin = '4 अंकों का MPIN आवश्यक है';
            }
        } else if (otpSent && !otp.trim()) {
            newErrors.otp = 'OTP आवश्यक है';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [alertState, setAlertState] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setAlertState({ visible: true, title, message, type });
    };

    const handleSendOtp = async () => {
        // 1. Inline Error for Incomplete Number
        if (!mobileNumber.trim() || mobileNumber.length < 10) {
            setErrors({ mobileNumber: 'मोबाइल नंबर पूरा 10 अंकों का होना चाहिए' });
            return;
        }

        // 2. Strict Validation Patterns
        const isAllSame = /^(\d)\1{9}$/.test(mobileNumber); // e.g. 9999999999
        const hasRepeatingEnd = /^[0-9]{4}(\d)\1{5}$/.test(mobileNumber); // e.g. 9876555555
        const isValidPrefix = /^[6-9]\d{9}$/.test(mobileNumber); // Starts with 6-9

        if (isAllSame || hasRepeatingEnd || !isValidPrefix) {
            showAlert('त्रुटि', 'यह नंबर अमान्य है। कृपया सही मोबाइल नंबर डालें।', 'error');
            return;
        }

        setLoading(true);
        try {
            console.log('🔵 Sending OTP to:', API_ENDPOINTS.sendOtp);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await apiFetch(API_ENDPOINTS.sendOtp, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: mobileNumber }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (result.success) {
                setOtpSent(true);
                startResendTimer();
                showAlert('सफल', result.message || 'OTP भेज दिया गया है', 'success');
            } else {
                showAlert('त्रुटि', result.message || 'OTP भेजने में त्रुटि', 'error');
            }
        } catch (error: any) {
            console.error('❌ Send OTP Error:', error);
            let errorMessage = 'कुछ गलत हो गया। कृपया दोबारा कोशिश करें।';
            if (error.name === 'AbortError') {
                errorMessage = 'आपका नेटवर्क बहुत धीमा है। कृपया कुछ देर बाद दोबारा कोशिश करें।';
            } else if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                errorMessage = 'इंटरनेट कनेक्शन नहीं है। कृपया अपना Wi-Fi या मोबाइल डेटा जांचें।';
            }
            showAlert('नेटवर्क त्रुटि', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || loading) return;
        setOtp('');
        setErrors((prev) => ({ ...prev, otp: '' }));
        await handleSendOtp();
    };

    const handleChangeNumber = () => {
        setOtpSent(false);
        setOtp('');
        setMpin('');
        setResendTimer(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    const handleSwitchToOtp = async () => {
        setLoginMode('otp');
        setOtpSent(false);
        setOtp('');
        await handleSendOtp();
    };

    const handleSwitchToMpin = () => {
        setLoginMode('mpin');
        setOtpSent(false);
        setOtp('');
    };

    const handleLoginWithMpin = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.loginFarmer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: mobileNumber,
                    mpin: mpin,
                }),
            });

            const result = await response.json();

            if (result.success) {
                await AsyncStorage.setItem('@last_farmer_mobile', mobileNumber);
                await AsyncStorage.setItem(`@farmer_mpin_${mobileNumber}`, mpin);
                onLogin(result.farmer, result.token);
            } else if (result.need_otp) {
                setLoginMode('otp');
                showAlert('सूचना', result.message || 'कृपया पहले OTP से लॉगिन करें।', 'info');
                await handleSendOtp();
            } else {
                showAlert('त्रुटि', result.message || 'गलत MPIN दर्ज किया गया है।', 'error');
            }
        } catch (error: any) {
            console.error('MPIN Login Error:', error);
            showAlert('नेटवर्क त्रुटि', 'लॉगिन करने में असमर्थ। कृपया इंटरनेट कनेक्शन जांचें।', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.loginFarmer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: mobileNumber,
                    otp: otp,
                }),
            });

            const result = await response.json();

            if (result.success) {
                await AsyncStorage.setItem('@last_farmer_mobile', mobileNumber);

                // If MPIN is not yet set, prompt them to create it!
                if (!result.has_mpin) {
                    setPendingAuth({ farmer: result.farmer, token: result.token });
                    setShowSetMpinModal(true);
                } else {
                    onLogin(result.farmer, result.token);
                }
            } else {
                showAlert('त्रुटि', result.message || 'OTP गलत है। कृपया सही OTP डालें।', 'error');
            }
        } catch (error: any) {
            console.error('Login Error:', error);
            let loginError = 'कुछ गलत हो गया। कृपया दोबारा कोशिश करें।';
            if (error.name === 'AbortError') {
                loginError = 'आपका नेटवर्क बहुत धीमा है। कृपया कुछ देर बाद दोबारा कोशिश करें।';
            } else if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                loginError = 'इंटरनेट कनेक्शन नहीं है। कृपया अपना Wi-Fi या मोबाइल डेटा जांचें।';
            }
            showAlert('नेटवर्क त्रुटि', loginError, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMpinSetSuccess = (savedMpin: string) => {
        setShowSetMpinModal(false);
        setHasMpin(true);
        if (pendingAuth) {
            onLogin(pendingAuth.farmer, pendingAuth.token);
        }
    };

    const handleMpinCancel = () => {
        setShowSetMpinModal(false);
        setPendingAuth(null);
        showAlert('सूचना', 'डैशबोर्ड पर जाने के लिए MPIN सेट करना अनिवार्य है।', 'warning');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#D49544' }}>
            <Image
                source={require('../../../assets/Farmer in golden wheat field.png')}
                style={[
                    styles.backgroundImage,
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        transform: [
                            { scale: LAYOUT.bgScale },
                            { translateY: LAYOUT.bgTranslateY }
                        ]
                    }
                ]}
                resizeMode="cover"
                blurRadius={0}
            />
            <View style={[styles.safeArea, { paddingTop: STATUS_BAR_HEIGHT }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            {
                                paddingBottom: LAYOUT.scrollPaddingBottom
                            }
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Flex-end pushes the card to the bottom, keeping the farmer and bag visible at the top */}

                        {/* Glass Card */}
                        <View style={styles.glassCard}>
                            <Text style={styles.title}>किसान लॉगिन</Text>
                            <Text style={styles.subtitle}>
                                मोबाइल नंबर से सुरक्षित लॉगिन करें
                            </Text>

                            {/* Custom Input */}
                            {!otpSent ? (
                                <>
                                    <View style={[styles.inputContainer, errors.mobileNumber ? styles.inputErrorBorder : null]}>
                                        <View style={styles.iconCircle}>
                                            <PhoneIcon size={isTablet ? 24 : 20} color={COLORS.white} />
                                        </View>

                                        <View style={styles.prefixContainer}>
                                            <Text style={styles.prefixText}>+91 </Text>
                                            <Text style={styles.dividerText}>|</Text>
                                        </View>

                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="मोबाइल नंबर"
                                            placeholderTextColor="#A07D5A"
                                            value={mobileNumber}
                                            onChangeText={handleMobileChange}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            editable={!loading}
                                        />
                                    </View>

                                    {/* MPIN Input Section (When user has MPIN set) */}
                                    {loginMode === 'mpin' && (
                                        <View style={styles.mpinWrapper}>
                                            <View style={styles.mpinHeaderRow}>
                                                <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#8A5A2B" />
                                                <Text style={styles.mpinHeadingText}>4 अंकों का सुरक्षा MPIN डालें</Text>
                                            </View>

                                            <View style={styles.pinContainer}>
                                                <TextInput
                                                    ref={mpinInputRef}
                                                    style={styles.touchableNativeInput}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                    value={mpin}
                                                    onChangeText={(val) => {
                                                        const clean = val.replace(/[^0-9]/g, '');
                                                        setMpin(clean);
                                                        if (errors.mpin) setErrors((prev) => ({ ...prev, mpin: '' }));
                                                    }}
                                                    caretHidden={true}
                                                    editable={!loading}
                                                />
                                                <View style={styles.mpinBoxesRow} pointerEvents="none">
                                                    {[0, 1, 2, 3].map((idx) => {
                                                        const digit = mpin[idx];
                                                        const isFocused = mpin.length === idx;
                                                        return (
                                                            <View
                                                                key={idx}
                                                                style={[
                                                                    styles.mpinBox,
                                                                    digit ? styles.mpinBoxFilled : null,
                                                                    isFocused ? styles.mpinBoxActive : null,
                                                                ]}
                                                            >
                                                                <Text style={styles.mpinBoxText}>{digit ? '●' : ''}</Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {errors.mpin ? (
                                                <Text style={styles.errorText}>{errors.mpin}</Text>
                                            ) : null}

                                            {/* Forgot MPIN Option */}
                                            <TouchableOpacity
                                                onPress={handleSwitchToOtp}
                                                style={styles.forgotMpinBtn}
                                                activeOpacity={0.7}
                                                disabled={loading}
                                            >
                                                <MaterialCommunityIcons name="message-alert-outline" size={15} color="#B45309" />
                                                <Text style={styles.forgotMpinText}>MPIN भूल गए? OTP से लॉगिन करें</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* Notice / helper when in OTP mode and MPIN exists */}
                                    {loginMode === 'otp' && hasMpin && (
                                        <TouchableOpacity
                                            onPress={handleSwitchToMpin}
                                            style={styles.backToMpinBtn}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons name="key-outline" size={15} color="#15803D" />
                                            <Text style={styles.backToMpinText}>वापस MPIN से लॉगिन करें</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            ) : (
                                <View style={{ marginBottom: 15 }}>
                                    <OTPInput
                                        value={otp}
                                        onChange={(value) => {
                                            setOtp(value);
                                            if (errors.otp) {
                                                setErrors((prev) => ({ ...prev, otp: '' }));
                                            }
                                        }}
                                        error={errors.otp}
                                    />
                                </View>
                            )}

                            {(errors.mobileNumber || errors.otp) && (
                                <Text style={styles.errorText}>
                                    {otpSent ? errors.otp : errors.mobileNumber}
                                </Text>
                            )}

                            {!otpSent && loginMode === 'otp' && (
                                <Text style={styles.otpNote}>
                                    OTP आपके मोबाइल नंबर पर SMS द्वारा भेजा जाएगा
                                </Text>
                            )}

                            {/* OTP Actions: Change Number & Resend OTP with 60s live countdown */}
                            {otpSent && (
                                <View style={styles.otpActionsRow}>
                                    <TouchableOpacity
                                        onPress={handleChangeNumber}
                                        style={styles.changeNumberBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.changeNumberText}>
                                            नंबर बदलें
                                        </Text>
                                    </TouchableOpacity>

                                    {resendTimer > 0 ? (
                                        <View style={styles.resendTimerContainer}>
                                            <Text style={styles.resendTimerText}>
                                                पुनः OTP ({resendTimer}s)
                                            </Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={handleResendOtp}
                                            disabled={loading}
                                            style={styles.resendBtn}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.resendBtnText}>
                                                पुनः OTP भेजें
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={
                                    otpSent
                                        ? handleLogin
                                        : (loginMode === 'mpin' ? handleLoginWithMpin : handleSendOtp)
                                }
                                disabled={loading}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {loading
                                        ? (otpSent
                                            ? "सत्यापित हो रहा है..."
                                            : (loginMode === 'mpin' ? "लॉगिन हो रहा है..." : "OTP भेज रहा है..."))
                                        : (otpSent
                                            ? "सत्यापित करें और लॉगिन करें"
                                            : (loginMode === 'mpin' ? "सुरक्षित लॉगिन करें" : "OTP भेजें"))}
                                </Text>
                                <Text style={styles.buttonChevron}>›</Text>
                            </TouchableOpacity>

                            <View style={styles.securitySection}>
                                <View style={styles.securityItem}>
                                    <Text style={styles.securityIcon}>✓</Text>
                                    <Text style={styles.securityText}>आपका डेटा सुरक्षित है</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Text style={styles.securityIcon}>🌾</Text>
                                    <Text style={styles.securityText}>केवल सत्यापित किसान उपयोग कर सकते हैं</Text>
                                </View>
                            </View>
                        </View>

                        {/* Register Link Outside Card with Glassmorphism */}
                        <View style={styles.registerGlassContainer}>
                            <View style={styles.registerContainer}>
                                <Text style={styles.registerText}>
                                    पहली बार उपयोग कर रहे हैं?
                                </Text>
                                <TouchableOpacity onPress={() => onRegister?.()} activeOpacity={0.7}>
                                    <View style={styles.registerLinkPill}>
                                        <Text style={styles.registerLink}>
                                            पंजीकरण करें
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, visible: false }))}
            />
            <SetMpinModal
                visible={showSetMpinModal}
                mobile={mobileNumber}
                onSuccess={handleMpinSetSuccess}
                onCancel={handleMpinCancel}
            />
        </View>
    );
}

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');
const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;

// Android status bar height (for top safe area padding)
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// Tablet check: standard Android sw600dp (smallest width >= 600dp) or large screen with aspect ratio < 1.85
const isTablet = Math.min(WINDOW_WIDTH, WINDOW_HEIGHT) >= 600 || (aspectRatio < 1.85 && WINDOW_HEIGHT >= 900);

// 3 Screen Height Tiers for phones (only when not a tablet)
const isTaller = !isTablet && (aspectRatio >= 2.18 || WINDOW_HEIGHT >= 840);
const isMedium = !isTablet && !isTaller && (aspectRatio >= 2.0 || WINDOW_HEIGHT >= 730);
const isCompact = !isTablet && !isTaller && !isMedium;

// Perfect circle dimension for phone icon: strictly equal width & height
const iconCircleSize = isTablet ? 44 : (isCompact ? 36 : 40);

const LAYOUT = {
    cardPaddingTop: isTablet ? 22 : (isTaller ? 18 : (isMedium ? 18 : 14)),
    cardPaddingBottom: isTablet ? 20 : (isTaller ? 16 : (isMedium ? 16 : 12)),
    cardPaddingHorizontal: isTablet ? 24 : (isTaller ? 20 : (isMedium ? 20 : 16)),
    titleFontSize: isTablet ? 32 : (isTaller ? 28 : (isMedium ? 28 : 24)),
    subtitleFontSize: isTablet ? 18 : (isTaller ? 16 : (isMedium ? 16 : 14)),
    subtitleMarginBottom: isTablet ? 18 : (isTaller ? 16 : (isMedium ? 16 : 10)),
    inputHeight: isTablet ? 58 : (isTaller ? 50 : (isMedium ? 50 : 46)),
    buttonHeight: isTablet ? 58 : (isTaller ? 50 : (isMedium ? 50 : 46)),
    registerMarginTop: isTablet ? 18 : (isTaller ? 15 : (isMedium ? 15 : 10)),
    registerPaddingVertical: isTablet ? 14 : (isTaller ? 12 : (isMedium ? 12 : 8)),

    // Bottom padding: larger on taller screens (more room), smaller on compact (save space)
    scrollPaddingBottom: isTablet ? SPACING.xxl + 25 : (isTaller ? SPACING.xxl + 20 : (isMedium ? SPACING.xxl + 30 : SPACING.xxl + 40)),

    // Background image adjustments (Scale & Shift):
    // On tablets, translateY is 0 and scale is 1.05 so the image covers the entire screen naturally without any black gap at the top.
    // On phones, translateY is clamped so it never exceeds the scale boundary.
    bgScale: isTablet ? 1.05 : 1.20,
    bgTranslateY: isTablet ? 0 : Math.max(0, Math.min((SCREEN_HEIGHT * 0.45) - 350, ((1.20 - 1) * SCREEN_HEIGHT) / 2)),
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: SPACING.md,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 245, 230, 0.95)', // Increased opacity from 0.85 to 0.95
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        paddingTop: LAYOUT.cardPaddingTop,
        paddingBottom: LAYOUT.cardPaddingBottom,
        paddingHorizontal: LAYOUT.cardPaddingHorizontal,
        marginTop: isCompact ? 8 : (isMedium ? 10 : 20),
        width: '100%',
        maxWidth: isTablet && WINDOW_WIDTH > WINDOW_HEIGHT ? 600 : undefined,
        alignSelf: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    title: {
        fontSize: LAYOUT.titleFontSize,
        fontWeight: 'bold',
        color: '#A04500',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: LAYOUT.subtitleFontSize,
        color: '#704B26',
        textAlign: 'center',
        marginBottom: LAYOUT.subtitleMarginBottom,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5E6',
        borderRadius: 30,
        height: LAYOUT.inputHeight,
        paddingHorizontal: isTablet ? 10 : 8,
        borderWidth: 1.5,
        borderColor: '#FFE0B2',
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    inputErrorBorder: {
        borderColor: COLORS.error,
        borderWidth: 1.5,
    },
    iconCircle: {
        width: iconCircleSize,
        height: iconCircleSize,
        borderRadius: iconCircleSize / 2,
        backgroundColor: '#E67E22',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: isTablet ? 12 : 10,
    },
    prefixContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: isTablet ? 12 : 10,
    },
    prefixText: {
        fontSize: isTablet ? 20 : moderateScale(18),
        fontWeight: 'bold',
        color: '#A04500',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    dividerText: {
        fontSize: isTablet ? 20 : moderateScale(18),
        color: '#D4A373',
        fontWeight: '300',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: isTablet ? 20 : moderateScale(18),
        color: '#333',
        height: '100%',
        fontWeight: '600',
        paddingVertical: 0,
        textAlignVertical: 'center',
        includeFontPadding: false,
    },
    errorText: {
        color: COLORS.error,
        fontSize: isTablet ? 16 : moderateScale(14),
        marginLeft: 16,
        marginTop: -6,
        marginBottom: 10,
        fontWeight: '500',
    },
    otpNote: {
        textAlign: 'center',
        fontSize: isTablet ? 15 : moderateScale(13),
        color: '#8A6342',
        marginBottom: 16,
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: '#E67E22',
        borderRadius: 30,
        height: LAYOUT.buttonHeight,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#D35400',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: isCompact ? 10 : (isMedium ? 14 : 20),
    },
    buttonDisabled: {
        backgroundColor: '#F3C59F',
        elevation: 0,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: isTablet ? 22 : moderateScale(20),
        fontWeight: 'bold',
        marginRight: 4,
    },
    buttonChevron: {
        color: COLORS.white,
        fontSize: isTablet ? 30 : moderateScale(26),
        fontWeight: 'bold',
        lineHeight: isTablet ? 32 : 28,
        marginTop: -2,
    },
    otpActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: -6,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    changeNumberBtn: {
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    changeNumberText: {
        fontSize: isTablet ? 16 : moderateScale(14),
        color: '#A04500',
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    resendTimerContainer: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(160, 69, 0, 0.08)',
        borderRadius: 16,
    },
    resendTimerText: {
        fontSize: isTablet ? 15 : moderateScale(13),
        color: '#8D6E63',
        fontWeight: '600',
    },
    resendBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: '#FFF0D9',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#FFCC80',
        elevation: 2,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    resendBtnText: {
        fontSize: isTablet ? 15 : moderateScale(13),
        color: '#E65100',
        fontWeight: 'bold',
    },
    securitySection: {
        alignItems: 'center',
        marginTop: isTablet ? 8 : 4,
    },
    securityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: isCompact ? 4 : (isMedium ? 6 : (isTablet ? 10 : 8)),
    },
    securityIcon: {
        fontSize: isTablet ? 18 : moderateScale(16),
        marginRight: 6,
        color: '#A04500',
    },
    securityText: {
        fontSize: isTablet ? 16 : moderateScale(14),
        color: '#704B26',
        fontWeight: '600',
    },
    registerGlassContainer: {
        marginTop: LAYOUT.registerMarginTop,
        marginHorizontal: 10,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: '100%',
        maxWidth: isTablet && WINDOW_WIDTH > WINDOW_HEIGHT ? 600 : undefined,
        alignSelf: 'center',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: LAYOUT.registerPaddingVertical,
        paddingHorizontal: 20,
    },
    registerText: {
        fontSize: isTablet ? 18 : moderateScale(16),
        color: '#FFFFFF',
        marginRight: 10,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    registerLinkPill: {
        backgroundColor: '#FF6D00',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    registerLink: {
        fontSize: isTablet ? 18 : moderateScale(16),
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    mpinWrapper: {
        width: '100%',
        marginTop: 10,
        marginBottom: 12,
        alignItems: 'center',
    },
    mpinHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 4,
    },
    mpinHeadingText: {
        fontSize: isTablet ? 16 : moderateScale(13),
        fontWeight: '700',
        color: '#633912',
        marginLeft: 6,
    },
    pinContainer: {
        width: '100%',
        height: isTablet ? 62 : 52,
        position: 'relative',
        justifyContent: 'center',
    },
    touchableNativeInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0.01,
        zIndex: 10,
    },
    mpinBoxesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 8,
    },
    mpinBox: {
        width: isTablet ? 66 : 56,
        height: isTablet ? 60 : 50,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#D49544',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mpinBoxFilled: {
        borderColor: '#8A5A2B',
        backgroundColor: '#FFF8ED',
    },
    mpinBoxActive: {
        borderColor: '#E65100',
        borderWidth: 2,
    },
    mpinBoxText: {
        fontSize: 22,
        color: '#633912',
        fontWeight: 'bold',
    },
    forgotMpinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    forgotMpinText: {
        fontSize: isTablet ? 14 : moderateScale(12),
        color: '#9A3412',
        fontWeight: '700',
        marginLeft: 5,
        textDecorationLine: 'underline',
    },
    backToMpinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 4,
        paddingVertical: 6,
    },
    backToMpinText: {
        fontSize: isTablet ? 14 : moderateScale(12),
        color: '#15803D',
        fontWeight: '700',
        marginLeft: 5,
    },
});
