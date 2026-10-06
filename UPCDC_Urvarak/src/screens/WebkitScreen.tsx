import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
    Platform,
    StatusBar,
    Modal,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Svg, { Path, Circle } from 'react-native-svg';
import { UPCDC_PORTAL_URL } from '../config/config';

// Custom SVG Icons
const BackIcon = ({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const RefreshIcon = ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const LogoutIcon = ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ExitWarningIcon = ({ size = 36, color = '#ef4444' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <Path d="M12 8v4M12 16h.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
);

interface WebkitScreenProps {
    route: {
        params: {
            url?: string;
            postData?: {
                submit?: string;
                username: string;
                userpwd: string;
            };
            username?: string;
        };
    };
    navigation: any;
}

export default function WebkitScreen({ route, navigation }: WebkitScreenProps) {
    const { url = UPCDC_PORTAL_URL, postData, username } = route.params || {};
    const webViewRef = useRef<WebView>(null);

    const [canGoBack, setCanGoBack] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Direct native POST submission to index_1.php
    const initialSource = useRef(() => {
        const targetUrl = url || UPCDC_PORTAL_URL;
        if (postData && postData.username && postData.userpwd) {
            const body = `submit=${encodeURIComponent(postData.submit || 'submit')}&username=${encodeURIComponent(postData.username)}&userpwd=${encodeURIComponent(postData.userpwd)}&is_from_app=1`;
            return {
                uri: targetUrl,
                method: 'POST' as const,
                body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };
        }
        return { uri: targetUrl };
    }).current();

    // Trigger custom exit modal
    const handleExit = useCallback(() => {
        setShowExitModal(true);
    }, []);

    // Handle hardware back button on Android
    useEffect(() => {
        const onBackPress = () => {
            if (showExitModal) {
                setShowExitModal(false);
                return true;
            }
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            handleExit();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [canGoBack, showExitModal, handleExit]);

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        setCanGoBack(navState.canGoBack);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#062347" />

            {/* Custom Modern Header */}
            <View style={styles.header}>
                <View style={styles.leftControls}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            if (canGoBack && webViewRef.current) {
                                webViewRef.current.goBack();
                            } else {
                                handleExit();
                            }
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <BackIcon size={20} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                UPCDC पोर्टल
                            </Text>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>लाइव</Text>
                            </View>
                        </View>
                        {username ? (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>
                                {username}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.rightControls}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => webViewRef.current?.reload()}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <RefreshIcon size={18} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.iconButton, styles.logoutButton]}
                        onPress={handleExit}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <LogoutIcon size={18} color="#fca5a5" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Modern Gradient Progress Bar */}
            {isLoading && loadingProgress < 1 ? (
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${Math.max(loadingProgress * 100, 15)}%` }]} />
                </View>
            ) : null}

            {/* WebView Container */}
            <View style={styles.webviewWrapper}>
                <WebView
                    ref={webViewRef}
                    source={initialSource}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    sharedCookiesEnabled={true}
                    thirdPartyCookiesEnabled={true}
                    allowsBackForwardNavigationGestures={true}
                    originWhitelist={['*']}
                    cacheEnabled={true}
                    onLoadProgress={({ nativeEvent }) => {
                        setLoadingProgress(nativeEvent.progress);
                        if (nativeEvent.progress >= 1) {
                            setIsLoading(false);
                        }
                    }}
                    onLoadStart={() => {
                        setIsLoading(true);
                        setHasError(false);
                    }}
                    onLoadEnd={() => {
                        setIsLoading(false);
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn('WebView error: ', nativeEvent);
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    onNavigationStateChange={handleNavigationStateChange}
                />

                {/* Error Fallback */}
                {hasError && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIconWrap}>
                            <ExitWarningIcon size={44} color="#ef4444" />
                        </View>
                        <Text style={styles.errorTitle}>पेज लोड करने में समस्या हुई</Text>
                        <Text style={styles.errorMessage}>
                            कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => webViewRef.current?.reload()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryButtonText}>पुनः प्रयास करें</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleExit}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>लॉगिन स्क्रीन पर वापस जाएं</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Custom Modern Exit/Logout Modal (Replaces Plain OS Alert) */}
            <Modal
                visible={showExitModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowExitModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconCircle}>
                            <ExitWarningIcon size={34} color="#ef4444" />
                        </View>

                        <Text style={styles.modalTitle}>पोर्टल से बाहर निकलें?</Text>
                        <Text style={styles.modalDescription}>
                            क्या आप UPCDC पोर्टल से बाहर निकलकर मुख्य लॉगिन स्क्रीन पर वापस जाना चाहते हैं?
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowExitModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalCancelBtnText}>रद्द करें</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={() => {
                                    setShowExitModal(false);
                                    navigation.replace('RetailerLogin');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalConfirmBtnText}>हाँ, बाहर निकलें</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#062347',
    },
    header: {
        height: 58,
        backgroundColor: '#062347',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    titleContainer: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.4)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginRight: 4,
    },
    liveText: {
        color: '#86efac',
        fontSize: 10,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#93c5fd',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    logoutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    progressBarBackground: {
        height: 3,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    progressBarFill: {
        height: 3,
        backgroundColor: '#ff930f',
    },
    webviewWrapper: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    webview: {
        flex: 1,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    retryButton: {
        backgroundColor: '#062347',
        paddingVertical: 13,
        paddingHorizontal: 28,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelButtonText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
    },

    // Custom Exit Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(3, 15, 30, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#fee2e2',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '600',
    },
    modalConfirmBtn: {
        flex: 1.2,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    modalConfirmBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
});
