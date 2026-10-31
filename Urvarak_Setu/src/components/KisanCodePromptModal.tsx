import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants';
import { moderateScale } from '../utils/responsive';

interface KisanCodePromptModalProps {
    visible: boolean;
    farmerName?: string;
    onSave: (code: string) => Promise<boolean | void>;
}

export default function KisanCodePromptModal({
    visible,
    farmerName,
    onSave,
}: KisanCodePromptModalProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const clean = code.trim().replace(/[^0-9]/g, '');
        if (!clean) {
            setError('कृपया 10 अंकों का कृषक पंजिका कोड दर्ज करें');
            return;
        }
        if (clean.length !== 10) {
            setError('कृषक पंजिका कोड ठीक 10 अंकों का होना चाहिए');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const success = await onSave(clean);
            if (success !== false) {
                setCode('');
            }
        } catch (e: any) {
            setError(e?.message || 'कोड सहेजने में विफल। कृपया पुनः प्रयास करें।');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => {
                // Non-dismissable modal: farmer must enter the 10-digit code
            }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.backdrop}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.centerContainer}
                    >
                        <View style={styles.card}>
                            {/* Icon Header */}
                            <View style={styles.iconWrapper}>
                                <MaterialCommunityIcons name="shield-check" size={42} color={COLORS.primary} />
                            </View>

                            {/* Title & Description */}
                            <Text style={styles.title}>कृषक पंजिका कोड अनिवार्य है</Text>
                            <Text style={styles.subtitle}>
                                {farmerName ? `नमस्ते ${farmerName} जी! ` : 'नमस्ते किसान भाई! '}
                                उर्वरक सेवाओं और टोकन बुकिंग जारी रखने के लिए अपना 10 अंकों का कृषक पंजिका कोड दर्ज करें।
                            </Text>

                            {/* Input Field */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>10 अंकों का कृषक पंजिका कोड *</Text>
                                <View style={[styles.inputBox, !!error && styles.inputBoxError]}>
                                    <MaterialCommunityIcons
                                        name="numeric"
                                        size={22}
                                        color={error ? COLORS.error : COLORS.primary}
                                        style={{ marginRight: 8 }}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="10 अंकों का कोड दर्ज करें"
                                        placeholderTextColor="#94A3B8"
                                        value={code}
                                        onChangeText={(t) => {
                                            const numericOnly = t.replace(/[^0-9]/g, '');
                                            setCode(numericOnly);
                                            if (error) setError('');
                                        }}
                                        keyboardType="numeric"
                                        maxLength={10}
                                        autoCorrect={false}
                                        editable={!loading}
                                    />
                                    <Text style={styles.counterText}>{code.length}/10</Text>
                                </View>
                                {!!error && (
                                    <Text style={styles.errorText}>
                                        <Ionicons name="alert-circle" size={13} color={COLORS.error} /> {error}
                                    </Text>
                                )}
                            </View>

                            {/* Action Button - Mandatory Submission */}
                            <TouchableOpacity
                                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <View style={styles.btnRow}>
                                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                        <Text style={styles.saveBtnText}>दर्ज करें और सुरक्षित करें</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    centerContainer: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 28,
        paddingBottom: 24,
        alignItems: 'center',
        ...SHADOWS.large,
        elevation: 12,
    },
    iconWrapper: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: moderateScale(19),
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: moderateScale(13),
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
        marginLeft: 2,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: '#F8FAFC',
        height: 52,
    },
    inputBoxError: {
        borderColor: COLORS.error,
        backgroundColor: '#FEF2F2',
    },
    input: {
        flex: 1,
        fontSize: moderateScale(16),
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 2,
    },
    counterText: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: '#94A3B8',
        marginLeft: 6,
    },
    errorText: {
        color: COLORS.error,
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
    },
    saveBtn: {
        width: '100%',
        height: 52,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        elevation: 4,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: moderateScale(15),
        fontWeight: '800',
    },
});
