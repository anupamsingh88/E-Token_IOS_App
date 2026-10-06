import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, HINDI_TEXT } from '../constants';

interface BottomNavigationProps {
    activeTab: 'home' | 'advice' | 'profile' | 'bookings' | 'request';
    onTabPress: (tab: 'home' | 'advice' | 'profile' | 'bookings' | 'request') => void;
}

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
    const tabs = [
        { id: 'home' as const, label: HINDI_TEXT.home, icon: '🏠' },
        { id: 'request' as const, label: 'अनुरोध', icon: '📝' },
        { id: 'bookings' as const, label: 'बुकिंग', icon: '📅' },
        { id: 'advice' as const, label: HINDI_TEXT.advice, icon: '💡' },
        { id: 'profile' as const, label: HINDI_TEXT.profile, icon: '👤' },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, isActive && styles.activeTab]}
                        onPress={() => onTabPress(tab.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                            <Text style={[styles.icon, isActive && styles.activeIcon]}>{tab.icon}</Text>
                        </View>
                        <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.grayLight,
        paddingBottom: SPACING.sm,
        paddingTop: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    activeTab: {
        // Active state handled in icon container
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs / 2,
    },
    activeIconContainer: {
        backgroundColor: '#FF9800',
        borderRadius: 25, // Explicitly set to ensure circle
    },
    icon: {
        fontSize: 24,
    },
    activeIcon: {
        // Icon stays same, background changes
    },
    label: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    activeLabel: {
        color: '#FF9800',
        fontWeight: '600',
    },
});
