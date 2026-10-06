import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ViewStyle,
    TextInputProps,
    TouchableOpacity,
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
}

export default function Input({
    label,
    error,
    required = false,
    containerStyle,
    icon,
    rightIcon,
    secureTextEntry,
    ...textInputProps
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = secureTextEntry;

    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
            >
                {icon && <View style={styles.iconLeft}>{icon}</View>}

                <TextInput
                    style={[styles.input, icon ? styles.inputWithIcon : undefined]}
                    placeholderTextColor={COLORS.textLight}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    {...textInputProps}
                />

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

                {rightIcon && !isPassword && (
                    <View style={styles.iconRight}>{rightIcon}</View>
                )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        fontWeight: '500',
    },
    required: {
        color: COLORS.danger,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.grayLight,
        height: INPUT_HEIGHT,
        ...SHADOWS.small,
    },
    inputFocused: {
        borderColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        paddingHorizontal: SPACING.md,
        height: '100%',
    },
    inputWithIcon: {
        paddingLeft: 0,
    },
    iconLeft: {
        paddingLeft: SPACING.md,
    },
    iconRight: {
        paddingRight: SPACING.md,
    },
    passwordToggle: {
        fontSize: FONT_SIZES.lg,
    },
    errorText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.danger,
        marginTop: SPACING.xs,
        marginLeft: SPACING.sm,
    },
});
