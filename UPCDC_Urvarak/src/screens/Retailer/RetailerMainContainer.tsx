import { apiFetch } from '../../utils/apiClient';
import React, { useState, useEffect, useCallback } from 'react';
import { useRetailerData } from '../../contexts/RetailerDataContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform, BackHandler, Alert, AppState, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Screens
import ScanScreen from './ScanScreen';
import StockRequestScreen from './StockRequestScreen';
import ApprovalsScreen from './ApprovalsScreen';
import SuggestionScreen from './SuggestionScreen';
import SetupModal from '../../components/SetupModal';
import { API_ENDPOINTS } from '../../config/config';
import TopHeader from '../../components/TopHeader';
import ParticleBackground from '../../components/ParticleBackground';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import HeaderDropdown from '../../components/HeaderDropdown';
import DailyFertilizerUpdateModal from '../../components/DailyFertilizerUpdateModal';
import RetailerProfileScreen from './RetailerProfileScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RetailerMainContainer({
    onLogout,
    retailerId,
    setupRequired,
    onSetupComplete
}: {
    onLogout?: () => void,
    retailerId: string | null,
    setupRequired: boolean,
    onSetupComplete: () => void
}) {
    const { retailerDetails, refreshData, counts } = useRetailerData();
    const [activeTab, setActiveTab] = useState('Home');
    const [showSetup, setShowSetup] = useState(setupRequired);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDailyUpdate, setShowDailyUpdate] = useState(false);
    const [dailyUpdateCompletedLocal, setDailyUpdateCompletedLocal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
    const retailerName = retailerDetails?.name || 'रिटेलर';

    // const { isAppLockEnabled, toggleAppLock } = useSecurity(); (Security removed)
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (retailerId) {
            refreshData(retailerId);
        }

        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active' && retailerId) {
                refreshData(retailerId);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        const interval = setInterval(() => {
            if (retailerId) refreshData(retailerId);
        }, 60000);

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, [retailerId]);

    useEffect(() => {
        if (retailerDetails) {
            checkDailyUpdate(retailerDetails);
        }
    }, [retailerDetails]);

    const checkDailyUpdate = async (details: any) => {
        // Use the flag directly from backend to sync across devices
        if (details && details.stock_updated_today === false && !setupRequired && !dailyUpdateCompletedLocal) {
            // Only show if not already updated today (checked via DB)
            setTimeout(() => setShowDailyUpdate(true), 1000);
        }
    };

    const handleDailyUpdateComplete = async () => {
        setDailyUpdateCompletedLocal(true);
        setShowDailyUpdate(false);
        if (retailerId) refreshData(retailerId);
    };

    useEffect(() => {
        const backAction = () => {
            if (isMenuOpen) {
                setIsMenuOpen(false);
                return true;
            }
            if (showProfile) {
                setShowProfile(false);
                return true;
            }
            if (showSettings) {
                setShowSettings(false);
                return true;
            }
            if (activeTab !== 'Home') {
                setActiveTab('Home');
                return true;
            }

            setConfirmModal({
                visible: true,
                title: 'ऐप बंद करें',
                message: 'क्या आप ऐप से बाहर निकलना चाहते हैं?',
                onConfirm: () => BackHandler.exitApp()
            });
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [isMenuOpen, showProfile, showSettings, activeTab]);

    /* Security Prompt Removed as per user request
    const checkAppLockPrompt = async () => { ... }
    */

    if (!retailerId) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const currentRetailerId = retailerId;

    const renderContent = () => {
        if (showProfile) {
            return (
                <RetailerProfileScreen
                    retailerName={retailerName}
                    retailerId={currentRetailerId}
                    onLogout={() => {
                        onLogout?.();
                    }}
                />
            );
        }

        if (showSettings) {
            return (
                <View style={styles.settingsContent}>
                    <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.backBtnInline}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                        <Text style={styles.backBtnText}>वापस (Back)</Text>
                    </TouchableOpacity>
                    <View style={styles.settingsBody}>
                        <Text style={styles.settingsTitle}>सेटिंग्स और गोपनीयता</Text>
                        <TouchableOpacity style={styles.settingRow}>
                            <Ionicons name="lock-closed-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.settingRowText}>पासवर्ड बदलें (Change Password)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingRow}>
                            <Ionicons name="help-buoy-outline" size={24} color="#f59e0b" />
                            <Text style={styles.settingRowText}>सहायता (Help)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        switch (activeTab) {
            case 'Home':
                return <ApprovalsScreen key="approvals-screen" retailerId={currentRetailerId} retailerDetails={retailerDetails} />;
            case 'Stock':
                return <StockRequestScreen onBack={() => setActiveTab('Home')} retailerId={currentRetailerId} retailerName={retailerName} />;
            case 'Scan':
                return <ScanScreen onClose={() => setActiveTab('Home')} retailerName={retailerName} retailerId={currentRetailerId} />;
            case 'Suggestions':
                return <SuggestionScreen retailerName={retailerName} />;
            default:
                return <ApprovalsScreen retailerId={retailerId || undefined} retailerDetails={retailerDetails} />;
        }
    };

    const handleBack = () => {
        if (showProfile) setShowProfile(false);
        else if (showSettings) setShowSettings(false);
    };

    return (
        <ParticleBackground>
            <View style={[styles.container, (showProfile || showSettings) && { backgroundColor: '#FFF7ED' }]}>
                <TopHeader
                    retailerName={retailerName}
                    onMenuPress={() => setIsMenuOpen(!isMenuOpen)}
                    showBack={showProfile || showSettings}
                    onBack={handleBack}
                />
                <View style={styles.content}>
                    {renderContent()}
                </View>

                <View style={[
                    styles.tabBar,
                    { paddingBottom: Math.max(insets.bottom, 20) }
                ]}>
                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => {
                            setActiveTab('Home');
                            setShowProfile(false);
                            setShowSettings(false);
                        }}
                    >
                        <Ionicons
                            name={activeTab === 'Home' ? "home" : "home-outline"}
                            size={26}
                            color={activeTab === 'Home' ? COLORS.primary : '#64748b'}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'Home' && styles.activeLabel]}>होम (अनुरोध)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => {
                            setActiveTab('Scan');
                            setShowProfile(false);
                            setShowSettings(false);
                        }}
                    >
                        <View style={styles.scanInner}>
                            <Ionicons name="scan" size={28} color="#FFF" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => {
                            setActiveTab('Stock');
                            setShowProfile(false);
                            setShowSettings(false);
                        }}
                    >
                        <MaterialCommunityIcons
                            name={activeTab === 'Stock' ? "package-variant" : "package-variant-closed"}
                            size={28}
                            color={activeTab === 'Stock' ? COLORS.primary : '#64748b'}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'Stock' && styles.activeLabel]}>खाद अनुरोध</Text>
                    </TouchableOpacity>
                </View>

                <SetupModal
                    visible={showSetup}
                    retailerId={retailerId || ''}
                    onComplete={() => {
                        setShowSetup(false);
                        onSetupComplete();
                    }}
                />

                <DailyFertilizerUpdateModal
                    visible={showDailyUpdate}
                    retailerId={currentRetailerId}
                    onComplete={handleDailyUpdateComplete}
                />

                <HeaderDropdown
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    retailerName={retailerName}
                    onProfilePress={() => {
                        setShowProfile(true);
                        setShowSettings(false);
                    }}
                    onSettingsPress={() => {
                        setShowSettings(true);
                        setShowProfile(false);
                    }}
                />

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
            </View>
        </ParticleBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    mainContent: {
        flex: 1,
    },
    settingsContent: {
        flex: 1,
        padding: 20,
    },
    backBtnInline: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 20,
    },
    backBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    settingsBody: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 30,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 18,
        borderRadius: 20,
        marginBottom: 15,
        ...SHADOWS.small,
    },
    settingRowText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginLeft: 15,
    },
    content: {
        flex: 1,
    },
    tabBar: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
    },
    tabLabel: {
        fontSize: 12,
        marginTop: 4,
        color: '#64748b',
        fontWeight: '600',
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: '900',
    },
    scanButton: {
        width: 65,
        height: 65,
        backgroundColor: COLORS.primary,
        borderRadius: 33,
        marginTop: -35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 5,
        borderColor: '#FFF',
        ...SHADOWS.large,
    },
    scanInner: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
