import { apiFetch } from '../../utils/apiClient';
import React, { useState, useEffect, useCallback } from 'react';
import { useRetailerData } from '../../contexts/RetailerDataContext';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    BackHandler,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, SHADOWS, FONT_SIZES } from '../../constants';
import { API_ENDPOINTS } from '../../config/config';
import BookingListScreen from './BookingListScreen';
import RegistrationListScreen from './RegistrationListScreen';
import { ReasonModal } from '../../components/ReasonModal';
import AlertModal from '../../components/AlertModal';

const { width } = Dimensions.get('window');

const PRODUCT_THEMES: Record<string, { gradient: readonly [string, string, ...string[]]; icon: any; iconColor: string }> = {
    urea: { gradient: ['#E0F2FE', '#BAE6FD'], icon: 'molecule', iconColor: '#0284c7' },
    dap: { gradient: ['#F0FDF4', '#DCFCE7'], icon: 'seed-outline', iconColor: '#059669' },
    npk: { gradient: ['#FEFCE8', '#FEF9C3'], icon: 'sprout-outline', iconColor: '#d97706' },
    mop: { gradient: ['#F5F3FF', '#EDE9FE'], icon: 'flask-outline', iconColor: '#7c3aed' },
    tsp: { gradient: ['#FFF1F2', '#FFE4E6'], icon: 'cube-outline', iconColor: '#e11d48' },
    ssp: { gradient: ['#F0FDFA', '#CCFBF1'], icon: 'leaf', iconColor: '#0d9488' },
};

const DEFAULT_THEME = { gradient: ['#F8FAFC', '#E2E8F0'] as readonly [string, string, ...string[]], icon: 'package-variant', iconColor: '#475569' };

