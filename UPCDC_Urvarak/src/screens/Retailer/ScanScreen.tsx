import { apiFetch } from '../../utils/apiClient';
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    Alert,
    Image,
    Platform,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    TextInput,
    FlatList,
    RefreshControl,
    BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, SHADOWS, BORDER_RADIUS } from '../../constants';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/config';
import ParticleBackground from '../../components/ParticleBackground';
import { BlurView } from 'expo-blur';
import AlertModal from '../../components/AlertModal';

const { width, height } = Dimensions.get('window');

interface FarmerDetails {
    booking: {
        order_id: string;
        status: string;
        booking_date: string;
        items: Array<{
            id: string;
            product: string;
            quantity: number;
            status: string;
        }>;
    };
    farmer: {
        name: string;
        mobile: string;
        aadhaar: string;
        khatauni_no: string;
        land_acres: string;
        farmer_id: string;
        photo?: string;
        booking_date?: string;
    };
    quota: {
        total: number;
        used: number;
        remaining: number;
    };
}

interface BookingListItem {
    id: string;
    order_id: string;
    full_name: string;
    token_number: string;
    status: string;
    items?: any[];
    photo?: string;
    phone?: string;
}

import { RetailerLogger } from '../../utils/RetailerLogger';

export default function ScanScreen({ onClose, retailerName, retailerId }: { onClose?: () => void, retailerName?: string, retailerId: string }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [farmerData, setFarmerData] = useState<FarmerDetails | null>(null);
    const insets = useSafeAreaInsets();
    const [manualToken, setManualToken] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [todaysBookings, setTodaysBookings] = useState<BookingListItem[]>([]);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertModal, setAlertModal] = useState<{
        visible: boolean, type: 'success' | 'error' | 'info', title: string, message: string
    }>({ visible: false, type: 'info', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean, title: string, message: string, onConfirm: () => void
    }>({ visible: false, title: '', message: '', onConfirm: () => { } });
    const [scannedViaCamera, setScannedViaCamera] = useState(false);

    // Animation values for the scanner line
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    // Animation for the modal
    const modalFadeAnim = useRef(new Animated.Value(0)).current;
    // Animation for logo (if needed, though instruction mentioned TopHeader)
    const logoScale = useRef(new Animated.Value(1)).current;

    const displayedName = retailerName;

    useEffect(() => {
        if (!scanned) {
            startScanAnimation();
        } else {
            scanLineAnim.stopAnimation();
        }
    }, [scanned]);

    useEffect(() => {
        // Automatically request permission on first open if not granted
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    useEffect(() => {
        const backAction = () => {
            if (showModal) {
                setShowModal(false);
                return true;
            }
            if (showManualInput) {
                setShowManualInput(false);
                return true;
            }
            if (isScannerActive) {
                setIsScannerActive(false);
                return true;
            }
            if (onClose) {
                onClose();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [showModal, showManualInput, isScannerActive, onClose]);

    useEffect(() => {
        fetchTodaysBookings();
        const interval = setInterval(() => fetchTodaysBookings(true), 60000); // Silent background refresh
        return () => clearInterval(interval);
    }, [retailerId]);

    const filteredBookings = todaysBookings.filter(b => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;

        // Search by Token (exact or partial), Name, or Phone
        return (
            (b.token_number && b.token_number.toLowerCase().includes(query)) ||
            (b.full_name && b.full_name.toLowerCase().includes(query)) ||
            (b.phone && b.phone.includes(query)) ||
            (b.order_id && b.order_id.toLowerCase().includes(query))
        );
    });

    const fetchTodaysBookings = async (isSilent = false) => {
        if (!isSilent) setFetchLoading(true);
        try {
            const response = await apiFetch(API_ENDPOINTS.getRetailerRequests, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retailer_id: retailerId })
            });
            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data.bookings)) {
                // Filter for bookings that are approved, confirmed, or extended (ready for collection)
                const filtered = result.data.bookings.filter((b: any) => {
                    const status = b.status?.toLowerCase();
                    return (status === 'approved' || status === 'confirmed' || status === 'extended');
                });

                // Unique by order_id or id
                const uniqueOrders: Record<string, any> = {};
                filtered.forEach((b: any) => {
                    const id = b.order_id || b.id;
                    if (!uniqueOrders[id]) uniqueOrders[id] = b;
                });

                // Sort by booking date
                const sorted = Object.values(uniqueOrders).sort((a: any, b: any) => {
                    const dateA = new Date(a.booking_date).getTime();
                    const dateB = new Date(b.booking_date).getTime();
                    return dateA - dateB;
                });

                setTodaysBookings(sorted);
            }
        } catch (error) {
            console.error('Fetch Today Bookings Error:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    const getISTDate = () => {
        const now = new Date();
        // Shift to IST (UTC+5:30) regardless of system timezone
        const istTime = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
        const y = istTime.getFullYear();
        const m = String(istTime.getMonth() + 1).padStart(2, '0');
        const d = String(istTime.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getImageUrl = (path: string | undefined | null) => {
        if (!path) return null;
        return path.startsWith('http') ? path : `${API_BASE_URL}/${path}`;
    };

    const startScanAnimation = () => {
        scanLineAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const handleBarcodeScanned = async (scanData: { data: string }, isCameraScan: boolean = false) => {
        const { data } = scanData;
        const trimmedData = data ? String(data).trim() : '';
        if (!trimmedData) return;

        // Debounce only camera frame scans
        if (isCameraScan && scanned) return;

        RetailerLogger.info(`Token Scanned/Input: ${trimmedData}`, retailerId);
        setScanned(true);
        setScannedViaCamera(isCameraScan);
        setLoading(true);

        try {
            const payload = {
                token_number: trimmedData,
                retailer_id: retailerId
            };
            RetailerLogger.apiReq(API_ENDPOINTS.getBookingByToken, 'POST', payload, retailerId);
            const response = await apiFetch(API_ENDPOINTS.getBookingByToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            RetailerLogger.apiRes(API_ENDPOINTS.getBookingByToken, response.status, result, retailerId);

            if (result.status === 'success') {
                if (!result.data || !result.data.booking) {
                    setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'बुकिंग का डेटा अधूरा है।' });
                    setScanned(false);
                    return;
                }
                setFarmerData(result.data);
                setShowManualInput(false);
                setManualToken('');
                setIsScannerActive(false);
                setShowModal(true);
                Animated.timing(modalFadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            } else {
                setAlertModal({ visible: true, type: 'error', title: 'टोकन अमान्य', message: result.message || 'यह टोकन नंबर हमारे डेटाबेस में नहीं मिला।' });
                setScanned(false);
            }
        } catch (error) {
            console.error('Scan Error:', error);
            RetailerLogger.apiErr(API_ENDPOINTS.getBookingByToken, 0, error, retailerId);
            setAlertModal({ visible: true, type: 'error', title: 'कनेक्शन एरर', message: 'सर्वर से संपर्क नहीं हो पाया। कृपया नेटवर्क की जाँच करें।' });
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setIsScannerActive(false);
        setShowModal(false);
        setScanned(false);
        setFarmerData(null);
        setManualToken('');
        setSearchTerm('');
        setShowManualInput(false);
        setScannedViaCamera(false);
        modalFadeAnim.setValue(0);
        fetchTodaysBookings(); // Refresh list after any modal close/action
    };

    const handleManualSubmit = () => {
        const tokenToSubmit = manualToken.trim();
        if (!tokenToSubmit) {
            setAlertModal({ visible: true, type: 'info', title: 'त्रुटि', message: 'कृपया टोकन नंबर दर्ज करें' });
            return;
        }
        handleBarcodeScanned({ data: tokenToSubmit }, false);
    };

    const handleConfirmCollection = async () => {
        if (!farmerData || !farmerData.booking.items.length) {
            setAlertModal({ visible: true, type: 'error', title: 'त्रुटि', message: 'बुकिंग आइटम्स नहीं मिले।' });
            return;
        }

        setConfirmModal({
            visible: true,
            title: 'पुष्टि करें',
            message: 'क्या आप वितरित (Collect) करने की पुष्टि करना चाहते हैं?',
            onConfirm: async () => {
                setLoading(true);
                const payload = {
                    booking_id: farmerData.booking.items[0].id,
                    action: 'collect',
                    retailer_id: retailerId
                };

                try {
                    RetailerLogger.apiReq(API_ENDPOINTS.manageBooking, 'POST', payload, retailerId);
                    const response = await apiFetch(API_ENDPOINTS.manageBooking, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();
                    RetailerLogger.apiRes(API_ENDPOINTS.manageBooking, response.status, result, retailerId);

                    if (result.status === 'success') {
                        setAlertModal({ visible: true, type: 'success', title: 'सफल', message: 'वितरण (Collection) की पुष्टि कर दी गई है।' });
                        resetScanner();
                    } else {
                        setAlertModal({ visible: true, type: 'error', title: 'अधूरी कार्यवाही', message: result.message || 'वितरण दर्ज करने में समस्या आई।' });
                    }
                } catch (error) {
                    console.error('Confirm Collection Error:', error);
                    RetailerLogger.apiErr(API_ENDPOINTS.manageBooking, 0, error, retailerId);
                    setAlertModal({ visible: true, type: 'error', title: 'नेटवर्क एरर', message: 'सर्वर से संपर्क टूट गया है।' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (!permission) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color={COLORS.primary} />
                <Text style={styles.permissionTitle}>कैमरा अनुमति आवश्यक</Text>
                <Text style={styles.permissionText}>किसान की जानकारी स्कैन करने के लिए कृपया कैमरा एक्सेस की अनुमति दें।</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>अनुमति दें (Grant Permission)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const scanLineTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 240],
    });

    const renderBookingItem = ({ item }: { item: BookingListItem }) => (
        <TouchableOpacity
            style={styles.bookingListItem}
            onPress={() => handleBarcodeScanned({ data: item.token_number }, false)}
            activeOpacity={0.7}
        >
            <View style={styles.bookingListTop}>
                <View style={styles.listAvatar}>
                    {getImageUrl(item.photo) ? (
                        <Image source={{ uri: getImageUrl(item.photo)! }} style={styles.avatarImageMini} resizeMode="cover" />
                    ) : (
                        <MaterialCommunityIcons name="account" size={18} color={COLORS.primary} />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bookingListName}>{item.full_name}</Text>
                    <Text style={styles.bookingListToken}>Token: {item.token_number}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: (item.status?.toLowerCase() === 'approved' || item.status?.toLowerCase() === 'confirmed' || item.status?.toLowerCase() === 'extended') ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Text style={[styles.statusTagText, { color: (item.status?.toLowerCase() === 'approved' || item.status?.toLowerCase() === 'confirmed' || item.status?.toLowerCase() === 'extended') ? '#059669' : '#D97706' }]}>
                        {(item.status?.toLowerCase() === 'approved' || item.status?.toLowerCase() === 'confirmed') ? 'स्वीकृत' : (item.status?.toLowerCase() === 'extended' ? 'समय विस्तारित' : 'लंबित')}
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isScannerActive ? "light-content" : "dark-content"} />

            {isScannerActive ? (
                <View style={{ flex: 1 }}>
                    <CameraView
                        style={styles.camera}
                        onBarcodeScanned={scanned ? undefined : (e) => handleBarcodeScanned(e, true)}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanHeader}>
                                <TouchableOpacity
                                    style={styles.closeBtnSmall}
                                    onPress={() => setIsScannerActive(false)}
                                >
                                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={styles.scanHeaderText}>QR स्कैन करें</Text>
                                <View style={{ width: 44 }} />
                            </View>

                            <View style={styles.scanMainContainer}>
                                <View style={styles.focusedContainer}>
                                    <Animated.View
                                        style={[
                                            styles.scanLine,
                                            { transform: [{ translateY: scanLineTranslateY }] }
                                        ]}
                                    />
                                    <View style={[styles.corner, styles.topLeft]} />
                                    <View style={[styles.corner, styles.topRight]} />
                                    <View style={[styles.corner, styles.bottomLeft]} />
                                    <View style={[styles.corner, styles.bottomRight]} />

                                    {loading && (
                                        <BlurView intensity={20} tint="dark" style={styles.loadingOverlay}>
                                            <ActivityIndicator size="large" color="#FFF" />
                                            <Text style={[styles.loadingText, { color: '#FFF' }]}>जाँच हो रही है...</Text>
                                        </BlurView>
                                    )}
                                </View>

                                {!showManualInput ? (
                                    <TouchableOpacity
                                        style={styles.premiumManualBtn}
                                        onPress={() => {
                                            setShowManualInput(true);
                                            setScanned(false);
                                        }}
                                    >
                                        <Ionicons name="pencil" size={18} color="#FFF" />
                                        <Text style={styles.manualInputToggleText}>टोकन नंबर दर्ज करें</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <BlurView intensity={90} tint="light" style={styles.glassManualContainer}>
                                        <TextInput
                                            style={styles.premiumTextInput}
                                            placeholder="यहाँ टोकन नंबर लिखें (उदा: 123456 या TKN-123456)"
                                            placeholderTextColor="#94A3B8"
                                            value={manualToken}
                                            onChangeText={setManualToken}
                                            autoFocus
                                            keyboardType="default"
                                            autoCapitalize="characters"
                                            returnKeyType="search"
                                            onSubmitEditing={handleManualSubmit}
                                        />
                                        <View style={styles.manualInputActions}>
                                            <TouchableOpacity
                                                style={styles.glassCancelBtn}
                                                onPress={() => {
                                                    setShowManualInput(false);
                                                    setScanned(false);
                                                }}
                                            >
                                                <Text style={styles.manualCancelText}>रद्द</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.glassSubmitBtn}
                                                onPress={handleManualSubmit}
                                            >
                                                <Text style={styles.manualSubmitText}>सबमिट</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </BlurView>
                                )}
                                <Text style={styles.hintTextSmall}>क्यूआर कोड को बीच में रखें</Text>
                            </View>
                        </View>
                    </CameraView>
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    renderItem={renderBookingItem}
                    keyExtractor={(item) => item.id || item.order_id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={fetchLoading}
                            onRefresh={fetchTodaysBookings}
                            colors={[COLORS.primary]}
                        />
                    }
                    ListHeaderComponent={
                        <View style={[styles.hubContainer, { paddingTop: Math.max(insets.top, 20) }]}>
                            <View style={styles.hubHeader}>
                                <TouchableOpacity onPress={onClose} style={styles.hubBackBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                                </TouchableOpacity>
                                <View>
                                    <Text style={styles.hubTitle}>टोकन और वितरण</Text>
                                    <Text style={styles.retailerSub}>{retailerName}</Text>
                                </View>
                                <View style={{ width: 44 }} />
                            </View>

                            <View style={styles.searchSection}>
                                <View style={styles.searchInputWrapper}>
                                    <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.hubSearchInput}
                                        placeholder="टोकन नंबर खोजें..."
                                        value={searchTerm}
                                        onChangeText={setSearchTerm}
                                        keyboardType="default"
                                        autoCapitalize="characters"
                                        returnKeyType="search"
                                        onSubmitEditing={() => {
                                            const tokenToSearch = searchTerm.trim();
                                            if (tokenToSearch) {
                                                handleBarcodeScanned({ data: tokenToSearch }, false);
                                            }
                                        }}
                                    />
                                    {searchTerm.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={() => {
                                        const tokenToSearch = searchTerm.trim();
                                        if (!tokenToSearch) {
                                            setAlertModal({ visible: true, type: 'info', title: 'सूचना', message: 'कृपया सर्च करने के लिए टोकन नंबर दर्ज करें' });
                                            return;
                                        }
                                        handleBarcodeScanned({ data: tokenToSearch }, false);
                                    }}
                                >
                                    <Text style={styles.searchButtonText}>खोजें (Search)</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.hubScanCard}
                                onPress={() => setIsScannerActive(true)}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#7C3AED', '#6D28D9']}
                                    style={styles.hubScanGradient}
                                >
                                    <View style={styles.hubScanIconBox}>
                                        <Ionicons name="scan" size={32} color="#FFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.hubScanTitle}>QR कोड स्कैन करें</Text>
                                        <Text style={styles.hubScanSubtitle}>परमिट पर दिए गए QR को स्कैन करें</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.listHeaderUnified}>
                                <View>
                                    <Text style={styles.listTitle}>आज की बुकिंग्स</Text>
                                    <Text style={styles.listSubtitle}>आज के लंबित और स्वीकृत ऑर्डर</Text>
                                </View>
                                <TouchableOpacity style={styles.refreshIconBox} onPress={() => fetchTodaysBookings()}>
                                    <Ionicons name="refresh" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>

                            {fetchLoading && todaysBookings.length === 0 && (
                                <View style={styles.listLoading}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={styles.listLoadingText}>डेटा लोड हो रहा है...</Text>
                                </View>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        !fetchLoading ? (
                            <View style={styles.emptyList}>
                                <Ionicons name="calendar-outline" size={48} color="#E2E8F0" />
                                <Text style={styles.emptyListText}>आज कोई बुकिंग नहीं मिली।</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                />
            )}

            {/* Farmer Details Modal - High Fidelity */}
            <Modal
                visible={showModal}
                transparent={true}
                animationType="none"
            >
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.modalContent, { opacity: modalFadeAnim }]}>
                        <LinearGradient
                            colors={['#FFFFFF', '#F9FAFB']}
                            style={[styles.modalGradient, { paddingBottom: Math.max(insets.bottom, 30) }]}
                        >
                            <View style={styles.modalHeader}>
                                <View style={{ width: 84, height: 84, justifyContent: 'center', alignItems: 'center' }}>
                                    <View style={styles.farmerAvatar}>
                                        <View style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden' }}>
                                            {getImageUrl(farmerData?.farmer.photo) ? (
                                                <Image source={{ uri: getImageUrl(farmerData?.farmer.photo)! }} style={styles.avatarImageLarge} resizeMode="cover" />
                                            ) : (
                                                <Ionicons name="person" size={40} color={COLORS.primary} />
                                            )}
                                        </View>
                                        {/* Border Overlay - strictly inside the avatar */}
                                        <View style={[StyleSheet.absoluteFill, { borderRadius: 40, borderWidth: 3, borderColor: COLORS.primary }]} pointerEvents="none" />
                                    </View>

                                    {/* Verified Badge - Now OUTSIDE the overflow hidden container, so it stays on top and unclipped */}
                                    <View style={[styles.verifiedBadge, { position: 'absolute', bottom: 4, right: 4, zIndex: 999 }]}>
                                        <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                                    </View>
                                </View>
                                <Text style={styles.modalTitle}>किसान और स्वीकृत बुकिंग</Text>
                            </View>

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                {/* Farmer Section */}
                                <Text style={styles.detailSectionTitle}>किसान की जानकारी</Text>
                                <View style={styles.detailsContainer}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>नाम:</Text>
                                        <Text style={styles.detailValue}>{farmerData?.farmer.name}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>मोबाइल:</Text>
                                        <Text style={styles.detailValue}>{farmerData?.farmer.mobile}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>आधार:</Text>
                                        <Text style={styles.detailValue}>{farmerData?.farmer.aadhaar}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>खतौनी नंबर:</Text>
                                        <Text style={styles.detailValue}>{farmerData?.farmer.khatauni_no}</Text>
                                    </View>
                                </View>

                                {/* Quota Section */}
                                <Text style={styles.detailSectionTitle}>कोटा की जानकारी</Text>
                                <View style={[styles.detailsContainer, { backgroundColor: 'rgba(56, 189, 248, 0.05)' }]}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>कुल स्वीकृत:</Text>
                                        <Text style={styles.detailValue}>{farmerData?.quota.total} बोरी</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>ले जा चुके:</Text>
                                        <Text style={[styles.detailValue, { color: COLORS.error }]}>{farmerData?.quota.used} बोरी</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>शेष कोटा:</Text>
                                        <Text style={[styles.detailValue, { color: COLORS.success, fontSize: 18 }]}>{farmerData?.quota.remaining} बोरी</Text>
                                    </View>
                                </View>

                                {/* Order Items Section */}
                                <Text style={styles.detailSectionTitle}>आज का आर्डर (Order ID: {farmerData?.booking.order_id})</Text>
                                <View style={[styles.detailsContainer, { backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
                                    {farmerData?.booking.items.map((item, index) => {
                                        const isAlreadyCollected = item.status?.toLowerCase() === 'collected';
                                        const isZero = Number(item.quantity) === 0;
                                        return (
                                            <View key={index} style={[styles.detailRow, isZero && { opacity: 0.65 }]}>
                                                <View>
                                                    <Text style={[styles.detailLabel, isZero && { textDecorationLine: 'line-through', color: '#64748B' }]}>
                                                        {item.product}:
                                                    </Text>
                                                    {isAlreadyCollected && !isZero && (
                                                        <Text style={{ fontSize: 10, color: '#059669', fontWeight: 'bold' }}>प्राप्त कर लिया गया ✅</Text>
                                                    )}
                                                    {isZero && (
                                                        <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: 'bold' }}>स्टॉक उपलब्ध नहीं था ❌</Text>
                                                    )}
                                                </View>
                                                <Text style={[styles.detailValue, { color: isZero ? '#DC2626' : (isAlreadyCollected ? '#059669' : COLORS.primary) }]}>
                                                    {item.quantity} बोरी
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                {/* Date Check Warning */}
                                {farmerData && (
                                    (() => {
                                        const todayStr = getISTDate();
                                        const bookingDate = farmerData.farmer.booking_date; // Format YYYY-MM-DD

                                        if (bookingDate && bookingDate !== todayStr) {
                                            return (
                                                <View style={{ backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5', marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ backgroundColor: '#F97316', padding: 6, borderRadius: 10 }}>
                                                        <MaterialCommunityIcons name="calendar-alert" size={20} color="#FFF" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9A3412' }}>गलत तारीख (Invalid Date)</Text>
                                                        <Text style={{ fontSize: 12, color: '#C2410C' }}>इनकी बुकिंग {bookingDate} की है। आप आज वितरण (Collect) नहीं कर सकते।</Text>
                                                    </View>
                                                </View>
                                            );
                                        }
                                        return null;
                                    })()
                                )}
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={resetScanner}
                                >
                                    <Text style={styles.cancelBtnText}>वापस (Back)</Text>
                                </TouchableOpacity>
                                {farmerData?.booking.items.some(i => i.status?.toLowerCase() === 'collected') ? (
                                    <View style={[styles.modalBtn, { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#059669' }]}>
                                        <Text style={{ color: '#059669', fontWeight: 'bold' }}>वितरण हो चुका</Text>
                                    </View>
                                ) : (() => {
                                    const todayStr = getISTDate();
                                    const bookingDate = farmerData?.farmer.booking_date;
                                    const isDateOk = !bookingDate || bookingDate === todayStr;

                                    return (
                                        <TouchableOpacity
                                            style={[styles.modalBtn, styles.proceedBtn, (!isDateOk || !scannedViaCamera) && { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]}
                                            onPress={handleConfirmCollection}
                                            disabled={loading || !isDateOk || !scannedViaCamera}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={[styles.proceedBtnText, (!isDateOk || !scannedViaCamera) && { color: '#94A3B8' }]}>
                                                    {scannedViaCamera ? 'वितरण की पुष्टि करें' : 'पुष्टि के लिए स्कैन करें'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })()}
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>

            {/* Final Alert and Confirm Modals */}
            <Modal visible={confirmModal.visible} transparent animationType="fade" onRequestClose={() => setConfirmModal({ ...confirmModal, visible: false })}>
                <View style={styles.confirmOverlay}>
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
        backgroundColor: '#F8FAFC',
    },
    hubContainer: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
    },
    hubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    hubBackBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    hubTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1E293B',
    },
    retailerSub: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
        marginTop: -2,
    },
    searchSection: {
        marginBottom: 20,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 56,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 12,
    },
    hubSearchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    searchButton: {
        backgroundColor: '#FFF',
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    searchButtonText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 15,
    },
    hubScanCard: {
        borderRadius: 24,
        overflow: 'hidden',
        ...SHADOWS.medium,
        marginBottom: 25,
    },
    hubScanGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    hubScanIconBox: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    hubScanTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    hubScanSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    listHeaderUnified: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
        paddingHorizontal: 2,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    avatarImageMini: {
        width: '100%',
        height: '100%',
    },
    avatarImageLarge: {
        width: '100%',
        height: '100%',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        position: 'absolute',
        top: 40,
        width: '100%',
        zIndex: 100,
    },
    scanHeaderText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 10,
    },
    closeBtnSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanMainContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusedContainer: {
        width: 260,
        height: 260,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    scanLine: {
        height: 3,
        width: '100%',
        backgroundColor: '#7C3AED',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#7C3AED', // Match purple theme
    },
    topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 15 },
    topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 15 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 15 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 15 },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontWeight: 'bold',
    },

    premiumManualBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 30,
        ...SHADOWS.medium,
    },
    manualInputToggleText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    glassManualContainer: {
        width: '85%',
        padding: 24,
        borderRadius: 30,
        marginTop: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    premiumTextInput: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
        padding: 16,
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 16,
    },
    manualInputActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    glassCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    glassSubmitBtn: {
        flex: 1.5,
        backgroundColor: '#7C3AED',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    manualCancelText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    manualSubmitText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    hintTextSmall: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 20,
    },

    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#F9FAFB',
    },
    permissionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
        marginBottom: 30,
    },
    permissionBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 15,
        ...SHADOWS.medium,
    },
    permissionBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: 400,
        overflow: 'hidden',
    },
    modalGradient: {
        padding: 30,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    farmerAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: COLORS.primary,
        overflow: 'hidden', // Fix image overlap/bleeding
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFF',
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#4B2C20',
    },
    modalScroll: {
        maxHeight: 450,
        marginBottom: 10,
    },
    detailSectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.primary,
        marginTop: 20,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    detailsContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        padding: 20,
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    cancelBtnText: {
        fontWeight: 'bold',
        color: '#666',
    },
    proceedBtn: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    proceedBtnText: {
        fontWeight: 'bold',
        color: '#FFF',
    },

    // Confirm Card Styles
    confirmCard: {
        width: width * 0.85,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    confirmIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontWeight: '600',
    },
    confirmActionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    confirmCancelText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#64748b',
    },
    confirmOkBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    confirmOkText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.white,
    },

    bookingListItem: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 15,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    listTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1E293B',
    },
    listSubtitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
        marginTop: -2,
    },
    refreshIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    bookingListTop: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bookingListName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#334155',
    },
    bookingListToken: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '700',
        marginTop: 1,
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginLeft: 10,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    emptyList: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyListText: {
        color: '#94A3B8',
        fontSize: 15,
        fontWeight: '700',
    },
    listLoading: {
        alignItems: 'center',
        marginTop: 40,
        gap: 10,
    },
    listLoadingText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '700',
    }
});
