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
    Animated,
    ImageBackground,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, SHADOWS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';
import { API_ENDPOINTS } from '../../config/config';
import { RetailerLogger } from '../../utils/RetailerLogger';
import BookingListScreen from './BookingListScreen';
import RegistrationListScreen from './RegistrationListScreen';

const { width } = Dimensions.get('window');

interface RequestCounts {
    registrations: { pending: number; approved: number; rejected: number };
    bookings: { pending: number; approved: number; cancelled: number; extended: number; collected: number };
    stock: { urea: number; dap: number; npk: number; mop: number };
    total_farmers: number;
}

export default function ApprovalsScreen({ route, navigation, ...props }: any) {
    const { retailerDetails: contextDetails, counts: contextCounts, refreshData, loading: contextLoading } = useRetailerData();
    const retailerId = props?.retailerId || route?.params?.retailerId || contextDetails?.retailer_id || contextDetails?.id?.toString();
    const retailerDetails = props?.retailerDetails || contextDetails || route?.params?.retailerDetails;
    
    const [currentView, setCurrentView] = useState<'menu' | 'registration' | 'booking'>('menu');
    const [refreshing, setRefreshing] = useState(false);


    const counts = contextCounts || {
        registrations: { pending: 0, approved: 0, rejected: 0 },
        bookings: { pending: 0, approved: 0, cancelled: 0, extended: 0, collected: 0 },
        stock: { urea: 0, dap: 0, npk: 0, mop: 0 },
        total_farmers: 0
    };

    const loading = contextLoading && !contextCounts;
    const isStockUpdated = retailerDetails?.stock_updated_today !== false;



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


    const renderMenuCards = () => (
        <View style={styles.menuContainer}>
            {/* Stock Summary - Improved UI */}
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
                    <Text style={styles.sectionLabelMain}>आज का स्टॉक (बोरी में)</Text>
                </LinearGradient>
                <View style={styles.stockGrid}>
                    <LinearGradient colors={['#E0F2FE', '#BAE6FD']} style={styles.stockCard}>
                        <View style={styles.stockCardHeader}>
                            <Text style={styles.stockLabel}>UREA</Text>
                            <MaterialCommunityIcons name="molecule" size={24} color="#0284c7" />
                        </View>
                        <Text style={styles.stockValue}>{counts.stock.urea}</Text>
                        <Text style={styles.stockUnit}>बोरी उपलब्ध</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.stockCard}>
                        <View style={styles.stockCardHeader}>
                            <Text style={styles.stockLabel}>DAP</Text>
                            <MaterialCommunityIcons name="seed-outline" size={24} color="#059669" />
                        </View>
                        <Text style={styles.stockValue}>{counts.stock.dap}</Text>
                        <Text style={styles.stockUnit}>बोरी उपलब्ध</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#FEFCE8', '#FEF9C3']} style={styles.stockCard}>
                        <View style={styles.stockCardHeader}>
                            <Text style={styles.stockLabel}>NPK</Text>
                            <MaterialCommunityIcons name="sprout-outline" size={24} color="#d97706" />
                        </View>
                        <Text style={styles.stockValue}>{counts.stock.npk}</Text>
                        <Text style={styles.stockUnit}>बोरी उपलब्ध</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.stockCard}>
                        <View style={styles.stockCardHeader}>
                            <Text style={styles.stockLabel}>MOP</Text>
                            <MaterialCommunityIcons name="flask-outline" size={24} color="#7c3aed" />
                        </View>
                        <Text style={styles.stockValue}>{counts.stock.mop}</Text>
                        <Text style={styles.stockUnit}>बोरी उपलब्ध</Text>
                    </LinearGradient>
                </View>
            </View>

            {/* Total Members Strip */}
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

            <LinearGradient 
                colors={['rgba(30, 41, 59, 0.05)', 'rgba(30, 41, 59, 0.01)']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }}
                style={[styles.stockHeaderContainer, { marginTop: 15 }]}
            >
                <View style={[styles.stockHeaderIcon, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="calendar" size={16} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionLabelMain}>आज की गतिविधियां</Text>
            </LinearGradient>

            {/* Main Menu Grid - Today's Only */}
            <View style={[styles.gridRow, { marginTop: 10 }]}>
                <TouchableOpacity
                    style={[styles.menuCard, { flex: 1 }]}
                    onPress={() => setCurrentView('registration')}
                    activeOpacity={0.9}
                >
                    <LinearGradient colors={['#F97316', '#EA580C']} style={styles.gridCardContent}>
                        <View style={styles.gridCardHeaderRow}>
                            <View style={styles.menuIconContainerMini}>
                                <Ionicons name="person-add" size={26} color={COLORS.white} />
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
                                <Ionicons name="cart" size={26} color={COLORS.white} />
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
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                    >
                        {/* Header Section Removed as it's in TopHeader */}
                        <View style={{ height: 10 }} />
                        
                        {renderMenuCards()}
                    </ScrollView>
                </SafeAreaView>
            )}

            {loading && currentView === 'menu' && !refreshing && counts.total_farmers === 0 && counts.registrations.pending === 0 && counts.bookings.pending === 0 ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 15 },
    welcomeText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
    shopText: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
    profileBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
    scrollContent: { paddingBottom: 40 },
    menuContainer: { paddingHorizontal: 15 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    sectionLabelMain: { fontSize: 14, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.8 },
    dashboardSection: { marginBottom: 15 },
    stockHeaderContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12, 
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
    stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
    stockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stockCard: { flex: 1, minWidth: (width - 50) / 2, borderRadius: 18, padding: 15, ...SHADOWS.small, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    stockLabel: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    stockValue: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
    membersStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 12, borderRadius: 18, marginBottom: 15, ...SHADOWS.small, borderLeftWidth: 4, borderLeftColor: '#F97316' },
    membersIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    membersLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },
    membersValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    gridRow: { flexDirection: 'row', gap: 12 },
    menuCard: { borderRadius: 24, overflow: 'hidden', ...SHADOWS.medium },
    gridCardContent: { padding: 16 },
    gridCardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    menuIconContainerMini: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
    gridTitle: { fontSize: 15, fontWeight: '900', color: COLORS.white },
    miniStatsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 8 },
    miniStat: { alignItems: 'center', flex: 1 },
    miniStatVal: { fontSize: 18, fontWeight: '900', color: COLORS.white },
    miniStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '800', textTransform: 'uppercase', marginTop: 1 },
    hintText: { textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 15 },
    stockUnit: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 2 },
    membersBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7' },
    membersBadgeText: { fontSize: 10, color: '#15803D', fontWeight: '800', textTransform: 'uppercase' },
});
