import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoPlaceholder from '../components/LogoPlaceholder';
import { COLORS, GRADIENTS } from '../constants';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
    isReady?: boolean;
}

export default function SplashScreen({ onFinish, isReady = true }: SplashScreenProps) {
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const isReadyRef = useRef(isReady);

    useEffect(() => {
        isReadyRef.current = isReady;
    }, [isReady]);

    useEffect(() => {
        let isFinished = false;

        // 1. Entrance Animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (isFinished) return;

            // 2. Start Infinite Pulse
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            // 3. Minimum wait time (reduced to 1.5s for better feel)
            const minWait = new Promise(resolve => setTimeout(resolve, 1500));

            const checkCompletion = async () => {
                await minWait;

                // Poll for isReady (from context) to be true
                const interval = setInterval(() => {
                    if (isReadyRef.current && !isFinished) {
                        clearInterval(interval);
                        isFinished = true;
                        pulse.stop();

                        // Exit animation
                        Animated.timing(opacityAnim, {
                            toValue: 0,
                            duration: 500,
                            useNativeDriver: true,
                        }).start(() => {
                            onFinish();
                        });
                    }
                }, 100);
            };

            checkCompletion();
        });

        return () => { isFinished = true; };
    }, [onFinish, scaleAnim, opacityAnim, pulseAnim]);


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

                    <Text style={styles.mainTitle}>Urvarak Setu</Text>
                    <Text style={styles.subTitle}>Government of Uttar Pradesh</Text>

                    <View style={styles.spacer} />

                    <Text style={styles.welcomeText}>Welcome to Urvarak Setu</Text>
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
        fontSize: moderateScale(30),
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: moderateScale(0), height: 2 },
        textShadowRadius: 6,
    },
    subTitle: {
        fontSize: moderateScale(18),
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        textAlign: 'center',
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: moderateScale(0), height: 1 },
        textShadowRadius: 4,
    },
    spacer: {
        height: verticalScale(40),
    },
    welcomeText: {
        fontSize: moderateScale(16),
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: moderateScale(0), height: 1 },
        textShadowRadius: 4,
    },
    footerText: {
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: 1,
    },
});

