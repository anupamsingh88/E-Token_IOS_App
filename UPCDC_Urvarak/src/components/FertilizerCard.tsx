import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../constants';

const { width } = Dimensions.get('window');

interface FertilizerCardProps {
    id: string;
    name: string;
    nameHindi: string;
    type: 'urea' | 'dap' | 'npk' | 'mop';
    price: number;
    availableQuantity: number;
    onPress: () => void;
    tag?: string;
    maxQuantity?: number;
}

const FERTILIZER_THEMES = {
    urea: {
        primary: '#3B82F6',
        image: require('../../assets/urea_bori.png')
    },
    dap: {
        primary: '#EF4444',
        image: require('../../assets/dap_bori.png')
    },
    npk: {
        primary: '#F59E0B',
        image: require('../../assets/npk_bori.png')
    },
    mop: {
        primary: '#8B4513',
        image: require('../../assets/mop_bori.png')
    },
};

export default function FertilizerCard({
    name,
    nameHindi,
    type,
    price,
    availableQuantity,
    onPress,
    tag = 'प्रीमियम',
}: FertilizerCardProps) {
    const theme = FERTILIZER_THEMES[type];
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.touchable}
            >
                {/* Product Header */}
                <View style={styles.cardHeader}>
                    <Text style={styles.titleHindi}>{nameHindi.split(' ')[0]}</Text>
                    <Text style={styles.titleEnglish}>{name}</Text>
                </View>

                {/* Main Bori Visual */}
                <View style={styles.imageContainer}>
                    <Image
                        source={theme.image}
                        style={styles.boriImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Action Badge - स्टॉक अपडेट */}
                <View style={styles.actionBadge}>
                    <Text style={styles.badgeText}>स्टॉक अपडेट</Text>
                </View>

                {/* Data Grid */}
                <View style={styles.dataGrid}>
                    <View style={styles.dataItem}>
                        <Text style={styles.dataLabel}>आज का स्टॉक</Text>
                        <Text style={styles.dataValue}>{availableQuantity} बोरी</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.dataItem}>
                        <Text style={styles.dataLabel}>रेट / बोरी</Text>
                        <Text style={styles.dataValue}>₹ {price}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        ...SHADOWS.medium,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    touchable: {
        flex: 1,
        alignItems: 'center',
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    titleHindi: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    titleEnglish: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    imageContainer: {
        width: '100%',
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
    },
    boriImage: {
        width: '90%',
        height: '90%',
    },
    actionBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#2E7D32',
        letterSpacing: 0.5,
    },
    dataGrid: {
        width: '100%',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    dataItem: {
        alignItems: 'center',
        flex: 1,
    },
    dataLabel: {
        fontSize: 9,
        color: '#888',
        fontWeight: '700',
        marginBottom: 2,
    },
    dataValue: {
        fontSize: 12,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: '#DDD',
    },
});
