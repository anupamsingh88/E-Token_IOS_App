import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Modal,
    Platform,
    ActivityIndicator,
    Dimensions,
    BackHandler
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button } from '../../components';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../constants';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';
import { useFarmerData } from '../../contexts/FarmerDataContext';
import ParticleBackground from '../../components/ParticleBackground';
import { scale, verticalScale, moderateScale, isTablet } from '../../utils/responsive';
import { getNextSequentialToken } from '../../utils/tokenGenerator';


interface Retailer {
    id: string;
    shopName?: string;
    shop_name?: string;
    name: string;
    address: string;
    address_en?: string;
}

interface FertilizerStock {
    id: string; // 'Urea', 'DAP'
    name: string;
    nameHindi: string;
    price: number;
    availableStock: number;
    userQuotaRemaining: number;
}

interface SlotBookingScreenProps {
    retailer: Retailer;
    farmerName: string;
    onConfirmBooking: (bookingData: any) => void; // Callback to refresh dashboard
    onBack: () => void;
    farmerId?: string; // Need farmerId to fetch quota
    initialFertilizerId?: string; // Pre-selected from dashboard
}

// Helper function to get available booking dates (excluding Sundays)
const getAvailableBookingDates = (count = 5): Date[] => {
    const dates: Date[] = [];
    let offset = 0;
    while (dates.length < count && offset < 14) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        // Exclude Sunday (0 is Sunday in JavaScript Date.getDay())
        if (d.getDay() !== 0) {
            dates.push(d);
        }
        offset++;
    }
    return dates;
};

