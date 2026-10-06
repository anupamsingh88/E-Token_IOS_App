import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';
import { Feather } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


const FERTILIZER_IMAGES: Record<string, any> = {
    urea: require('../../assets/UREA_bori.jpeg'),
    dap: require('../../assets/DAP_bori.png'),
    npk: require('../../assets/NPK_bori.png'),
    mop: require('../../assets/MOP_bori.png'),
};

const FERTILIZER_COLORS = {
    urea: { badge: '#1D4ED8', gradient: ['#1e3a8a', '#3b82f6'] as [string, string] },
    dap: { badge: '#B91C1C', gradient: ['#7f1d1d', '#ef4444'] as [string, string] },
    npk: { badge: '#92400E', gradient: ['#78350f', '#f59e0b'] as [string, string] },
    mop: { badge: '#6B21A8', gradient: ['#4a044e', '#a855f7'] as [string, string] },
};

interface FertilizerCardProps {
    id: string;
    name: string;
    nameHindi: string;
    type: 'urea' | 'dap' | 'npk' | 'mop';
    price: number;
    availableQuantity: number;
    onPress: () => void;
}

export default function FertilizerCard({
    name,
    nameHindi,
    type,
    price,
    availableQuantity,
    onPress,
}: FertilizerCardProps) {
    const colors = FERTILIZER_COLORS[type];
    const image = FERTILIZER_IMAGES[type];
    const isAvailable = availableQuantity > 0;

    return (
        <TouchableOpacity
            style={[styles.card, !isAvailable && styles.disabled]}
            onPress={isAvailable ? onPress : undefined}
            activeOpacity={0.85}
            disabled={!isAvailable}
        >
            <View style={styles.cardInner}>
                {/* TOP: Bag Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={image}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    {/* Gradient fade at bottom of image */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.25)']}
                        style={styles.imageOverlay}
                    />
                    {/* Badge top-left */}
                    <View style={[styles.badge, { backgroundColor: colors.badge }]}>
                        <Text style={styles.badgeText}>{name}</Text>
                    </View>
                    {/* Unavailable overlay */}
                    {!isAvailable && (
                        <View style={styles.unavailableOverlay}>
                            <Text style={styles.unavailableOverlayText}>कोटा समाप्त</Text>
                        </View>
                    )}
                </View>

                {/* BOTTOM: Details */}
                <LinearGradient colors={colors.gradient} style={styles.details}>
                    <Text style={styles.hindiName} numberOfLines={1} adjustsFontSizeToFit>{nameHindi}</Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>कीमत:</Text>
                        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>₹{price}</Text>
                        <Text style={styles.perBag}>/बोरी</Text>
                    </View>

                    <View style={styles.footer}>
                        {isAvailable ? (
                            <>
                                <View style={styles.availRow}>
                                    <Text 
                                        style={styles.availText}
                                        numberOfLines={2}
                                        adjustsFontSizeToFit
                                    >
                                        {availableQuantity} बोरी उपलब्ध
                                    </Text>
                                </View>
                                <View style={styles.arrowBtn}>
                                    <Feather name="arrow-right" size={18} color={COLORS.primary} />
                                </View>
                            </>
                        ) : (
                            <Text style={styles.unavailableText}>कोटा समाप्त</Text>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 380;

const styles = StyleSheet.create({
    card: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.md,
        ...SHADOWS.large,
        elevation: 6,
    },
    cardInner: {
        flex: 1,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    disabled: {
        opacity: 0.6,
    },
    imageContainer: {
        width: '100%',
        height: verticalScale(210), // Increased from 180 to show full bag
        position: 'relative',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: verticalScale(50),
    },
    badge: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.md,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    unavailableOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unavailableOverlayText: {
        color: COLORS.white,
        fontWeight: FONT_WEIGHTS.bold,
        fontSize: FONT_SIZES.sm,
    },
    details: {
        flex: 1,
        padding: SPACING.sm,
        paddingBottom: SPACING.md,
    },
    hindiName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        marginBottom: SPACING.sm,
        width: '100%',
    },
    priceLabel: {
        fontSize: isSmallScreen ? 14 : 13,
        color: 'rgba(255,255,255,0.75)',
        marginRight: 2,
    },
    price: {
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
        flexShrink: 1,
    },
    perBag: {
        fontSize: isSmallScreen ? 14 : 13,
        color: 'rgba(255,255,255,0.75)',
        marginLeft: 2,
        flexShrink: 1,
    },
    footer: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: 6,
    },
    availRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    checkmark: {
        fontSize: moderateScale(13),
    },
    availText: {
        fontSize: isSmallScreen ? 12 : 14,
        color: '#86efac',
        fontWeight: FONT_WEIGHTS.semibold,
        flexShrink: 1,
        lineHeight: isSmallScreen ? 18 : 20,
    },
    arrowBtn: {
        width: moderateScale(34),
        height: verticalScale(34),
        borderRadius: 17,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    unavailableText: {
        fontSize: FONT_SIZES.sm,
        color: '#fca5a5',
        fontWeight: FONT_WEIGHTS.semibold,
    },
});
