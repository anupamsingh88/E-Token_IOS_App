import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Pressable,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const { width } = Dimensions.get('window');

const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }: ConfirmModalProps) => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

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
                    friction: 8,
                    tension: 40,
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
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="help-circle-outline" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        
                        <View style={styles.actionRow}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.cancelButton,
                                    pressed && { opacity: 0.8 }
                                ]}
                                onPress={onCancel}
                            >
                                <Text style={styles.cancelButtonText}>नहीं</Text>
                            </Pressable>
                            
                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.confirmButton,
                                    pressed && { opacity: 0.8 }
                                ]}
                                onPress={onConfirm}
                            >
                                <Text style={styles.confirmButtonText}>हाँ, करें</Text>
                            </Pressable>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        width: width * 0.8,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    iconContainer: {
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: SPACING.md,
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
    },
    confirmButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
    },
});

export default ConfirmModal;
