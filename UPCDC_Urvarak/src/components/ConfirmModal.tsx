import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const { width } = Dimensions.get('window');

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    visible,
    title,
    message,
    confirmText = 'हाँ, करें',
    cancelText = 'नहीं',
    onConfirm,
    onCancel,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onCancel}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.card,
                                { transform: [{ scale: scaleAnim }] },
                            ]}
                        >
                            {/* Top Decorative Icon Badge */}
                            <View style={styles.outerIconRing}>
                                <View style={styles.innerIconCircle}>
                                    <Ionicons name="help-circle" size={36} color={COLORS.primary || '#1E3A8A'} />
                                </View>
                            </View>

                            {/* Title & Message */}
                            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
                                {title}
                            </Text>
                            <Text style={styles.message} maxFontSizeMultiplier={1.3}>
                                {message}
                            </Text>

                            {/* Action Buttons */}
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onCancel}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.cancelButtonText} maxFontSizeMultiplier={1.3}>
                                        {cancelText}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.confirmButton]}
                                    onPress={onConfirm}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.confirmButtonText} maxFontSizeMultiplier={1.3}>
                                        {confirmText}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: Math.min(width * 0.88, 350),
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 22,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    outerIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    innerIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    message: {
        fontSize: 14.5,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 22,
        paddingHorizontal: 6,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cancelButton: {
        backgroundColor: '#F1F5F9',
        elevation: 0,
        shadowOpacity: 0,
    },
    confirmButton: {
        backgroundColor: COLORS.primary || '#1E3A8A',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default ConfirmModal;
