import React from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    Animated,
    Platform,
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
    colors?: readonly string[] | string[];
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
    colors,
}: ButtonProps) {
    const height = BUTTON_SIZES[size];
    const isDisabled = disabled || loading;
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!isDisabled) {
            Animated.spring(scaleAnim, {
                toValue: 0.96,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (!isDisabled) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
            }).start();
        }
    };

    const getGradientColors = () => {
        if (variant === 'primary') return GRADIENTS.purple;
        if (variant === 'secondary') return GRADIENTS.pink;
        return [COLORS.white, COLORS.white];
    };

    const renderContent = () => {
        const textStyles = [
            styles.text,
            variant === 'outline' && styles.outlineText,
            variant === 'text' && styles.linkText,
            { fontSize: size === 'large' ? FONT_SIZES.lg : FONT_SIZES.md },
            Platform.OS === 'web' && { userSelect: 'none' } as any,
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
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        <Text
                            style={textStyles}
                            selectable={false}
                        >
                            {title}
                        </Text>
                    </>
                )}
            </>
        );
    };

    const containerStyle = [
        { height, transform: [{ scale: scaleAnim }] },
        style
    ];

    if (variant === 'outline' || variant === 'text') {
        return (
            <Animated.View style={containerStyle}>
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        { height },
                        variant === 'outline' && styles.outlineButton,
                        variant === 'text' && styles.textButton,
                        isDisabled && styles.disabled,
                        pressed && { opacity: 0.8 },
                    ]}
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    android_ripple={null}
                >
                    {renderContent()}
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={containerStyle}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                android_ripple={null}
                style={({ pressed }) => [
                    { height, borderRadius: BORDER_RADIUS.lg },
                    pressed && { opacity: 0.9 }
                ]}
            >
                <LinearGradient
                    colors={isDisabled ? (['#E5E7EB', '#D1D5DB'] as const) : (colors || getGradientColors() as any)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.button, styles.gradientButton, { height }]}
                >
                    {renderContent()}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.lg,
    },
    iconContainer: {
        marginRight: SPACING.sm,
    },
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
