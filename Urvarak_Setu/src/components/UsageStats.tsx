import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';
import { PieChartIcon } from './FormIcons';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


interface UsageStatsProps {
    used: number;
    remaining: number;
    total: number;
    unit?: string;
}

export default function UsageStats({ used, remaining, total, unit = 'kg' }: UsageStatsProps) {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    // Ensure they are numbers and total is not 0 to avoid NaN
    const nUsed = Number(used) || 0;
    const nTotal = Number(total) || 1; // Default to 1 to avoid / 0

    // Calculate percentage (max 100)
    const rawPercentage = (nUsed / nTotal) * 100;
    const usedPercentage = Math.min(Math.round(rawPercentage), 100);

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: usedPercentage,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [usedPercentage]);

    return (
        <View style={styles.container}>
            {/* Progress Bar with Percentage */}
            <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <PieChartIcon size={20} color={COLORS.primary} />
                        <Text style={[styles.progressLabel, { marginLeft: 8 }]}>आवंटित कोटा उपयोग</Text>
                    </View>
                    <Text style={styles.progressPercentage}>{usedPercentage}%</Text>
                </View>
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFillContainer,
                            {
                                width: animatedWidth.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%']
                                }),
                                // Ensure a tiny bit of color is visible if used > 0
                                minWidth: nUsed > 0 ? '2%' : '0%'
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={[COLORS.success, '#34D399'] as readonly [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.progressFill}
                        />
                    </Animated.View>
                </View>
                <View style={styles.progressFooter}>
                    <Text style={styles.progressSubtext}>कुल उपयोग: {nUsed} / {nTotal} {unit}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        ...SHADOWS.medium,
    },
    progressContainer: {
        marginBottom: 0,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    progressLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    progressPercentage: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.success,
        fontWeight: FONT_WEIGHTS.bold,
    },
    progressTrack: {
        height: verticalScale(16),
        backgroundColor: COLORS.grayLight,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    progressFillContainer: {
        height: '100%',
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        width: '100%',
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.xs,
    },
    progressSubtext: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: FONT_WEIGHTS.medium,
    },
});

