import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants';
import { CheckCircleIcon, AlertCircleIcon, CloseIcon } from './PhotoUploadIcons';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';


interface ModernAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    buttons?: Array<{
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

export const ModernAlert: React.FC<ModernAlertProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    buttons = [{ text: 'ठीक है', onPress: onClose, style: 'default' }],
}) => {
    const scaleValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(scaleValue, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        } else {
            scaleValue.setValue(0);
        }
    }, [visible]);

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return COLORS.success;
            case 'error':
                return COLORS.error;
            case 'warning':
                return COLORS.warning;
            default:
                return COLORS.primary;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return COLORS.success + '10';
            case 'error':
                return COLORS.error + '10';
            case 'warning':
                return COLORS.warning + '10';
            default:
                return COLORS.primary + '10';
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
                <Animated.View
                    style={[
                        styles.alertContainer,
                        { transform: [{ scale: scaleValue }] },
                    ]}
                >
                    {/* Close Button - Top Right */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <CloseIcon size={isTablet ? 24 : 20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Icon Section - Compact */}
                    <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor() }]}>
                        {type === 'success' ? (
                            <CheckCircleIcon size={isTablet ? 38 : 30} color={getIconColor()} />
                        ) : (
                            <AlertCircleIcon size={isTablet ? 36 : 28} color={getIconColor()} />
                        )}
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    {/* Buttons Section - Modern Styling */}
                    <View style={styles.buttonsContainer}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    button.style === 'cancel' && styles.cancelButton,
                                    button.style === 'destructive' && styles.destructiveButton,
                                ]}
                                onPress={() => {
                                    button.onPress();
                                    onClose();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        button.style === 'cancel' && styles.cancelButtonText,
                                        button.style === 'destructive' && styles.destructiveButtonText,
                                    ]}
                                >
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly lighter overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: isTablet ? SPACING.xxl : SPACING.lg, // Reduced padding for overlay
    },
    alertContainer: {
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 28 : 24, // More rounded
        width: '100%',
        maxWidth: isTablet ? 460 : 340,
        ...SHADOWS.large,
        paddingTop: isTablet ? 24 : SPACING.lg,
        overflow: 'hidden',
        position: 'relative', // For absolute positioning of close button
    },
    closeButton: {
        position: 'absolute',
        top: isTablet ? 14 : 12,
        right: isTablet ? 14 : 12,
        padding: isTablet ? 10 : 8,
        zIndex: 10,
        backgroundColor: '#F5F5F5', // Light background circle
        borderRadius: 20,
    },
    iconContainer: {
        alignSelf: 'center',
        width: isTablet ? 60 : 44,
        height: isTablet ? 60 : 44,
        borderRadius: isTablet ? 30 : 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: isTablet ? SPACING.lg : SPACING.md,
    },
    contentContainer: {
        paddingHorizontal: isTablet ? SPACING.xl : SPACING.md,
        paddingBottom: isTablet ? SPACING.md : SPACING.sm,
        alignItems: 'center',
    },
    title: {
        fontSize: isTablet ? 22 : FONT_SIZES.lg,
        fontWeight: '700', // Bold
        color: COLORS.textPrimary,
        marginBottom: isTablet ? 14 : 12,
        textAlign: 'center',
    },
    message: {
        fontSize: isTablet ? 16 : FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: isTablet ? 26 : 22,
        paddingTop: 5,
        paddingHorizontal: isTablet ? 14 : 8,
    },
    // Update styles for better button layout
    buttonsContainer: {
        flexDirection: 'row',
        padding: isTablet ? SPACING.lg : SPACING.md,
        gap: isTablet ? 16 : 12,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    button: {
        flex: 1,
        paddingVertical: isTablet ? 15 : 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: isTablet ? 14 : 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: moderateScale(0), height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 0, // Flat for cancel
        shadowOpacity: 0,
    },
    destructiveButton: {
        backgroundColor: COLORS.error,
        shadowColor: COLORS.error,
    },
    buttonText: {
        fontSize: isTablet ? 17 : FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.white,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
    },
    destructiveButtonText: {
        color: COLORS.white,
    },
});
