import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { resolveAppImage } from '../utils/imageResolver';

interface LogoPlaceholderProps {
    size?: number;
}

export default function LogoPlaceholder({ size = 100 }: LogoPlaceholderProps) {
    const { settings } = useSettings();
    const defaultLogo = require('../../assets/icon.png');
    const [source, setSource] = useState(() =>
        resolveAppImage(settings?.farmer_app_logo_url || settings?.farmer_app_icon_url || settings?.logo_url, defaultLogo)
    );

    useEffect(() => {
        setSource(resolveAppImage(settings?.farmer_app_logo_url || settings?.farmer_app_icon_url || settings?.logo_url, defaultLogo));
    }, [settings?.farmer_app_logo_url, settings?.farmer_app_icon_url, settings?.logo_url]);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
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
