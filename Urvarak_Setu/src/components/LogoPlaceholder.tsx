import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { BORDER_RADIUS, SHADOWS } from '../constants';

interface LogoPlaceholderProps {
    size?: number;
}

export default function LogoPlaceholder({ size = 100 }: LogoPlaceholderProps) {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Image
                source={require('../../assets/icon.png')}
                style={styles.image}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
