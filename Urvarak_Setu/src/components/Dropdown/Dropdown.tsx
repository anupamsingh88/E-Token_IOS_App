import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, INPUT_HEIGHT, SHADOWS } from '../../constants';
import { scale, verticalScale, moderateScale, isTablet } from '../../utils/responsive';


interface DropdownOption {
    label: string;
    value: string | number;
}

interface DropdownProps {
    label: string;
    placeholder?: string;
    options: DropdownOption[];
    value: string | number | null;
    onSelect: (value: string | number) => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    variant?: 'default' | 'glass';
    activeColor?: string;
    height?: number;
    fontSize?: number;
}

const Dropdown: React.FC<DropdownProps> = ({
    label,
    placeholder = 'Select an option',
    options,
    value,
    onSelect,
    error,
    required,
    disabled = false,
    icon,
    variant = 'default',
    activeColor = COLORS.primary,
    height,
    fontSize,
}) => {
    const [visible, setVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Animated value for floating label
    const labelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;

    const selectedOption = options.find((opt) => opt.value == value);
    const hasValue = !!selectedOption;

    useEffect(() => {
        // Animate label when focused or has value
        Animated.timing(labelPosition, {
            toValue: isFocused || hasValue ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, hasValue]);

    const handleSelect = (val: string | number) => {
        onSelect(val);
        setVisible(false);
        setIsFocused(false);
    };

    const handleOpen = () => {
        if (!disabled) {
            setVisible(true);
            setIsFocused(true);
        }
    };

    const handleClose = () => {
        setVisible(false);
        setIsFocused(false);
    };

    const labelStyle = {
        position: 'absolute' as const,
        left: icon ? 48 : SPACING.md,
        top: labelPosition.interpolate({
            inputRange: [0, 1],
            outputRange: [height ? (height - 20) / 2 : 20, -10], // Dynamic centering
        }),
        fontSize: labelPosition.interpolate({
            inputRange: [0, 1],
            outputRange: [FONT_SIZES.sm, 11], // Smaller when floating
        }),
        color: error
            ? COLORS.danger
            : isFocused
                ? activeColor
                : COLORS.textSecondary,
        backgroundColor: (isFocused || !!selectedOption)
            ? (variant === 'glass' ? '#F8F9FA' : COLORS.white)
            : 'transparent',
        paddingHorizontal: 6,
        zIndex: 2,
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.selector,
                    variant === 'glass' && styles.selectorGlass,
                    isFocused && { borderColor: activeColor },
                    error && styles.selectorError,
                    disabled && (variant === 'glass' ? styles.selectorGlassDisabled : styles.selectorDisabled),
                    height ? { height } : null,
                ]}
                onPress={handleOpen}
                activeOpacity={0.7}
            >
                {/* Floating Label */}
                {label ? (
                    <Animated.Text style={labelStyle}>
                        {label}
                        {required && <Text style={styles.required}> *</Text>}
                    </Animated.Text>
                ) : null}

                {/* Left Icon */}
                {icon && <View style={styles.iconLeft}>{icon}</View>}

                {/* Selected Value or Placeholder */}
                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                        styles.valueText,
                        variant === 'glass' && { color: COLORS.textPrimary },
                        !selectedOption && [styles.placeholderText, variant === 'glass' && { color: COLORS.textLight }],
                        icon ? styles.valueWithIcon : null,
                        fontSize ? { fontSize } : null,
                    ]}
                >
                    {selectedOption ? selectedOption.label : (placeholder || '')}
                </Text>

                {/* Dropdown Arrow */}
                <Text style={[styles.arrow, variant === 'glass' && { color: COLORS.textSecondary }]}>▼</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                transparent={true}
                visible={visible}
                animationType="fade"
                onRequestClose={handleClose}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={handleClose}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {options.length > 0 ? (
                            <FlatList
                                data={options}
                                keyExtractor={(item) => String(item.value)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.optionItem,
                                            item.value === value && styles.selectedOption
                                        ]}
                                        onPress={() => handleSelect(item.value)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            item.value === value && { color: activeColor, fontWeight: FONT_WEIGHTS.bold }
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.listContent}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No options available</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12, // Match Farmer Screen reduction
    },
    selector: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: COLORS.grayLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.white,
        height: INPUT_HEIGHT,
    },
    selectorGlass: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        elevation: 0,
    },
    selectorFocused: {
        borderColor: COLORS.primary, // Default fallback
    },
    selectorGlassFocused: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.primary, // Default fallback
    },
    selectorError: {
        borderColor: COLORS.danger,
    },
    selectorDisabled: {
        backgroundColor: COLORS.backgroundLight,
        opacity: 0.7,
    },
    selectorGlassDisabled: {
        backgroundColor: COLORS.white,
        opacity: 0.8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    iconLeft: {
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valueText: {
        fontSize: FONT_SIZES.sm, // Reduced from md
        color: COLORS.textPrimary,
        flex: 1,
        paddingTop: 0,
        textAlignVertical: 'center',
    },
    valueWithIcon: {
        paddingLeft: 0,
    },
    placeholderText: {
        color: COLORS.textSecondary,
    },
    arrow: {
        fontSize: FONT_SIZES.xs, // Reduced from sm
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
    },
    required: {
        color: COLORS.danger,
    },
    errorText: {
        marginTop: SPACING.xs,
        marginLeft: SPACING.sm,
        fontSize: FONT_SIZES.sm - 2,
        color: '#FF3B30', // Vibrant iOS Red
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isTablet ? SPACING.xxl : SPACING.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: isTablet ? 500 : 360,
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 20 : 12,
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: moderateScale(0), height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayLight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.md, // Reduced from lg
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    closeButton: {
        fontSize: FONT_SIZES.lg, // Reduced from xl
        color: COLORS.textSecondary,
        padding: SPACING.xs,
    },
    listContent: {
        paddingVertical: SPACING.xs,
    },
    optionItem: {
        paddingVertical: 12, // Reduced padding
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.backgroundLight,
    },
    selectedOption: {
        backgroundColor: COLORS.primary + '10',
    },
    optionText: {
        fontSize: FONT_SIZES.sm, // Reduced from md
        color: COLORS.textPrimary,
    },
    selectedOptionText: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.bold,
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
    },
});

export default Dropdown;
