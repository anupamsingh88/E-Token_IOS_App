import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


const { width } = Dimensions.get('window');

export interface DashboardBooking {
    id: string;
    token_number: string;
    qr_code?: string;
    status: string;
    product: string;
    quantity: number;
    shop_name: string;
    booking_date: string;
    total_price?: number;
    retailer_address?: string;
}

interface QRCarouselProps {
    bookings: any[]; // Using any to avoid strict type conflicts for now, or use DashboardBooking
    onPress: (booking: any) => void;
}

const QRCarousel = React.memo(({ bookings, onPress }: QRCarouselProps) => {
    if (!bookings || bookings.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>🎫 आपके टोकन</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={width}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {bookings.map((booking, index) => (
                    <TouchableOpacity
                        key={booking.id || index}
                        style={styles.cardWrapper}
                        onPress={() => onPress(booking)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.card}>
                            <LinearGradient
                                colors={['#ffffff', '#f8f9fa']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={JSON.stringify({
                                        id: booking.id,
                                        token: booking.token_number,
                                        product: booking.product
                                    })}
                                    size={100}
                                    color={COLORS.black}
                                    backgroundColor="transparent"
                                />
                                <Text style={styles.qrLabel}>स्कैन करें</Text>

                                {booking.status && (booking.status === 'Cancelled' || booking.status?.toLowerCase() === 'cancelled') && (
                                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                        <Text style={{ fontSize: 32 }}>❌</Text>
                                        <Text style={{ fontSize: moderateScale(13), color: COLORS.error, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>रद्द किया गया</Text>
                                    </View>
                                )}
                                {booking.status && (booking.status === 'Pending' || booking.status?.toLowerCase() === 'pending') && (
                                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                        <Text style={{ fontSize: 32 }}>⏳</Text>
                                        <Text style={{ fontSize: moderateScale(13), color: COLORS.warning, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>लंबित</Text>
                                    </View>
                                )}
                                {booking.status && (booking.status === 'Collected' || booking.status?.toLowerCase() === 'collected') && (
                                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
                                        <Text style={{ fontSize: 32 }}>✔️</Text>
                                        <Text style={{ fontSize: moderateScale(13), color: COLORS.success, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>प्राप्त</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.infoContainer}>
                                <View style={styles.headerRow}>
                                    <View style={{ flexShrink: 1, marginRight: 4 }}>
                                        <Text style={styles.tokenLabel}>टोकन नंबर</Text>
                                        <Text style={styles.tokenNumber} numberOfLines={1} adjustsFontSizeToFit>{booking.token_number}</Text>
                                    </View>

                                    <View style={[
                                        styles.statusBadge,
                                        (booking.status === 'Collected' || booking.status?.toLowerCase() === 'collected') ? { backgroundColor: COLORS.success + '20' } :
                                            (booking.status === 'Cancelled' || booking.status?.toLowerCase() === 'cancelled') ? { backgroundColor: COLORS.error + '20' } :
                                                (booking.status?.toLowerCase() === 'extended') ? { backgroundColor: '#8B5CF6' + '20' } :
                                                { backgroundColor: COLORS.primary + '20' }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            (booking.status === 'Collected' || booking.status?.toLowerCase() === 'collected') ? { color: COLORS.success } :
                                                (booking.status === 'Cancelled' || booking.status?.toLowerCase() === 'cancelled') ? { color: COLORS.error } :
                                                    (booking.status?.toLowerCase() === 'extended') ? { color: '#7C3AED' } :
                                                    { color: COLORS.primary }
                                        ]}>
                                            {(booking.status === 'Collected' || booking.status?.toLowerCase() === 'collected') ? 'प्राप्त' :
                                                (booking.status === 'Cancelled' || booking.status?.toLowerCase() === 'cancelled') ? 'रद्द' :
                                                    (booking.status === 'Pending' || booking.status?.toLowerCase() === 'pending') ? 'लंबित' :
                                                        (booking.status?.toLowerCase() === 'confirmed' || booking.status?.toLowerCase() === 'approved') ? 'पुष्टि' : 
                                                            (booking.status?.toLowerCase() === 'extended') ? 'विस्तारित' : booking.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>उत्पाद:</Text>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        {booking.items && booking.items.length > 0 ? (
                                            booking.items.map((item: any, idx: number) => (
                                                <Text key={idx} style={styles.detailValue} numberOfLines={1}>
                                                    {item.nameHindi || item.product} ({item.quantity} बोरी)
                                                </Text>
                                            ))
                                        ) : (
                                            <Text style={styles.detailValue}>
                                                {booking.product === 'Urea' ? 'यूरिया' :
                                                    booking.product === 'DAP' ? 'डीएपी' :
                                                        booking.product === 'NPK' ? 'एनपीके' :
                                                            booking.product === 'MOP' ? 'एमओपी' : booking.product} ({booking.quantity} बोरी)
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>तारीख:</Text>
                                    <Text style={styles.detailValue}>{new Date(booking.booking_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>दुकान:</Text>
                                    <Text style={styles.detailValue}>{booking.shop_name}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
});

export default QRCarousel;

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.sm, // Reduced from lg
        marginTop: SPACING.md, // Reduced from xl
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginLeft: SPACING.lg,
        marginBottom: SPACING.md,
    },
    scrollContent: {
        paddingBottom: SPACING.md,
    },
    cardWrapper: {
        width: width, // Exactly full width for perfect paging
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        width: width - (SPACING.lg * 2), // Keep margins on sides visually
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.goldBorder || '#E5E7EB',
        backgroundColor: COLORS.white,
        overflow: 'hidden',
    },
    qrContainer: {
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        marginRight: SPACING.md,
    },
    qrLabel: {
        fontSize: moderateScale(10),
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        marginTop: 4,
        letterSpacing: 1
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    tokenLabel: {
        fontSize: moderateScale(12), // Increased from 10
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2
    },
    tokenNumber: {
        fontSize: moderateScale(22),
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    divider: {
        height: verticalScale(1),
        backgroundColor: COLORS.grayLight,
        marginVertical: 8,
        width: '100%',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: moderateScale(14), // Increased from 12
        color: COLORS.textSecondary,
        width: moderateScale(60),
    },
    detailValue: {
        fontSize: moderateScale(15), // Increased from 12
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    statusBadge: {
        paddingHorizontal: 5, // Reduced from 10
        paddingVertical: 2, // Reduced from 4
        borderRadius: 6,
    },
    statusText: {
        fontSize: moderateScale(12), // Reduced from 12
        fontWeight: 'bold',
    },
});
