import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';


const { width } = Dimensions.get('window');

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    buttons?: {
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }[];
}

export default function CustomAlert({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    buttons
}: CustomAlertProps) {
    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'success': return COLORS.success;
            case 'error': return COLORS.error;
            case 'warning': return COLORS.warning;
            default: return COLORS.info;
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.alertContainer}>
                    <View style={[styles.header, { backgroundColor: getHeaderColor() }]}>
                        <Text style={styles.icon}>{getIcon()}</Text>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    <View style={styles.footer}>
                        {buttons ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.button, btn.style === 'cancel' && styles.cancelButton]}
                                    onPress={() => {
                                        btn.onPress();
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        { color: btn.style === 'cancel' ? COLORS.textSecondary : COLORS.white },
                                        btn.style === 'cancel' && { color: COLORS.textSecondary }
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: getHeaderColor() }]}
                                onPress={onClose}
                            >
                                <Text style={styles.buttonText}>ठीक है (OK)</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isTablet ? SPACING.xxl : SPACING.xl,
    },
    alertContainer: {
        width: '100%',
        maxWidth: isTablet ? 460 : 340,
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 28 : BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.large,
    },
    header: {
        height: isTablet ? 96 : verticalScale(80),
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: isTablet ? 46 : moderateScale(40),
    },
    content: {
        padding: isTablet ? SPACING.xxl : SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: isTablet ? 22 : FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
        lineHeight: isTablet ? 36 : 34,
        paddingHorizontal: SPACING.sm,
        marginTop: SPACING.xs,
    },
    message: {
        fontSize: isTablet ? 17 : FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: isTablet ? 28 : 26,
        paddingHorizontal: SPACING.sm,
    },
    footer: {
        padding: isTablet ? SPACING.lg : SPACING.md,
        paddingTop: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: isTablet ? SPACING.lg : SPACING.md,
    },
    button: {
        paddingVertical: isTablet ? 14 : 12,
        paddingHorizontal: isTablet ? 28 : 24,
        borderRadius: isTablet ? 14 : BORDER_RADIUS.lg,
        minWidth: isTablet ? 120 : 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.grayLight,
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: isTablet ? 17 : FONT_SIZES.md,
    },
});
