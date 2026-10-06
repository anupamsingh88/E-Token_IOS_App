import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform,
    Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import ViewShot from "react-native-view-shot";
import { Ionicons } from '@expo/vector-icons'; // Using standard Expo icon
import { Card, Button, ModernAlert } from '../../components';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    HINDI_TEXT,
    BORDER_RADIUS,
    SHADOWS,
} from '../../constants';
import { Booking } from '../../types';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';


interface TokenQRScreenProps {
    booking: Booking;
    onBackToDashboard: () => void;
    onSaveQR?: () => void;
}

export default function TokenQRScreen({
    booking,
    onBackToDashboard,
    onSaveQR,
}: TokenQRScreenProps) {
    const insets = useSafeAreaInsets();
    const qrRef = useRef<any>(null);

    // Styled alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>(undefined);

    console.log('📱 TokenQRScreen received booking:', JSON.stringify(booking, null, 2));

    if (!booking) {
        return (
            <LinearGradient colors={[COLORS.backgroundLight, COLORS.background]} style={styles.container}>
                <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: moderateScale(18), color: COLORS.error }}>Error: No booking data found</Text>
                        <Button title="Back to Home" onPress={onBackToDashboard} style={{ marginTop: 20 }} />
                    </View>
                </View>
            </LinearGradient>
        );
    }

    const [status, requestPermission] = MediaLibrary.usePermissions();

    const handleShare = async () => {
        try {
            const uri = await captureRef(qrRef, {
                format: 'png',
                quality: 0.8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                setAlertTitle('त्रुटि');
                setAlertMessage('इस डिवाइस पर शेयर करना उपलब्ध नहीं है।');
                setAlertType('error');
                setAlertOnOk(undefined);
                setAlertVisible(true);
            }
        } catch (error) {
            console.error('Error sharing QR:', error);
            setAlertTitle('त्रुटि');
            setAlertMessage('QR कोड शेयर करने में विफल।');
            setAlertType('error');
            setAlertOnOk(undefined);
            setAlertVisible(true);
        }
    };

    const handleSave = async () => {
        try {
            let permissionStatus = status;

            if (!permissionStatus || permissionStatus.status !== 'granted') {
                permissionStatus = await requestPermission();
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
                onBackToDashboard(); // Redirect to home screen
            });
            setAlertVisible(true);

            if (onSaveQR) onSaveQR();

        } catch (error) {
            console.error('Error saving QR:', error);
            setAlertTitle('त्रुटि');
            setAlertMessage('QR कोड सेव करने में विफल। कृपया पुनः प्रयास करें।');
            setAlertType('error');
            setAlertOnOk(undefined);
            setAlertVisible(true);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (time: string) => {
        return time;
    };

    const bookingStatus = (booking as any).status;
    const token = booking.tokenNumber || (booking as any).token_number;
    const hasValidToken = !!token && token !== 'PENDING';
    const isPending = bookingStatus === 'Pending';
    const isCancelled = bookingStatus === 'Cancelled';
    const hasQR = !isCancelled && hasValidToken;

    return (
        <View style={styles.container}>
            <View style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.md) + 10 }]}>
                        <View style={[
                            styles.successIcon,
                            isCancelled && { backgroundColor: '#FEE2E2' },
                            isPending && { backgroundColor: '#FEF3C7' },
                        ]}>
                            <Ionicons
                                name={isCancelled ? 'close-circle' : isPending ? 'checkmark-circle' : 'checkmark-circle'}
                                size={80}
                                color={isCancelled ? COLORS.error : isPending ? '#D97706' : COLORS.success}
                            />
                        </View>
                        <Text style={[
                            styles.title,
                            isCancelled && { color: COLORS.error },
                            isPending && { color: '#D97706' },
                        ]}>
                            {isCancelled ? 'बुकिंग रद्द की गई' : isPending ? 'बुकिंग अनुरोध दर्ज हुआ' : HINDI_TEXT.bookingConfirmed}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isCancelled
                                ? 'यह बुकिंग रद्द हो चुकी है'
                                : isPending
                                    ? 'आपका टोकन नंबर जनरेट हो गया है'
                                    : 'आपकी बुकिंग सफलतापूर्वक पूर्ण हो गई है'}
                        </Text>
                    </View>

                    {/* CAPTURE ZONE: Token & QR Only */}
                    {hasQR ? (
                        <ViewShot ref={qrRef} options={{ format: "png", quality: 0.9, result: "tmpfile" }}>
                            <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12 }}>
                                {/* Token Number */}
                                <Card style={{ ...styles.tokenCard, marginBottom: 16, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: '#eee' } as any}>
                                    <Text style={styles.tokenLabel}>आपका टोकन नंबर</Text>
                                    <Text style={styles.tokenNumber}>{token}</Text>
                                    <Text style={styles.tokenHint}>
                                        यह नंबर दुकानदार को दिखाएं
                                    </Text>
                                </Card>

                                {/* QR Code */}
                                <Card style={{ ...styles.qrCard, marginBottom: 0, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: '#eee' } as any}>
                                    <Text style={styles.qrLabel}>QR कोड</Text>
                                    <View style={styles.qrContainer}>
                                        <QRCode
                                            value={typeof booking.qrCode === 'string' && booking.qrCode !== 'PENDING' ? booking.qrCode : (token || 'TKN-000001')}
                                            size={200}
                                            color={COLORS.primary}
                                            backgroundColor={COLORS.white}
                                        />
                                    </View>
                                    <Text style={styles.qrHint}>
                                        दुकान पर यह QR कोड स्कैन करवाएं
                                    </Text>
                                </Card>

                                {isPending && (
                                    <View style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FEF3C7', borderRadius: 8, alignItems: 'center' }}>
                                        <Text style={{ fontSize: moderateScale(13), color: '#D97706', fontWeight: 'bold' }}>
                                            स्थिति: अनुमोदन लंबित (Pending Approval)
                                        </Text>
                                    </View>
                                )}

                                {/* App Branding Footer for Image */}
                                <Text style={{ textAlign: 'center', marginTop: 12, color: COLORS.textSecondary, fontSize: 10 }}>
                                    UP Fertilizer Management System
                                </Text>
                            </View>
                        </ViewShot>
                    ) : (
                        /* Status Badge for Pending/Cancelled without Token */
                        <View style={[
                            styles.statusBadgeContainer,
                            isPending && { backgroundColor: '#FEF3C7', borderColor: COLORS.warning },
                            isCancelled && { backgroundColor: '#FEE2E2', borderColor: COLORS.error },
                        ] as any}>
                            <Text style={{ fontSize: moderateScale(48), marginBottom: 8 }}>
                                {isPending ? '⏳' : '❌'}
                            </Text>
                            <Text style={[
                                styles.statusBadgeText,
                                isPending && { color: COLORS.warning },
                                isCancelled && { color: COLORS.error }
                            ] as any}>
                                {isPending ? 'लंबित (Pending)' : 'रद्द किया गया (Cancelled)'}
                            </Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: 4 }}>
                                {isPending
                                    ? 'टोकन नंबर और QR कोड पुष्टि होने के बाद उपलब्ध होगा'
                                    : 'यह बुकिंग रद्द कर दी गई है'}
                            </Text>
                        </View>
                    )}

                    {/* Booking Details - OUTSIDE capture */}
                    <Card style={{ ...styles.detailsCard, marginTop: 24 } as any}>
                        <Text style={styles.detailsTitle}>बुकिंग का विवरण</Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📅 तारीख:</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(booking.bookingDate)}
                            </Text>
                        </View>

                        {booking.timeSlot ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>⏰ समय:</Text>
                                <Text style={styles.detailValue}>
                                    {formatTime(booking.timeSlot.startTime)} -{' '}
                                    {formatTime(booking.timeSlot.endTime)}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>⏰ स्लॉट:</Text>
                                <Text style={styles.detailValue}>
                                    पूरा दिन (Open Slot)
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🌱 उर्वरक & मात्रा:</Text>
                            <View style={{ flex: 1 }}>
                                {booking.items ? (
                                    booking.items.map((item, index) => (
                                        <View key={index} style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                                            <Text style={styles.detailValue}>
                                                {item.nameHindi || item.name} ({item.quantity} बोरी)
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                                        <Text style={styles.detailValue}>
                                            {(booking as any).product} ({(booking as any).quantity} बोरी)
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>💰 कुल मूल्य:</Text>
                            <Text style={[styles.detailValue, { color: COLORS.primary }]}>
                                ₹{booking.totalPrice || (booking as any).total_price || (booking.items ? booking.items.reduce((sum: number, it: any) => sum + ((it.price_per_bag || 0) * (it.quantity || 0)), 0) : 'N/A')}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>🏪 दुकान:</Text>
                            <Text style={styles.detailValue}>
                                {(booking as any).shopName || (booking as any).retailer_name || booking.retailerId}
                            </Text>
                        </View>
                    </Card>

                    {/* Important Instructions */}
                    <Card style={[styles.instructionCard, styles.warningCard] as any}>
                        <Text style={styles.instructionTitle}>⚠️ महत्वपूर्ण निर्देश</Text>
                        <Text style={styles.instructionText}>
                            • निर्धारित समय पर ही दुकान पर पहुंचें
                        </Text>
                        <Text style={styles.instructionText}>
                            • अपना टोकन नंबर या QR कोड साथ रखें
                        </Text>
                        <Text style={styles.instructionText}>
                            • आधार कार्ड साथ लेकर आएं
                        </Text>
                        <Text style={styles.instructionText}>
                            • उर्वरक की रसीद जरूर लें
                        </Text>
                    </Card>

                    {/* Action Buttons */}
                    <View style={[styles.buttonContainer, { marginTop: SPACING.xl }]}>
                        {hasQR && (
                            <>
                                <Button
                                    title={HINDI_TEXT.saveQR}
                                    onPress={handleSave}
                                    size="large"
                                    variant="secondary"
                                    style={styles.button}
                                />

                                <Button
                                    title="शेयर करें 📤"
                                    onPress={handleShare}
                                    size="medium"
                                    variant="outline"
                                    style={styles.button}
                                />
                            </>
                        )}

                        <Button
                            title="डैशबोर्ड पर जाएं"
                            onPress={onBackToDashboard}
                            size="medium"
                            variant="outline"
                        />
                    </View>
                </ScrollView>
            </View>

            {/* Styled Alert for Save/Share Feedback */}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    successIcon: {
        width: moderateScale(100),
        height: verticalScale(100),
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 4,               // Added thicker border for "badge" look
        borderColor: COLORS.white,   // White border
        ...SHADOWS.medium,            // Added shadow
    },
    // successEmoji removed
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.success,
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    tokenCard: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
        backgroundColor: '#FFF3E0',
    },
    tokenLabel: {
        fontSize: FONT_SIZES.md,
        color: '#E65100',
        marginBottom: SPACING.sm,
    },
    tokenNumber: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#E65100',
        marginBottom: SPACING.sm,
        letterSpacing: 4,
    },
    tokenHint: {
        fontSize: FONT_SIZES.sm,
        color: '#F57C00',
        fontStyle: 'italic',
        textAlign: 'center',       // Center align
        paddingHorizontal: SPACING.md, // Prevent edge clipping
        flexWrap: 'wrap',          // Ensure text wraps
    },
    qrCard: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    qrLabel: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    qrContainer: {
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        ...SHADOWS.medium,
    },
    qrHint: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.lg,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    detailsCard: {
        marginBottom: SPACING.lg,
    },
    detailsTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayLight,
    },
    detailLabel: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        flex: 1,
    },
    detailValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    instructionCard: {
        marginBottom: SPACING.xl,
    },
    warningCard: {
        backgroundColor: '#FEF3C7',
    },
    instructionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    instructionText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        lineHeight: 24,
    },
    buttonContainer: {
        gap: SPACING.md,
    },
    statusBadgeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.warning,
        backgroundColor: '#FEF3C7',
        ...SHADOWS.small,
    },
    statusBadgeText: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        textAlign: 'center',
        color: COLORS.warning,
    },
    button: {
        marginBottom: SPACING.sm,
    },
});
