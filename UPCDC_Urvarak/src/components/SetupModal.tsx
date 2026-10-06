import { apiFetch } from '../utils/apiClient';
import React, { useState } from 'react';
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
import { API_ENDPOINTS } from '../config/config';
import AlertModal from './AlertModal';

interface SetupModalProps {
    visible: boolean;
    retailerId: string;
    onComplete: () => void;
}

export default function SetupModal({ visible, retailerId, onComplete }: SetupModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
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
    const { height: windowHeight } = useWindowDimensions();
    
    // Check if it's a small screen to adjust UI
    const isSmallScreen = windowHeight < 800;

    // Form State
    const [totalCapacity, setTotalCapacity] = useState('');
    const [visitorCap, setVisitorCap] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securePassword, setSecurePassword] = useState(true);

    // Initial Stock State
    const [ureaStock, setUreaStock] = useState('');
    const [dapStock, setDapStock] = useState('');
    const [npkStock, setNpkStock] = useState('');
    const [mopStock, setMopStock] = useState('');

    const handleSubmit = async () => {
        if (!password || password !== confirmPassword) {
            showAlert('error', 'त्रुटि', 'पासवर्ड मैच नहीं कर रहे हैं या खाली हैं');
            return;
        }

        if (!totalCapacity || !visitorCap) {
            showAlert('error', 'त्रुटि', 'कृपया क्षमता विवरण भरें');
            return;
        }

        if (!ureaStock || !dapStock || !npkStock || !mopStock) {
            showAlert('error', 'त्रुटि', 'कृपया सभी उर्वरक स्टॉक विवरण भरें');
            return;
        }

        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.completeSetup, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId,
                    password: password,
                    total_capacity: parseInt(totalCapacity) || 0,
                    daily_visitor_capacity: parseInt(visitorCap) || 0,
                    urea_stock: parseInt(ureaStock) || 0,
                    dap_stock: parseInt(dapStock) || 0,
                    npk_stock: parseInt(npkStock) || 0,
                    mop_stock: parseInt(mopStock) || 0
                })
            });

            const result = await response.json();
            if (result.success) {
                showAlert('success', 'सफल', 'सेटअप सफलतापूर्वक पूरा हो गया!', onComplete);
            } else {
                showAlert('error', 'त्रुटि', result.message || 'सेटअप विफल रहा');
            }
        } catch (error) {
            console.error('Setup error:', error);
            showAlert('error', 'त्रुटि', 'नेटवर्क समस्या। कृपया पुनः प्रयास करें।');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>स्टोर की क्षमता (Storage Capacity)</Text>
            <Text style={styles.stepSubtitle}>अपनी कुल क्षमता और विजिटर लिमिट दर्ज करें</Text>

            <View style={styles.field}>
                <Text style={styles.label}>कुल भंडारण क्षमता (बोरी में)</Text>
                <TextInput
                    style={styles.fullInput}
                    placeholder="Total Capacity (e.g. 500)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={totalCapacity}
                    onChangeText={setTotalCapacity}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>एक दिन में कितने किसान आ सकते हैं?</Text>
                <TextInput
                    style={styles.fullInput}
                    placeholder="Visitor Capacity (e.g. 50)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={visitorCap}
                    onChangeText={setVisitorCap}
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>सुरक्षा सेटिंग (Security Settings)</Text>
            <Text style={styles.stepSubtitle}>अपना नया पासवर्ड सेट करें</Text>

            <View style={styles.field}>
                <Text style={styles.label}>नया पासवर्ड सेट करें</Text>
                <View style={styles.passwordWrapper}>
                    <TextInput
                        style={[styles.fullInput, { flex: 1 }]}
                        placeholder="New Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={securePassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setSecurePassword(!securePassword)}
                    >
                        <Ionicons
                            name={securePassword ? "eye-off" : "eye"}
                            size={24}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>पासवर्ड की पुष्टि करें</Text>
                <TextInput
                    style={styles.fullInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={securePassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>प्रारंभिक स्टॉक (Initial Stock)</Text>
            <Text style={styles.stepSubtitle}>आज का उपलब्ध स्टॉक दर्ज करें (बोरी में)</Text>

            <View style={styles.grid}>
                <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>यूरिया (Urea)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={ureaStock}
                        onChangeText={setUreaStock}
                    />
                </View>
                <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>डीएपी (DAP)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={dapStock}
                        onChangeText={setDapStock}
                    />
                </View>
                <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>एनपीके (NPK)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={npkStock}
                        onChangeText={setNpkStock}
                    />
                </View>
                <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>एमओपी (MOP)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={mopStock}
                        onChangeText={setMopStock}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="slide">
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
                        <View style={styles.progressDot}>
                            <View style={[styles.dot, step >= 1 && styles.activeDot]} />
                            <View style={[styles.line, step >= 2 && styles.activeLine]} />
                            <View style={[styles.dot, step >= 2 && styles.activeDot]} />
                            <View style={[styles.line, step >= 3 && styles.activeLine]} />
                            <View style={[styles.dot, step >= 3 && styles.activeDot]} />
                        </View>
                        <Text style={[styles.headerTitle, isSmallScreen && { fontSize: 20, marginTop: 5 }]}>प्रथम लॉगिन सेटअप</Text>
                    </View>

                    <ScrollView
                        style={styles.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
                        
                        {/* For very small screens, we might want to add extra padding at bottom of scroll */}
                        {isSmallScreen && <View style={{ height: 20 }} />}
                    </ScrollView>

                    <View style={[
                        styles.footer, 
                        isSmallScreen && { 
                            paddingTop: SPACING.md, 
                            marginTop: SPACING.sm,
                            paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.md
                        }
                    ]}>
                        {step === 1 ? (
                            <TouchableOpacity
                                style={[
                                    styles.nextBtn, 
                                    (!totalCapacity || !visitorCap) && styles.disabledBtn,
                                    isSmallScreen && { padding: 14 }
                                ]}
                                onPress={() => {
                                    if (totalCapacity && visitorCap) setStep(2);
                                    else showAlert('info', 'सूचना', 'कृपया सभी जानकारी भरें');
                                }}
                            >
                                <Text style={[styles.btnText, isSmallScreen && { fontSize: 16 }]}>अगला (Next)</Text>
                                <Ionicons name="arrow-forward" size={isSmallScreen ? 18 : 20} color="#FFF" />
                            </TouchableOpacity>
                        ) : step === 2 ? (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.backBtn, isSmallScreen && { padding: 14 }]} onPress={() => setStep(1)}>
                                    <Text style={[styles.btnText, { color: COLORS.primary }, isSmallScreen && { fontSize: 16 }]}>पीछे</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.nextBtn, 
                                        { flex: 2 }, 
                                        (!password || !confirmPassword) && styles.disabledBtn,
                                        isSmallScreen && { padding: 14 }
                                    ]}
                                    onPress={() => {
                                        if (password && confirmPassword) {
                                            if (password !== confirmPassword) {
                                                showAlert('error', 'त्रुटि', 'पासवर्ड मैच नहीं कर रहे हैं');
                                            } else {
                                                setStep(3);
                                            }
                                        } else {
                                            showAlert('info', 'सूचना', 'कृपया पासवर्ड भरें');
                                        }
                                    }}
                                >
                                    <Text style={[styles.btnText, isSmallScreen && { fontSize: 16 }]}>अगला (Next)</Text>
                                    <Ionicons name="arrow-forward" size={isSmallScreen ? 18 : 20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.backBtn, isSmallScreen && { padding: 14 }]} onPress={() => setStep(2)}>
                                    <Text style={[styles.btnText, { color: COLORS.primary }, isSmallScreen && { fontSize: 16 }]}>पीछे</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.submitBtn, 
                                        (!ureaStock || !dapStock || !npkStock || !mopStock) && styles.disabledBtn,
                                        isSmallScreen && { padding: 14 }
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={loading || !ureaStock || !dapStock || !npkStock || !mopStock}
                                >
                                    {loading ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={[styles.btnText, isSmallScreen && { fontSize: 16 }]}>सबमिट करें</Text>
                                            <Ionicons name="checkmark-done" size={isSmallScreen ? 18 : 20} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
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
        justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-end',
        padding: Platform.OS === 'ios' ? SPACING.lg : 0,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 30,
        padding: SPACING.xl,
        // Remove fixed height to allow flexible resizing with keyboard
        maxHeight: '85%',
        width: '100%',
        ...SHADOWS.large,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.primary,
        marginTop: 10,
    },
    progressDot: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#DDD',
    },
    activeDot: {
        backgroundColor: COLORS.primary,
    },
    line: {
        width: 40,
        height: 3,
        backgroundColor: '#DDD',
    },
    activeLine: {
        backgroundColor: COLORS.primary,
    },
    stepContainer: {
        width: '100%',
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    grid: {
        gap: 12,
        marginBottom: 20,
    },
    itemRow: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 15,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.primary,
        marginBottom: 8,
    },
    inputGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EEE',
        fontSize: 14,
        fontWeight: '600',
    },
    fullInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE',
        fontSize: 16,
        fontWeight: '600',
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    field: {
        marginBottom: 15,
    },
    nextBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 15,
        gap: 10,
        marginTop: 10,
    },
    submitBtn: {
        flex: 2,
        backgroundColor: COLORS.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 15,
        gap: 10,
        },
    backBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    btnText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '900',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    eyeBtn: {
        padding: 15,
    },
    scrollArea: {
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.xl,
    },
    footer: {
        width: '100%',
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginTop: SPACING.md,
    },
    disabledBtn: {
        backgroundColor: '#CCC',
        opacity: 0.7,
    }
});
