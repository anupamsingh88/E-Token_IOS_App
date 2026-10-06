import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
}

export default function LoadingSpinner({
    message,
    size = 'large', // Size prop kept for compatibility but icon size is fixed/responsive
}: LoadingSpinnerProps) {
    const fadeAnim = useRef(new Animated.Value(0.3)).current; // Initial opacity

    useEffect(() => {
        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.3,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        blink.start();

        return () => blink.stop();
    }, [fadeAnim]);

    return (
        <View style={styles.container}>
            <Animated.Image
                source={require('../../assets/icon.png')}
                style={[
                    styles.icon,
                    { opacity: fadeAnim }
                ]}
                resizeMode="contain"
            />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    icon: {
        width: 100,
        height: 100,
    },
    message: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
});
