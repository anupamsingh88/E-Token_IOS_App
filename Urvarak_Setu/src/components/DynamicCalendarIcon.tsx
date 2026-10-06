import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../constants';

interface DynamicCalendarIconProps {
    date?: Date | string; // Optional, defaults to now
    size?: number;        // Base size, default 40
    style?: any;
}

export default function DynamicCalendarIcon({ date, size = 40, style }: DynamicCalendarIconProps) {
    const targetDate = date ? new Date(date) : new Date();

    // Scale factors based on size (base size 40)
    const scale = size / 40;
    const monthSize = 8 * scale;
    const dateSize = 16 * scale;
    const borderWidth = 1.5 * scale; // Slightly thinner border
    const radius = 6 * scale;

    return (
        <View style={[
            styles.container,
            {
                width: size,
                height: size,
                borderRadius: radius,
                borderWidth: borderWidth,
            },
            style
        ]}>
            <View style={[styles.header, { height: size * 0.3 }]}>
                <Text style={[styles.month, { fontSize: monthSize }]}>
                    {targetDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                </Text>
            </View>
            <View style={styles.body}>
                <Text style={[styles.date, { fontSize: dateSize }]}>
                    {targetDate.getDate()}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.primary,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    header: {
        width: '100%',
        backgroundColor: COLORS.primary, // Red header like standard calendar icons
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    month: {
        color: COLORS.white,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    date: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
