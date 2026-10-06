import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface LogoPlaceholderProps {
    size?: number;
    width?: number;
    height?: number;
}

export default function LogoPlaceholder({ size = 100, width, height }: LogoPlaceholderProps) {
    const finalWidth = width || size;
    const finalHeight = height || size;
    
    return (
        <View style={[styles.container, { width: finalWidth, height: finalHeight }]}>
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
