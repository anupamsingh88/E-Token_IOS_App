import { apiFetch } from '../../utils/apiClient';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, LayoutAnimation, Platform, UIManager, Animated, Easing, Dimensions, TextInput, PanResponder, RefreshControl, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants';
import { API_ENDPOINTS } from '../../config/config';
import ParticleBackground from '../../components/ParticleBackground';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import TopHeader from '../../components/TopHeader';
const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FertilizerItem {
    id: string;
    name: string;
    nameHindi: string;
    type: 'urea' | 'dap' | 'npk' | 'mop';
    price: number;
}

interface RequestDetail {
    quantity: number;
    status: 'pending' | 'approved' | 'rejected' | null;
    comment: string | null;
    time: string | null;
}

interface StockRequestScreenProps {
    onBack: () => void;
    retailerId: string;
    retailerName?: string;
}

const SELECTION_ASSETS = {
    urea: require('../../../assets/urea_bori.png'),
    dap: require('../../../assets/dap_bori.png'),
    npk: require('../../../assets/npk_bori.png'),
    mop: require('../../../assets/mop_bori.png'),
};

const DETAIL_ASSETS = {
    urea: require('../../../assets/bori_urea.jpeg'),
    dap: require('../../../assets/bori_DAP.jpeg'),
    npk: require('../../../assets/bori_NPK.jpeg'),
    mop: require('../../../assets/bori_MOP.jpeg'),
};

const DEFAULT_ITEMS: FertilizerItem[] = [
    { id: '1', name: 'Urea', nameHindi: 'यूरिया', type: 'urea', price: 0 },
    { id: '2', name: 'DAP', nameHindi: 'डीएपी', type: 'dap', price: 0 },
    { id: '3', name: 'NPK', nameHindi: 'एनपीके', type: 'npk', price: 0 },
    { id: '4', name: 'MOP', nameHindi: 'एमओपी', type: 'mop', price: 0 },
];

const STATUS_LABELS = {
    pending: 'लंबित',
    approved: 'स्वीकृत',
    rejected: 'अस्वीकृत',
};

const STATUS_COLORS = {
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
};

