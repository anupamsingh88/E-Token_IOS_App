import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, RefreshControl, Platform, Animated, FlatList, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale, isTablet } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFarmerData } from '../../contexts/FarmerDataContext';
import {
    BottomNavigation,
    FarmerHero,
    UsageStats,
    FertilizerCard,
    Button,
} from '../../components';
import QRCarousel from '../../components/QRCarousel';
import AdviceScreen from './AdviceScreen';

import SlotBookingScreen from './SlotBookingScreen';
import TokenQRScreen from './TokenQRScreen';
import BookingDetailModal from '../../components/BookingDetailModal';
import FarmerProfileScreen from './FarmerProfileScreen';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { apiFetch } from '../../utils/apiClient';

// Memoize heavy tab components to prevent re-renders when hidden or when switching tabs
const MemoizedAdviceScreen = React.memo(AdviceScreen);
const MemoizedFarmerProfile = React.memo(FarmerProfileScreen);
const MemoizedSlotBooking = React.memo(SlotBookingScreen);
const MemoizedUsageStats = React.memo(UsageStats);
const MemoizedFertilizerCard = React.memo(FertilizerCard);
const MemoizedBottomNavigation = React.memo(BottomNavigation);
const MemoizedFarmerHero = React.memo(FarmerHero);

const statusConfig: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    all: { label: 'सभी', emoji: '📋', color: '#1e40af', bg: '#EFF6FF', border: '#3B82F6' },
    pending: { label: 'लंबित', emoji: '⏳', color: '#92400E', bg: '#FFFBEB', border: '#F59E0B' },
    confirmed: { label: 'पुष्टि', emoji: '✅', color: '#166534', bg: '#F0FDF4', border: '#22C55E' },
    extended: { label: 'विस्तारित', emoji: '⏰', color: '#7C3AED', bg: '#F5F3FF', border: '#8B5CF6' },
    cancelled: { label: 'रद्द', emoji: '❌', color: '#991B1B', bg: '#FFF1F2', border: '#F43F5E' },
    collected: { label: 'प्राप्त', emoji: '🎉', color: '#065F46', bg: '#ECFDF5', border: '#10B981' },
};

const cardBorderColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed' || s === 'approved') return '#22C55E';
    if (s === 'pending') return '#F59E0B';
    if (s === 'extended') return '#8B5CF6';
    if (s === 'cancelled') return '#F43F5E';
    if (s === 'collected') return '#10B981';
    return COLORS.primary;
};

const statusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed' || s === 'approved') return { text: 'पुष्टि ✅', color: '#166534', bg: '#F0FDF4' };
    if (s === 'pending') return { text: 'लंबित ⏳', color: '#92400E', bg: '#FFFBEB' };
    if (s === 'extended') return { text: 'विस्तारित ⏰', color: '#7C3AED', bg: '#F5F3FF' };
    if (s === 'cancelled') return { text: 'रद्द ❌', color: '#991B1B', bg: '#FFF1F2' };
    if (s === 'collected') return { text: 'प्राप्त 🎉', color: '#065F46', bg: '#ECFDF5' };
    return { text: status, color: COLORS.textSecondary, bg: '#F1F5F9' };
};

const formatDateHindi = (dateInput: string | Date, isShort: boolean = false) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const months = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const shortMonths = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सितं', 'अक्टू', 'नवं', 'दिसं'];
    const d = date.getDate().toString().padStart(2, '0');
    const m = isShort ? shortMonths[date.getMonth()] : months[date.getMonth()];
    const y = date.getFullYear();
    return isShort ? `${d} ${m}` : `${d} ${m} ${y}`;
};

