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

interface AlertModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

const AlertModal = ({ visible, type, title, message, onClose }: AlertModalProps) => {
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

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <Circle cx="12" cy="12" r="10" stroke={COLORS.success} strokeWidth="2" />
                        <Path d="M8 12L11 15L16 9" stroke={COLORS.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                );
            case 'error':
                return (
                    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <Circle cx="12" cy="12" r="10" stroke={COLORS.error} strokeWidth="2" />
                        <Path d="M15 9L9 15M9 9L15 15" stroke={COLORS.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                );
            case 'info':
                return (
                    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <Circle cx="12" cy="12" r="10" stroke={COLORS.info} strokeWidth="2" />
                        <Path d="M12 16V12M12 8H12.01" stroke={COLORS.info} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                );
        }
    };

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
                        <View style={styles.iconContainer}>{getIcon()}</View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                { backgroundColor: type === 'success' ? COLORS.success : type === 'error' ? COLORS.error : COLORS.info },
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>ठीक है</Text>
                        </Pressable>
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
    button: {
        width: '100%',
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
    },
});

export default AlertModal;
