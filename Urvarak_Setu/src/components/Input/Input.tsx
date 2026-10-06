import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ViewStyle,
    TextInputProps,
    TouchableOpacity,
    Animated,
} from 'react-native';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    INPUT_HEIGHT,
    SHADOWS,
} from '../../constants';
import { EyeIcon, EyeOffIcon } from '../EyeIcons';

interface InputProps extends TextInputProps {
    label: string;
    error?: string;
    required?: boolean;
    containerStyle?: ViewStyle;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'glass';
    activeColor?: string;
    height?: number;
    fontSize?: number;
}

export default function Input({
    label,
    error,
    required = false,
    containerStyle,
    icon,
    rightIcon,
    secureTextEntry,
    value,
    variant = 'default',
    activeColor,
    onFocus,
    onBlur,
    height,
    fontSize,
    ...textInputProps
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animated value for floating label
    const labelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;

    const isPassword = secureTextEntry;
    const hasValue = !!(value && String(value).length > 0);

    useEffect(() => {
        // Animate label when focused or has value
        Animated.timing(labelPosition, {
            toValue: isFocused || hasValue ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, hasValue]);

    const labelStyle = {
        position: 'absolute' as const,
        left: icon ? 48 : SPACING.md,
        top: labelPosition.interpolate({
            inputRange: [0, 1],
            outputRange: [17, -10], // True center - adjusted based on user feedback (19 was too low, 16 too high)
        }),
        fontSize: labelPosition.interpolate({
            inputRange: [0, 1],
            outputRange: [FONT_SIZES.md, 11], // Smaller when floating
        }),
        color: error
            ? COLORS.danger
            : isFocused
                ? (variant === 'glass' ? COLORS.primary : COLORS.primary)
                : (variant === 'glass' ? COLORS.textSecondary : COLORS.textSecondary),
        backgroundColor: (isFocused || hasValue)
            ? (variant === 'glass' ? '#F8F9FA' : COLORS.white)
            : 'transparent',
        paddingHorizontal: 6,
        zIndex: 2,
    };

    return (
        <View style={[styles.container, containerStyle]}>
            <View
                style={[
                    styles.inputContainer,
                    variant === 'glass' && styles.inputGlass,
                    isFocused && (variant === 'glass' ? styles.inputGlassFocused : styles.inputFocused),
                    isFocused && activeColor ? { borderColor: activeColor } : null,
                    error && styles.inputError,
                    height ? { height } : null,
                ]}
            >
                {/* Floating Label */}
                {label ? (
                    <Animated.Text style={[
                        labelStyle,
                        height ? {
                            top: labelPosition.interpolate({
                                inputRange: [0, 1],
                                outputRange: [(height - 20) / 2, -10],
                            })
                        } : null
                    ]}>
                        {label}
                        {required && <Text style={styles.required}> *</Text>}
                    </Animated.Text>
                ) : null}

                {/* Left Icon */}
                {icon && <View style={styles.iconLeft}>{icon}</View>}

                {/* Text Input */}
                <TextInput
                    {...textInputProps}
                    style={[
                        styles.input,
                        icon ? styles.inputWithIcon : null,
                        variant === 'glass' && { color: COLORS.textPrimary },
                        fontSize ? { fontSize } : null
                    ]}
                    placeholderTextColor={variant === 'glass' ? COLORS.textLight : COLORS.textLight}
                    onFocus={(e) => {
                        setIsFocused(true);
                        if (onFocus) onFocus(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        if (onBlur) onBlur(e);
                    }}
                    secureTextEntry={isPassword && !showPassword}
                    value={value}
                />

                {/* Password Toggle Icon */}
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.iconRight}
                    >
                        {showPassword ? (
                            <EyeIcon size={22} color={COLORS.textSecondary} />
                        ) : (
                            <EyeOffIcon size={22} color={COLORS.textSecondary} />
                        )}
                    </TouchableOpacity>
                )}

                {/* Right Icon */}
                {rightIcon && !isPassword && (
                    <View style={styles.iconRight}>{rightIcon}</View>
                )}
            </View>

            {/* Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.grayLight,
        height: INPUT_HEIGHT,
    },
    inputGlass: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        elevation: 0,
    },
    inputFocused: {
        borderColor: COLORS.primary,
    },

    inputGlassFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 0,
        height: '100%',
        textAlignVertical: 'center',
        zIndex: 1,
    },
    inputWithIcon: {
        paddingLeft: SPACING.md, // Add generous space between icon and text
    },
    iconLeft: {
        paddingLeft: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconRight: {
        paddingRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    required: {
        color: COLORS.danger,
    },
    errorText: {
        fontSize: FONT_SIZES.sm - 2,
        color: '#FF3B30', // Vibrant iOS Red
        fontWeight: 'bold',
        marginTop: SPACING.xs,
        marginLeft: SPACING.sm,
    },
});