export default function StockRequestScreen({ onBack, retailerId, retailerName }: StockRequestScreenProps) {
    const [items, setItems] = useState<FertilizerItem[]>(DEFAULT_ITEMS);
    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
    const [selectedItem, setSelectedItem] = useState<FertilizerItem | null>(null);
    const [quantity, setQuantity] = useState('');
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
    const [sliderWidth, setSliderWidth] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [dailyRequests, setDailyRequests] = useState<Record<string, RequestDetail>>({
        urea: { quantity: 0, status: null, comment: null, time: null },
        dap: { quantity: 0, status: null, comment: null, time: null },
        npk: { quantity: 0, status: null, comment: null, time: null },
        mop: { quantity: 0, status: null, comment: null, time: null },
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        const backAction = () => {
            if (activeTab === 'history') {
                setActiveTab('request');
                return true;
            }
            if (selectedItem) {
                setSelectedItem(null);
                return true;
            }
            onBack();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [selectedItem, activeTab, onBack]);

    const fetchData = useCallback(async (isRefresh = false, isSilent = false, activeFlag = { active: true }) => {
        try {
            if (!isSilent) {
                if (isRefresh) setRefreshing(true);
                else setLoading(true);
            }

            // Fetch Prices
            const settingsRes = await apiFetch(API_ENDPOINTS.getSettings);
            if (!activeFlag.active) return;
            const settingsResult = await settingsRes.json();
            if (!activeFlag.active) return;
            const prices = settingsResult.data || {};

            const updatedItems = DEFAULT_ITEMS.map(item => ({
                ...item,
                price: prices[`${item.type}_price`] || 0,
            }));
            if (!activeFlag.active) return;
            setItems(updatedItems);

            // Fetch Today's Requests
            const requestsRes = await apiFetch(`${API_ENDPOINTS.getDailyRequests}?retailer_id=${retailerId}`);
            if (!activeFlag.active) return;
            const requestsResult = await requestsRes.json();
            if (!activeFlag.active) return;
            if (requestsResult.success) {
                setDailyRequests(requestsResult.data);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            if (activeFlag.active) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [retailerId]);

    useEffect(() => {
        let active = true;
        const activeFlag = { active };

        fetchData(false, false, activeFlag);
        const interval = setInterval(() => {
            fetchData(true, true, activeFlag);
        }, 120000); // Silent background refresh

        return () => {
            active = false;
            activeFlag.active = false;
            clearInterval(interval);
        };
    }, [retailerId, fetchData]);

    useEffect(() => {
        if (selectedItem) {
            const currentReq = dailyRequests[selectedItem.type];
            setQuantity(currentReq?.quantity > 0 ? currentReq.quantity.toString() : '');
            // Simple display without heavy transitions
            fadeAnim.setValue(1);
            translateYAnim.setValue(0);
            scaleAnim.setValue(1);
        }
    }, [selectedItem, dailyRequests]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                if (sliderWidth > 0) {
                    const relativeX = gestureState.moveX - (width - sliderWidth) / 2;
                    const percentage = (relativeX / sliderWidth) * 1000;
                    const clampedValue = Math.max(0, Math.min(1000, Math.round(percentage / 10) * 10));
                    setQuantity(clampedValue.toString());
                }
            },
        })
    ).current;

    const handleQuantityChange = (val: string) => {
        const num = parseInt(val) || 0;
        if (num >= 0 && num <= 9999) setQuantity(num.toString());
    };

    const adjustQuantity = (amount: number) => {
        const current = parseInt(quantity) || 0;
        const next = Math.max(0, Math.min(9999, current + amount));
        setQuantity(next.toString());
    };

    const handleSendRequest = async () => {
        if (!quantity || !selectedItem) {
            showAlert('error', 'त्रुटि', 'कृपया बोरी की संख्या दर्ज करें');
            return;
        }
        const currentReq = dailyRequests[selectedItem.type];
        if (currentReq?.status === 'approved') {
            showAlert('info', 'सूचना', 'आपका पिछला अनुरोध स्वीकृत हो चुका है। आप अगले 4 दिनों तक नया अनुरोध नहीं कर सकते।');
            return;
        }
        setLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.requestStock, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId,
                    product_type: selectedItem.type,
                    quantity: parseInt(quantity)
                }),
            });
            const result = await response.json();
            if (result.success) {
                showAlert('success', 'सफल', result.message || 'आपका अनुरोध भेज दिया गया है।', () => {
                    setSelectedItem(null);
                    fetchData(true);
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            showAlert('error', 'त्रुटि', error.message || 'अनुरोध भेजने में विफल');
        } finally {
            setLoading(false);
        }
    };

    const renderStatusBadge = (status: 'pending' | 'approved' | 'rejected' | null) => {
        if (!status) return null;
        return (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + '20', borderColor: STATUS_COLORS[status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
            </View>
        );
    };

    const renderItemSelector = () => (
        <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
                <Text style={styles.selectorTitle}>अनुरोध के लिए खाद चुनें</Text>
                <Text style={styles.selectorSub}>स्टॉक मंगवाने के लिए खाद और मात्रा का चयन करें</Text>
            </View>
            <View style={styles.itemGrid}>
                {items.map((item) => {
                    const req = dailyRequests[item.type];
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.itemCard}
                            onPress={() => setSelectedItem(item)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.imageContainer}>
                                <Image source={SELECTION_ASSETS[item.type]} style={styles.gridImage} resizeMode="cover" />
                            </View>
                            <View style={styles.cardInfoContainer}>
                                <View style={styles.cardNameRow}>
                                    <Text style={styles.gridName}>{item.nameHindi}</Text>
                                    {renderStatusBadge(req.status)}
                                </View>
                                {req.quantity > 0 ? (
                                    <View style={styles.requestDetailRow}>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="cube-outline" size={14} color="#4F46E5" />
                                            <Text style={styles.detailValue}>{req.quantity} बोरी</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="time-outline" size={14} color="#64748B" />
                                            <Text style={styles.detailTime}>{req.time}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <Text style={styles.priceSmall}>₹{item.price} / बोरी</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <ParticleBackground>
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.headerGlass}>
                    <TouchableOpacity onPress={selectedItem ? () => setSelectedItem(null) : onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{selectedItem ? selectedItem.nameHindi : 'खाद अनुरोध'}</Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />}
                >
                    {!selectedItem ? renderItemSelector() : (
                        <View>
                            <View style={styles.premiumProductCard}>
                                <View style={styles.productCardContent}>
                                    <View style={styles.productImageWrapper}>
                                        <Image source={DETAIL_ASSETS[selectedItem.type]} style={styles.detailBoriImage} resizeMode="contain" />
                                    </View>
                                    <View style={styles.productDetailsSide}>
                                        <View style={styles.productTitleRow}>
                                            <Text style={styles.detailTitleMain}>{selectedItem.nameHindi}</Text>
                                            {renderStatusBadge(dailyRequests[selectedItem.type].status)}
                                        </View>
                                        <Text style={styles.detailPriceMain}>₹{selectedItem.price} / बोरी</Text>
                                        {dailyRequests[selectedItem.type].comment && (
                                            <View style={styles.commentBox}>
                                                <Text style={styles.commentTitle}>AR की टिप्पणी:</Text>
                                                <Text style={styles.commentText}>{dailyRequests[selectedItem.type].comment}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.solidFormCard}>
                                <View style={styles.formSectionHeader}>
                                    <Text style={styles.formSectionTitle}>
                                        {dailyRequests[selectedItem.type].status === 'pending' ? 'अनुरोध अपडेट करें' : 'आवश्यक मात्रा दर्ज करें'}
                                    </Text>
                                </View>

                                {dailyRequests[selectedItem.type].status !== 'approved' ? (
                                    <>
                                        <View style={styles.stepperContainer}>
                                            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuantity(-10)}>
                                                <Ionicons name="remove" size={24} color="#7C3AED" />
                                            </TouchableOpacity>

                                            <View style={styles.sliderTrackContainer} onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)} {...panResponder.panHandlers}>
                                                <View style={styles.sliderTrackBackground} />
                                                <View style={[styles.sliderTrackActive, { width: `${Math.min(100, (parseInt(quantity) || 0) / 10)}%`, backgroundColor: '#7C3AED' }]} />
                                                <View style={[styles.sliderThumb, { left: `${Math.min(92, (parseInt(quantity) || 0) / 10)}%`, borderColor: '#7C3AED' }]}>
                                                    <Text style={styles.thumbValue}>{quantity || 0}</Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuantity(10)}>
                                                <Ionicons name="add" size={24} color="#7C3AED" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={[styles.inputDisplayWrapper, { borderColor: '#7C3AED' }]}>
                                            <TextInput
                                                value={quantity}
                                                onChangeText={handleQuantityChange}
                                                keyboardType="numeric"
                                                style={styles.displayInput}
                                                placeholder="0"
                                                placeholderTextColor="#CBD5E1"
                                            />
                                            <View style={styles.inputSeparator} />
                                            <Text style={styles.inputUnitLabel}>बोरी</Text>
                                        </View>

                                        <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#7C3AED' }]} onPress={handleSendRequest} disabled={loading}>
                                            <View style={styles.mainActionBtnContent}>
                                                <Text style={styles.mainActionBtnText}>
                                                    {dailyRequests[selectedItem.type].status === 'pending' ? 'अनुरोध अपडेट करें' : 'अनुरोध भेजें'}
                                                </Text>
                                                <Ionicons name="send" size={20} color="#FFF" />
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.approvedBox}>
                                        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                                        <Text style={styles.approvedText}>अनुरोध स्वीकृत ({dailyRequests[selectedItem.type].time})</Text>
                                        <Text style={styles.lockInfoText}>4 दिन बाद ही नया अनुरोध कर पाएंगे</Text>
                                        <Text style={styles.approvedQty}>{dailyRequests[selectedItem.type].quantity} बोरी</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
                <AlertModal
                    visible={alertModal.visible}
                    type={alertModal.type}
                    title={alertModal.title}
                    message={alertModal.message}
                    onClose={hideAlert}
                />
            </SafeAreaView>
        </ParticleBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        ...SHADOWS.small,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 15 },
    selectorContainer: { marginTop: 5 },
    selectorHeader: { marginBottom: 20 },
    selectorTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
    selectorSub: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
    itemCard: {
        width: (width - 55) / 2,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    imageContainer: {
        width: '100%',
        height: 110,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    gridImage: { width: '100%', height: '100%' },
    cardInfoContainer: { padding: 12 },
    cardNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    gridName: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
    priceSmall: { fontSize: 12, color: '#4F46E5', fontWeight: '800' },
    requestDetailRow: { marginTop: 4, gap: 4 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailValue: { fontSize: 13, color: '#4F46E5', fontWeight: '900' },
    detailTime: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1
    },
    statusText: { fontSize: 9, fontWeight: '900' },
    premiumProductCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
    productCardContent: { flexDirection: 'row', alignItems: 'center' },
    productImageWrapper: { width: 80, height: 100, justifyContent: 'center', alignItems: 'center' },
    detailBoriImage: { width: 70, height: 90 },
    productDetailsSide: { flex: 1, paddingLeft: 15 },
    productTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    detailTitleMain: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
    detailPriceMain: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 5 },
    commentBox: { backgroundColor: '#FFF7ED', padding: 8, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#FFEDD5' },
    commentTitle: { fontSize: 10, fontWeight: '800', color: '#C2410C', marginBottom: 2 },
    commentText: { fontSize: 12, color: '#9A3412', fontWeight: '600' },
    solidFormCard: { padding: 20, backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
    formSectionHeader: { alignItems: 'center', marginBottom: 20 },
    formSectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    stepBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    sliderTrackContainer: { flex: 1, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', paddingHorizontal: 4, position: 'relative' },
    sliderTrackBackground: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginHorizontal: 10 },
    sliderTrackActive: { position: 'absolute', left: 14, height: 4, borderRadius: 2 },
    sliderThumb: { position: 'absolute', width: 40, height: 32, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    thumbValue: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
    inputDisplayWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 16, marginBottom: 20, borderWidth: 2 },
    displayInput: { fontSize: 24, fontWeight: '900', color: '#1E293B', textAlign: 'center', width: 100 },
    inputSeparator: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 15 },
    inputUnitLabel: { fontSize: 16, fontWeight: '800', color: '#64748B' },
    mainActionBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    mainActionBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainActionBtnText: { fontSize: 20, fontWeight: '900', color: '#FFF' },
    approvedBox: { alignItems: 'center', paddingVertical: 20 },
    approvedText: { fontSize: 16, fontWeight: '800', color: '#10B981', marginTop: 10, textAlign: 'center' },
    lockInfoText: { fontSize: 14, fontWeight: '600', color: '#EF4444', marginTop: 4, textAlign: 'center' },
    approvedQty: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginTop: 10 },
});
