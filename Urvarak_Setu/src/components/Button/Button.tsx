import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    COLORS,
    GRADIENTS,
    BUTTON_SIZES,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
} from '../../constants';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    icon,
    style,
    textStyle,
}: ButtonProps) {
    const height = BUTTON_SIZES[size];
    const isDisabled = disabled || loading;

    const getGradientColors = (): readonly [string, string, ...string[]] => {
        if (variant === 'primary') return GRADIENTS.purple as readonly [string, string, ...string[]];
        if (variant === 'secondary') return GRADIENTS.pink as readonly [string, string, ...string[]];
        return [COLORS.white, COLORS.white] as readonly [string, string];
    };

    const renderContent = () => {
        const textStyles = [
            styles.text,
            variant === 'outline' && styles.outlineText,
            variant === 'text' && styles.linkText,
            { fontSize: size === 'large' ? FONT_SIZES.lg : FONT_SIZES.md },
            textStyle,
        ];

        return (
            <>
                {loading ? (
                    <ActivityIndicator
                        color={variant === 'outline' ? COLORS.primary : COLORS.white}
                    />
                ) : (
                    <>
                        {icon && <>{icon}</>}
                        <Text
                            style={textStyles}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.5}
                        >
                            {title}
                        </Text>
                    </>
                )}
            </>
        );
    };

    if (variant === 'outline' || variant === 'text') {
        return (
            <TouchableOpacity
                style={[
                    styles.button,
                    { height },
                    variant === 'outline' && styles.outlineButton,
                    variant === 'text' && styles.textButton,
                    isDisabled && styles.disabled,
                    { justifyContent: 'center', alignItems: 'center' },
                    style,
                ]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {renderContent()}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={[{ width: '100%', height }, style]}
        >
            <View style={[styles.button, styles.gradientButton, { height, justifyContent: 'center', alignItems: 'center' }]}>
                <LinearGradient
                    colors={isDisabled ? [COLORS.grayLight, COLORS.gray] : getGradientColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {renderContent()}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    // contentContainer removed
    gradientButton: {
        ...SHADOWS.medium,
    },
    outlineButton: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    textButton: {
        backgroundColor: 'transparent',
    },
    text: {
        color: COLORS.white,
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    outlineText: {
        color: COLORS.primary,
    },
    linkText: {
        color: COLORS.primary,
        textDecorationLine: 'underline',
    },
    disabled: {
        opacity: 0.5,
    },
});