export default function SlotBookingScreen({
    retailer,
    farmerName,
    onConfirmBooking,
    onBack,
    farmerId = 'FARMER_123', // Fallback for dev, should be passed
    initialFertilizerId
}: SlotBookingScreenProps) {
    const { prefetchedData } = useFarmerData();
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState<Date>(() => getAvailableBookingDates(1)[0] || new Date());
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // Initialize stocks directly from context if available to prevent flicker
    const [stocks, setStocks] = useState<FertilizerStock[]>(() => {
        if (prefetchedData?.fertilizers?.length) {
            return prefetchedData.fertilizers.map(f => ({
                id: f.name,
                name: f.name,
                nameHindi: f.nameHindi,
                price: f.pricePerBag,
                availableStock: 0,
                userQuotaRemaining: f.quota.remainingQuantity
            }));
        }
        return [];
    });

    // Start with loading=false if we have stocks ready
    const [loading, setLoading] = useState(stocks.length === 0 && !prefetchedData);

    const [dateRefreshing, setDateRefreshing] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Initialize counts from context if available
    const [counts, setCounts] = useState(prefetchedData?.counts || { daily: 0, pending: 0 });

    const isInitialLoad = React.useRef(true);
    // Cache counts per date string so switching dates is instant on revisit
    const dateCountsCache = React.useRef<Record<string, { daily: number; pending: number }>>({});
    const QUOTA_CACHE_KEY = `slot_quota_${farmerId}`;

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: React.ReactNode;
        type: 'error' | 'success' | 'warning' | 'confirm';
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'error'
    });

    const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    const showAlert = (title: string, message: React.ReactNode, type: 'error' | 'success' | 'warning' = 'error') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const showConfirm = (title: string, message: React.ReactNode, onConfirm: () => void) => {
        setAlertConfig({ visible: true, title, message, type: 'confirm', onConfirm, onCancel: hideAlert });
    };

    const [retailerInfo, setRetailerInfo] = useState(retailer);

    // Highly-specific BackHandler to protect the booking process
    useEffect(() => {
        const handleBackPress = () => {
            if (bookingLoading || alertConfig.visible) {
                // Return true means "We handled the back press", preventing navigation
                return true;
            }
            return false; // Let the Dashboard handle it normally
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [bookingLoading, alertConfig.visible]);

    // Fetch retailer name if it's potentially just an ID
    useEffect(() => {
        const fetchName = async () => {
            if (retailer.id && (!retailer.shopName || retailer.shopName === retailer.id)) {
                try {
                    const response = await apiFetch(`${API_ENDPOINTS.getRetailerInfo}?retailer_id=${retailer.id}`);
                    const result = await response.json();
                    if (result.success && result.data) {
                        setRetailerInfo({
                            ...retailer,
                            shopName: result.data.agency_name || result.data.name || retailer.id,
                            name: result.data.name || retailer.name,
                            address: result.data.address || retailer.address
                        });
                    }
                } catch (error) {
                    console.error('Error fetching retailer name:', error);
                }
            }
        };
        fetchName();
    }, [retailer.id]);

    // Pre-fill quantity if initialFertilizerId is provided
    useEffect(() => {
        if (initialFertilizerId && stocks.length > 0) {
            const stock = stocks.find(s => s.id.toLowerCase() === initialFertilizerId.toLowerCase());
            if (stock && stock.userQuotaRemaining > 0) {
                setQuantities(prev => ({ ...prev, [stock.id]: 1 }));
            }
        }
    }, [initialFertilizerId, stocks]);

    useEffect(() => {
        // This flag prevents stale API responses from updating the UI
        // when the user switches dates quickly (race condition fix)
        let cancelled = false;

        const fetchData = async () => {
            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

            if (isInitialLoad.current && prefetchedData) {
                isInitialLoad.current = false;
                if (!cancelled) setDateRefreshing(true);
            } else if (isInitialLoad.current) {
                try {
                    const cached = await AsyncStorage.getItem(QUOTA_CACHE_KEY);
                    if (cancelled) return; // Date changed while reading cache — abort
                    if (cached) {
                        const data = JSON.parse(cached);
                        if (data.stocks?.length) setStocks(data.stocks);
                        if (data.counts) setCounts(data.counts);
                        setLoading(false);
                    } else {
                        setLoading(true);
                    }
                } catch (_) {
                    if (!cancelled) setLoading(true);
                }
            } else {
                if (!cancelled) {
                    // Show cached data instantly if available, otherwise reset and show loader
                    if (dateCountsCache.current[dateStr]) {
                        setCounts(dateCountsCache.current[dateStr]);
                        setDateRefreshing(false);
                    } else {
                        setCounts({ daily: 0, pending: 0 });
                        setDateRefreshing(true);
                    }
                }
            }

            try {
                const quotaRes = await apiFetch(API_ENDPOINTS.getFarmerQuota, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        farmer_id: farmerId,
                        booking_date: dateStr
                    })
                });

                if (cancelled) return; // Date changed while fetching — discard this response

                const quotaData = await quotaRes.json();

                if (cancelled) return; // Date changed while parsing — discard

                let quotas: Record<string, number> = {};
                let prices: Record<string, number> = {};

                if (quotaData.success && quotaData.data.fertilizers) {
                    quotaData.data.fertilizers.forEach((f: any) => {
                        quotas[f.name] = f.quota.remainingQuantity;
                        prices[f.name] = f.pricePerBag;
                    });
                }

                const newStocks: FertilizerStock[] = [
                    { id: 'Urea', name: 'Urea', nameHindi: 'यूरिया', price: prices['Urea'] || 0, availableStock: 0, userQuotaRemaining: quotas['Urea'] || 0 },
                    { id: 'DAP', name: 'DAP', nameHindi: 'डीएपी', price: prices['DAP'] || 0, availableStock: 0, userQuotaRemaining: quotas['DAP'] || 0 },
                    { id: 'NPK', name: 'NPK', nameHindi: 'एनपीके', price: prices['NPK'] || 0, availableStock: 0, userQuotaRemaining: quotas['NPK'] || 0 },
                    { id: 'MOP', name: 'MOP', nameHindi: 'एमओपी', price: prices['MOP'] || 0, availableStock: 0, userQuotaRemaining: quotas['MOP'] || 0 },
                ];

                if (quotaData.success && quotaData.data) {
                    const daily = quotaData.data.daily_booking_count || 0;
                    const pending = quotaData.data.pending_booking_count || 0;
                    const freshCounts = { daily, pending };
                    dateCountsCache.current[dateStr] = freshCounts;
                    setCounts(freshCounts);
                }

                setStocks(newStocks);

                const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                if (dateStr === todayStr) {
                    try {
                        await AsyncStorage.setItem(QUOTA_CACHE_KEY, JSON.stringify({
                            stocks: newStocks,
                            counts: quotaData?.data ? { daily: quotaData.data.daily_booking_count || 0, pending: quotaData.data.pending_booking_count || 0 } : { daily: 0, pending: 0 },
                            timestamp: Date.now(),
                        }));
                    } catch (_) { }
                }

            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching booking data:", error);
                    showAlert('त्रुटि', 'स्टॉक डेटा लोड करने में विफल', 'error');
                }
            } finally {
                if (!cancelled) {
                    isInitialLoad.current = false;
                    setLoading(false);
                    setDateRefreshing(false);
                }
            }
        };

        fetchData();

        // Cleanup: mark this fetch as stale when the date changes
        return () => { cancelled = true; };
    }, [selectedDate, retailer.id, farmerId]);

    const updateQuantity = (id: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            const newVal = Math.max(0, current + delta);
            const stock = stocks.find(s => s.id === id);
            if (!stock) return prev;
            if (newVal > 25) {
                showAlert('सीमा समाप्त', 'एक उत्पाद की अधिकतम 25 बोरी ही बुक की जा सकती हैं।', 'warning');
                return prev;
            }
            if (newVal > stock.userQuotaRemaining) {
                showAlert('कोटा सीमा', `आपका शेष कोटा केवल ${stock.userQuotaRemaining} बोरी है।`, 'warning');
                return prev;
            }
            return { ...prev, [id]: newVal };
        });
    };

    const totalBags = Object.values(quantities).reduce((a, b) => a + b, 0);
    const totalPrice = stocks.reduce((sum, stock) => sum + (stock.price * (quantities[stock.id] || 0)), 0);

    const handleBooking = async () => {
        const items = stocks
            .filter(s => (quantities[s.id] || 0) > 0)
            .map(s => ({
                product: s.id,
                quantity: quantities[s.id],
                price: s.price
            }));

        if (items.length === 0) {
            showAlert('त्रुटि', 'कृपया कम से कम एक उर्वरक चुनें।', 'warning');
            return;
        }

        showConfirm(
            'बुकिंग की पुष्टि करें',
            (
                <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text style={[styles.summaryText, { width: '100%', textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit>
                        कुल: {totalBags} बोरी
                    </Text>
                    <Text style={[styles.summaryText, { width: '100%', textAlign: 'center' }]}>राशि: ₹{totalPrice}</Text>
                    <Text style={styles.confirmPromptText}>क्या आप अपना अनुरोध भेजना चाहते हैं?</Text>
                </View>
            ),
            async () => {
                hideAlert();
                setBookingLoading(true);
                try {
                    const payload = {
                        farmer_id: farmerId,
                        retailer_id: retailer.id,
                        retailer_name: retailer.shopName || retailer.name,
                        booking_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
                        items: items
                    };

                    const response = await apiFetch(API_ENDPOINTS.bookSlot, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();

                    if (result.success || result.message === "Request Pending Approval") {
                        let tokenNumber = result.token_number || result.token;
                        if (!tokenNumber || tokenNumber === 'PENDING') {
                            tokenNumber = await getNextSequentialToken(prefetchedData?.bookings || []);
                        }

                        const bookingData = {
                            id: result.order_id || Date.now().toString(),
                            order_id: result.order_id || undefined,
                            success: true,
                            tokenNumber: tokenNumber,
                            token_number: tokenNumber,
                            qrCode: JSON.stringify({
                                token: tokenNumber,
                                farmer_id: farmerId,
                                retailer_id: retailer.id,
                                booking_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                            }),
                            bookingDate: selectedDate.toString(),
                            totalPrice: totalPrice,
                            retailerId: retailer.id,
                            shopName: retailer.shopName,
                            status: result.status || 'Pending',
                            items: items.map(i => {
                                const stockItem = stocks.find(s => s.id === i.product);
                                return {
                                    ...i,
                                    name: stockItem?.name || i.product,
                                    nameHindi: stockItem?.nameHindi || i.product
                                };
                            })
                        };

                        setAlertConfig({
                            visible: true,
                            title: 'सफलता',
                            message: 'आपका खाद बुकिंग अनुरोध रिटेलर के पास अनुमोदन के लिए भेज दिया गया है।',
                            type: 'success',
                            onConfirm: () => {
                                hideAlert();
                                setQuantities({});
                                setSelectedDate(getAvailableBookingDates(1)[0] || new Date());
                                onConfirmBooking(bookingData);
                            }
                        });
                    } else {
                        showAlert('विफल', result.message || 'बुकिंग विफल रही', 'error');
                    }
                } catch (error) {
                    console.error('Booking error:', error);
                    showAlert('त्रुटि', 'नेटवर्क त्रुटि, पुनः प्रयास करें', 'error');
                } finally {
                    setBookingLoading(false);
                }
            }
        );
    };

    const renderDateSelector = () => {
        const dates = getAvailableBookingDates(5);

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {dates.map((date, index) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                            onPress={() => {
                                const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                if (dateCountsCache.current[dStr]) {
                                    setCounts(dateCountsCache.current[dStr]);
                                }
                                setSelectedDate(date);
                            }}
                        >
                            <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                                {date.toLocaleDateString('hi-IN', { weekday: 'short' })}
                            </Text>
                            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                                {date.getDate()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.modernBackButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>खाद अनुरोध फॉर्म</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {loading && stocks.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary, fontWeight: '500' }}>डेटा लोड हो रहा है...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Card style={styles.retailerCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <MaterialCommunityIcons name="storefront-outline" size={24} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                            <Text style={styles.retailerName}>{retailerInfo.shopName || retailerInfo.shop_name || 'समिति का नाम लोड हो रहा है...'}</Text>
                        </View>
                        <Text style={styles.retailerAddress}>
                            <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textSecondary} /> {retailerInfo.address || retailerInfo.address_en || 'पता उपलब्ध नहीं'}
                        </Text>
                    </Card>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>बुकिंग दिनांक चुनें</Text>
                        {renderDateSelector()}
                    </View>

                    {(counts.daily >= 3 || counts.pending >= 3) && (
                        <Card style={[
                            styles.limitCard,
                            counts.daily >= 3 ? styles.limitCardError : styles.limitCardWarning,
                        ] as any}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: moderateScale(24), height: verticalScale(24), justifyContent: 'center', alignItems: 'center' }}>
                                    {dateRefreshing ? (
                                        <ActivityIndicator size="small" color={counts.daily >= 3 ? COLORS.error : '#D97706'} />
                                    ) : (
                                        <MaterialCommunityIcons
                                            name={counts.daily >= 3 ? "alert-octagon" : "clock-alert"}
                                            size={24}
                                            color={counts.daily >= 3 ? COLORS.error : '#D97706'}
                                        />
                                    )}
                                </View>
                                <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                                    <Text style={[styles.limitTitle, { color: counts.daily >= 3 ? COLORS.error : '#D97706' }]} numberOfLines={1}>
                                        {counts.daily >= 3 ? 'दैनिक बुकिंग सीमा समाप्त' : 'प्रतीक्षारत बुकिंग सीमा'}
                                    </Text>
                                    <Text style={styles.limitMessage} numberOfLines={2}>
                                        {counts.daily >= 3
                                            ? (selectedDate.toDateString() === new Date().toDateString()
                                                ? 'आप आज की अधिकतम 3 बुकिंग कर चुके हैं।'
                                                : `आप ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()} की अधिकतम ${counts.daily} बुकिंग कर चुके हैं`)
                                            : 'आपकी 3 बुकिंग अभी प्रतीक्षारत हैं। कृपया उनके स्वीकृत होने का इंतज़ार करें।'}
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>उर्वरक चुनें (बोरियाँ)</Text>
                        {stocks.map(stock => (
                            <Card key={stock.id} style={styles.stockCard}>
                                <View style={styles.stockInfo}>
                                    <Text style={styles.stockName}>{stock.nameHindi} <Text style={{ fontSize: moderateScale(13), color: COLORS.textSecondary }}>({stock.name})</Text></Text>
                                    <Text style={styles.stockPrice}>₹{stock.price} / बोरी</Text>
                                    <View style={styles.stockBadgeContainer}>
                                        <View style={[styles.badgeWrapper, { backgroundColor: COLORS.error + '15' }]}>
                                            <MaterialCommunityIcons name="account-circle" size={14} color={COLORS.error} />
                                            <Text style={styles.quotaText}>
                                                आपका कोटा: {stock.userQuotaRemaining}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.counter}>
                                    <TouchableOpacity
                                        style={[styles.countBtn, styles.minusBtn]}
                                        onPress={() => updateQuantity(stock.id, -1)}
                                        disabled={bookingLoading}
                                    >
                                        <MaterialCommunityIcons name="minus" size={20} color={COLORS.textPrimary} />
                                    </TouchableOpacity>

                                    <View style={styles.countDisplay}>
                                        <Text style={styles.countText}>{quantities[stock.id] || 0}</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.countBtn, styles.plusBtn]}
                                        onPress={() => updateQuantity(stock.id, 1)}
                                        disabled={bookingLoading || stock.userQuotaRemaining === 0}
                                    >
                                        <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))}
                    </View>
                </ScrollView>
            )}

            {totalBags > 0 && !loading && (
                <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm }]}>
                    <View>
                        <Text style={styles.footerLabel}>कुल ({totalBags} बोरी)</Text>
                        <Text style={styles.footerPrice}>₹{totalPrice}</Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.modernBookBtn,
                            (bookingLoading || counts.daily >= 3 || counts.pending >= 3) && { backgroundColor: COLORS.grayLight, opacity: 0.8 }
                        ] as any}
                        onPress={handleBooking}
                        disabled={bookingLoading || counts.daily >= 3 || counts.pending >= 3}
                    >
                        {bookingLoading ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.modernBookBtnText}>बुकिंग करें</Text>
                                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={alertConfig.visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alertCard}>
                        <View style={[styles.alertIconContainer,
                        alertConfig.type === 'success' ? { backgroundColor: COLORS.success + '20' } :
                            alertConfig.type === 'error' ? { backgroundColor: COLORS.error + '20' } :
                                alertConfig.type === 'warning' ? { backgroundColor: '#FEF3C7' } :
                                    { backgroundColor: COLORS.primary + '20' }
                        ]}>
                            <MaterialCommunityIcons
                                name={
                                    alertConfig.type === 'success' ? "check-decagram" :
                                        alertConfig.type === 'error' ? "alert-circle" :
                                            alertConfig.type === 'warning' ? "alert" :
                                                "help-circle"
                                }
                                size={40}
                                color={
                                    alertConfig.type === 'success' ? COLORS.success :
                                        alertConfig.type === 'error' ? COLORS.error :
                                            alertConfig.type === 'warning' ? '#D97706' :
                                                COLORS.primary
                                }
                            />
                        </View>
                        <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                        {typeof alertConfig.message === 'string' ? (
                            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
                        ) : (
                            alertConfig.message
                        )}

                        <View style={styles.alertActions}>
                            {alertConfig.type === 'confirm' ? (
                                <>
                                    <TouchableOpacity style={[styles.alertButton, styles.alertCancelButton]} onPress={alertConfig.onCancel}>
                                        <Text style={styles.alertCancelText}>रद्द करें</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.alertButton, styles.alertConfirmButton]} onPress={alertConfig.onConfirm}>
                                        <Text style={styles.alertConfirmText}>हाँ, पुष्टि करें</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertConfirmButton, { width: '100%' }]}
                                    onPress={alertConfig.onConfirm || hideAlert}
                                >
                                    <Text style={styles.alertConfirmText}>ठीक है</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const isTallScreen = WINDOW_HEIGHT > 750;

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    modernBackButton: {
        width: moderateScale(44),
        height: verticalScale(44),
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.grayLight,
        marginRight: SPACING.md,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    content: { paddingHorizontal: 16, paddingTop: SPACING.lg, paddingBottom: 120 },
    retailerCard: { marginBottom: SPACING.lg, padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl },
    retailerName: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    retailerAddress: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
    section: { marginBottom: SPACING.xl },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginBottom: SPACING.md, color: COLORS.textPrimary },
    dateScroll: { flexDirection: 'row' },
    dateCard: {
        width: moderateScale(70),
        height: verticalScale(80),
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        borderWidth: 1.5,
        borderColor: COLORS.grayLight,
        ...SHADOWS.small,
    },
    dateCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dateText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' },
    dateTextSelected: { color: COLORS.white + 'CC' },
    dayText: { fontSize: moderateScale(22), fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
    dayTextSelected: { color: COLORS.white },
    stockCard: {
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.grayLight,
    },
    stockInfo: { flex: 1, marginRight: 15 },
    stockName: { fontSize: moderateScale(19), fontWeight: '900', color: COLORS.textPrimary },
    stockPrice: { fontSize: moderateScale(16), color: COLORS.textSecondary, marginTop: 4, fontWeight: '700' },
    stockBadgeContainer: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badgeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 7,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginLeft: isTallScreen ? -4 : 0,
    },
    quotaText: {
        fontSize: moderateScale(14),
        color: COLORS.error,
        fontWeight: 'bold',
    },
    counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, borderRadius: 24, padding: 4, borderWidth: 1, borderColor: COLORS.grayLight },
    countBtn: { width: moderateScale(40), height: verticalScale(40), borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    minusBtn: { backgroundColor: COLORS.white, ...SHADOWS.small },
    plusBtn: { backgroundColor: COLORS.primary, ...SHADOWS.small },
    countDisplay: { width: moderateScale(44), alignItems: 'center' },
    countText: { fontSize: moderateScale(20), fontWeight: '900', color: COLORS.textPrimary },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.grayLight,
        ...SHADOWS.large
    },
    footerLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: 'bold' },
    footerPrice: { fontSize: moderateScale(24), fontWeight: '900', color: COLORS.primary },
    modernBookBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.medium
    },
    modernBookBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.lg,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isTablet ? SPACING.xxl : SPACING.xl,
    },
    alertCard: {
        width: '100%',
        maxWidth: isTablet ? 480 : 360,
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 28 : BORDER_RADIUS.xl,
        padding: isTablet ? 28 : SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    alertIconContainer: {
        width: isTablet ? 84 : moderateScale(80),
        height: isTablet ? 84 : verticalScale(80),
        borderRadius: isTablet ? 42 : 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: isTablet ? SPACING.xl : SPACING.lg,
    },
    alertTitle: {
        fontSize: isTablet ? 24 : moderateScale(22),
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: isTablet ? 17 : FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: isTablet ? SPACING.xxl : SPACING.xl,
        lineHeight: isTablet ? 28 : 26,
    },
    alertActions: {
        flexDirection: 'row',
        width: '100%',
        gap: isTablet ? SPACING.lg : SPACING.md,
    },
    alertButton: {
        flex: 1,
        paddingVertical: isTablet ? 16 : 14,
        borderRadius: isTablet ? 14 : BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertCancelButton: {
        backgroundColor: COLORS.backgroundLight,
        borderWidth: 1,
        borderColor: COLORS.grayLight,
    },
    alertCancelText: {
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        fontSize: isTablet ? 17 : FONT_SIZES.md,
    },
    alertConfirmButton: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
    },
    alertConfirmText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: isTablet ? 17 : FONT_SIZES.md,
    },
    summaryText: {
        fontSize: moderateScale(16),
        color: COLORS.textSecondary,
        marginBottom: 2,
        fontWeight: '700',
    },
    confirmPromptText: {
        fontSize: moderateScale(16),
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    limitCard: {
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        borderLeftWidth: 5,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        height: verticalScale(84),
        overflow: 'hidden',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    limitCardError: {
        backgroundColor: COLORS.error + '10',
        borderLeftColor: COLORS.error,
    },
    limitCardWarning: {
        backgroundColor: '#FEF3C7',
        borderLeftColor: '#D97706',
    },
    limitTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    limitMessage: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
});
