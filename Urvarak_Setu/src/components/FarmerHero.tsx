import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


const { width } = Dimensions.get('window');

interface FarmerHeroProps {
    name: string;
    subtitle?: string;
    photoUrl?: string;
    onProfilePress?: () => void;
}

export default function FarmerHero({ name, subtitle, photoUrl, onProfilePress }: FarmerHeroProps) {
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1500, // Very slow and smooth scale
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 1500, // Very slow and smooth fade
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.container,
                { paddingTop: Math.max(0, insets.top) }
            ]}
        >
            <View style={styles.content}>
                {/* Farmer Avatar */}
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                >
                    {photoUrl ? (
                        <View style={[styles.avatar, styles.imageWrapper]}>
                            <Image
                                source={{ uri: photoUrl }}
                                style={styles.avatarImage}
                                resizeMode="cover"
                            />
                        </View>
                    ) : (
                        <View style={[styles.avatar, { overflow: 'hidden' }]}>
                            <LinearGradient
                                colors={[COLORS.white, COLORS.backgroundLight] as readonly [string, string, ...string[]]}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Greeting Text */}
                <View style={styles.textContainer}>
                    <Text style={styles.greeting}>नमस्ते 🙏</Text>
                    <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
                    {/* {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>} */}
                </View>

                {/* Decorative Farm Elements */}
                <View style={styles.decorContainer}>
                    <Animated.Image
                        source={require('../../assets/icon.png')}
                        style={[
                            styles.decorLogo,
                            {
                                opacity: opacityAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Background Pattern */}
            <View style={styles.pattern} pointerEvents="none">
                <View style={[styles.circle, styles.circle1]} />
                <View style={[styles.circle, styles.circle2]} />
                <View style={[styles.circle, styles.circle3]} />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: 0,
        paddingHorizontal: SPACING.md,
        borderBottomLeftRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.xs,
        paddingBottom: 2,
        zIndex: 1,
    },
    avatarContainer: {
        marginRight: SPACING.md,
    },
    avatar: {
        width: moderateScale(65),
        height: moderateScale(65),
        borderRadius: moderateScale(38),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    imageWrapper: {
        backgroundColor: COLORS.white,
        padding: 2, // Border effect
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: moderateScale(30),
    },
    avatarText: {
        fontSize: moderateScale(36),
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    textContainer: {
        flex: 1,
        paddingRight: 12, // Space between name and logo
    },
    greeting: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.white,
        opacity: 0.9,
        fontWeight: FONT_WEIGHTS.medium,
    },
    name: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.white,
        fontWeight: FONT_WEIGHTS.bold,
        marginTop: 0,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.white,
        opacity: 0.85,
        marginTop: 2,
    },
    decorContainer: {
        marginLeft: SPACING.sm,
        marginTop: 5, // Push down closer to bottom
        marginRight: -10, // Shift right
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorLogo: {
        width: moderateScale(90),
        height: verticalScale(60),
    },
    // Background pattern
    pattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    circle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    circle1: {
        width: moderateScale(120),
        height: verticalScale(120),
        top: -40,
        right: -20,
    },
    circle2: {
        width: moderateScale(80),
        height: verticalScale(80),
        bottom: -30,
        left: 40,
    },
    circle3: {
        width: moderateScale(60),
        height: verticalScale(60),
        top: 60,
        right: width * 0.3,
    },
});
