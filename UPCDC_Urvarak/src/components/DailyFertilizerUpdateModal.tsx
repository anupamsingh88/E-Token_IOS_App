import { apiFetch } from '../utils/apiClient';
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    useWindowDimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants';
import AlertModal from './AlertModal';
import { API_ENDPOINTS } from '../config/config';

interface DailyFertilizerUpdateModalProps {
    visible: boolean;
    retailerId: string;
    onComplete: () => void;
}

export default function DailyFertilizerUpdateModal({ visible, retailerId, onComplete }: DailyFertilizerUpdateModalProps) {
    const [loading, setLoading] = useState(false);
    const { height: windowHeight } = useWindowDimensions();
    const isSmallScreen = windowHeight < 800;

    // Stock State
    const [ureaStock, setUreaStock] = useState('');
    const [dapStock, setDapStock] = useState('');
    const [npkStock, setNpkStock] = useState('');
    const [mopStock, setMopStock] = useState('');
    const [alertModal, setAlertModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info',
        onClose: undefined as (() => void) | undefined
    });

    const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
        setAlertModal({ visible: true, type, title, message, onClose });
    };

    const hideAlert = () => {
        if (alertModal.onClose) alertModal.onClose();
        setAlertModal(prev => ({ ...prev, visible: false }));
    };

    const handleSubmit = async () => {
        const updates = [
            { product_type: 'urea', quantity: parseInt(ureaStock) },
            { product_type: 'dap', quantity: parseInt(dapStock) },
            { product_type: 'npk', quantity: parseInt(npkStock) },
            { product_type: 'mop', quantity: parseInt(mopStock) },
        ].filter(u => !isNaN(u.quantity));

        if (updates.length === 0) {
            showAlert('info', 'सूचना', 'कृपया कम से कम एक खाद का स्टॉक दर्ज करें');
            return;
        }

        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.updateStock, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId, // Send directly as string
                    updates: updates
                })
            });

            const result = await response.json();
            if (result.success) {
                showAlert('success', 'सफल', result.message || 'आज का स्टॉक अपडेट कर दिया गया है!', onComplete);
            } else {
                showAlert('error', 'त्रुटि', result.message || 'अपडेट करने में विफल');
            }
        } catch (error) {
            console.error('Daily stock update error:', error);
            showAlert('error', 'त्रुटि', 'सर्वर से कनेक्ट नहीं हो पा रहा है');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[
                    styles.modalContent, 
                    isSmallScreen && { 
                        padding: SPACING.lg, 
                        maxHeight: '92%',
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0
                    }
                ]}>
                    <View style={[styles.header, isSmallScreen && { marginBottom: SPACING.md }]}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="update" size={32} color={COLORS.primary} />
                        </View>
                        <Text style={styles.headerTitle}>आज का स्टॉक अपडेट</Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>खाद का स्टॉक (Daily Initial Stock)</Text>
                            <Text style={styles.stepSubtitle}>दुकान खोलते समय आपके पास मौजूद स्टॉक दर्ज करें</Text>

                            <View style={styles.grid}>
                                <View style={styles.itemRow}>
                                    <Text style={styles.itemLabel}>यूरिया (Urea)</Text>
                                    <TextInput
                                        style={styles.fullInput}
                                        placeholder="Urea bags (e.g. 100)"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={ureaStock}
                                        onChangeText={setUreaStock}
                                    />
                                </View>
                                <View style={styles.itemRow}>
                                    <Text style={styles.itemLabel}>डीएपी (DAP)</Text>
                                    <TextInput
                                        style={styles.fullInput}
                                        placeholder="DAP bags (e.g. 50)"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={dapStock}
                                        onChangeText={setDapStock}
                                    />
                                </View>
                                <View style={styles.itemRow}>
                                    <Text style={styles.itemLabel}>एनपीके (NPK)</Text>
                                    <TextInput
                                        style={styles.fullInput}
                                        placeholder="NPK bags"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={npkStock}
                                        onChangeText={setNpkStock}
                                    />
                                </View>
                                <View style={styles.itemRow}>
                                    <Text style={styles.itemLabel}>एमओपी (MOP)</Text>
                                    <TextInput
                                        style={styles.fullInput}
                                        placeholder="MOP bags"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={mopStock}
                                        onChangeText={setMopStock}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                (!ureaStock || !dapStock || !npkStock || !mopStock) && styles.disabledBtn
                            ]}
                            onPress={handleSubmit}
                            disabled={loading || !ureaStock || !dapStock || !npkStock || !mopStock}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Text style={styles.btnText}>सबमिट करें (Update Today)</Text>
                                    <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.footerHint}>* यह दिन में केवल एक बार आवश्यक है</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <AlertModal
                visible={alertModal.visible}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={hideAlert}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: SPACING.xl,
        width: '100%',
        maxHeight: '80%',
        ...SHADOWS.large,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.primary,
    },
    scrollContent: {
        paddingVertical: 10,
    },
    stepContainer: {
        width: '100%',
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 20,
    },
    grid: {
        gap: 12,
    },
    itemRow: {
        marginBottom: 15,
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
    },
    fullInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE',
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    footer: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    submitBtn: {
        backgroundColor: COLORS.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 10,
    },
    btnText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '900',
    },
    disabledBtn: {
        backgroundColor: '#CCC',
        opacity: 0.7,
    },
    footerHint: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '600',
    }
});
