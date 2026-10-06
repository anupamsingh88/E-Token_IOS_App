import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Text,
    Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';


interface OTPInputProps {
    value: string;
    onChange: (otp: string) => void;
    error?: string;
    label?: string;
}

export default function OTPInput({ value, onChange, error, label }: OTPInputProps) {
    const [otp, setOtp] = useState<string[]>(value.split('').slice(0, 6));
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        // Update internal state when external value changes
        setOtp(value.split('').slice(0, 6));
    }, [value]);

    const handleChange = (text: string, index: number) => {
        // Only allow numbers
        if (text && !/^\d+$/.test(text)) return;

        const newOtp = [...otp];

        // Handle paste
        if (text.length > 1) {
            const pastedData = text.slice(0, 6).split('');
            pastedData.forEach((char, i) => {
                if (index + i < 6) {
                    newOtp[index + i] = char;
                }
            });
            setOtp(newOtp);
            onChange(newOtp.join(''));

            // Focus last filled box or next empty box
            const nextIndex = Math.min(index + pastedData.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        // Single character input
        newOtp[index] = text;
        setOtp(newOtp);
        onChange(newOtp.join(''));

        // Auto-advance to next box
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                // Move to previous box if current is empty
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label} <Text style={styles.required}>*</Text>
                </Text>
            )}
            <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => {
                            inputRefs.current[index] = ref;
                        }}
                        style={[
                            styles.otpBox,
                            otp[index] && styles.otpBoxFilled,
                            error && styles.otpBoxError,
                        ]}
                        value={otp[index] || ''}
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        autoFocus={index === 0}
                    />
                ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
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
        justifyContent: 'center', // Center aligned with explicit gap
        gap: 10, // Increased gap
    },
    otpBox: {
        width: moderateScale(45), // Restore width to a good size
        height: verticalScale(50),
        borderWidth: 1.5,
        borderColor: COLORS.grayLight,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        textAlignVertical: 'center',
        paddingVertical: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    otpBoxFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '08',
    },
    otpBoxError: {
        borderColor: COLORS.error,
    },
    errorText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.error,
        marginTop: SPACING.xs,
    },
});
