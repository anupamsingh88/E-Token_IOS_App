import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { resolveAppImage } from '../utils/imageResolver';

interface LogoPlaceholderProps {
    size?: number;
    width?: number;
    height?: number;
}

export default function LogoPlaceholder({ size = 100, width, height }: LogoPlaceholderProps) {
    const finalWidth = width || size;
    const finalHeight = height || size;
    const { settings } = useSettings();
    const defaultLogo = require('../../assets/icon.png');
    const [source, setSource] = useState(() =>
        resolveAppImage(settings?.retailer_app_logo_url || settings?.retailer_app_icon_url || settings?.logo_url, defaultLogo)
    );

    useEffect(() => {
        setSource(resolveAppImage(settings?.retailer_app_logo_url || settings?.retailer_app_icon_url || settings?.logo_url, defaultLogo));
    }, [settings?.retailer_app_logo_url, settings?.retailer_app_icon_url, settings?.logo_url]);

    return (
        <View style={[styles.container, { width: finalWidth, height: finalHeight }]}>
            <Image
                source={source}
                onError={() => setSource(defaultLogo)}
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
