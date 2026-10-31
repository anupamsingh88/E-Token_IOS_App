import React, { useEffect, useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';

interface ReasonModalProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconBgColor?: string;
    loading?: boolean;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const { width } = Dimensions.get('window');

export const ReasonModal: React.FC<ReasonModalProps> = ({
    visible,
    title,
    subtitle = 'कृपया सटीक व स्पष्ट कारण दर्ज करें:',
    placeholder = 'यहाँ सटीक कारण विस्तार से लिखें...',
    confirmText = 'पुष्टि करें',
    cancelText = 'वापस जाएं',
    confirmColor = COLORS.error,
    iconName = 'alert-circle-outline',
    iconBgColor,
    loading = false,
    onConfirm,
    onCancel,
}) => {
    const [reason, setReason] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const inputRef = useRef<TextInput>(null);

    const resolvedIconBg = iconBgColor || (confirmColor === COLORS.error ? '#FEE2E2' : '#FEF3C7');

    useEffect(() => {
        if (visible) {
            setReason('');
            setErrorMsg('');
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            });
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.92,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleConfirm = () => {
        const trimmed = reason.trim();
        if (!trimmed) {
            setErrorMsg('कृपया आगे बढ़ने के लिए कारण दर्ज करें');
            return;
        }
        if (trimmed.length < 5) {
            setErrorMsg('कृपया कम से कम 5 अक्षरों में सटीक कारण लिखें');
            return;
        }
        setErrorMsg('');
        onConfirm(trimmed);
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.headerIconContainer, { backgroundColor: resolvedIconBg }]}>
                            <Ionicons name={iconName} size={24} color={confirmColor} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.cardTitle, { color: confirmColor }]}>{title}</Text>
                            <Text style={styles.cardSubtitle}>{subtitle}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <TextInput
                            ref={inputRef}
                            style={[
                                styles.textInput,
                                errorMsg ? styles.inputError : null,
                            ]}
                            multiline
                            numberOfLines={4}
                            placeholder={placeholder}
                            placeholderTextColor="#94A3B8"
                            value={reason}
                            onChangeText={(text) => {
                                setReason(text);
                                if (errorMsg) setErrorMsg('');
                            }}
                            textAlignVertical="top"
                            maxLength={300}
                        />
                        <View style={styles.inputMetaRow}>
                            {errorMsg ? (
                                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                            ) : (
                                <Text style={styles.hintText}>* सटीक कारण दर्ज करना अनिवार्य है</Text>
                            )}
                            <Text style={styles.counterText}>{reason.length}/300</Text>
                        </View>
                    </View>

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                styles.cancelButton,
                                pressed && { opacity: 0.8 },
                            ]}
                            onPress={onCancel}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>{cancelText}</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                { backgroundColor: confirmColor },
                                pressed && { opacity: 0.85 },
                                loading && { opacity: 0.7 },
                            ]}
                            onPress={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.md,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
    },
    cardContainer: {
        width: Math.min(width * 0.92, 440),
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        ...SHADOWS.large,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3,
        fontWeight: '500',
        lineHeight: 16,
    },
    closeBtn: {
        padding: 4,
        marginLeft: 6,
    },
    inputSection: {
        marginTop: 4,
    },
    textInput: {
        height: 110,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        padding: 12,
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
        lineHeight: 20,
    },
    inputError: {
        borderColor: COLORS.error,
        backgroundColor: '#FEF2F2',
    },
    inputMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    hintText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    errorText: {
        fontSize: 11,
        color: COLORS.error,
        fontWeight: '600',
    },
    counterText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 18,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    button: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F1F5F9',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});

export default ReasonModal;
