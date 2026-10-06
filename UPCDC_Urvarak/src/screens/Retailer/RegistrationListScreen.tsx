import { apiFetch } from '../../utils/apiClient';
import { getTodayDateString, isDateMatch, formatToHindiDate, parseMixedDateFormat } from '../../utils/dateUtils';
import { RetailerLogger } from '../../utils/RetailerLogger';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Dimensions,
    TextInput,
    Image,
    Linking,
    ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../../constants';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
const { width, height } = Dimensions.get('window');

interface RegistrationListScreenProps {
    retailerId?: string;
    retailerDetails?: any;
    onBack: () => void;
}

export default function RegistrationListScreen({ retailerId, retailerDetails, onBack }: RegistrationListScreenProps) {
    const [registrations, setRegistrations] = useState<{ pending: any[], approved: any[], rejected: any[] }>({
        pending: [], approved: [], rejected: []
    });
    const [regTab, setRegTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const registrationsRef = useRef(registrations);

    useEffect(() => {
        registrationsRef.current = registrations;
    }, [registrations]);

    // Removed manual getTodayDate

    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
    const [useDateFilter, setUseDateFilter] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Document Viewer state
    const [docModal, setDocModal] = useState<{ visible: boolean, url: string, title: string }>({ visible: false, url: '', title: '' });

    // PDF Viewer state
    const [pdfModal, setPdfModal] = useState<{ visible: boolean, title: string, viewerUrl: string }>({ visible: false, title: '', viewerUrl: '' });

    // Custom Modal states
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean, title: string, message: string, onConfirm: () => void
    }>({ visible: false, title: '', message: '', onConfirm: () => { } });
    const [alertModal, setAlertModal] = useState<{
        visible: boolean, type: 'success' | 'error' | 'info', title: string, message: string
    }>({ visible: false, type: 'info', title: '', message: '' });

    // Edit Farmer state
    const [editModal, setEditModal] = useState<{ visible: boolean, data: any }>({ visible: false, data: null });
    const [editFields, setEditFields] = useState({ name: '', phone: '', aadhaar: '', khatauni_no: '', land_acres: '' });

    const fetchRegistrations = useCallback(async (isRefresh = false, isSilent = false, activeFlag = { active: true }) => {
        try {
            // Flicker Fix: Only show full-screen spinner if it's the absolute first load and no data exists
            const hasData = registrationsRef.current.pending.length > 0 || registrationsRef.current.approved.length > 0 || registrationsRef.current.rejected.length > 0;

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
                setRegistrations(result.data.registrations || { pending: [], approved: [], rejected: [] });
            }
        } catch (error) {
            console.error('Fetch registrations failed', error);
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

        fetchRegistrations(false, false, activeFlag);
        const interval = setInterval(() => {
            fetchRegistrations(true, true, activeFlag);
        }, 120000); // Silent background refresh

        return () => {
            active = false;
            activeFlag.active = false;
            clearInterval(interval);
        };
    }, [retailerId, fetchRegistrations]);

    const handleAction = async (endpoint: string, body: Record<string, any>, successMsg: string, confirmTitle: string, confirmMsg: string) => {
        const effectiveId = retailerId || retailerDetails?.retailer_id || retailerDetails?.id || 'UNKNOWN';
        setConfirmModal({
            visible: true,
            title: confirmTitle,
            message: confirmMsg,
            onConfirm: async () => {
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
                        fetchRegistrations();
                    } else {
                        setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: result.message || 'कुछ गलत हो गया' });
                    }
                } catch (error) {
                    console.error('Action failed', error);
                    RetailerLogger.apiErr(endpoint, 0, error, effectiveId);
                    setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'नेटवर्क त्रुटि' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleUpdateFarmer = async () => {
        if (!editModal.data) return;
        const effectiveId = retailerId || retailerDetails?.retailer_id || retailerDetails?.id || 'UNKNOWN';
        try {
            setLoading(true);
            const body = {
                farmer_id: editModal.data.id,
                name: editFields.name,
                mobile: editFields.phone,
                aadhaar: editFields.aadhaar,
                khatauni_number: editFields.khatauni_no,
                khasra_rukba: parseFloat(editFields.land_acres) || 0
            };
            RetailerLogger.apiReq(API_ENDPOINTS.updateFarmer, 'POST', body, effectiveId);

            const response = await apiFetch(API_ENDPOINTS.updateFarmer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();

            RetailerLogger.apiRes(API_ENDPOINTS.updateFarmer, response.status, result, effectiveId);

            if (result.status === 'success') {
                setAlertModal({ visible: true, type: 'success', title: 'सफल', message: 'किसान का विवरण अपडेट कर दिया गया है' });
                setEditModal({ visible: false, data: null });
                fetchRegistrations();
            } else {
                setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: result.message || 'अपडेट विफल रहा' });
            }
        } catch (error) {
            RetailerLogger.apiErr(API_ENDPOINTS.updateFarmer, 0, error, effectiveId);
            setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'नेटवर्क त्रुटि' });
        } finally {
            setLoading(false);
        }
    };

    const openDocument = (path: string, title: string) => {
        if (!path) {
            setAlertModal({ visible: true, type: 'info', title: 'उपलब्ध नहीं', message: 'यह दस्तावेज़ अपलोड नहीं किया गया है' });
            return;
        }
        const url = path.startsWith('http') ? path : `${API_BASE_URL}/${path}`;
        const isPdf = path.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            setPdfModal({ visible: true, title, viewerUrl: googleViewerUrl });
        } else {
            setDocModal({ visible: true, url, title });
        }
    };

    const openPdfInBrowser = () => {
        Linking.openURL(pdfModal.viewerUrl).catch(() =>
            setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'PDF खोलने में विफल' })
        );
    };

    const renderCalendarModal = () => {
        const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const monthName = calendarMonth.toLocaleString('hi-IN', { month: 'long', year: 'numeric' });
        const days: any[] = [];
        const weekDays = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
        for (let i = 0; i < firstDay; i++) days.push({ day: null, key: `empty-${i}` });
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, date: dateStr, key: `day-${dateStr}` });
        }
        return (
            <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.calendarCard, { marginBottom: 20 }]}>
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
                            {days.map((item) => (
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

    const filterListByDate = (list: any[]) => {
        const safeList = Array.isArray(list) ? list : [];
        if (!useDateFilter) return safeList;
        return safeList.filter(item => isDateMatch(item.created_at, selectedDate));
    };

    const startEdit = (item: any) => {
        setEditFields({
            name: item.name,
            phone: item.phone,
            aadhaar: item.aadhaar || '',
            khatauni_no: item.khatauni_no || '',
            land_acres: String(item.land_acres || '0')
        });
        setEditModal({ visible: true, data: item });
    };

    const renderRegistrationCard = (item: any, index?: number) => {
        const isLocked = regTab === 'pending' && typeof index === 'number' && index > 0;

        return (
            <View
                style={[
                    styles.card
                ]}
                key={item.id}
                pointerEvents={isLocked ? 'none' : 'auto'}
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
                        <View style={styles.avatarContainer}>
                            {(item.photo || item.farmer_photo || item.profile_photo) ? (
                                <Image
                                    source={{
                                        uri: (item.photo || item.farmer_photo || item.profile_photo).startsWith('http')
                                            ? (item.photo || item.farmer_photo || item.profile_photo)
                                            : `${API_BASE_URL}/${item.photo || item.farmer_photo || item.profile_photo}`
                                    }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                    onError={(e) => console.log('Image Load Error:', e.nativeEvent.error)}
                                />
                            ) : (
                                <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.farmerName}>{item.name}</Text>
                            <Text style={styles.farmerDetail}>{item.phone}</Text>
                            <View style={styles.aadhaarBadge}>
                                <Text style={styles.aadhaarText}>{item.aadhaar || 'No Aadhaar'}</Text>
                            </View>
                            {!!item.registry_id && (
                                <Text style={[styles.farmerDetail, { marginTop: 4, fontWeight: '700', color: COLORS.primary }]}>
                                    पंजीकरण सं: {item.registry_id}
                                </Text>
                            )}
                        </View>
                        {item.status === 0 && (
                            <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>खतौनी नंबर</Text>
                        <Text style={styles.detailText}>{item.khatauni_no || 'N/A'}</Text>
                    </View>
                    <View style={[styles.detailBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
                        <Text style={styles.detailLabel}>जमीन (हेक्टेयर)</Text>
                        <Text style={styles.detailText}>{item.land_acres || '0'}</Text>
                    </View>
                </View>

                <View style={styles.docRow}>
                    <TouchableOpacity style={styles.docButton} onPress={() => openDocument(item.aadhaar_photo, 'आधार कार्ड')}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.docButtonText}>आधार कार्ड</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.docButton} onPress={() => openDocument(item.khatauni_photo, 'खतौनी')}>
                        <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.docButtonText}>खतौनी कॉपी</Text>
                    </TouchableOpacity>
                    {(item.photo || item.farmer_photo || item.profile_photo) && (
                        <TouchableOpacity
                            style={[styles.docButton, { backgroundColor: '#FFF7ED' }]}
                            onPress={() => openDocument(item.photo || item.farmer_photo || item.profile_photo, 'प्रोफ़ाइल फोटो/Profile Photo')}
                        >
                            <MaterialCommunityIcons name="image-search-outline" size={18} color="#F97316" />
                            <Text style={[styles.docButtonText, { color: '#F97316' }]}>फोटो देखें</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5, marginTop: 5 }}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#64748b" />
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700' }}>अनुरोध: {item.created_at}</Text>
                </View>

                {item.status === 1 && item.approved_at && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 15 }}>
                        <MaterialCommunityIcons name="check-all" size={14} color={COLORS.success} />
                        <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '700' }}>स्वीकृत: {item.approved_at}</Text>
                    </View>
                )}

                {item.status === 2 && item.approved_at && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 15 }}>
                        <MaterialCommunityIcons name="close-circle-outline" size={14} color={COLORS.error} />
                        <Text style={{ fontSize: 12, color: COLORS.error, fontWeight: '700' }}>अस्वीकृत: {item.approved_at}</Text>
                    </View>
                )}

                {item.status === 0 ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleAction(
                                API_ENDPOINTS.manageRegistration,
                                { request_id: item.id, action: 'reject', retailer_id: retailerId },
                                'किसान को अस्वीकार कर दिया गया है',
                                'अस्वीकार करें?',
                                'क्या आप वाकई इस किसान के पंजीकरण को अस्वीकार करना चाहते हैं?'
                            )}
                        >
                            <Ionicons name="close-circle" size={18} color={COLORS.error} />
                            <Text style={[styles.btnText, { color: COLORS.error }]}>अस्वीकार</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleAction(
                                API_ENDPOINTS.manageRegistration,
                                { request_id: item.id, action: 'approve', retailer_id: retailerId },
                                'किसान सफलतापूर्वक जुड़ गया है',
                                'स्वीकार करें?',
                                'क्या आप वाकई इस किसान को अपने स्टोर के साथ जोड़ना चाहते हैं?'
                            )}
                        >
                            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                            <Text style={[styles.btnText, { color: COLORS.white }]}>स्वीकार करें</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.statusBadge, item.status === 1 ? styles.approvedBadge : styles.rejectedBadge]}>
                        <Ionicons name={item.status === 1 ? "checkmark-circle" : "close-circle"} size={16} color={item.status === 1 ? COLORS.success : COLORS.error} />
                        <Text style={[styles.statusText, { color: item.status === 1 ? COLORS.success : COLORS.error }]}>
                            {item.status === 1 ? 'स्वीकृत' : 'अस्वीकृत'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };
    const filteredPending = filterListByDate(registrations.pending).sort((a, b) => {
        const parsedA = parseMixedDateFormat(a.created_at) || new Date(a.created_at?.replace(/-/g, '/') || 0);
        const parsedB = parseMixedDateFormat(b.created_at) || new Date(b.created_at?.replace(/-/g, '/') || 0);
        let dateA = parsedA.getTime();
        let dateB = parsedB.getTime();
        if (isNaN(dateA)) dateA = 0;
        if (isNaN(dateB)) dateB = 0;
        if (dateA === dateB) {
            return parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10);
        }
        return dateA - dateB;
    });
    const filteredApproved = filterListByDate(registrations.approved);
    const filteredRejected = filterListByDate(registrations.rejected);

    let listToShow = [];
    if (regTab === 'pending') listToShow = filteredPending;
    else if (regTab === 'approved') listToShow = filteredApproved;
    else if (regTab === 'rejected') listToShow = filteredRejected;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingVertical: 10, paddingTop: 15 }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>पंजीकरण अनुरोध</Text>
            </View>

            {/* Tabs Area */}
            <View style={styles.fixedHeaderArea}>
                {renderDateFilter()}
                <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity style={[styles.filterChip, regTab === 'pending' && styles.activeFilterChip]} onPress={() => setRegTab('pending')}>
                            <MaterialCommunityIcons name="clock-alert-outline" size={18} color={regTab === 'pending' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, regTab === 'pending' && styles.activeFilterChipText]}>लंबित ({filteredPending.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, regTab === 'approved' && styles.activeFilterChip]} onPress={() => setRegTab('approved')}>
                            <MaterialCommunityIcons name="check-decagram" size={18} color={regTab === 'approved' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, regTab === 'approved' && styles.activeFilterChipText]}>स्वीकृत ({filteredApproved.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.filterChip, regTab === 'rejected' && styles.activeFilterChip]} onPress={() => setRegTab('rejected')}>
                            <MaterialCommunityIcons name="close-circle-multiple-outline" size={18} color={regTab === 'rejected' ? COLORS.white : '#64748b'} />
                            <Text style={[styles.filterChipText, regTab === 'rejected' && styles.activeFilterChipText]}>अस्वीकृत ({filteredRejected.length})</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>

            {loading && !refreshing && !editModal.visible && registrations.pending.length === 0 && registrations.approved.length === 0 && registrations.rejected.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={listToShow}
                    renderItem={({ item, index }) => renderRegistrationCard(item, index)}
                    keyExtractor={(item) => (item.id || Math.random()).toString()}
                    contentContainerStyle={styles.scrollContent}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={8}
                    windowSize={5}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchRegistrations(true)}
                            colors={[COLORS.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyText}>कोई अनुरोध नहीं मिला</Text>
                        </View>
                    }
                    ListFooterComponent={<View style={{ height: 100 }} />}
                />
            )}

            {/* Document Viewer Modal */}
            <Modal visible={docModal.visible} transparent animationType="fade" onRequestClose={() => setDocModal({ ...docModal, visible: false })}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.docModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{docModal.title}</Text>
                            <TouchableOpacity onPress={() => setDocModal({ ...docModal, visible: false })}>
                                <Ionicons name="close" size={28} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: docModal.url }} style={styles.fullImage} resizeMode="contain" />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* PDF Preview Modal */}
            <Modal visible={pdfModal.visible} transparent animationType="slide" onRequestClose={() => setPdfModal({ ...pdfModal, visible: false })}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.pdfModalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.pdfIconBox}>
                                    <MaterialCommunityIcons name="file-pdf-box" size={24} color="#EF4444" />
                                </View>
                                <Text style={styles.modalTitle} numberOfLines={1}>{pdfModal.title}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPdfModal({ ...pdfModal, visible: false })}>
                                <Ionicons name="close" size={28} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        {/* PDF Preview Card */}
                        <View style={styles.pdfPreviewCard}>
                            <MaterialCommunityIcons name="file-pdf-box" size={80} color="#EF4444" />
                            <Text style={styles.pdfFileName}>{pdfModal.title}</Text>
                            <Text style={styles.pdfSubText}>PDF दस्तावेज़</Text>

                            <View style={styles.pdfInfoRow}>
                                <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.success} />
                                <Text style={styles.pdfInfoText}>सुरक्षित रूप से खुलेगा</Text>
                            </View>
                        </View>

                        {/* Open Button */}
                        <TouchableOpacity style={styles.pdfOpenBtn} onPress={openPdfInBrowser}>
                            <MaterialCommunityIcons name="open-in-app" size={22} color="#fff" />
                            <Text style={styles.pdfOpenBtnText}>PDF खोलें</Text>
                        </TouchableOpacity>

                        <Text style={styles.pdfNote}>
                            📄 PDF सुरक्षित Viewer में खुलेगा
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Edit Farmer Modal */}
            <Modal visible={editModal.visible} transparent animationType="slide" onRequestClose={() => setEditModal({ ...editModal, visible: false })}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.editModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>विवरण बदलें</Text>
                            <TouchableOpacity onPress={() => setEditModal({ ...editModal, visible: false })}>
                                <Ionicons name="close" size={28} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {(editModal.data?.photo || editModal.data?.farmer_photo || editModal.data?.profile_photo) ? (
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={styles.editAvatarContainer}>
                                        <Image
                                            source={{
                                                uri: (editModal.data.photo || editModal.data.farmer_photo || editModal.data.profile_photo).startsWith('http')
                                                    ? (editModal.data.photo || editModal.data.farmer_photo || editModal.data.profile_photo)
                                                    : `${API_BASE_URL}/${editModal.data.photo || editModal.data.farmer_photo || editModal.data.profile_photo}`
                                            }}
                                            style={styles.fullImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={[styles.editAvatarContainer, { backgroundColor: '#F1F5F9' }]}>
                                        <MaterialCommunityIcons name="account" size={60} color="#CBD5E1" />
                                    </View>
                                </View>
                            )}
                            <Text style={styles.inputLabel}>किसान का नाम</Text>
                            <TextInput style={styles.input} value={editFields.name} onChangeText={(t) => setEditFields({ ...editFields, name: t })} />

                            <Text style={styles.inputLabel}>मोबाइल नंबर</Text>
                            <TextInput style={styles.input} value={editFields.phone} onChangeText={(t) => setEditFields({ ...editFields, phone: t })} keyboardType="phone-pad" maxLength={10} />

                            <Text style={styles.inputLabel}>आधार नंबर</Text>
                            <TextInput style={styles.input} value={editFields.aadhaar} onChangeText={(t) => setEditFields({ ...editFields, aadhaar: t })} keyboardType="numeric" maxLength={12} />

                            <Text style={styles.inputLabel}>खतौनी नंबर</Text>
                            <TextInput style={styles.input} value={editFields.khatauni_no} onChangeText={(t) => setEditFields({ ...editFields, khatauni_no: t })} />

                            <Text style={styles.inputLabel}>जमीन (हेक्टेयर में)</Text>
                            <TextInput style={styles.input} value={editFields.land_acres} onChangeText={(t) => setEditFields({ ...editFields, land_acres: t })} keyboardType="numeric" />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateFarmer}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>बदलाव सुरक्षित करें</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Confirm Modal */}
            <ConfirmModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    setConfirmModal({ ...confirmModal, visible: false });
                    confirmModal.onConfirm();
                }}
                onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
            />

            {/* Alert Modal */}
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
    container: { flex: 1, backgroundColor: '#F0F4F8' },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#F0F4F8' },
    backButton: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
    fixedHeaderArea: { backgroundColor: '#F0F4F8', paddingBottom: 2 },
    filterWrapper: { marginBottom: 8, height: 44, marginTop: 5 },
    filterScroll: { paddingHorizontal: 15, alignItems: 'center', gap: 8 },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', gap: 5 },
    activeFilterChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, ...SHADOWS.small },
    filterChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    activeFilterChipText: { color: COLORS.white },
    scrollContent: { paddingHorizontal: 4, paddingTop: 4 },
    card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginBottom: 12, marginHorizontal: 10, ...SHADOWS.medium, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    farmerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarContainer: { width: 55, height: 55, borderRadius: 12, backgroundColor: 'rgba(76, 175, 80, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    avatarImage: { width: '100%', height: '100%' },
    farmerName: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
    farmerDetail: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
    aadhaarBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
    aadhaarText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
    editBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 10 },
    detailsGrid: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    detailBox: { flex: 1, padding: 10, alignItems: 'center' },
    detailLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    detailText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
    docRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    docButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: 8, borderRadius: 10, gap: 5, borderWidth: 1, borderColor: '#E2E8F0' },
    docButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, gap: 6, borderWidth: 1 },
    approvedBadge: { backgroundColor: '#E8F5E9', borderColor: 'rgba(76, 175, 80, 0.3)' },
    rejectedBadge: { backgroundColor: '#FFEBEE', borderColor: 'rgba(244, 67, 54, 0.3)' },
    statusText: { fontSize: 15, fontWeight: '900' },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
    approveBtn: { backgroundColor: COLORS.primary },
    rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
    btnText: { fontSize: 14, fontWeight: '800' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, fontSize: 16, color: '#94a3b8', fontWeight: '700' },
    dateFilterRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, marginTop: 5, gap: 10 },
    dateFilterToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
    activeDateFilterToggle: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dateFilterText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    activeDateFilterText: { color: COLORS.white },
    calendarCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, width: width * 0.9, alignSelf: 'center', ...SHADOWS.large },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calendarMonthTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    weekDayText: { width: (width * 0.9 - 40) / 7, textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#94a3b8' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: (width * 0.9 - 40) / 7, height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderRadius: 10 },
    selectedDayCell: { backgroundColor: COLORS.primary },
    dayText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    selectedDayText: { color: COLORS.white },
    todayBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    todayBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    docModalContent: { width: '100%', height: '80%', backgroundColor: COLORS.white, borderRadius: 24, padding: 15, ...SHADOWS.large },
    editModalContent: { width: '100%', maxHeight: '90%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20, ...SHADOWS.large },
    pdfModalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20, ...SHADOWS.large },
    pdfIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    pdfPreviewCard: { alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 18, padding: 30, marginBottom: 20, borderWidth: 1, borderColor: '#FECACA', gap: 8 },
    pdfFileName: { fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
    pdfSubText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    pdfInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    pdfInfoText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },
    pdfOpenBtn: { backgroundColor: '#EF4444', paddingVertical: 15, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, ...SHADOWS.medium },
    pdfOpenBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    pdfNote: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 12, fontWeight: '600' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
    imageContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', backgroundColor: '#f8fafc' },
    fullImage: { width: '100%', height: '100%' },
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
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 5, marginLeft: 5 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b', marginBottom: 15, fontWeight: '600' },
    saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 10, ...SHADOWS.medium },
    saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
    editAvatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: '#FFEDD5',
        ...SHADOWS.medium,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center'
    },
});
