import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/config';
import { apiFetch } from '../utils/apiClient';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SetMpinModalProps {
    visible: boolean;
    mobile: string;
    onSuccess: (mpin: string) => void;
    onCancel: () => void;
}

export const SetMpinModal: React.FC<SetMpinModalProps> = ({
    visible,
    mobile,
    onSuccess,
    onCancel,
}) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<'pin' | 'confirm' | null>(null);

    const pinInputRef = useRef<TextInput>(null);
    const confirmInputRef = useRef<TextInput>(null);

    // Smooth autofocus after modal slide animation finishes
    useEffect(() => {
        if (visible) {
            setPin('');
            setConfirmPin('');
            setError('');
            setFocusedField('pin');
            const timer = setTimeout(() => {
                pinInputRef.current?.focus();
            }, 350);
            return () => clearTimeout(timer);
        } else {
            setFocusedField(null);
        }
    }, [visible]);

    const handleSave = async () => {
        setError('');
        if (pin.length !== 4) {
            setError('कृपया 4 अंकों का नया MPIN दर्ज करें');
            return;
        }

        if (confirmPin.length !== 4) {
            setError('कृपया MPIN की पुनः पुष्टि (Confirm) करें');
            return;
        }

        if (pin !== confirmPin) {
            setError('दोनों MPIN मेल नहीं खाते। कृपया पुनः जांचें।');
            return;
        }

        setLoading(true);
        try {
            // Save to backend
            const response = await apiFetch(API_ENDPOINTS.loginFarmer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_mpin',
                    mobile: mobile,
                    mpin: pin,
                }),
            });

            const result = await response.json();
            if (result.success) {
                // Save locally for instant offline-safe login
                await AsyncStorage.setItem(`@farmer_mpin_${mobile}`, pin);
                await AsyncStorage.setItem('@last_farmer_mobile', mobile);
                onSuccess(pin);
            } else {
                setError(result.message || 'MPIN सेट करने में विफल। पुनः प्रयास करें।');
            }
        } catch (e: any) {
            console.error('Error setting MPIN:', e);
            // Save locally so farmer is not blocked on network errors
            await AsyncStorage.setItem(`@farmer_mpin_${mobile}`, pin);
            await AsyncStorage.setItem('@last_farmer_mobile', mobile);
            onSuccess(pin);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={() => {
                // Strictly prevent closing without setting MPIN
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.card}>
                        {/* Header Icon */}
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.iconCircle}
                        >
                            <MaterialCommunityIcons
                                name="shield-key"
                                size={isTablet ? 42 : moderateScale(32)}
                                color="#FFFFFF"
                            />
                        </LinearGradient>

                        <Text style={styles.title}>4 अंकों का MPIN बनाएं</Text>
                        <Text style={styles.subtitle}>
                            भविष्य में बिना बार-बार OTP लिए तुरंत लॉगिन करने के लिए अपना सुरक्षा MPIN सेट करें।
                        </Text>

                        {/* Mandatory Badge */}
                        <View style={styles.mandatoryBadge}>
                            <MaterialCommunityIcons name="alert-decagram" size={moderateScale(15)} color="#B45309" />
                            <Text style={styles.mandatoryText}>
                                डैशबोर्ड पर जाने के लिए MPIN सेट करना अनिवार्य है
                            </Text>
                        </View>

                        {/* Step 1: Enter 4-digit PIN */}
                        <Text style={styles.inputLabel}>नया 4 अंकों का MPIN:</Text>
                        <View style={styles.pinContainer}>
                            <TextInput
                                ref={pinInputRef}
                                style={styles.touchableNativeInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                value={pin}
                                onChangeText={(val) => {
                                    const clean = val.replace(/[^0-9]/g, '');
                                    setPin(clean);
                                    setError('');
                                    if (clean.length === 4) {
                                        confirmInputRef.current?.focus();
                                        setFocusedField('confirm');
                                    }
                                }}
                                onFocus={() => setFocusedField('pin')}
                                onBlur={() => {
                                    if (focusedField === 'pin') setFocusedField(null);
                                }}
                                caretHidden={true}
                                selectTextOnFocus={false}
                            />
                            <View style={styles.digitsRow} pointerEvents="none">
                                {[0, 1, 2, 3].map((idx) => {
                                    const digit = pin[idx];
                                    const isCurrentActive = focusedField === 'pin' && pin.length === idx;
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.digitBox,
                                                digit ? styles.digitBoxFilled : null,
                                                isCurrentActive ? styles.digitBoxActive : null,
                                            ]}
                                        >
                                            <Text style={styles.digitText}>{digit ? '●' : ''}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Step 2: Confirm 4-digit PIN */}
                        <Text style={[styles.inputLabel, { marginTop: verticalScale(14) }]}>
                            MPIN पुनः दर्ज करें (Confirm):
                        </Text>
                        <View style={styles.pinContainer}>
                            <TextInput
                                ref={confirmInputRef}
                                style={styles.touchableNativeInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                value={confirmPin}
                                onChangeText={(val) => {
                                    const clean = val.replace(/[^0-9]/g, '');
                                    setConfirmPin(clean);
                                    setError('');
                                }}
                                onFocus={() => setFocusedField('confirm')}
                                onBlur={() => {
                                    if (focusedField === 'confirm') setFocusedField(null);
                                }}
                                caretHidden={true}
                                selectTextOnFocus={false}
                            />
                            <View style={styles.digitsRow} pointerEvents="none">
                                {[0, 1, 2, 3].map((idx) => {
                                    const digit = confirmPin[idx];
                                    const isCurrentActive = focusedField === 'confirm' && confirmPin.length === idx;
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.digitBox,
                                                digit ? styles.digitBoxFilled : null,
                                                isCurrentActive ? styles.digitBoxActive : null,
                                            ]}
                                        >
                                            <Text style={styles.digitText}>{digit ? '●' : ''}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Error display */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <MaterialCommunityIcons name="alert-circle" size={moderateScale(16)} color="#DC2626" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Quota benefit badge */}
                        <View style={styles.benefitBadge}>
                            <MaterialCommunityIcons name="check-decagram" size={moderateScale(16)} color="#059669" />
                            <Text style={styles.benefitText}>
                                अगली बार केवल इस 4 अंकों के PIN से तुरंत लॉगिन होगा (SMS की ज़रूरत नहीं)!
                            </Text>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                (pin.length !== 4 || confirmPin.length !== 4 || loading) && styles.disabledButton,
                            ]}
                            activeOpacity={0.85}
                            onPress={handleSave}
                            disabled={pin.length !== 4 || confirmPin.length !== 4 || loading}
                        >
                            <LinearGradient
                                colors={
                                    pin.length === 4 && confirmPin.length === 4
                                        ? ['#16A34A', '#15803D']
                                        : ['#9CA3AF', '#6B7280']
                                }
                                style={styles.gradientBtn}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name="lock-check"
                                            size={moderateScale(20)}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.saveButtonText}>MPIN सुरक्षित करें</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Cancel Login Button (Takes user back to login, never dashboard) */}
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.cancelBtn}
                            activeOpacity={0.7}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={moderateScale(16)} color="#6B7280" />
                            <Text style={styles.cancelBtnText}>रद्द करें और लॉगिन पर लौटें</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: verticalScale(20),
        paddingHorizontal: scale(16),
    },
    card: {
        width: '100%',
        maxWidth: isTablet ? scale(460) : Math.min(SCREEN_WIDTH - scale(28), 380),
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(22),
        paddingTop: verticalScale(24),
        paddingBottom: verticalScale(20),
        paddingHorizontal: scale(18),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    iconCircle: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(10),
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    title: {
        fontSize: moderateScale(19),
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: verticalScale(4),
    },
    subtitle: {
        fontSize: moderateScale(12.5),
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: moderateScale(18),
        marginBottom: verticalScale(12),
        paddingHorizontal: scale(4),
    },
    mandatoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(10),
        borderRadius: moderateScale(8),
        marginBottom: verticalScale(14),
        borderWidth: 1,
        borderColor: '#FDE68A',
        width: '100%',
    },
    mandatoryText: {
        fontSize: moderateScale(11.5),
        color: '#92400E',
        fontWeight: '600',
        marginLeft: scale(6),
        flex: 1,
    },
    inputLabel: {
        alignSelf: 'flex-start',
        fontSize: moderateScale(12.5),
        fontWeight: '700',
        color: '#374151',
        marginBottom: verticalScale(6),
        marginLeft: scale(4),
    },
    pinContainer: {
        width: '100%',
        height: verticalScale(54),
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
    digitsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: scale(4),
    },
    digitBox: {
        width: scale(60),
        height: verticalScale(50),
        borderRadius: moderateScale(12),
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    digitBoxFilled: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    digitBoxActive: {
        borderColor: '#059669',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },
    digitText: {
        fontSize: moderateScale(22),
        color: '#065F46',
        fontWeight: '700',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(10),
        backgroundColor: '#FEE2E2',
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(10),
        borderRadius: moderateScale(8),
        width: '100%',
    },
    errorText: {
        color: '#DC2626',
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginLeft: scale(6),
        flex: 1,
    },
    benefitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(10),
        marginVertical: verticalScale(12),
        borderWidth: 1,
        borderColor: '#BBF7D0',
        width: '100%',
    },
    benefitText: {
        fontSize: moderateScale(11.5),
        color: '#166534',
        marginLeft: scale(6),
        flex: 1,
        lineHeight: moderateScale(16),
        fontWeight: '500',
    },
    saveButton: {
        width: '100%',
        borderRadius: moderateScale(14),
        overflow: 'hidden',
        marginTop: verticalScale(4),
    },
    disabledButton: {
        opacity: 0.65,
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(13),
        paddingHorizontal: scale(16),
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: moderateScale(15),
        fontWeight: '700',
        marginLeft: scale(8),
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(10),
    },
    cancelBtnText: {
        color: '#6B7280',
        fontSize: moderateScale(12.5),
        fontWeight: '600',
        marginLeft: scale(4),
    },
});

export default SetMpinModal;