const formatMonthYearHindi = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const months = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const BookingCard = React.memo(({ booking, onPress }: { booking: any; onPress: (b: any) => void }) => {
    const st = (booking.status || '').toLowerCase();
    const isCancelled = st === 'cancelled' || st === 'rejected';
    const isApproved = st === 'approved' || st === 'confirmed';
    const isExtended = st === 'extended';
    const isCollected = st === 'collected';

    const totalPrice = booking.items?.reduce((s: number, it: any) => s + (it.price_per_bag * it.quantity), 0) || 0;

    return (
        <TouchableOpacity
            style={[styles.bookingCard, { borderLeftColor: cardBorderColor(booking.status) }]}
            onPress={() => onPress(booking)}
            activeOpacity={0.8}
        >
            <View style={styles.bookingHeader}>
                <Text style={styles.bookingToken}>Token: {booking.token_number || 'PENDING'}</Text>
                <View style={[styles.bookingStatus, {
                    backgroundColor: isCancelled ? '#FEE2E2' :
                        (isApproved ? '#DCFCE7' :
                            (isCollected ? '#D1FAE5' : '#FEF3C7'))
                }]}>
                    <Text style={[styles.bookingStatusText, {
                        color: isCancelled ? '#991B1B' :
                            (isApproved ? '#166534' :
                                (isCollected ? '#065F46' : '#92400E'))
                    }]}>
                        {st === 'pending' ? 'लंबित' :
                            isApproved ? 'पुष्टि' :
                                isCollected ? 'प्राप्त' :
                                    isExtended ? 'विस्तारित' : 'रद्द'}
                    </Text>
                </View>
            </View>

            <Text style={styles.storeName}>{booking.shop_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.primary} />
                <Text style={[styles.bookingDate, { marginTop: 0 }]}>
                    {formatDateHindi(booking.booking_date)}
                </Text>
            </View>

            <View style={styles.bookingItems}>
                {booking.items?.map((item: any, i: number) => (
                    <Text key={i} style={styles.bookingItemText}>
                        • {item.product}: {item.quantity} बोरी
                    </Text>
                ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.bookingPrice}>₹{totalPrice}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </View>
        </TouchableOpacity>
    );
});

const MemoizedFarmerHomeTab = React.memo(({
    refreshing,
    onRefresh,
    activeBookingsForCarousel,
    onQRPress,
    usageStats,
    currentSeason,
    landArea,
    fertilizers,
    onFertilizerPress,
    loading
}: any) => {
    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        >
            {/* QR Carousel Section */}
            {activeBookingsForCarousel.length > 0 && (
                <QRCarousel
                    bookings={activeBookingsForCarousel}
                    onPress={onQRPress}
                />
            )}

            {/* Usage Stats Card */}
            <View style={[styles.section, styles.firstSection]}>
                <View style={styles.seasonHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={COLORS.primary} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>उपयोग सारांश</Text>
                    </View>
                    <View style={styles.seasonBadge}>
                        <Text style={styles.seasonText}>
                            {currentSeason === 'Rabi' ? '❄️ रबी' : '🌧️ खरीफ'} सीजन
                        </Text>
                    </View>
                </View>
                <MemoizedUsageStats
                    used={usageStats.used}
                    remaining={usageStats.remaining}
                    total={usageStats.total}
                    unit="बोरी"
                />
                <Text style={styles.landAreaText}>
                    🌾 आपकी जमीन: {landArea} हेक्टेयर
                </Text>
            </View>

            {/* Fertilizers Grid */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>उर्वरक चुनें</Text>

                {loading && fertilizers.length === 0 ? (
                    <Text style={styles.loadingText}>लोड हो रहा है...</Text>
                ) : (
                    <View style={styles.fertilizerGrid}>
                        {fertilizers.map((fertilizer: any) => (
                            <MemoizedFertilizerCard
                                key={fertilizer.id}
                                id={fertilizer.id}
                                name={fertilizer.name}
                                nameHindi={fertilizer.nameHindi}
                                type={fertilizer.type}
                                price={fertilizer.pricePerBag}
                                availableQuantity={fertilizer.quota.remainingQuantity}
                                onPress={() => onFertilizerPress(fertilizer.id)}
                            />
                        ))}
                    </View>
                )}
            </View>

            <View style={{ height: SPACING.xxl }} />
        </ScrollView>
    );
});

const MemoizedFarmerBookingsTab = React.memo(({
    filteredBookings,
    onBookingPress,
    refreshing,
    onRefresh,
    bookingStatusFilter,
    setBookingStatusFilter,
    bookingDateFilter,
    setBookingDateFilter,
    statusConfig,
    showStatusDropdown,
    setShowStatusDropdown,
    showBookingCalendar,
    setShowBookingCalendar,
    calendarViewMonth,
    setCalendarViewMonth,
    monthLabel,
    weekDays,
    calDays,
    todayStr
}: any) => {

    const renderBooking = useCallback(({ item }: any) => (
        <BookingCard
            booking={item}
            onPress={onBookingPress}
        />
    ), [onBookingPress]);

    const keyExtractor = useCallback((item: any, index: number) => item.order_id || item.id || index.toString(), []);

    const getItemLayout = useCallback((data: any, index: number) => (
        { length: 150, offset: 150 * index, index }
    ), []);

    return (
        <View style={{ flex: 1 }}>
            <View style={bStyles.topBar}>
                <Text style={bStyles.topBarTitle}>मेरी बुकिंग</Text>
                <View style={bStyles.topBarRight}>
                    <TouchableOpacity
                        style={[bStyles.dropdownBtn, showStatusDropdown && bStyles.dateBtnActive]}
                        onPress={() => setShowStatusDropdown(true)}
                    >
                        <Text style={[bStyles.dropdownBtnText, showStatusDropdown && { color: COLORS.white }]}>
                            {statusConfig[bookingStatusFilter]?.label || 'फ़िल्टर'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={showStatusDropdown ? COLORS.white : COLORS.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[bStyles.dateBtn, bookingDateFilter && bStyles.dateBtnActive]}
                        onPress={() => setShowBookingCalendar(true)}
                    >
                        <MaterialCommunityIcons name="calendar-month" size={18}
                            color={bookingDateFilter ? COLORS.white : COLORS.primary} />
                        <Text style={[bStyles.dropdownBtnText, bookingDateFilter && { color: COLORS.white }]}>
                            {bookingDateFilter
                                ? formatDateHindi(bookingDateFilter, true)
                                : 'तारीख़'}
                        </Text>
                        {bookingDateFilter && (
                            <TouchableOpacity
                                onPress={(e: any) => { e.stopPropagation(); setBookingDateFilter(null); }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.white} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
                <Modal
                    visible={showStatusDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowStatusDropdown(false)}
                >
                    <TouchableOpacity style={bStyles.dropdownOverlay} activeOpacity={1} onPress={() => setShowStatusDropdown(false)}>
                        <View style={bStyles.dropdownCard}>
                            {Object.keys(statusConfig).map((key) => {
                                const cfg = statusConfig[key];
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            bStyles.dropdownItem,
                                            bookingStatusFilter === key && bStyles.dropdownItemActive,
                                        ]}
                                        onPress={() => {
                                            setBookingStatusFilter(key as any);
                                            setShowStatusDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            bStyles.dropdownItemText,
                                            bookingStatusFilter === key && { color: COLORS.white }
                                        ]}>
                                            {cfg.emoji} {cfg.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>

            <FlatList
                data={filteredBookings}
                keyExtractor={keyExtractor}
                renderItem={renderBooking}
                getItemLayout={getItemLayout}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={bStyles.emptyBox}>
                        <Text style={{ fontSize: moderateScale(52), marginBottom: 12 }}>📭</Text>
                        <Text style={bStyles.emptyTitle}>कोई बुकिंग नहीं मिली</Text>
                        <Text style={bStyles.emptySubtitle}>
                            {bookingDateFilter || bookingStatusFilter !== 'all'
                                ? 'फ़िल्टर बदलें या हटाएं'
                                : 'अभी तक कोई बुकिंग नहीं'}
                        </Text>
                    </View>
                }
            />

            {/* Calendar Modal */}
            <Modal visible={showBookingCalendar} transparent animationType="fade" onRequestClose={() => setShowBookingCalendar(false)}>
                <TouchableOpacity style={bStyles.calOverlay} activeOpacity={1} onPress={() => setShowBookingCalendar(false)}>
                    <View style={bStyles.calCard}>
                        {/* Month nav */}
                        <View style={bStyles.calNavRow}>
                            <TouchableOpacity onPress={() => { const p = new Date(calendarViewMonth); p.setMonth(p.getMonth() - 1); setCalendarViewMonth(p); }} style={bStyles.calNavBtn}>
                                <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={bStyles.calMonthLabel}>{monthLabel}</Text>
                            <TouchableOpacity onPress={() => { const n = new Date(calendarViewMonth); n.setMonth(n.getMonth() + 1); setCalendarViewMonth(n); }} style={bStyles.calNavBtn}>
                                <MaterialCommunityIcons name="chevron-right" size={26} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        {/* Weekday headers */}
                        <View style={bStyles.calWeekRow}>
                            {weekDays.map((d: string) => <Text key={d} style={bStyles.calWeekText}>{d}</Text>)}
                        </View>
                        {/* Days grid */}
                        <View style={bStyles.calGrid}>
                            {calDays.map((item: any, idx: number) => {
                                const isSelected = item.dateStr === bookingDateFilter;
                                const isFuture = item.dateStr ? item.dateStr > todayStr : false;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            bStyles.calDay,
                                            isSelected && bStyles.calDaySelected,
                                            !item.day && { opacity: 0 },
                                            isFuture && { opacity: 0.3 }
                                        ]}
                                        disabled={!item.day || isFuture}
                                        onPress={() => { if (item.dateStr) { setBookingDateFilter(item.dateStr); setShowBookingCalendar(false); } }}
                                    >
                                        <Text style={[bStyles.calDayText, isSelected && bStyles.calDayTextSelected]}>{item.day || ''}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {/* Action row */}
                        <View style={bStyles.calActions}>
                            <TouchableOpacity style={bStyles.calClearBtn} onPress={() => { setBookingDateFilter(null); setShowBookingCalendar(false); }}>
                                <Text style={bStyles.calClearText}>फ़िल्टर हटाएं</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={bStyles.calTodayBtn} onPress={() => { const now = new Date(); const t = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; setBookingDateFilter(t); setCalendarViewMonth(new Date()); setShowBookingCalendar(false); }}>
                                <Text style={bStyles.calTodayText}>आज</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
});

export interface Fertilizer {
    id: string;
    name: string;
    nameHindi: string;
    type: 'urea' | 'dap' | 'npk' | 'mop';
    pricePerBag: number;
    quota: {
        allowedQuantity: number;
        usedQuantity: number;
        remainingQuantity: number;
    };
}

interface FarmerDashboardProps {
    farmerName: string;
    farmerId: string;
    farmerPhoto?: string | null;
    myBookings: any[];

    onLogout: () => void;
    onPhotoChange?: (newPhotoUrl: string) => void;
}

const FarmerDashboard = ({
    farmerName,
    farmerId,
    farmerPhoto,
    myBookings: initialBookings,

    onLogout,
    onPhotoChange,
}: FarmerDashboardProps) => {
    const [activeTab, setActiveTab] = useState<'home' | 'advice' | 'profile' | 'bookings' | 'request'>('home');
    const [tabHistory, setTabHistory] = useState<Array<'home' | 'advice' | 'profile' | 'bookings' | 'request'>>(['home']);
    const [preselectedFertilizer, setPreselectedFertilizer] = useState<string | null>(null);
    const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['home']));

    const navigateToTab = useCallback((tab: 'home' | 'advice' | 'profile' | 'bookings' | 'request') => {
        setActiveTab(prev => {
            if (prev !== tab) {
                setTabHistory(history => [...history, tab]);
                return tab;
            }
            return prev;
        });
    }, []);

    const handleGoBack = useCallback(() => {
        setTabHistory(prev => {
            if (prev.length > 1) {
                const newHistory = [...prev];
                newHistory.pop();
                const previousTab = newHistory[newHistory.length - 1];
                setActiveTab(previousTab);
                return newHistory;
            }
            return prev;
        });
    }, []);

    const resetToHome = useCallback(() => {
        setTabHistory(['home']);
        setActiveTab('home');
    }, []);

    useEffect(() => {
        setMountedTabs(prev => {
            if (!prev.has(activeTab)) {
                const newSet = new Set(prev);
                newSet.add(activeTab);
                return newSet;
            }
            return prev;
        });
    }, [activeTab]);

    // Handle Hardware Back Button for Dashboard Tabs
    useEffect(() => {
        const handleBackPress = () => {
            if (tabHistory.length > 1) {
                handleGoBack();
                return true; // Prevent default (exit app)
            } else {
                // We are on the home tab. Show exit confirmation in Hindi.
                Alert.alert(
                    'बाहर निकलें',
                    'क्या आप ऐप से बाहर निकलना चाहते हैं?',
                    [
                        { text: 'नहीं', style: 'cancel' },
                        { text: 'हाँ', onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true; // We handled the event by showing the alert
            }
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [tabHistory, handleGoBack]);

    // Booking Filter State
    const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'extended' | 'cancelled' | 'collected'>('all');
    const [bookingDateFilter, setBookingDateFilter] = useState<string | null>(null);
    const [showBookingCalendar, setShowBookingCalendar] = useState(false);
    const [calendarViewMonth, setCalendarViewMonth] = useState(new Date());
    const { prefetchedData, isReady, refreshData } = useFarmerData();
    const [displayName, setDisplayName] = useState(prefetchedData?.farmerName || farmerName);
    const [localFarmerPhoto, setLocalFarmerPhoto] = useState(farmerPhoto);
    const [fertilizers, setFertilizers] = useState<Fertilizer[]>(prefetchedData?.fertilizers || []);
    const [localBookings, setLocalBookings] = useState<any[]>(prefetchedData?.bookings || []);
    
    // Start loading as false if we already have prefetched data in context
    const [loading, setLoading] = useState(fertilizers.length === 0 && !prefetchedData);
    const [refreshing, setRefreshing] = useState(false);
    const [landArea, setLandArea] = useState(prefetchedData?.landArea || 0);
    const [currentSeason, setCurrentSeason] = useState(prefetchedData?.season || 'Rabi');
    const [selectedQRViewBooking, setSelectedQRViewBooking] = useState<any | null>(null);
    const [selectedRetailer, setSelectedRetailer] = useState<any | null>(prefetchedData?.retailer || null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // Calendar logic computations
    const monthLabel = useMemo(() => formatMonthYearHindi(calendarViewMonth), [calendarViewMonth]);
    const weekDays = useMemo(() => ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'], []);
    
    const calDays = useMemo(() => {
        const year = calendarViewMonth.getFullYear();
        const month = calendarViewMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days: { day: number | null, dateStr: string | null }[] = [];
        for (let i = 0; i < firstDay; i++) days.push({ day: null, dateStr: null });
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, dateStr });
        }
        return days;
    }, [calendarViewMonth]);

    const todayStr = useMemo(() => {
        const tDate = new Date();
        return `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
    }, []);

    // On mount: instantly apply prefetched context data (no fetch, no spinner)
    useEffect(() => {
        if (isReady) setLoading(false);
    }, [isReady]);

    // KEY FIX: Sync all local state whenever prefetchedData updates in context
    // Without this, the dashboard shows stale/empty data even after the context refreshes
    useEffect(() => {
        if (!prefetchedData) return;
        if (prefetchedData.fertilizers?.length) setFertilizers(prefetchedData.fertilizers);
        if (prefetchedData.bookings) setLocalBookings(prefetchedData.bookings);
        if (prefetchedData.landArea) setLandArea(prefetchedData.landArea);
        if (prefetchedData.season) setCurrentSeason(prefetchedData.season);
        if (prefetchedData.farmerName) setDisplayName(prefetchedData.farmerName);
        if (prefetchedData.retailer) setSelectedRetailer(prefetchedData.retailer);
        setLoading(false);
        setRefreshing(false);
    }, [prefetchedData]);


    // fetchData used only for pull-to-refresh and auto-refresh interval
    const fetchData = useCallback(async (isRefresh = false) => {
        await refreshData(farmerId, farmerName);
        setRefreshing(false);
        setLoading(false);
    }, [farmerId, farmerName, refreshData]);

    useEffect(() => {
        setDisplayName(farmerName);
    }, [farmerName]);

    useEffect(() => {
        setLocalFarmerPhoto(farmerPhoto);
    }, [farmerPhoto]);

    // Auto-refresh every 60 seconds (reduced from 20s to save battery and network on slow connections)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(true);
        }, 60000); // 60000ms = 60s

        return () => clearInterval(interval);
    }, [fetchData]);


    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const filteredBookings = useMemo(() => {
        return localBookings
            .filter(booking => {
                let passStatus = true;
                if (bookingStatusFilter !== 'all') {
                    const st = (booking.status || '').toLowerCase();
                    if (bookingStatusFilter === 'confirmed') {
                        passStatus = st === 'confirmed' || st === 'approved';
                    } else if (bookingStatusFilter === 'cancelled') {
                        passStatus = st === 'cancelled' || st === 'rejected';
                    } else {
                        passStatus = st === bookingStatusFilter;
                    }
                }

                let passDate = true;
                if (bookingDateFilter && booking.booking_date) {
                    const d = new Date(booking.booking_date);
                    if (!isNaN(d.getTime())) {
                        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        passDate = localDateStr === bookingDateFilter;
                    }
                }

                return passStatus && passDate;
            })
            .sort((a, b) => {
                const dateA = new Date(a.created_at || a.booking_date || 0).getTime();
                const dateB = new Date(b.created_at || b.booking_date || 0).getTime();
                return dateB - dateA; // Newest first
            });
    }, [localBookings, bookingStatusFilter, bookingDateFilter]);

    const activeBookingsForCarousel = useMemo(() => {
        return localBookings.filter(b => {
            const st = (b.status || '').toLowerCase();
            return st === 'pending' || st === 'approved' || st === 'confirmed' || st === 'extended';
        }).sort((a, b) => {
            const dateA = new Date(a.created_at || a.booking_date || 0).getTime();
            const dateB = new Date(b.created_at || b.booking_date || 0).getTime();
            return dateB - dateA;
        }).slice(0, 5);
    }, [localBookings]);

    const usageStats = useMemo(() => {
        return {
            used: fertilizers.reduce((sum, f) => sum + Number(f.quota?.usedQuantity || 0), 0),
            remaining: fertilizers.reduce((sum, f) => sum + Number(f.quota?.remainingQuantity || 0), 0),
            total: fertilizers.reduce((sum, f) => sum + Number(f.quota?.allowedQuantity || 0), 0)
        };
    }, [fertilizers]);


    const renderContent = () => {
        return (
            <View style={{ flex: 1 }}>
                {/* Home Tab */}
                <View style={{ display: activeTab === 'home' ? 'flex' : 'none', flex: 1 }}>
                    {mountedTabs.has('home') && (
                        <MemoizedFarmerHomeTab
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            activeBookingsForCarousel={activeBookingsForCarousel}
                            onQRPress={(booking: any) => setSelectedQRViewBooking(booking)}
                            usageStats={usageStats}
                            currentSeason={currentSeason}
                            landArea={landArea}
                            fertilizers={fertilizers}
                            onFertilizerPress={(id: string) => {
                                setPreselectedFertilizer(id);
                                navigateToTab('request');
                            }}
                            loading={loading}
                        />
                    )}
                </View>

                {/* Bookings Tab */}
                <View style={{ display: activeTab === 'bookings' ? 'flex' : 'none', flex: 1 }}>
                    {mountedTabs.has('bookings') && (
                        <MemoizedFarmerBookingsTab
                            filteredBookings={filteredBookings}
                            onBookingPress={setSelectedQRViewBooking}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            bookingStatusFilter={bookingStatusFilter}
                            setBookingStatusFilter={setBookingStatusFilter}
                            bookingDateFilter={bookingDateFilter}
                            setBookingDateFilter={setBookingDateFilter}
                            statusConfig={statusConfig}
                            showStatusDropdown={showStatusDropdown}
                            setShowStatusDropdown={setShowStatusDropdown}
                            showBookingCalendar={showBookingCalendar}
                            setShowBookingCalendar={setShowBookingCalendar}
                            calendarViewMonth={calendarViewMonth}
                            setCalendarViewMonth={setCalendarViewMonth}
                            monthLabel={monthLabel}
                            weekDays={weekDays}
                            calDays={calDays}
                            todayStr={todayStr}
                        />
                    )}
                </View>

                {/* Advice Tab */}
                <View style={{ display: activeTab === 'advice' ? 'flex' : 'none', flex: 1 }}>
                    {mountedTabs.has('advice') && (
                        <MemoizedAdviceScreen farmerName={displayName} />
                    )}
                </View>

                {/* Profile Tab */}
                <View style={{ display: activeTab === 'profile' ? 'flex' : 'none', flex: 1 }}>
                    {mountedTabs.has('profile') && (
                        <MemoizedFarmerProfile
                            farmerName={displayName}
                            farmerId={farmerId}
                            onLogout={onLogout}
                            onNameChange={(newName) => setDisplayName(newName)}
                            onPhotoChange={onPhotoChange}
                        />
                    )}
                </View>

                {/* Request Tab */}
                <View style={{ display: activeTab === 'request' ? 'flex' : 'none', flex: 1 }}>
                    {mountedTabs.has('request') && (
                        selectedRetailer ? (
                            <MemoizedSlotBooking
                                retailer={selectedRetailer}
                                farmerName={displayName}
                                farmerId={farmerId}
                                initialFertilizerId={preselectedFertilizer || undefined}
                                onConfirmBooking={() => {
                                    setPreselectedFertilizer(null);
                                    resetToHome();
                                    handleRefresh();
                                }}
                                onBack={() => {
                                    setPreselectedFertilizer(null);
                                    handleGoBack();
                                }}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="store-alert-outline" size={64} color={COLORS.textSecondary} />
                                <Text style={styles.emptyStateText}>कोई समिति आवंटित नहीं है।</Text>
                                <Text style={[styles.emptyStateText, { fontSize: moderateScale(14), marginTop: 4 }]}>कृपया अपने कृषि अधिकारी से संपर्क करें।</Text>
                            </View>
                        )
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {activeTab !== 'profile' && (
                <MemoizedFarmerHero
                    name={displayName}
                    subtitle="अपनी उर्वरक कोटा प्रबंधित करें"
                    photoUrl={localFarmerPhoto
                        ? (localFarmerPhoto.startsWith('http')
                            ? localFarmerPhoto
                            : `${API_BASE_URL}/${localFarmerPhoto.startsWith('/') ? localFarmerPhoto.substring(1) : localFarmerPhoto}`)
                        : undefined}
                    onProfilePress={() => navigateToTab('profile')}
                />
            )}

            {renderContent()}

            <BookingDetailModal
                visible={!!selectedQRViewBooking}
                booking={selectedQRViewBooking}
                onClose={() => setSelectedQRViewBooking(null)}
            />

            <MemoizedBottomNavigation
                activeTab={activeTab}
                onTabPress={(tab) => {
                    navigateToTab(tab);
                }}
            />
        </SafeAreaView>
    );
};

export default FarmerDashboard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: SPACING.xxl,
    },
    firstSection: {
        marginTop: SPACING.lg,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    fertilizerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '48%',
        minHeight: verticalScale(120),
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
    },
    primaryAction: {
        backgroundColor: COLORS.primary,
    },
    primaryActionText: {
        color: COLORS.white,
    },
    actionEmoji: {
        fontSize: moderateScale(36),
        marginBottom: SPACING.sm,
    },
    actionText: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    calendarIcon: {
        width: moderateScale(60),
        height: moderateScale(60),
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    calendarMonth: {
        fontSize: moderateScale(10),
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    calendarDate: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: -4,
    },
    bookingCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    bookingToken: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: SPACING.sm,
    },
    bookingStatus: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 4,
    },
    bookingStatusText: {
        fontSize: moderateScale(12),
        fontWeight: 'bold',
    },
    bookingDate: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    bookingItems: {
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.background,
        padding: SPACING.sm,
        borderRadius: 4,
    },
    bookingItemText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    bookingPrice: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    storeName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    storeAddress: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 10,
    },
    emptyState: {
        alignItems: 'center',
        padding: SPACING.xl,
        marginTop: SPACING.xl,
    },
    emptyStateEmoji: {
        fontSize: moderateScale(48),
        marginBottom: SPACING.md,
    },
    emptyStateText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    seasonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    seasonBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    seasonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.primary,
    },
    landAreaText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.md,
        fontWeight: FONT_WEIGHTS.medium,
    },
    loadingText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        padding: SPACING.xl,
    },
});

// ─── Booking Filter Screen Styles ────────────────────────────────────────────
const bStyles = StyleSheet.create({
    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 12,
        backgroundColor: 'transparent',
    },
    topBarTitle: {
        fontSize: moderateScale(26),
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    dateBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dateBtnText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: COLORS.primary,
    },

    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
        marginRight: 10,
    },
    dropdownBtnText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: COLORS.primary,
    },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dropdownCard: {
        width: '100%',
        maxWidth: isTablet ? 380 : 300,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 12,
        ...SHADOWS.large,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    dropdownItemActive: {
        backgroundColor: COLORS.primary,
    },
    dropdownItemText: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: COLORS.textPrimary,
    },

    // Status filter chips
    chipScroll: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    chipEmoji: { fontSize: 14 },
    chipLabel: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    chipBadge: {
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        minWidth: 22,
        alignItems: 'center',
    },
    chipBadgeText: {
        fontSize: moderateScale(11),
        fontWeight: '800',
        color: COLORS.textSecondary,
    },

    // Booking Card
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
    },
    shopName: {
        fontSize: moderateScale(16),
        fontWeight: '800',
        color: COLORS.textPrimary,
        flex: 1,
    },
    cardDate: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        marginTop: 2,
        fontWeight: '600',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statusPillText: {
        fontSize: moderateScale(12),
        fontWeight: '800',
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    tokenText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: COLORS.primary,
    },
    itemsBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        gap: 4,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemName: {
        fontSize: moderateScale(13),
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    itemQty: {
        fontSize: moderateScale(13),
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    addressText: {
        fontSize: moderateScale(12),
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 8,
    },
    priceText: {
        fontSize: moderateScale(16),
        fontWeight: '900',
        color: COLORS.primary,
    },

    // Empty state
    emptyBox: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    emptyTitle: {
        fontSize: moderateScale(17),
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Calendar Modal
    calOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    calCard: {
        width: '100%',
        maxWidth: isTablet ? 480 : 360,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        ...SHADOWS.large,
    },
    calNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    calNavBtn: {
        width: moderateScale(40),
        height: verticalScale(40),
        borderRadius: 20,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calMonthLabel: {
        fontSize: moderateScale(17),
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    calWeekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    calWeekText: {
        width: moderateScale(36),
        textAlign: 'center',
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    calDay: {
        width: '14.28%',
        height: verticalScale(42),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 21,
    },
    calDaySelected: {
        backgroundColor: COLORS.primary,
    },
    calDayText: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    calDayTextSelected: {
        color: COLORS.white,
        fontWeight: '900',
    },
    calActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    calClearBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
    },
    calClearText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    calTodayBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    calTodayText: {
        fontSize: moderateScale(14),
        fontWeight: '800',
        color: COLORS.white,
    },
});
