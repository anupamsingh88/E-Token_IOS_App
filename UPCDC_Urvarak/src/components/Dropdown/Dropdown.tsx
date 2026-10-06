import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants';

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
}) => {
    const [visible, setVisible] = useState(false);

    const selectedOption = options.find((opt) => opt.value == value);

    const handleSelect = (val: string | number) => {
        onSelect(val);
        setVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{label}</Text>
                {required && <Text style={styles.required}>*</Text>}
            </View>

            <TouchableOpacity
                style={[
                    styles.selector,
                    error ? styles.selectorError : null,
                    disabled ? styles.selectorDisabled : null,
                ]}
                onPress={() => !disabled && setVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.valueText,
                    !selectedOption && styles.placeholderText
                ]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                transparent={true}
                visible={visible}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
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
                                            item.value === value && styles.selectedOptionText
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
        marginBottom: SPACING.md,
    },
    labelContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    label: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    required: {
        color: COLORS.error,
        marginLeft: 4,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.grayLight,
        borderRadius: 8,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
    },
    selectorError: {
        borderColor: COLORS.error,
    },
    selectorDisabled: {
        backgroundColor: COLORS.backgroundLight,
        opacity: 0.7,
    },
    valueText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        flex: 1,
    },
    placeholderText: {
        color: COLORS.textSecondary,
    },
    arrow: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
    },
    errorText: {
        marginTop: 4,
        fontSize: FONT_SIZES.sm,
        color: COLORS.error,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
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
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    closeButton: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.textSecondary,
        padding: SPACING.xs,
    },
    listContent: {
        paddingVertical: SPACING.xs,
    },
    optionItem: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.backgroundLight,
    },
    selectedOption: {
        backgroundColor: COLORS.primary + '10', // 10% opacity
    },
    optionText: {
        fontSize: FONT_SIZES.md,
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