export default function ApprovalsScreen({ route, navigation, ...props }: any) {
    const { retailerDetails: contextDetails, counts: contextCounts, refreshData, loading: contextLoading } = useRetailerData();
    const retailerId = props?.retailerId || route?.params?.retailerId || contextDetails?.retailer_id || contextDetails?.id?.toString();
    const retailerDetails = props?.retailerDetails || contextDetails || route?.params?.retailerDetails;
    
    const [currentView, setCurrentView] = useState<'menu' | 'registration' | 'booking'>('menu');
    const [refreshing, setRefreshing] = useState(false);

    // Modal States
    const [showCapacityModal, setShowCapacityModal] = useState(false);
    const [newCapacityInput, setNewCapacityInput] = useState('');
    const [capacityLoading, setCapacityLoading] = useState(false);

    const [showReasonModal, setShowReasonModal] = useState(false);
    const [reasonModalAction, setReasonModalAction] = useState<'MANUAL_INACTIVATE' | 'MANUAL_ACTIVATE' | 'HOLIDAY_MARKED'>('MANUAL_INACTIVATE');
    const [reasonLoading, setReasonLoading] = useState(false);

    const [alertModal, setAlertModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info'
    });

    const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        setAlertModal({ visible: true, type, title, message });
    };

    const counts = contextCounts || {
        registrations: { pending: 0, approved: 0, rejected: 0 },
        bookings: { pending: 0, approved: 0, cancelled: 0, extended: 0, collected: 0 },
        stock: { urea: 0, dap: 0, npk: 0, mop: 0 },
        stock_items: [],
        total_farmers: 0
    };

    const capacityStatus = counts.capacity_status || {
        base_capacity: retailerDetails?.daily_visitor_capacity || 50,
        effective_capacity: retailerDetails?.daily_visitor_capacity || 50,
        active_queue: 0,
        collected_today: 0,
        remaining_slots: retailerDetails?.daily_visitor_capacity || 50,
        is_active: 1,
        is_holiday: 0,
        is_full: 0,
        effective_active: 1,
        closure_reason: null,
        schedule_date: new Date().toISOString().split('T')[0]
    };

    const stockItems = (counts.stock_items && counts.stock_items.length > 0)
        ? counts.stock_items
        : Object.keys(counts.stock || {}).map(key => ({
            id: key,
            type: key,
            name: key.toUpperCase(),
            nameHindi: key.toUpperCase(),
            stock: counts.stock[key] || 0
        }));

    const stockSummary = counts.stock_summary || {
        total_storage_capacity: retailerDetails?.total_bori_capacity || 0,
        current_total_stock: stockItems.reduce((acc: number, item: any) => acc + (item.stock || 0), 0),
        utilization_percent: 0,
        has_out_of_stock: stockItems.some((item: any) => (item.stock || 0) <= 0)
    };

    const loading = contextLoading && !contextCounts;

    useEffect(() => {
        const backAction = () => {
            if (currentView !== 'menu') {
                setCurrentView('menu');
                if (retailerId) refreshData(retailerId);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [currentView, retailerId]);

    useEffect(() => {
        if (retailerId) {
            refreshData(retailerId);
        }
    }, [retailerId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (retailerId) await refreshData(retailerId);
        setRefreshing(false);
    }, [retailerId]);

    // Handle Capacity Edit Submit
    const handleUpdateCapacity = async () => {
        const parsed = parseInt(newCapacityInput, 10);
        if (isNaN(parsed) || parsed <= 0 || parsed > 500) {
            showAlert('error', 'अमान्य क्षमता', 'कृपया 1 से 500 के बीच मान्य संख्या दर्ज करें');
            return;
        }

        setCapacityLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.updateDailySchedule, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId,
                    action: 'CAPACITY_CHANGE',
                    custom_capacity: parsed,
                    reason: `दैनिक क्षमता ${capacityStatus.effective_capacity} से बदलकर ${parsed} की गई`
                })
            });

            const json = await res.json();
            if (json.success) {
                setShowCapacityModal(false);
                showAlert('success', 'सफल', 'दैनिक क्षमता सफलतापूर्वक अपडेट कर दी गई!');
                if (retailerId) refreshData(retailerId);
            } else {
                showAlert('error', 'त्रुटि', json.message || 'क्षमता अपडेट नहीं हो सकी');
            }
        } catch (e) {
            showAlert('error', 'त्रुटि', 'सर्वर से कनेक्ट नहीं हो पा रहा है');
        } finally {
            setCapacityLoading(false);
        }
    };

    // Handle Active/Inactive Reason Submit
    const handleConfirmReason = async (reasonText: string) => {
        if (!reasonText || reasonText.trim().length === 0) {
            showAlert('info', 'कारण आवश्यक', 'कृपया कारण दर्ज करें');
            return;
        }

        setReasonLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.updateDailySchedule, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    retailer_id: retailerId,
                    action: reasonModalAction,
                    reason: reasonText.trim()
                })
            });

            const json = await res.json();
            if (json.success) {
                setShowReasonModal(false);
                showAlert('success', 'सफल', 'समिति का स्टेटस सफलतापूर्वक अपडेट हो गया!');
                if (retailerId) refreshData(retailerId);
            } else {
                showAlert('error', 'त्रुटि', json.message || 'अपडेट विफल रहा');
            }
        } catch (e) {
            showAlert('error', 'त्रुटि', 'सर्वर से कनेक्ट नहीं हो पा रहा है');
        } finally {
            setReasonLoading(false);
        }
    };

    const renderMenuCards = () => {
        const capacityPercent = capacityStatus.effective_capacity > 0
            ? Math.min(100, Math.round((capacityStatus.active_queue / capacityStatus.effective_capacity) * 100))
            : 0;

        const isFull = capacityStatus.is_full === 1;
        const isHoliday = capacityStatus.is_holiday === 1;
        const isActive = capacityStatus.effective_active === 1;

        return (
            <View style={styles.menuContainer}>

                {/* 1. Live Operational Status Header */}
                <View style={styles.operationalStatusCard}>
                    <View style={styles.statusIndicatorRow}>
                        <View style={[
                            styles.statusPulseDot,
                            { backgroundColor: isActive ? '#10B981' : (isHoliday ? '#F59E0B' : '#EF4444') }
                        ]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitle}>
                                {isHoliday
                                    ? 'समिति अवकाश (Holiday)'
                                    : (isActive
                                        ? 'आज समिति खुली है (Active)'
                                        : (isFull ? 'आज का कोटा पूर्ण (Full)' : 'आज बुकिंग बंद है (Inactive)'))}
                            </Text>
                            <Text style={styles.statusSubtitle} numberOfLines={1}>
                                {isHoliday
                                    ? (capacityStatus.closure_reason || 'आज समिति बंद रहेगी')
                                    : (isActive
                                        ? 'किसान आज की तारीख के लिए खाद बुक कर सकते हैं'
                                        : (isFull ? 'दैनिक क्षमता पूर्ण हो चुकी है' : (capacityStatus.closure_reason || 'दुकानदार द्वारा बुकिंग रोकी गई है')))}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.statusToggleBtn}
                            onPress={() => {
                                if (isActive) {
                                    setReasonModalAction('MANUAL_INACTIVATE');
                                } else {
                                    setReasonModalAction('MANUAL_ACTIVATE');
                                }
                                setShowReasonModal(true);
                            }}
                        >
                            <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                            <Text style={styles.statusToggleBtnText}>
                                {isActive ? 'बंद करें' : 'शुरू करें'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. Rolling Footfall & Capacity Meter */}
                <View style={styles.capacityCardContainer}>
                    <LinearGradient
                        colors={isActive ? ['#F8FAFC', '#EEF2FF'] : ['#FEF2F2', '#FEE2E2']}
                        style={styles.capacityGradientCard}
                    >
                        <View style={styles.capacityHeaderRow}>
                            <View style={styles.capacityHeaderLeft}>
                                <View style={[styles.capacityIconCircle, { backgroundColor: isActive ? '#E0E7FF' : '#FEE2E2' }]}>
                                    <MaterialCommunityIcons name="account-group" size={20} color={isActive ? COLORS.primary : '#EF4444'} />
                                </View>
                                <Text style={styles.capacityCardTitle}>दैनिक कृषक फुटफॉल क्षमता</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.editCapBtn}
                                onPress={() => {
                                    setNewCapacityInput(String(capacityStatus.effective_capacity));
                                    setShowCapacityModal(true);
                                }}
                            >
                                <Ionicons name="pencil" size={13} color="#FFF" />
                                <Text style={styles.editCapBtnText}>क्षमता बदलें</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Capacity Numbers Row */}
                        <View style={styles.capacityNumbersRow}>
                            <View>
                                <Text style={styles.capacityMainNumber}>
                                    {capacityStatus.active_queue}
                                    <Text style={styles.capacityTotalNumber}> / {capacityStatus.effective_capacity}</Text>
                                    <Text style={styles.capacityUnitText}> किसान</Text>
                                </Text>
                                <Text style={styles.capacityHintText}>
                                    {capacityStatus.remaining_slots > 0
                                        ? `🟢 ${capacityStatus.remaining_slots} स्लॉट अभी उपलब्ध हैं`
                                        : '🔴 आज के सभी स्लॉट भर चुके हैं'}
                                </Text>
                            </View>

                            <View style={[
                                styles.capacityStatusBadge,
                                { backgroundColor: isFull ? '#FEE2E2' : (capacityPercent > 75 ? '#FEF3C7' : '#DCFCE7') }
                            ]}>
                                <Text style={[
                                    styles.capacityStatusBadgeText,
                                    { color: isFull ? '#DC2626' : (capacityPercent > 75 ? '#D97706' : '#15803D') }
                                ]}>
                                    {capacityPercent}% भरा
                                </Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarTrack}>
                            <View style={[
                                styles.progressBarFill,
                                {
                                    width: `${capacityPercent}%`,
                                    backgroundColor: isFull ? '#EF4444' : (capacityPercent > 75 ? '#F59E0B' : '#10B981')
                                }
                            ]} />
                        </View>

                        {/* 4-Box Queue Metrics */}
                        <View style={styles.queueBreakupGrid}>
                            <View style={styles.queueBox}>
                                <Text style={[styles.queueBoxValue, { color: '#F59E0B' }]}>{counts.bookings.pending}</Text>
                                <Text style={styles.queueBoxLabel}>⏳ प्रतीक्षारत</Text>
                            </View>
                            <View style={styles.queueBox}>
                                <Text style={[styles.queueBoxValue, { color: COLORS.primary }]}>{counts.bookings.approved}</Text>
                                <Text style={styles.queueBoxLabel}>✅ स्वीकृत</Text>
                            </View>
                            <View style={styles.queueBox}>
                                <Text style={[styles.queueBoxValue, { color: '#10B981' }]}>{capacityStatus.collected_today}</Text>
                                <Text style={styles.queueBoxLabel}>🚚 प्राप्त</Text>
                            </View>
                            <View style={styles.queueBox}>
                                <Text style={[styles.queueBoxValue, { color: capacityStatus.remaining_slots > 0 ? '#10B981' : '#EF4444' }]}>
                                    {capacityStatus.remaining_slots}
                                </Text>
                                <Text style={styles.queueBoxLabel}>🟢 रिक्त स्लॉट</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* 3. Stock Summary - Fully Dynamic UI with Out-of-Stock Badges */}
                <View style={styles.dashboardSection}>
                    <LinearGradient 
                        colors={['rgba(30, 41, 59, 0.05)', 'rgba(30, 41, 59, 0.01)']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                        style={styles.stockHeaderContainer}
                    >
                        <View style={styles.stockHeaderIcon}>
                            <MaterialCommunityIcons name="format-list-bulleted" size={16} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionLabelMain}>आज का स्टॉक (बोरी में)</Text>
                            {stockSummary.total_storage_capacity > 0 && (
                                <Text style={styles.warehouseSubtitle}>
                                    गोदाम उपयोग: {stockSummary.current_total_stock} / {stockSummary.total_storage_capacity} बोरी ({stockSummary.utilization_percent}%)
                                </Text>
                            )}
                        </View>
                    </LinearGradient>

                    <View style={styles.stockGrid}>
                        {stockItems.map(item => {
                            const typeKey = (item.type || item.id || '').toLowerCase();
                            const theme = PRODUCT_THEMES[typeKey] || DEFAULT_THEME;
                            const displayName = item.nameHindi || item.name || typeKey.toUpperCase();
                            const stockVal = item.stock ?? (counts.stock[typeKey] || 0);
                            const isOutOfStock = stockVal <= 0;

                            return (
                                <LinearGradient
                                    key={item.id || typeKey}
                                    colors={isOutOfStock ? ['#FFF1F2', '#FFE4E6'] : theme.gradient}
                                    style={[styles.stockCard, isOutOfStock && styles.outOfStockCardBorder]}
                                >
                                    <View style={styles.stockCardHeader}>
                                        <Text style={styles.stockLabel} numberOfLines={1}>{displayName}</Text>
                                        <MaterialCommunityIcons
                                            name={isOutOfStock ? "alert-circle" : theme.icon}
                                            size={22}
                                            color={isOutOfStock ? '#E11D48' : theme.iconColor}
                                        />
                                    </View>

                                    <Text style={[styles.stockValue, isOutOfStock && { color: '#E11D48' }]}>
                                        {stockVal}
                                    </Text>

                                    {isOutOfStock ? (
                                        <View style={styles.outOfStockBadge}>
                                            <Text style={styles.outOfStockBadgeText}>कोटा समाप्त (0)</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.stockUnit}>बोरी उपलब्ध</Text>
                                    )}
                                </LinearGradient>
                            );
                        })}
                    </View>
                </View>

                {/* 4. Total Members Strip */}
                <View style={styles.membersStrip}>
                    <View style={styles.membersIconBox}>
                        <MaterialCommunityIcons name="account-multiple-check" size={28} color="#F97316" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.membersLabel}>कुल पंजीकृत किसान</Text>
                        <Text style={styles.membersValue}>{counts.total_farmers || retailerDetails?.total_farmers || '0'}</Text>
                    </View>
                    <View style={styles.membersBadge}>
                        <Text style={styles.membersBadgeText}>सक्रिय</Text>
                    </View>
                </View>

                {/* 5. Main Menu Grid - Today's Actions */}
                <LinearGradient 
                    colors={['rgba(30, 41, 59, 0.05)', 'rgba(30, 41, 59, 0.01)']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }}
                    style={[styles.stockHeaderContainer, { marginTop: 4, marginBottom: 8 }]}
                >
                    <View style={[styles.stockHeaderIcon, { backgroundColor: '#F0F9FF' }]}>
                        <Ionicons name="calendar" size={16} color="#0EA5E9" />
                    </View>
                    <Text style={styles.sectionLabelMain}>आज की गतिविधियां</Text>
                </LinearGradient>

                <View style={styles.gridRow}>
                    <TouchableOpacity
                        style={[styles.menuCard, { flex: 1 }]}
                        onPress={() => setCurrentView('registration')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={['#F97316', '#EA580C']} style={styles.gridCardContent}>
                            <View style={styles.gridCardHeaderRow}>
                                <View style={styles.menuIconContainerMini}>
                                    <Ionicons name="person-add" size={24} color={COLORS.white} />
                                </View>
                                <Text style={styles.gridTitle}>नया पंजीकरण</Text>
                            </View>
                            <View style={styles.miniStatsGrid}>
                                <View style={styles.miniStat}>
                                    <Text style={styles.miniStatVal}>{counts.registrations.pending}</Text>
                                    <Text style={styles.miniStatLabel}>लंबित</Text>
                                </View>
                                <View style={[styles.miniStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Text style={styles.miniStatVal}>{counts.registrations.approved}</Text>
                                    <Text style={styles.miniStatLabel}>स्वीकृत</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuCard, { flex: 1 }]}
                        onPress={() => setCurrentView('booking')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.gridCardContent}>
                            <View style={styles.gridCardHeaderRow}>
                                <View style={styles.menuIconContainerMini}>
                                    <Ionicons name="cart" size={24} color={COLORS.white} />
                                </View>
                                <Text style={styles.gridTitle}>आज बुकिंग</Text>
                            </View>
                            <View style={styles.miniStatsGrid}>
                                <View style={styles.miniStat}>
                                    <Text style={styles.miniStatVal}>{counts.bookings.pending}</Text>
                                    <Text style={styles.miniStatLabel}>लंबित</Text>
                                </View>
                                <View style={[styles.miniStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Text style={styles.miniStatVal}>{counts.bookings.approved}</Text>
                                    <Text style={styles.miniStatLabel}>स्वीकृत</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Text style={styles.hintText}>* डेटा रीयल-टाइम अपडेट किया जा रहा है</Text>

            </View>
        );
    };

    return (
        <View style={styles.container}>
            {currentView === 'booking' ? (
                <BookingListScreen
                    retailerId={retailerId}
                    retailerDetails={retailerDetails}
                    onBack={() => { setCurrentView('menu'); if (retailerId) refreshData(retailerId); }}
                />
            ) : currentView === 'registration' ? (
                <RegistrationListScreen
                    retailerId={retailerId}
                    retailerDetails={retailerDetails}
                    onBack={() => { setCurrentView('menu'); if (retailerId) refreshData(retailerId); }}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                    >
                        {renderMenuCards()}
                    </ScrollView>
                </View>
            )}

            {/* Quick Capacity Edit Modal */}
            <Modal visible={showCapacityModal} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalBackdrop}
                >
                    <View style={styles.capacityModalCard}>
                        <View style={styles.capacityModalHeader}>
                            <View style={styles.capacityModalIcon}>
                                <Ionicons name="people" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.capacityModalTitle}>दैनिक कृषक क्षमता बदलें</Text>
                        </View>

                        <Text style={styles.capacityModalSubtitle}>
                            आज समिति पर अधिकतम कितने किसान आ सकते हैं?
                        </Text>

                        <View style={styles.capacityInputBox}>
                            <TextInput
                                style={styles.capacityInput}
                                keyboardType="numeric"
                                placeholder="उदा. 50"
                                placeholderTextColor="#64748B"
                                value={newCapacityInput}
                                onChangeText={setNewCapacityInput}
                            />
                            <Text style={styles.capacityInputUnit}>किसान / दिन</Text>
                        </View>

                        <View style={styles.capacityModalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowCapacityModal(false)}
                                disabled={capacityLoading}
                            >
                                <Text style={styles.modalCancelBtnText}>रद्द करें</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleUpdateCapacity}
                                disabled={capacityLoading}
                            >
                                {capacityLoading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.modalSaveBtnText}>सुरक्षित करें</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Active / Inactive Reason Modal */}
            <ReasonModal
                visible={showReasonModal}
                title={reasonModalAction === 'MANUAL_INACTIVATE' ? 'आज की बुकिंग बंद करें' : 'आज की बुकिंग पुनः शुरू करें'}
                subtitle="कृपया स्टेटस बदलने का सटीक कारण दर्ज करें (यह केवल विभागीय रिकॉर्ड के लिए सुरक्षित रहेगा):"
                placeholder="कारण विस्तार से लिखें..."
                confirmText={reasonModalAction === 'MANUAL_INACTIVATE' ? 'बुकिंग बंद करें' : 'सक्रिय करें'}
                confirmColor={reasonModalAction === 'MANUAL_INACTIVATE' ? COLORS.error : COLORS.success}
                iconName={reasonModalAction === 'MANUAL_INACTIVATE' ? 'pause-circle' : 'play-circle'}
                iconBgColor={reasonModalAction === 'MANUAL_INACTIVATE' ? '#FEE2E2' : '#DCFCE7'}
                loading={reasonLoading}
                onConfirm={handleConfirmReason}
                onCancel={() => setShowReasonModal(false)}
            />

            {/* Alert Modal */}
            <AlertModal
                visible={alertModal.visible}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
            />

            {loading && currentView === 'menu' && !refreshing && counts.total_farmers === 0 && counts.registrations.pending === 0 && counts.bookings.pending === 0 ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 10 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { paddingTop: 10, paddingBottom: 40 },
    menuContainer: { paddingHorizontal: 15 },
    sectionLabelMain: { fontSize: 14, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.8 },
    dashboardSection: { marginBottom: 15 },

    // 1. Operational Status Card
    operationalStatusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...SHADOWS.small,
    },
    statusIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusPulseDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    statusSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    statusToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    statusToggleBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
    },

    // 2. Capacity Card
    capacityCardContainer: {
        marginBottom: 15,
        borderRadius: 20,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    capacityGradientCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    capacityHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    capacityHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    capacityIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    capacityCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    editCapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editCapBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFF',
    },
    capacityNumbersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    capacityMainNumber: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
    },
    capacityTotalNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#64748B',
    },
    capacityUnitText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    capacityHintText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        marginTop: 2,
    },
    capacityStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    capacityStatusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    progressBarTrack: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 14,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    queueBreakupGrid: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 10,
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    queueBox: {
        alignItems: 'center',
        flex: 1,
    },
    queueBoxValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    queueBoxLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
    },

    // 3. Stock Cards
    stockHeaderContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10, 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    stockHeaderIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        ...SHADOWS.small
    },
    warehouseSubtitle: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1,
    },
    stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stockCard: {
        flex: 1,
        minWidth: (width - 50) / 2,
        maxWidth: (width - 40) / 2,
        borderRadius: 18,
        padding: 14,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)'
    },
    outOfStockCardBorder: {
        borderColor: '#FECDD3',
        borderWidth: 1.5,
    },
    stockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stockLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    stockValue: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    stockUnit: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 2 },
    outOfStockBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    outOfStockBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#E11D48',
    },

    // 4. Members Strip
    membersStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        ...SHADOWS.small,
        borderLeftWidth: 4,
        borderLeftColor: '#F97316'
    },
    membersIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    membersLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },
    membersValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    membersBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7' },
    membersBadgeText: { fontSize: 10, color: '#15803D', fontWeight: '800', textTransform: 'uppercase' },

    // 5. Action Cards
    gridRow: { flexDirection: 'row', gap: 12 },
    menuCard: { borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
    gridCardContent: { padding: 14 },
    gridCardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    menuIconContainerMini: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
    gridTitle: { fontSize: 15, fontWeight: '900', color: COLORS.white },
    miniStatsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: 8 },
    miniStat: { alignItems: 'center', flex: 1 },
    miniStatVal: { fontSize: 18, fontWeight: '900', color: COLORS.white },
    miniStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '800', textTransform: 'uppercase', marginTop: 1 },
    hintText: { textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 15 },

    // Modals
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    capacityModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 360,
        ...SHADOWS.large,
    },
    capacityModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    capacityModalIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    capacityModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    capacityModalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
        lineHeight: 18,
    },
    capacityInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: '#F8FAFC',
        marginBottom: 20,
    },
    capacityInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        paddingVertical: 12,
    },
    capacityInputUnit: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    capacityModalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
    },
    modalCancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    modalSaveBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    modalSaveBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
    },
});
