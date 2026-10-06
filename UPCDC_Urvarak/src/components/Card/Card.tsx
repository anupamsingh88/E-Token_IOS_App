import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../constants';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    padding?: keyof typeof SPACING;
    elevated?: boolean;
}

export default function Card({
    children,
    style,
    padding = 'lg',
    elevated = true,
}: CardProps) {
    return (
        <View
            style={[
                styles.card,
                { padding: SPACING[padding] },
                elevated && SHADOWS.medium,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
    },
});
