import { apiFetch } from '../../utils/apiClient';
import { getTodayDateString, isDateMatch, formatToHindiDate, formatToISODate, parseMixedDateFormat } from '../../utils/dateUtils';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    FlatList,
    Dimensions,
    RefreshControl,
    Modal,
    ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../../constants';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import { RetailerLogger } from '../../utils/RetailerLogger';
import AlertModal from '../../components/AlertModal';

const { width } = Dimensions.get('window');

interface BookingListScreenProps {
    retailerId?: string;
    retailerDetails?: any;
    onBack: () => void;
}

export default function BookingListScreen({ retailerId, retailerDetails, onBack }: BookingListScreenProps) {
    const [bookings, setBookings] = useState<{ pending: any[], approved: any[], cancelled: any[], extended: any[], collected: any[] }>({
        pending: [], approved: [], cancelled: [], extended: [], collected: []
    });
    const [bookingTab, setBookingTab] = useState<'pending' | 'approved' | 'cancelled' | 'extended' | 'collected'>('pending');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const bookingsRef = useRef(bookings);

    useEffect(() => {
        bookingsRef.current = bookings;
    }, [bookings]);
    const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, number>>({});

    // Removed manual getTodayDate in favor of dateUtils.getTodayDateString

    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
    const [useDateFilter, setUseDateFilter] = useState(false);

    const resetDateFilter = () => {
        setSelectedDate(getTodayDateString());
        setUseDateFilter(false);
    };
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [showExtensionCalendar, setShowExtensionCalendar] = useState(false);
    const [extendingItem, setExtendingItem] = useState<any>(null);
    const [selectedExtensionDate, setSelectedExtensionDate] = useState<string>('');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean, title: string, message: string, onConfirm: () => void
    }>({ visible: false, title: '', message: '', onConfirm: () => { } });
    const [alertModal, setAlertModal] = useState<{
        visible: boolean, type: 'success' | 'error' | 'info', title: string, message: string
    }>({ visible: false, type: 'info', title: '', message: '' });
    const insets = useSafeAreaInsets();

    // Memoized Calendar Days for main calendar
    const calendarDays = useMemo(() => {
        if (!showCalendar) return [];
        const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const days: any[] = [];
        for (let i = 0; i < firstDay; i++) days.push({ day: null, key: `empty-${i}` });
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, date: dateStr, key: `day-${dateStr}` });
        }
        return days;
    }, [calendarMonth, showCalendar]);

    // Helper to get ISO date (YYYY-MM-DD)
    const getISODate = useCallback((rawDate: any): string | null => {
        if (!rawDate) return null;
        const parsed = parseMixedDateFormat(rawDate);
        return parsed ? formatToISODate(parsed) : null;
    }, []);

    // Calculate maximum date across all extended and approved bookings for this retailer
    const globalMaxExtendedDate = useMemo(() => {
        let maxD = '';
        const allProcessed = [...(bookings.extended || []), ...(bookings.approved || [])];
        allProcessed.forEach((b: any) => {
            const d = getISODate(b.booking_date);
            if (d && (!maxD || d > maxD)) {
                maxD = d;
            }
        });
        return maxD;
    }, [bookings.extended, bookings.approved, getISODate]);

    // Memoized Calendar Days for Extension Calendar - STRICT QUEUE ORDER
    const extensionDays = useMemo(() => {
        if (!showExtensionCalendar) return [];

        const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const days: any[] = [];

        const todayStr = getTodayDateString();
        const originalBookingDateRaw = extendingItem?.booking_date || todayStr;

        // Normalize original booking date to YYYY-MM-DD for robust comparison
        const parsedOriginalDate = parseMixedDateFormat(originalBookingDateRaw);
        const originalBookingDate = parsedOriginalDate ? formatToISODate(parsedOriginalDate) : todayStr;

        // Preceding queue date if any
        const precedingDate = extendingItem?.highestPrecedingDate || '';
        const minRequired = precedingDate ? (precedingDate > todayStr ? precedingDate : todayStr) : todayStr;

        for (let i = 0; i < firstDay; i++) days.push({ day: null, key: `ext-empty-${i}` });
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            // STRICT QUEUE LOCK:
            // 1. Cannot be in the past or today
            // 2. Cannot be before the preceding queue date (< precedingDate)
            // 3. Must be strictly greater than original date if original was already >= minRequired
            let isPast = false;
            if (dateStr <= todayStr) {
                isPast = true;
            } else if (precedingDate && dateStr < precedingDate) {
                isPast = true;
            } else if (originalBookingDate >= minRequired && dateStr <= originalBookingDate) {
                isPast = true;
            }

            days.push({ day: i, date: dateStr, key: `ext-${dateStr}`, isPast });
        }
        return days;
    }, [calendarMonth, extendingItem, showExtensionCalendar]);

    const fetchBookings = useCallback(async (isRefresh = false, isSilent = false, activeFlag = { active: true }) => {
        try {
            // Flicker Fix: Only show full-screen spinner if it's the absolute first load and no data exists
            const hasData = bookingsRef.current.pending.length > 0 || bookingsRef.current.approved.length > 0 || bookingsRef.current.collected.length > 0;

            if (!isSilent) {
                if (isRefresh || hasData) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }
            }

            const effectiveId = retailerId || retailerDetails?.retailer_id || retailerDetails?.id || '';
            const response = await apiFetch(API_ENDPOINTS.getRetailerRequests, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retailer_id: effectiveId })
            });
            if (!activeFlag.active) return;
            const result = await response.json();
            if (!activeFlag.active) return;
            if (result.status === 'success') {
                if (Array.isArray(result.data.bookings)) {
                    const categorized: { pending: any[], approved: any[], cancelled: any[], extended: any[], collected: any[] } = { pending: [], approved: [], cancelled: [], extended: [], collected: [] };
                    result.data.bookings.forEach((b: any) => {
                        const status = b.status?.toLowerCase() || 'pending';
                        if (status === 'pending' || status === 'booked') categorized.pending.push(b);
                        else if (status === 'approved' || status === 'confirmed') categorized.approved.push(b);
                        else if (status === 'cancelled' || status === 'rejected') categorized.cancelled.push(b);
                        else if (status === 'extended') categorized.extended.push(b);
                        else if (status === 'collected') categorized.collected.push(b);
                        else categorized.pending.push(b);
                    });
                    setBookings(categorized);
                }
            }
        } catch (error) {
            console.error('Fetch bookings failed', error);
        } finally {
            if (activeFlag.active) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [retailerId, retailerDetails]);

    useEffect(() => {
        let active = true;
        const activeFlag = { active };

        fetchBookings(false, false, activeFlag);
        const interval = setInterval(() => {
            fetchBookings(true, true, activeFlag);
        }, 30000); // Silent background refresh

        return () => {
            active = false;
            activeFlag.active = false;
            clearInterval(interval);
        };
    }, [retailerId, fetchBookings]);

    const handleAction = async (endpoint: string, body: Record<string, any>, successMsg: string) => {
        const effectiveId = retailerId || retailerDetails?.retailer_id || retailerDetails?.id || 'UNKNOWN';
        try {
            setLoading(true);
            RetailerLogger.apiReq(endpoint, 'POST', body, effectiveId);

            const response = await apiFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            
            RetailerLogger.apiRes(endpoint, response.status, result, effectiveId);

            if (result.status === 'success') {
                setAlertModal({ visible: true, type: 'success', title: 'सफल', message: successMsg });
                fetchBookings();
            } else {
                setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: result.message || 'कुछ गलत हो गया' });
            }
        } catch (error) {
            console.error('Action failed', error);
            RetailerLogger.apiErr(endpoint, 0, error, effectiveId);
            setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें' });
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = (itemId: string, originalQty: number, delta: number) => {
        const currentModified = modifiedQuantities[itemId] ?? originalQty;
        const newQty = Math.max(0, currentModified + delta);
        if (newQty > originalQty) return;
        setModifiedQuantities(prev => ({ ...prev, [itemId]: newQty }));
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ visible: true, title, message, onConfirm });
    };

    const filterListByDate = (list: any[]) => {
        const safeList = Array.isArray(list) ? list : [];
        if (!useDateFilter) return safeList;

        return safeList.filter(item => {
            const isCollected = item.status?.toLowerCase() === 'collected';
            const rawDate = isCollected ? (item.collected_at || item.booking_date) : item.booking_date;

            return isDateMatch(rawDate, selectedDate);
        });
    };

    const renderCustomConfirmModal = () => (
        <Modal visible={confirmModal.visible} transparent animationType="fade" onRequestClose={() => setConfirmModal({ ...confirmModal, visible: false })}>
            <View style={styles.modalOverlay}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.confirmCard}>
                    <View style={styles.confirmIconContainer}>
                        <Ionicons name="help-circle-outline" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
                    <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
                    <View style={styles.confirmActionRow}>
                        <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmModal({ ...confirmModal, visible: false })}>
                            <Text style={styles.confirmCancelText}>नहीं</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmOkBtn} onPress={() => { setConfirmModal({ ...confirmModal, visible: false }); confirmModal.onConfirm(); }}>
                            <Text style={styles.confirmOkText}>हाँ, करें</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderExtensionCalendarModal = () => {
        const monthName = calendarMonth.toLocaleString('hi-IN', { month: 'long', year: 'numeric' });
        const weekDays = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
        return (
            <Modal visible={showExtensionCalendar} transparent animationType="fade" onRequestClose={() => setShowExtensionCalendar(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExtensionCalendar(false)}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.calendarCard, { marginBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={() => { const prev = new Date(calendarMonth); prev.setMonth(prev.getMonth() - 1); setCalendarMonth(prev); }}>
                                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                            <TouchableOpacity onPress={() => { const next = new Date(calendarMonth); next.setMonth(next.getMonth() + 1); setCalendarMonth(next); }}>
                                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ textAlign: 'center', marginBottom: 8, fontWeight: '800', color: '#64748B' }}>बुकिंग के लिए नई तारीख चुनें</Text>
                        {extendingItem?.highestPrecedingDate ? (
                            <View style={styles.calendarQueueNotice}>
                                <Ionicons name="information-circle" size={16} color="#DC2626" />
                                <Text style={styles.calendarQueueNoticeText}>
                                    कतार नियम: पिछले किसान की तारीख {formatToHindiDate(extendingItem.highestPrecedingDate)} है — केवल {formatToHindiDate(extendingItem.highestPrecedingDate)} या उसके बाद की तारीख चुनें
                                </Text>
                            </View>
                        ) : extendingItem?.booking_date ? (
                            <Text style={{ textAlign: 'center', marginBottom: 10, fontSize: 12, color: '#EF4444', fontWeight: '700' }}>
                                ⚠️ वर्तमान तारीख: {extendingItem.booking_date} — इससे बड़ी तारीख चुनें
                            </Text>
                        ) : null}
                        <View style={styles.weekRow}>
                            {weekDays.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
                        </View>
                        <View style={styles.daysGrid}>
                            {extensionDays.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.dayCell,
                                        item.date === selectedExtensionDate && !item.isPast && styles.selectedDayCell,
                                        item.isPast && styles.disabledDayCell,
                                    ]}
                                    disabled={!item.day || item.isPast}
                                    onPress={() => {
                                        if (item.date && !item.isPast) {
                                            setSelectedExtensionDate(item.date);
                                            showConfirm('अनुरोध की पुष्टि', `क्या आप बुकिंग की तारीख ${item.date} तक बढ़ाने की पुष्टि करना चाहते हैं?`, () => {
                                                setShowExtensionCalendar(false);
                                                handleAction(API_ENDPOINTS.manageBooking, { booking_id: extendingItem.id, action: 'extend', retailer_id: retailerId, new_date: item.date }, `बुकिंग की तारीख ${item.date} तक बढ़ा दी गई है`);
                                            });
                                        }
                                    }}
                                >
                                    {item.day && <Text style={[
                                        styles.dayText,
                                        item.date === selectedExtensionDate && !item.isPast && styles.selectedDayText,
                                        item.isPast && styles.disabledDayText,
                                    ]}>{item.day}</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderCalendarModal = () => {
        const monthName = calendarMonth.toLocaleString('hi-IN', { month: 'long', year: 'numeric' });
        const weekDays = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
        return (
            <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.calendarCard, { marginBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={() => { const prev = new Date(calendarMonth); prev.setMonth(prev.getMonth() - 1); setCalendarMonth(prev); }}>
                                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                            <TouchableOpacity onPress={() => { const next = new Date(calendarMonth); next.setMonth(next.getMonth() + 1); setCalendarMonth(next); }}>
                                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.weekRow}>
                            {weekDays.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
                        </View>
                        <View style={styles.daysGrid}>
                            {calendarDays.map((item) => (
                                <TouchableOpacity key={item.key} style={[styles.dayCell, item.date === selectedDate && styles.selectedDayCell]} disabled={!item.day} onPress={() => { if (item.date) { setSelectedDate(item.date); setShowCalendar(false); setUseDateFilter(true); } }}>
                                    {item.day && <Text style={[styles.dayText, item.date === selectedDate && styles.selectedDayText]}>{item.day}</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.todayBtn} onPress={() => { setSelectedDate(getTodayDateString()); setCalendarMonth(new Date()); setShowCalendar(false); setUseDateFilter(true); }}>
                            <Text style={styles.todayBtnText}>आज की तारीख चुनें</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderDateFilter = () => (
        <View style={styles.dateFilterRow}>
            <TouchableOpacity
                style={[styles.dateFilterToggle, useDateFilter && styles.activeDateFilterToggle, { flex: 1, height: 48, paddingHorizontal: 16, justifyContent: 'space-between' }]}
                onPress={() => setShowCalendar(true)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="calendar" size={20} color={useDateFilter ? COLORS.white : COLORS.primary} />
                    <Text style={[styles.dateFilterText, useDateFilter && styles.activeDateFilterText, { fontSize: 15, fontWeight: '800' }]}>
                        {useDateFilter ? formatToHindiDate(selectedDate) : "सभी तारीखें (All Dates)"}
                    </Text>
                </View>
                {useDateFilter ? (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setUseDateFilter(false); setSelectedDate(getTodayDateString()); }} style={{ padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
                        <Ionicons name="close" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>तारीख बदलें</Text>
                        <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
                    </View>
                )}
            </TouchableOpacity>
            {renderCalendarModal()}
        </View>
    );

    const renderBookingCard = (item: any, index?: number) => {
        const isExpanded = expandedOrderId === (item.order_id || item.id);
        const isPending = item.status?.toLowerCase() === 'pending' || item.status?.toLowerCase() === 'booked';
        const isLocked = bookingTab === 'pending' && typeof index === 'number' && index > 0;

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isExpanded && styles.expandedCard
                ]}
                key={item.order_id || item.id}
                onPress={() => {
                    if (isLocked) return;
                    setExpandedOrderId(isExpanded ? null : (item.order_id || item.id));
                }}
                activeOpacity={isLocked ? 1 : 0.9}
            >
                {isLocked && (
                    <BlurView intensity={30} tint="light" style={styles.lockOverlay}>
                        <View style={styles.lockIconCircle}>
                            <MaterialCommunityIcons name="lock" size={28} color={COLORS.primary} />
                        </View>
                        <View style={styles.lockTextContainer}>
                            <Text style={styles.lockText}>पुराने अनुरोध को पहले पूरा करें</Text>
                        </View>
                    </BlurView>
                )}
                <View style={styles.cardHeader}>
                    <View style={styles.farmerInfo}>
                        <View style={[styles.avatarContainer, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                            {item.photo ? (
                                <Image source={{ uri: `${API_BASE_URL}/${item.photo}` }} style={styles.avatarImage} />
                            ) : (
                                <Ionicons name="person" size={20} color="#FF9800" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.farmerName} numberOfLines={1}>{item.full_name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Text style={styles.farmerDetail}>{item.phone}</Text>
                                {item.order_id && (
                                    <>
                                        <View style={{ width: 1, height: 12, backgroundColor: '#cbd5e1', marginHorizontal: 8 }} />
                                        <Text style={styles.orderIdText}>{item.order_id}</Text>
                                    </>
                                )}
                            </View>
                            {!!item.registry_id && (
                                <Text style={[styles.farmerDetail, { marginTop: 4, fontWeight: '700', color: COLORS.primary }]}>
                                    पंजीकरण सं: {item.registry_id}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar" size={16} color={item.status?.toLowerCase() === 'collected' ? COLORS.success : "#FF9800"} />
                            <Text style={[styles.detailText, { fontWeight: '800', color: item.status?.toLowerCase() === 'collected' ? COLORS.success : "#FF9800" }]}>
                                {item.status?.toLowerCase() === 'collected' ? 'वितरित तिथि:' : 'बुकिंग तिथि:'} {item.status?.toLowerCase() === 'collected' ? (item.collected_at || item.booking_date) : item.booking_date}
                            </Text>
                        </View>
                        {item.created_at && (
                            <View style={styles.detailItem}>
                                <Ionicons name="time-outline" size={14} color="#64748b" />
                                <Text style={[styles.detailText, { fontSize: 12 }]}>अनुरोध: {item.created_at}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="layers-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.detailText}>खतौनी: {item.khatauni_no || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="leaf-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.detailText}>जमीन: {item.land_acres || '0'} हेक्टेयर</Text>
                        </View>
                    </View>
                    {item.token_number && (
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <Ionicons name="receipt-outline" size={16} color={COLORS.success} />
                                <Text style={[styles.detailText, { color: COLORS.success, fontWeight: '800' }]}>टोकन: {item.token_number}</Text>
                            </View>
                        </View>
                    )}
                    {item.isDateViolated && (
                        <View style={styles.queueWarningBadge}>
                            <Ionicons name="alert-circle" size={15} color="#DC2626" />
                            <Text style={styles.queueWarningBadgeText}>
                                कतार नियम: पिछले किसान की तारीख {formatToHindiDate(item.highestPrecedingDate)} है। तारीख बढ़ाना आवश्यक है।
                            </Text>
                        </View>
                    )}
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.divider} />
                        <Text style={styles.sectionTitle}>ऑर्डर विवरण</Text>
                        <View style={styles.itemsList}>
                            {(item.items || []).map((prod: any, pIdx: number) => {
                                const currentQty = modifiedQuantities[prod.id] !== undefined ? modifiedQuantities[prod.id] : Number(prod.quantity);
                                const originalQty = prod.original_quantity !== undefined && prod.original_quantity !== null ? Number(prod.original_quantity) : Number(prod.quantity);
                                const isZero = currentQty === 0;

                                return (
                                    <View key={pIdx} style={[styles.productRow, isZero && { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 8, padding: 8 }]}>
                                        <View style={styles.productMain}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Text style={[styles.productName, isZero && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                                                    {prod.product_name}
                                                </Text>
                                                {isZero && (
                                                    <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '800' }}>स्टॉक नहीं (0 बोरी)</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <Text style={styles.productPrice}>₹{prod.price_per_bag} / बोरी</Text>
                                                {originalQty !== currentQty && (
                                                    <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FEE2E2' }}>
                                                        <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '800' }}>किसान ने माँगा: {originalQty}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.qtyContainerSmall}>
                                            <TouchableOpacity 
                                                style={[styles.qtyBtnSmall, isZero && { backgroundColor: '#F1F5F9' }]} 
                                                onPress={(e) => { e.stopPropagation(); updateQuantity(prod.id, originalQty, -1); }} 
                                                disabled={!isPending || isZero}
                                            >
                                                <Ionicons name="remove" size={16} color={!isPending || isZero ? '#CBD5E1' : COLORS.primary} />
                                            </TouchableOpacity>
                                            <Text style={[styles.qtyTextSmall, isZero && { color: '#EF4444', fontWeight: '900' }]}>
                                                {currentQty}
                                            </Text>
                                            <TouchableOpacity 
                                                style={[styles.qtyBtnSmall, currentQty >= originalQty && { backgroundColor: '#F1F5F9' }]} 
                                                onPress={(e) => { e.stopPropagation(); updateQuantity(prod.id, originalQty, 1); }} 
                                                disabled={!isPending || currentQty >= originalQty}
                                            >
                                                <Ionicons name="add" size={16} color={!isPending || currentQty >= originalQty ? '#CBD5E1' : COLORS.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {isPending && (
                            <View style={[styles.threeActionRow, { marginTop: 12 }]}>
                                <TouchableOpacity style={[styles.actionBtn3, styles.cancelBtn]} onPress={(e) => { e.stopPropagation(); showConfirm('बुकिंग रद्द करें', 'क्या आप वाकई इस बुकिंग को रद्द करना चाहते हैं?', () => handleAction(API_ENDPOINTS.manageBooking, { booking_id: item.id, action: 'cancel', retailer_id: retailerId }, 'बुकिंग रद्द कर दी गई है')); }}>
                                    <MaterialCommunityIcons name="close-circle-outline" size={18} color={COLORS.error} />
                                    <Text style={[styles.btnText3, { color: COLORS.error }]}>रद्द करें</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn3, styles.extendBtn]} onPress={(e) => { e.stopPropagation(); setSelectedExtensionDate(''); setExtendingItem(item); setCalendarMonth(new Date()); setShowExtensionCalendar(true); }}>
                                    <MaterialCommunityIcons name="calendar-clock" size={18} color="#FF9800" />
                                    <Text style={[styles.btnText3, { color: "#FF9800" }]}>समय बढ़ाएं</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionBtn3, item.isDateViolated ? styles.disabledConfirmBtn : styles.confirmBtn]} 
                                    onPress={(e) => { 
                                        e.stopPropagation(); 
                                        if (item.isDateViolated) {
                                            setAlertModal({
                                                visible: true,
                                                type: 'error',
                                                title: 'कतार नियम उल्लंघन',
                                                message: `आप इस बुकिंग को ${item.booking_date} में स्वीकार नहीं कर सकते क्योंकि कतार में पूर्व किसान की तारीख ${formatToHindiDate(item.highestPrecedingDate)} है।\n\nकृपया पहले 'समय बढ़ाएं' पर क्लिक करके तारीख कम से कम ${formatToHindiDate(item.highestPrecedingDate)} या उसके बाद की करें।`
                                            });
                                            return;
                                        }

                                        const allItems = item.items || [];
                                        const totalApprovedBags = allItems.reduce((acc: number, p: any) => {
                                            const q = modifiedQuantities[p.id] !== undefined ? modifiedQuantities[p.id] : Number(p.quantity);
                                            return acc + q;
                                        }, 0);

                                        if (totalApprovedBags === 0) {
                                            setAlertModal({
                                                visible: true,
                                                type: 'error',
                                                title: 'अमान्य मात्रा',
                                                message: 'सभी खादों की मात्रा 0 है। यदि आपके पास कोई भी खाद उपलब्ध नहीं है, तो कृपया इस बुकिंग को "रद्द करें" (Cancel) चुनें।'
                                            });
                                            return;
                                        }

                                        const zeroItems = allItems.filter((p: any) => {
                                            const q = modifiedQuantities[p.id] !== undefined ? modifiedQuantities[p.id] : Number(p.quantity);
                                            return q === 0;
                                        });

                                        let confirmMsg = 'क्या आप इस बुकिंग को स्वीकार करना चाहते हैं?';
                                        if (zeroItems.length > 0) {
                                            const zeroNames = zeroItems.map((p: any) => p.product_name).join(', ');
                                            confirmMsg = `नोट: आपने ${zeroNames} की मात्रा 0 (स्टॉक नहीं) कर दी है।\n\nकेवल शेष खादों (${totalApprovedBags} बोरी) के लिए टोकन जारी होगा। क्या आप पुष्टि करना चाहते हैं?`;
                                        }

                                        showConfirm('बुकिंग की पुष्टि', confirmMsg, () => { 
                                            const updates = (item.items || []).filter((p: any) => modifiedQuantities[p.id] !== undefined).map((p: any) => ({ id: p.id, quantity: modifiedQuantities[p.id] })); 
                                            handleAction(API_ENDPOINTS.manageBooking, { booking_id: item.id, action: 'confirm', retailer_id: retailerId, item_updates: updates }, 'बुकिंग सफलतापूर्वक स्वीकृत हो गई है'); 
                                        }); 
                                    }}
                                >
                                    <MaterialCommunityIcons name="check-all" size={18} color={COLORS.white} />
                                    <Text style={[styles.btnText3, { color: COLORS.white }]}>पुष्टि करें</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {!isExpanded && (
                    <View style={styles.tapIndicator}>
                        <Text style={styles.tapIndicatorText}>विवरण देखें</Text>
                        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Pre-sort pending bookings oldest first and assign strict queue order dates
    const pendingWithQueueDates = useMemo(() => {
        const sorted = [...(bookings.pending || [])].sort((a, b) => {
            const rawA = a.created_at || a.booking_date || a.date;
            const rawB = b.created_at || b.booking_date || b.date;
            const parsedA = parseMixedDateFormat(rawA) || new Date(rawA?.replace(/-/g, '/') || 0);
            const parsedB = parseMixedDateFormat(rawB) || new Date(rawB?.replace(/-/g, '/') || 0);
            let dateA = parsedA.getTime();
            let dateB = parsedB.getTime();
            if (isNaN(dateA)) dateA = 0;
            if (isNaN(dateB)) dateB = 0;
            if (dateA === dateB) {
                return parseInt(a.id || a.order_id || '0', 10) - parseInt(b.id || b.order_id || '0', 10);
            }
            return dateA - dateB;
        });

        let runningMax = globalMaxExtendedDate;
        return sorted.map((item) => {
            const itemIsoDate = getISODate(item.booking_date);
            const highestPreceding = runningMax;

            if (itemIsoDate && (!runningMax || itemIsoDate > runningMax)) {
                runningMax = itemIsoDate;
            }

            const isDateViolated = Boolean(highestPreceding && itemIsoDate && itemIsoDate < highestPreceding);

            return {
                ...item,
                highestPrecedingDate: highestPreceding,
                isDateViolated
            };
        });
    }, [bookings.pending, globalMaxExtendedDate, getISODate]);

    const filteredPending = filterListByDate(pendingWithQueueDates);
    const filteredApproved = filterListByDate(bookings.approved);
    const filteredCollected = filterListByDate(bookings.collected);
    const filteredExtended = filterListByDate(bookings.extended);
    const filteredCancelled = filterListByDate(bookings.cancelled);

    let listToShow: any[] = [];
    if (bookingTab === 'pending') listToShow = filteredPending;
    else if (bookingTab === 'approved') listToShow = filteredApproved;
    else if (bookingTab === 'cancelled') listToShow = filteredCancelled;
    else if (bookingTab === 'extended') listToShow = filteredExtended;
    else if (bookingTab === 'collected') listToShow = filteredCollected;

    const sortedList = useMemo(() => {
        if (bookingTab === 'pending') {
            return listToShow;
        }
        return [...listToShow].sort((a, b) => {
            const rawA = a.status?.toLowerCase() === 'collected' ? (a.collected_at || a.booking_date) : (a.created_at || a.booking_date || a.date);
            const rawB = b.status?.toLowerCase() === 'collected' ? (b.collected_at || b.booking_date) : (b.created_at || b.booking_date || b.date);
            
            const parsedA = parseMixedDateFormat(rawA) || new Date(rawA?.replace(/-/g, '/') || 0);
            const parsedB = parseMixedDateFormat(rawB) || new Date(rawB?.replace(/-/g, '/') || 0);
            
            let dateA = parsedA.getTime();
            let dateB = parsedB.getTime();
            
            if (isNaN(dateA)) dateA = 0;
            if (isNaN(dateB)) dateB = 0;

            if (dateA === dateB) {
                return parseInt(b.id || b.order_id || '0', 10) - parseInt(a.id || a.order_id || '0', 10);
            }
            return dateB - dateA; // Newest first
        });
    }, [listToShow, bookingTab]);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) =>
        renderBookingCard(item, index),
        [expandedOrderId, modifiedQuantities, bookingTab]);

    return (
        <View style={styles.container}>
            {/* Compact Header */}
            <View style={[styles.headerBar, { paddingVertical: 10, paddingTop: 15 }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>बुकिंग अनुरोध</Text>
            </View>

            {/* Date Filter + Tabs - Fixed at top */}
            <View style={[styles.fixedHeaderArea, { marginTop: -5 }]}>
                {renderDateFilter()}
                <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity style={[styles.filterChip, bookingTab === 'pending' && styles.activeFilterChip]} onPress={() => setBookingTab('pending')}>
                            <MaterialCommunityIcons name="clock-alert-outline" size={18} color={bookingTab === 'pending' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, bookingTab === 'pending' && styles.activeFilterChipText]}>लंबित ({filteredPending.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, bookingTab === 'approved' && styles.activeFilterChip]} onPress={() => setBookingTab('approved')}>
                            <MaterialCommunityIcons name="check-decagram" size={18} color={bookingTab === 'approved' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, bookingTab === 'approved' && styles.activeFilterChipText]}>स्वीकृत ({filteredApproved.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, bookingTab === 'collected' && styles.activeFilterChip]} onPress={() => setBookingTab('collected')}>
                            <MaterialCommunityIcons name="package-variant-closed-check" size={18} color={bookingTab === 'collected' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, bookingTab === 'collected' && styles.activeFilterChipText]}>वितरित ({filteredCollected.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, bookingTab === 'extended' && styles.activeFilterChip]} onPress={() => setBookingTab('extended')}>
                            <MaterialCommunityIcons name="calendar-clock" size={18} color={bookingTab === 'extended' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, bookingTab === 'extended' && styles.activeFilterChipText]}>समय बढ़ाया ({filteredExtended.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, bookingTab === 'cancelled' && styles.activeFilterChip]} onPress={() => setBookingTab('cancelled')}>
                            <Ionicons name="close-circle-outline" size={16} color={bookingTab === 'cancelled' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, bookingTab === 'cancelled' && styles.activeFilterChipText]}>रद्द ({filteredCancelled.length})</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>

            {/* Booking Cards */}
            {/* Flicker Fix: We keep the list mounted even during loading if we have data. 
                The pull-to-refresh spinner handles the feedback. */}
            <FlatList
                data={sortedList}
                renderItem={renderItem}
                keyExtractor={(item, idx) => item.order_id || item.id || idx.toString()}
                contentContainerStyle={styles.scrollContent}
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} colors={[COLORS.primary]} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={60} color="#CBD5E1" />
                        <Text style={styles.emptyText}>कोई बुकिंग नहीं मिली</Text>
                        <TouchableOpacity onPress={() => fetchBookings()} style={{ marginTop: 15, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 10 }}>
                            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>पुनः प्रयास करें</Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={<View style={{ height: 80 }} />}
            />

            {/* Overlay Loading for background updates (only if absolutely necessary, but usually RefreshControl is enough) */}
            {loading && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            {renderExtensionCalendarModal()}
            {renderCustomConfirmModal()}
            <AlertModal
                visible={alertModal.visible}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={() => setAlertModal({ ...alertModal, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#F0F4F8',
    },
    backButton: {
        padding: 6,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.primary,
    },
    fixedHeaderArea: {
        backgroundColor: '#F0F4F8',
        paddingBottom: 2,
    },
    dateFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginBottom: 10,
        gap: 10,
    },
    dateFilterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeDateFilterToggle: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dateFilterText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    activeDateFilterText: {
        color: COLORS.white,
    },
    filterWrapper: {
        marginBottom: 8,
        height: 44,
    },
    filterScroll: {
        paddingHorizontal: 15,
        alignItems: 'center',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 5,
    },
    activeFilterChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    activeFilterChipText: {
        color: COLORS.white,
    },
    scrollContent: {
        paddingHorizontal: 4,
        paddingTop: 4,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        marginHorizontal: 10,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    expandedCard: {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    farmerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    farmerName: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    farmerDetail: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    orderIdText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '700',
    },
    bookingDetails: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
    },
    detailText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    expandedContent: {
        marginTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 10,
    },
    itemsList: {
        gap: 10,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    productMain: {
        flex: 1,
    },
    productName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
    },
    productPrice: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    qtyContainerSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 3,
        gap: 6,
    },
    qtyBtnSmall: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    qtyTextSmall: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
        minWidth: 20,
        textAlign: 'center',
    },
    threeActionRow: {
        flexDirection: 'row',
        gap: 6,
    },
    actionBtn3: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 10,
        gap: 3,
    },
    cancelBtn: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    extendBtn: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.3)',
    },
    confirmBtn: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
    },
    btnText3: {
        fontSize: 12,
        fontWeight: '900',
    },
    tapIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 5,
        borderTopWidth: 1,
        borderTopColor: '#f8fafc',
        paddingTop: 6,
    },
    tapIndicatorText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderRadius: 18,
        overflow: 'hidden',
    },
    lockIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        marginBottom: 10,
    },
    lockTextContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    lockText: {
        fontSize: 13,
        fontWeight: '900',
        color: COLORS.primary,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    confirmCard: {
        backgroundColor: COLORS.white,
        width: '85%',
        borderRadius: 24,
        padding: 25,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    confirmIconContainer: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    confirmTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 10, textAlign: 'center' },
    confirmMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    confirmActionRow: { flexDirection: 'row', width: '100%', gap: 12 },
    confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 15, backgroundColor: '#f1f5f9', alignItems: 'center' },
    confirmCancelText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
    confirmOkBtn: { flex: 1, paddingVertical: 14, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center' },
    confirmOkText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
    calendarCard: {
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        ...SHADOWS.large,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarMonthTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    weekDayText: { fontSize: 12, fontWeight: '700', color: '#94a3b8', width: 40, textAlign: 'center' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    dayCell: { width: (width - 80) / 7, height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    selectedDayCell: { backgroundColor: COLORS.primary, borderRadius: 12, ...SHADOWS.small },
    dayText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    selectedDayText: { color: COLORS.white, fontWeight: '900' },
    todayBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
    todayBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    disabledDayCell: { opacity: 0.3 },
    disabledDayText: { color: '#94a3b8', textDecorationLine: 'line-through' },
    queueWarningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginTop: 6,
        gap: 6,
    },
    queueWarningBadgeText: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: '700',
        flex: 1,
    },
    disabledConfirmBtn: {
        backgroundColor: '#94A3B8',
        ...SHADOWS.small,
    },
    calendarQueueNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 8,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        gap: 6,
    },
    calendarQueueNoticeText: {
        flex: 1,
        fontSize: 12,
        color: '#DC2626',
        fontWeight: '800',
        textAlign: 'center',
    },
});
