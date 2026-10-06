import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';

interface UsageStatsProps {
    used: number;
    remaining: number;
    total: number;
    unit?: string;
}

export default function UsageStats({ used, remaining, total, unit = 'kg' }: UsageStatsProps) {
    const usedPercentage = (used / total) * 100;
    const remainingPercentage = (remaining / total) * 100;

    return (
        <View style={styles.container}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <LinearGradient
                        colors={[COLORS.success, '#34D399'] as readonly [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${usedPercentage}%` }]}
                    />
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                {/* Used */}
                <View style={[styles.statCard, styles.usedCard]}>
                    <Text style={styles.statLabel}>📊 उपयोग किया</Text>
                    <Text style={styles.statValue}>{used} {unit}</Text>
                </View>

                {/* Remaining */}
                <View style={[styles.statCard, styles.remainingCard]}>
                    <Text style={styles.statLabel}>✅ शेष</Text>
                    <Text style={[styles.statValue, styles.remainingValue]}>{remaining} {unit}</Text>
                </View>

                {/* Total */}
                <View style={[styles.statCard, styles.totalCard]}>
                    <Text style={styles.statLabel}>📦 कुल</Text>
                    <Text style={styles.statValue}>{total} {unit}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.medium,
    },
    progressContainer: {
        marginBottom: SPACING.lg,
    },
    progressTrack: {
        height: 12,
        backgroundColor: COLORS.grayLight,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.sm,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
    },
    usedCard: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FCD34D',
    },
    remainingCard: {
        backgroundColor: '#D1FAE5',
        borderColor: '#34D399',
    },
    totalCard: {
        backgroundColor: '#E0E7FF',
        borderColor: '#A5B4FC',
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: FONT_WEIGHTS.medium,
    },
    statValue: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.bold,
    },
    remainingValue: {
        color: COLORS.success,
    },
});
