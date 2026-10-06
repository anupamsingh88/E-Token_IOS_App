import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Button from './Button/Button';
import { ModernAlert } from './ModernAlert';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';


const { width, height } = Dimensions.get('window');

interface Booking {
    id: string;
    token_number: string;
    status: string;
    product: string;
    quantity: number;
    shop_name: string;
    retailer_address: string;
    booking_date: string;
    total_price?: number;
}

interface BookingDetailModalProps {
    visible: boolean;
    booking: any | null; // using any to accommodate snake_case API response
    onClose: () => void;
}

export default function BookingDetailModal({ visible, booking, onClose }: BookingDetailModalProps) {
    const qrRef = useRef<any>(null);
    const [status, requestPermission] = MediaLibrary.usePermissions();

    // Styled alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>(undefined);

    if (!booking) return null;

    const handleSave = async () => {
        try {
            let permissionStatus = status;

            if (!permissionStatus || permissionStatus.status !== 'granted') {
                permissionStatus = await MediaLibrary.requestPermissionsAsync(true);
            }

            if (permissionStatus.status !== 'granted') {
                setAlertTitle('अनुमति आवश्यक');
                setAlertMessage('QR कोड सेव करने के लिए गैलरी की अनुमति दें।');
                setAlertType('warning');
                setAlertOnOk(undefined);
                setAlertVisible(true);
                return;
            }

            const uri = await captureRef(qrRef, {
                format: 'png',
                quality: 0.8,
            });

            await MediaLibrary.saveToLibraryAsync(uri);

            setAlertTitle('सफलता ✅');
            setAlertMessage('QR कोड आपकी गैलरी में सेव हो गया है!');
            setAlertType('success');
            setAlertOnOk(() => () => {
                setAlertVisible(false);
                onClose(); // Close modal → returns to home screen
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('Error saving QR:', error);
            setAlertTitle('त्रुटि');
            setAlertMessage('QR कोड सेव करने में विफल। कृपया पुनः प्रयास करें।');
            setAlertType('error');
            setAlertOnOk(undefined);
            setAlertVisible(true);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.blurContainer}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                        <ViewShot ref={qrRef} options={{ format: "png", quality: 0.9, result: "tmpfile" }}>
                            <View style={styles.captureArea}>
                                <Text style={styles.headerTitle}>बुकिंग विवरण</Text>

                                <View style={styles.qrSection}>
                                    <View style={styles.qrWrapper}>
                                        <QRCode
                                            value={JSON.stringify({
                                                id: booking.id || booking.booking_id,
                                                token: booking.token_number,
                                                product: booking.product
                                            })}
                                            size={160}
                                            color={COLORS.black}
                                            backgroundColor="transparent"
                                        />

                                        {booking.status === 'Cancelled' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>❌</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: COLORS.error, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>रद्द किया गया</Text>
                                            </View>
                                        )}
                                        {booking.status === 'Pending' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>⏳</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: COLORS.warning, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>लंबित</Text>
                                            </View>
                                        )}
                                        {booking.status === 'Extended' && (
                                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                                <Text style={{ fontSize: 40 }}>⏰</Text>
                                                <Text style={{ fontSize: moderateScale(16), color: '#D97706', fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>विस्तारित</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.tokenLabel}>टोकन नंबर</Text>
                                    <Text style={styles.tokenValue}>{booking.token_number}</Text>
                                </View>

                                <View style={styles.detailsContainer}>
                                    <View style={{ marginBottom: SPACING.md }}>
                                        <Text style={[styles.label, { marginBottom: SPACING.xs }]}>चयनित उर्वरक (Selected Fertilizers):</Text>
                                        {(booking.items && booking.items.length > 0) ? (
                                            booking.items.map((item: any, idx: number) => (
                                                <View key={idx} style={[styles.detailRow, { marginBottom: 4, paddingLeft: 8 }]}>
                                                    <Text style={[styles.value, { flex: 1 }]}>• {item.nameHindi || item.product}</Text>
                                                    <Text style={styles.value}>{item.quantity} बोरी</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.value}>
                                                    {booking.product === 'Urea' ? 'ยूरिया' :
                                                        booking.product === 'DAP' ? 'डीएपी' :
                                                            booking.product === 'NPK' ? 'एनपीके' :
                                                                booking.product === 'MOP' ? 'एमओपी' : booking.product}
                                                </Text>
                                                <Text style={styles.value}>{booking.quantity} बोरी</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.label}>कुल कीमत (Total Price):</Text>
                                        <Text style={[styles.value, { color: COLORS.primary }]}>
                                            ₹{booking.totalPrice || booking.total_price || (booking.price_per_bag && booking.quantity ? booking.price_per_bag * booking.quantity : 'N/A')}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.label}>तारीख (Date):</Text>
                                        <Text style={styles.value}>
                                            {new Date(booking.booking_date || booking.bookingDate).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.label}>स्थिति (Status):</Text>
                                        <Text style={[
                                            styles.value,
                                            {
                                                color: booking.status === 'Collected' ? COLORS.success :
                                                    booking.status === 'Cancelled' ? COLORS.error :
                                                        booking.status === 'Pending' ? COLORS.warning : COLORS.primary
                                            }
                                        ]}>
                                            {booking.status === 'Collected' ? 'प्राप्त' :
                                                booking.status === 'Cancelled' ? 'रद्द' :
                                                    booking.status === 'Pending' ? 'लंबित' :
                                                        booking.status === 'Extended' ? 'विस्तारित' :
                                                            (booking.status === 'Approved' || booking.status === 'Confirmed') ? 'पुष्टि' : booking.status}
                                        </Text>
                                    </View>

                                    <View style={styles.divider} />

                                    <Text style={styles.sectionHeader}>दुकान का विवरण</Text>
                                    <View style={styles.shopDetails}>
                                        <Text style={styles.shopName}>{booking.shop_name}</Text>
                                        <Text style={styles.shopAddress}>{booking.retailer_address}</Text>
                                    </View>
                                </View>
                            </View>
                        </ViewShot>

                        <View style={styles.buttonContainer}>
                            {(() => {
                                const isPending = booking.status === 'Pending';
                                const isCancelled = booking.status === 'Cancelled';
                                const isExtended = booking.status === 'Extended';

                                if (isPending || isCancelled || isExtended) {
                                    return (
                                        <View style={[
                                            styles.saveBtn,
                                            styles.statusBtn,
                                            isPending ? { backgroundColor: '#FEF9C3', borderColor: COLORS.warning } :
                                                isExtended ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' } :
                                                    { backgroundColor: '#FEE2E2', borderColor: COLORS.error },
                                        ] as any}>
                                            <Text style={[
                                                styles.statusBtnText,
                                                isPending ? { color: COLORS.warning } :
                                                    isExtended ? { color: '#D97706' } :
                                                        { color: COLORS.error },
                                            ]}>
                                                {isPending ? '⏳ लंबित' : isExtended ? '⏰ विस्तारित' : '❌ रद्द किया गया'}
                                            </Text>
                                        </View>
                                    );
                                }

                                return (
                                    <Button
                                        title=" डिवाइस में सेव करें"
                                        onPress={handleSave}
                                        style={styles.saveBtn}
                                        icon={<Ionicons name="download-outline" size={20} color={COLORS.white} />}
                                    />
                                );
                            })()}
                        </View>
                    </ScrollView>
                </View>
            </View>

            {/* Styled Alert for Save Feedback */}
            <ModernAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                onClose={() => {
                    setAlertVisible(false);
                    if (alertOnOk) alertOnOk();
                }}
                buttons={[{
                    text: 'ठीक है',
                    onPress: () => {
                        if (alertOnOk) alertOnOk();
                        else setAlertVisible(false);
                    },
                    style: 'default',
                }]}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: isTablet ? SPACING.xxl : SPACING.md,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '90%',
        maxWidth: isTablet ? 540 : 380,
        maxHeight: height * 0.85,
        backgroundColor: COLORS.white,
        borderRadius: isTablet ? 28 : BORDER_RADIUS.xl,
        ...SHADOWS.large,
        overflow: 'hidden',
    },
    scrollContent: {
        flexGrow: 1,
    },
    captureArea: {
        backgroundColor: COLORS.white,
        padding: SPACING.xl,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        zIndex: 10,
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: BORDER_RADIUS.round,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
        marginTop: SPACING.sm, // space for close btn
    },
    qrSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    qrWrapper: {
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.grayLight,
        marginBottom: SPACING.sm,
        position: 'relative',
    },
    tokenLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    tokenValue: {
        fontSize: moderateScale(28),
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 4,
        letterSpacing: 2,
    },
    detailsContainer: {
        width: '100%',
        backgroundColor: '#f8f9fa',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    value: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: 'bold',
    },
    divider: {
        height: verticalScale(1),
        backgroundColor: '#dee2e6',
        marginVertical: SPACING.md,
    },
    sectionHeader: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    shopDetails: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    shopName: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    shopAddress: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    saveBtn: {
        width: '100%',
    },
    statusBtn: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBtnText: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
        alignItems: 'center',
    }
});
