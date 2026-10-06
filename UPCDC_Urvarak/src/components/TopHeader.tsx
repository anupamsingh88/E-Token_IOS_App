import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, StatusBar, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants';

interface TopHeaderProps {
    retailerName?: string;
    onMenuPress?: () => void;
    showBack?: boolean;
    onBack?: () => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({
    retailerName = 'रिटेलर',
    onMenuPress,
    showBack = false,
    onBack
}) => {
    const logoScale = useRef(new Animated.Value(1)).current;

    const displayedName = retailerName;

    useEffect(() => {
        // Entrance animation removed to prevent blink on each dashboard refresh
    }, []);

    return (
        <View style={styles.topHeaderContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient
                colors={['#1e3a8a', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topHeaderGradient}
            >
                {/* Decorative Bubbles */}
                <View style={[styles.bubble, { width: 60, height: 60, top: -20, left: -10, opacity: 0.1 }]} />
                <View style={[styles.bubble, { width: 100, height: 100, bottom: -30, right: 40, opacity: 0.08 }]} />

                <SafeAreaView edges={['top']} style={styles.topHeaderContent}>
                    <View style={styles.headerLeft}>
                        {showBack ? (
                            <TouchableOpacity
                                style={styles.menuButton}
                                onPress={onBack}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={32} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.menuButton}
                                onPress={onMenuPress}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="menu-outline" size={32} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        <View style={styles.welcomeTextSection}>
                            <View style={styles.namasteRow}>
                                <Text style={styles.namasteText}>नमस्ते</Text>
                                <MaterialCommunityIcons name="hands-pray" size={20} color="#FCD34D" style={{ marginLeft: 6 }} />
                            </View>
                            <Text style={styles.retailerNameText} numberOfLines={1} ellipsizeMode="tail">
                                {displayedName}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    topHeaderContainer: {
        width: '100%',
        zIndex: 100,
        ...SHADOWS.medium,
    },
    topHeaderGradient: {
        width: '100%',
        paddingBottom: 8, // Reduced height
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    bubble: {
        position: 'absolute',
        backgroundColor: COLORS.white,
        borderRadius: 100,
    },
    topHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: SPACING.lg,
        paddingTop: 8, // Reduced top padding
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    menuButton: {
        padding: 5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    welcomeTextSection: {
        flex: 1,
        justifyContent: 'center',
    },
    namasteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    namasteText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
    },
    retailerNameText: {
        fontSize: 18, // Reduced from 22
        fontWeight: '900',
        color: COLORS.white,
        marginTop: 0,
        letterSpacing: 0.2,
        flexShrink: 1,
    },
    logoImage: {
        width: 60,
        height: 60,
    },
});

export default TopHeader;
