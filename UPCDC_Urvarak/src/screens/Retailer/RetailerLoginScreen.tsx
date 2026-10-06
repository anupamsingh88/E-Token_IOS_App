import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Image,
    TextInput,
    Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import AlertModal from '../../components/AlertModal';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    SHADOWS,
} from '../../constants';
import { API_ENDPOINTS } from '../../config/config';
import { apiFetch, setRetailerTokenCache } from '../../utils/apiClient';

interface RetailerLoginScreenProps {
    onLoginSuccess: (isSuperAdmin: boolean, retailerId?: string, setupRequired?: boolean) => void;
    onWebkitLogin?: (url: string, postData?: any, username?: string) => void;
    navigation?: any;
}

// Icon Components
const UserIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const LockIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const EyeIcon = ({ size = 22, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 15a3 3 0 100-6 3 3 0 000 6z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const EyeOffIcon = ({ size = 22, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default function RetailerLoginScreen({
    onLoginSuccess,
    onWebkitLogin,
    navigation
}: RetailerLoginScreenProps) {
    const [retailerId, setRetailerId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ retailerId?: string; password?: string }>({});

    // Alert Modal State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'info';
        title: string;
        message: string;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });

    const [pendingLoginData, setPendingLoginData] = useState<{ isSuperAdmin: boolean; retailerId?: string; setupRequired?: boolean } | null>(null);

    const validate = () => {
        const newErrors: { retailerId?: string; password?: string } = {};

        if (!retailerId.trim()) newErrors.retailerId = 'यूजर आईडी / रिटेलर आईडी आवश्यक है';
        if (!password.trim()) newErrors.password = 'पासवर्ड आवश्यक है';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('retailer_id', retailerId);
            formData.append('password', password);

            const response = await apiFetch(API_ENDPOINTS.loginRetailer, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                // Check if user is from secondary DB (UPCDC WebKit portal)
                if (result.login_type === 'webkit') {
                    const targetUrl = result.url || API_ENDPOINTS.upcdcPortal;
                    const postData = result.post_data || { submit: 'submit', username: retailerId, userpwd: password };
                    const displayName = result.data?.name || result.data?.username || retailerId;

                    if (onWebkitLogin) {
                        onWebkitLogin(targetUrl, postData, displayName);
                    } else if (navigation) {
                        navigation.replace('WebkitScreen', {
                            url: targetUrl,
                            postData,
                            username: displayName,
                        });
                    }
                    return;
                }

                if (result.token) {
                    await AsyncStorage.setItem('retailer_token', result.token);
                    setRetailerTokenCache(result.token);
                }

                if (result.data.user_type === 'superadmin') {
                    setAlertConfig({
                        visible: true,
                        type: 'success',
                        title: 'सफल',
                        message: 'SuperAdmin लॉगिन सफल!',
                    });
                    setPendingLoginData({ isSuperAdmin: true });
                } else {
                    setAlertConfig({
                        visible: true,
                        type: 'success',
                        title: 'सफल',
                        message: `स्वागत है, ${result.data.name}!`,
                    });
                    setPendingLoginData({
                        isSuperAdmin: false,
                        retailerId: result.data.retailer_id?.toString(),
                        setupRequired: result.data.forced_setup === 1 || result.data.forced_setup === true
                    });
                }
            } else {
                // If district is restricted by backend, do NOT attempt UPCDC webkit fallback
                if (!result.district_restricted) {
                    // Smart Fallback: Verify directly against UPCDC portal
                    // This ensures instant login even if live backend files are not yet uploaded to cPanel
                    try {
                        const upcdcBody = `submit=submit&username=${encodeURIComponent(retailerId)}&userpwd=${encodeURIComponent(password)}`;
                        const upcdcCheck = await fetch(API_ENDPOINTS.upcdcCheck, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: upcdcBody,
                        });

                        const html = await upcdcCheck.text();
                        const hasError = (
                            html.includes('Invalid Username or Password') ||
                            html.includes('Please Enter Valid User')
                        );

                        // If credentials matched on UPCDC, redirect to WebkitScreen immediately!
                        if (!hasError && (html.includes('UPCDC') || html.includes('service-card') || html.includes('custom-sidebar') || html.includes('PHPSESSID') || html.includes('index_1.php') || html.includes('index_3.php'))) {
                            const targetUrl = API_ENDPOINTS.upcdcPortal;
                            const postData = { submit: 'submit', username: retailerId, userpwd: password };

                            if (onWebkitLogin) {
                                onWebkitLogin(targetUrl, postData, retailerId);
                            } else if (navigation) {
                                navigation.replace('WebkitScreen', {
                                    url: targetUrl,
                                    postData,
                                    username: retailerId,
                                });
                            }
                            return;
                        }
                    } catch (fallbackError) {
                        console.warn('UPCDC direct validation error:', fallbackError);
                    }
                }

                setAlertConfig({
                    visible: true,
                    type: 'error',
                    title: result.district_restricted ? 'सेवा उपलब्ध नहीं है' : 'लॉगिन विफल',
                    message: result.message || 'आपका क्रडेंशियल्स सही नहीं हैं',
                });
            }
        } catch (error: any) {
            console.error('Login error:', error);
            let loginError = 'कुछ गलत हो गया। कृपया दोबारा कोशिश करें।';
            if (error.name === 'AbortError') {
                loginError = 'आपका नेटवर्क बहुत धीमा है। कृपया कुछ देर बाद दोबारा कोशिश करें।';
            } else if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                loginError = 'इंटरनेट कनेक्शन नहीं है। कृपया अपना Wi-Fi या मोबाइल डेटा जांचें।';
            }
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'नेटवर्क त्रुटि',
                message: loginError,
            });
        } finally {
            setLoading(false);
        }
    };

    const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Image
                source={require('../../../assets/retailer.png')}
                style={[
                    styles.backgroundImage,
                    { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
                ]}
                resizeMode="cover"
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {/* Hidden view to trigger layout */}
                        <View style={{ height: 1 }} />

                        {/* Glass Card */}
                        <View style={styles.glassCard}>
                            {/* Header with Title + Logo */}
                            <View style={styles.headerRow}>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.title}>लॉगिन</Text>
                                </View>
                                <LogoPlaceholder size={75} />
                            </View>

                            {/* Retailer ID Input */}
                            <View style={[styles.inputContainer, errors.retailerId ? styles.inputErrorBorder : null]}>
                                <View style={styles.iconCircle}>
                                    <UserIcon size={20} color={COLORS.white} />
                                </View>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="यूजर आईडी / रिटेलर आईडी दर्ज करें"
                                    placeholderTextColor="#9B8EC4"
                                    value={retailerId}
                                    onChangeText={(text) => {
                                        setRetailerId(text);
                                        if (errors.retailerId) setErrors({ ...errors, retailerId: undefined });
                                    }}
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                            </View>
                            {errors.retailerId && (
                                <Text style={styles.errorText}>{errors.retailerId}</Text>
                            )}

                            {/* Password Input with Visibility Toggle */}
                            <View style={[styles.inputContainer, errors.password ? styles.inputErrorBorder : null]}>
                                <View style={styles.iconCircle}>
                                    <LockIcon size={20} color={COLORS.white} />
                                </View>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="पासवर्ड दर्ज करें"
                                    placeholderTextColor="#9B8EC4"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors({ ...errors, password: undefined });
                                    }}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    activeOpacity={0.7}
                                    accessibilityLabel={showPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon size={22} color={COLORS.primary} />
                                    ) : (
                                        <EyeIcon size={22} color="#9B8EC4" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {errors.password && (
                                <Text style={styles.errorText}>{errors.password}</Text>
                            )}

                            {/* Login Button */}
                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {loading ? 'लॉगिन हो रहा है...' : 'लॉगिन करें'}
                                </Text>
                                <Text style={styles.buttonChevron}>›</Text>
                            </TouchableOpacity>

                            {/* Security Info */}
                            <View style={styles.securitySection}>
                                <View style={styles.securityItem}>
                                    <Text style={styles.securityIcon}>✓</Text>
                                    <Text style={styles.securityText}>आपका डेटा सुरक्षित है</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Text style={styles.securityIcon}>🏪</Text>
                                    <Text style={styles.securityText}>केवल सत्यापित रिटेलर उपयोग कर सकते हैं</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <AlertModal
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => {
                    setAlertConfig({ ...alertConfig, visible: false });
                    if (pendingLoginData) {
                        onLoginSuccess(pendingLoginData.isSuperAdmin, pendingLoginData.retailerId, pendingLoginData.setupRequired);
                        setPendingLoginData(null);
                    }
                }}
            />
        </View>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('screen');

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
        paddingHorizontal: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xxl : 80,
    },
    glassCard: {
        backgroundColor: 'rgba(245, 243, 255, 0.95)',
        borderWidth: 1.5,
        borderColor: 'rgba(124, 58, 237, 0.2)',
        borderRadius: 24,
        paddingVertical: 20, // Reduced from 28
        paddingHorizontal: 20, // Reduced from 22
        marginTop: 10,
        elevation: 8,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10, // Even more compact
        paddingHorizontal: SPACING.xs,
    },
    headerTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primaryDark,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0ECFF',
        borderRadius: 30,
        height: 56,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#D4CCFF',
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
    },
    inputErrorBorder: {
        borderColor: COLORS.error,
        borderWidth: 1.5,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 18,
        color: '#333',
        height: '100%',
        fontWeight: '600',
    },
    eyeButton: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        marginLeft: 16,
        marginTop: -6,
        marginBottom: 10,
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 30,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginTop: 8,
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: '#C4B5FD',
        elevation: 0,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 4,
    },
    buttonChevron: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: 'bold',
        lineHeight: 28,
        marginTop: -2,
    },
    securitySection: {
        alignItems: 'center',
        marginTop: 4,
    },
    securityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    securityIcon: {
        fontSize: 16,
        marginRight: 6,
        color: COLORS.primary,
    },
    securityText: {
        fontSize: 14,
        color: COLORS.primaryDark,
        fontWeight: '600',
    },
});
