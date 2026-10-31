import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Text,
    Pressable,
    Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants';
import { moderateScale, verticalScale } from '../../utils/responsive';

interface OTPInputProps {
    value: string;
    onChange: (otp: string) => void;
    error?: string;
    label?: string;
    length?: number;
    autoFocus?: boolean;
}

export default function OTPInput({
    value = '',
    onChange,
    error,
    label,
    length = 6,
    autoFocus = true,
}: OTPInputProps) {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Blinking cursor animation for active box
    const cursorOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let blinkAnimation: Animated.CompositeAnimation | null = null;
        if (isFocused && value.length < length) {
            blinkAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(cursorOpacity, {
                        toValue: 0,
                        duration: 450,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cursorOpacity, {
                        toValue: 1,
                        duration: 450,
                        useNativeDriver: true,
                    }),
                ])
            );
            blinkAnimation.start();
        } else {
            cursorOpacity.setValue(0);
        }

        return () => {
            if (blinkAnimation) {
                blinkAnimation.stop();
            }
        };
    }, [isFocused, value.length, length, cursorOpacity]);

    const handleContainerPress = () => {
        inputRef.current?.focus();
    };

    const handleTextChange = (text: string) => {
        // Strip non-numeric characters and slice to maximum length
        const numericOnly = text.replace(/[^0-9]/g, '').slice(0, length);
        onChange(numericOnly);
    };

    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label} <Text style={styles.required}>*</Text>
                </Text>
            )}

            <Pressable
                onPress={handleContainerPress}
                style={styles.otpContainer}
                accessible={false}
            >
                {Array.from({ length }).map((_, index) => {
                    const char = value[index] || '';
                    const isCurrent = isFocused && index === value.length;
                    const isFilled = Boolean(char);

                    return (
                        <View
                            key={index}
                            style={[
                                styles.otpBox,
                                isFilled && styles.otpBoxFilled,
                                isCurrent && styles.otpBoxActive,
                                Boolean(error) && styles.otpBoxError,
                            ]}
                        >
                            {char ? (
                                <Text style={styles.otpText}>{char}</Text>
                            ) : isCurrent ? (
                                <Animated.View
                                    style={[
                                        styles.cursor,
                                        { opacity: cursorOpacity },
                                    ]}
                                />
                            ) : null}
                        </View>
                    );
                })}

                {/* Single hidden master TextInput for instantaneous, zero-lag input */}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={handleTextChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    keyboardType="number-pad"
                    maxLength={length}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    importantForAutofill="yes"
                    autoFocus={autoFocus}
                    caretHidden={true}
                    style={styles.hiddenInput}
                />
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    required: {
        color: COLORS.error,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
    },
    otpBox: {
        flex: 1,
        maxWidth: 48,
        minWidth: 32,
        height: verticalScale(48),
        marginHorizontal: 3,
        borderWidth: 1.5,
        borderColor: COLORS.grayLight,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpBoxFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '08',
    },
    otpBoxActive: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: COLORS.white,
    },
    otpBoxError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.error + '08',
    },
    otpText: {
        fontSize: moderateScale(22),
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    cursor: {
        width: 2,
        height: 22,
        backgroundColor: COLORS.primary,
        borderRadius: 1,
    },
    hiddenInput: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0,
    },
    errorText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: 2,
    },
});
