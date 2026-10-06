import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoPlaceholder from '../components/LogoPlaceholder';
import { COLORS, GRADIENTS } from '../constants';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
    isReady?: boolean;
}

export default function SplashScreen({ onFinish, isReady = true }: SplashScreenProps) {
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [minTimePassed, setMinTimePassed] = useState(false);

    useEffect(() => {
        // Minimum time for splash screen to ensure smooth transition
        const timer = setTimeout(() => {
            setMinTimePassed(true);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isReady && minTimePassed) {
            onFinish();
        }
    }, [isReady, minTimePassed, onFinish]);

    useEffect(() => {
        // Entrance Animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Loop pulse animation
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();

        return () => {
            pulse.stop();
        };
    }, [scaleAnim, pulseAnim]);

    return (
        <LinearGradient
            colors={GRADIENTS.purple as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.content}>
                <Animated.View style={{
                    opacity: opacityAnim,
                    transform: [
                        { scale: Animated.multiply(scaleAnim, pulseAnim) }
                    ],
                    alignItems: 'center',
                    width: '90%'
                }}>
                    <LogoPlaceholder size={180} />

                    <Text style={styles.mainTitle}>Uttar Pradesh Cooperative Data Center</Text>


                    <View style={styles.spacer} />

                    <Text style={styles.welcomeText}>Government of Uttar Pradesh</Text>
                </Animated.View>

                <Animated.View style={{ position: 'absolute', bottom: 50, opacity: opacityAnim }}>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center',
        marginTop: 14,
        marginBottom: 8,
        lineHeight: 32,
    },
    subTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        textAlign: 'center',
        marginBottom: 20,
    },
    spacer: {
        height: 40,
    },
    welcomeText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    footerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: 1,
    },
});

