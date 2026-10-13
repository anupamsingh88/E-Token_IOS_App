import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    PanResponder,
    Image,
    ActivityIndicator,
    Platform,
    StatusBar,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../config/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DocumentViewerModalProps {
    visible: boolean;
    onClose: () => void;
    documents?: string | string[] | null;
    title?: string;
    farmerName?: string;
    initialIndex?: number;
}

export default function DocumentViewerModal({
    visible,
    onClose,
    documents,
    title = 'दस्तावेज़',
    farmerName,
    initialIndex = 0,
}: DocumentViewerModalProps) {
    // 1. Parse & Normalize Document URLs
    const parseDocuments = useCallback((): string[] => {
        if (!documents) return [];
        let list: string[] = [];
        if (Array.isArray(documents)) {
            list = documents;
        } else if (typeof documents === 'string') {
            list = documents
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return list.map((item) => {
            if (item.startsWith('http://') || item.startsWith('https://')) {
                return item;
            }
            const cleanPath = item.startsWith('/') ? item.substring(1) : item;
            return `${API_BASE_URL}/${cleanPath}`;
        });
    }, [documents]);

    const docList = parseDocuments();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

    // Zoom state
    const [zoomLevelPercent, setZoomLevelPercent] = useState(100);

    // Animated values for Image Pan & Zoom
    const scale = useRef(new Animated.Value(1)).current;
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // Synchronous refs for 60fps tracking
    const currentScaleRef = useRef(1);
    const currentPanRef = useRef({ x: 0, y: 0 });
    const isPinchingRef = useRef(false);
    const initialDistanceRef = useRef(0);
    const initialScaleRef = useRef(1);
    const initialPanRef = useRef({ x: 0, y: 0 });
    const initialMidRef = useRef({ x: 0, y: 0 });
    const lastTouchRef = useRef({ x: 0, y: 0 });
    const lastTapTimeRef = useRef(0);

    // PDF specific state
    const [pdfZoom, setPdfZoom] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);
    const webViewRef = useRef<WebView>(null);

    // Keep scale and pan refs in sync with Animated values
    useEffect(() => {
        const scaleListener = scale.addListener((v) => {
            currentScaleRef.current = v.value;
            setZoomLevelPercent(Math.round(v.value * 100));
        });
        const panListener = pan.addListener((v) => {
            currentPanRef.current = v;
        });

        return () => {
            scale.removeListener(scaleListener);
            pan.removeListener(panListener);
        };
    }, [scale, pan]);

    // Reset transformations when changing document or closing
    const resetTransformations = useCallback(() => {
        scale.setValue(1);
        pan.setValue({ x: 0, y: 0 });
        currentScaleRef.current = 1;
        currentPanRef.current = { x: 0, y: 0 };
        isPinchingRef.current = false;
        initialDistanceRef.current = 0;
        setRotation(0);
        setZoomLevelPercent(100);
        setPdfZoom(1);
        setImageLoading(true);
        setImageError(false);
        setPdfLoading(true);
        setPdfError(false);
    }, [scale, pan]);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(Math.min(initialIndex, Math.max(0, docList.length - 1)));
            resetTransformations();
        }
    }, [visible, initialIndex, docList.length, resetTransformations]);

    const currentDocUrl = docList[currentIndex] || '';
    const isPdf = Boolean(
        currentDocUrl &&
        (currentDocUrl.toLowerCase().split('?')[0].endsWith('.pdf') ||
            currentDocUrl.toLowerCase().includes('.pdf'))
    );

    // Calculate Google Docs viewer URL for PDF
    const getPdfViewerUrl = useCallback((url: string) => {
        if (Platform.OS === 'ios') {
            return url; // iOS WKWebView natively displays PDFs
        }
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }, []);

    // Distance calculation between touches for pinch-to-zoom
    const calcDistance = (touches: any[]) => {
        if (!touches || touches.length < 2) return 0;
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Smooth Animated Scale & Pan helper (keeps ref & state 100% in sync)
    const animateToScale = (targetScale: number, resetPan: boolean = false) => {
        const clampedScale = Math.max(1.0, Math.min(targetScale, 4.0));
        currentScaleRef.current = clampedScale;
        setZoomLevelPercent(Math.round(clampedScale * 100));

        const anims: Animated.CompositeAnimation[] = [
            Animated.spring(scale, {
                toValue: clampedScale,
                useNativeDriver: false,
                friction: 7,
                tension: 40,
            }),
        ];

        if (resetPan || clampedScale <= 1.0) {
            currentPanRef.current = { x: 0, y: 0 };
            anims.push(
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                    friction: 7,
                    tension: 40,
                })
            );
        }

        Animated.parallel(anims).start();
    };

    // PanResponder for Image Multi-Touch Pinch Zoom & Pan
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,

            onPanResponderGrant: (evt) => {
                const touches = evt.nativeEvent.touches;
                const now = Date.now();

                // Double tap handling (single touch, tap interval < 300ms)
                if (touches && touches.length === 1 && now - lastTapTimeRef.current < 300) {
                    lastTapTimeRef.current = 0;
                    if (currentScaleRef.current > 1.15) {
                        // Already zoomed in -> Zoom OUT to 100%
                        animateToScale(1.0, true);
                    } else {
                        // At 100% -> Zoom IN to 200%
                        animateToScale(2.0, false);
                    }
                    return;
                }
                lastTapTimeRef.current = now;

                if (touches && touches.length >= 2) {
                    isPinchingRef.current = true;
                    initialDistanceRef.current = calcDistance(touches);
                    initialScaleRef.current = currentScaleRef.current;
                    initialMidRef.current = {
                        x: (touches[0].pageX + touches[1].pageX) / 2,
                        y: (touches[0].pageY + touches[1].pageY) / 2,
                    };
                    initialPanRef.current = { ...currentPanRef.current };
                } else if (touches && touches.length === 1) {
                    isPinchingRef.current = false;
                    initialDistanceRef.current = 0;
                    lastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
                    initialPanRef.current = { ...currentPanRef.current };
                }
            },

            onPanResponderMove: (evt) => {
                const touches = evt.nativeEvent.touches;

                if (touches && touches.length >= 2) {
                    const dist = calcDistance(touches);
                    if (dist <= 0) return;

                    // If second finger just touched down during move, initialize pinch
                    if (!isPinchingRef.current || initialDistanceRef.current <= 0) {
                        isPinchingRef.current = true;
                        initialDistanceRef.current = dist;
                        initialScaleRef.current = currentScaleRef.current;
                        initialMidRef.current = {
                            x: (touches[0].pageX + touches[1].pageX) / 2,
                            y: (touches[0].pageY + touches[1].pageY) / 2,
                        };
                        initialPanRef.current = { ...currentPanRef.current };
                        return;
                    }

                    const factor = dist / initialDistanceRef.current;
                    let targetScale = initialScaleRef.current * factor;
                    // Clamp scale between 0.8 and 4.0 during active pinch
                    targetScale = Math.max(0.8, Math.min(targetScale, 4.0));

                    currentScaleRef.current = targetScale;
                    scale.setValue(targetScale);
                    setZoomLevelPercent(Math.round(targetScale * 100));

                    // Pan follows pinch midpoint
                    const currentMidX = (touches[0].pageX + touches[1].pageX) / 2;
                    const currentMidY = (touches[0].pageY + touches[1].pageY) / 2;
                    const panDx = currentMidX - initialMidRef.current.x;
                    const panDy = currentMidY - initialMidRef.current.y;
                    const nextX = initialPanRef.current.x + panDx;
                    const nextY = initialPanRef.current.y + panDy;
                    currentPanRef.current = { x: nextX, y: nextY };
                    pan.setValue({ x: nextX, y: nextY });

                } else if (touches && touches.length === 1) {
                    if (isPinchingRef.current) {
                        isPinchingRef.current = false;
                        initialDistanceRef.current = 0;
                        lastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
                        initialPanRef.current = { ...currentPanRef.current };
                        return;
                    }

                    if (currentScaleRef.current > 1.05) {
                        const dx = touches[0].pageX - lastTouchRef.current.x;
                        const dy = touches[0].pageY - lastTouchRef.current.y;
                        const nextX = initialPanRef.current.x + dx;
                        const nextY = initialPanRef.current.y + dy;
                        currentPanRef.current = { x: nextX, y: nextY };
                        pan.setValue({ x: nextX, y: nextY });
                    }
                }
            },

            onPanResponderRelease: () => {
                isPinchingRef.current = false;
                initialDistanceRef.current = 0;

                if (currentScaleRef.current < 1.0) {
                    // Snap back to 100% and center
                    animateToScale(1.0, true);
                } else if (currentScaleRef.current > 4.0) {
                    animateToScale(4.0, false);
                } else if (currentScaleRef.current > 1.0) {
                    // Keep within reasonable pan boundaries
                    const maxPanX = (SCREEN_WIDTH * (currentScaleRef.current - 1)) / 2 + 40;
                    const maxPanY = (SCREEN_HEIGHT * (currentScaleRef.current - 1)) / 2 + 40;
                    const clampedX = Math.max(-maxPanX, Math.min(currentPanRef.current.x, maxPanX));
                    const clampedY = Math.max(-maxPanY, Math.min(currentPanRef.current.y, maxPanY));

                    currentPanRef.current = { x: clampedX, y: clampedY };
                    Animated.spring(pan, {
                        toValue: { x: clampedX, y: clampedY },
                        useNativeDriver: false,
                        friction: 7,
                    }).start();
                } else {
                    currentPanRef.current = { x: 0, y: 0 };
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },

            onPanResponderTerminate: () => {
                isPinchingRef.current = false;
                initialDistanceRef.current = 0;
            },
        })
    ).current;

    // Controls: Zoom In (+20% step)
    const handleZoomIn = () => {
        if (isPdf) {
            const newZoom = Math.min(Math.round((pdfZoom + 0.2) * 10) / 10, 3.0);
            setPdfZoom(newZoom);
            setZoomLevelPercent(Math.round(newZoom * 100));
            webViewRef.current?.injectJavaScript(`
                document.body.style.zoom = '${newZoom}';
                true;
            `);
        } else {
            // Step +20% (100 -> 120 -> 140 -> 160 -> 180 -> 200 -> ...)
            const newScale = Math.min(Math.round((currentScaleRef.current + 0.2) * 100) / 100, 4.0);
            animateToScale(newScale, false);
        }
    };

    // Controls: Zoom Out (-20% step)
    const handleZoomOut = () => {
        if (isPdf) {
            const newZoom = Math.max(Math.round((pdfZoom - 0.2) * 10) / 10, 0.8);
            setPdfZoom(newZoom);
            setZoomLevelPercent(Math.round(newZoom * 100));
            webViewRef.current?.injectJavaScript(`
                document.body.style.zoom = '${newZoom}';
                true;
            `);
        } else {
            // Step -20% (200 -> 180 -> 160 -> 140 -> 120 -> 100)
            const newScale = Math.max(Math.round((currentScaleRef.current - 0.2) * 100) / 100, 1.0);
            animateToScale(newScale, newScale <= 1.0);
        }
    };

    // Controls: Reset
    const handleReset = () => {
        if (isPdf) {
            setPdfZoom(1);
            setZoomLevelPercent(100);
            webViewRef.current?.injectJavaScript(`
                document.body.style.zoom = '1.0';
                true;
            `);
        } else {
            setRotation(0);
            animateToScale(1.0, true);
        }
    };

    // Controls: Rotate 90° Clockwise
    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    // Controls: Previous / Next Document
    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            resetTransformations();
        }
    };

    const handleNext = () => {
        if (currentIndex < docList.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            resetTransformations();
        }
    };

    // Open in External App / Browser
    const handleOpenExternal = () => {
        if (currentDocUrl) {
            Linking.openURL(currentDocUrl).catch(() => {
                // Ignore or handle silently
            });
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <StatusBar barStyle="light-content" backgroundColor="#090d16" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* TOP HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.headerIconCircle, isPdf && styles.pdfHeaderIconCircle]}>
                                <MaterialCommunityIcons
                                    name={isPdf ? 'file-pdf-box' : 'image-outline'}
                                    size={22}
                                    color={isPdf ? '#EF4444' : '#38BDF8'}
                                />
                            </View>
                            <View style={styles.headerTextGroup}>
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {title}
                                </Text>
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    {farmerName ? `${farmerName} • ` : ''}
                                    {docList.length > 1
                                        ? `पेज ${currentIndex + 1} / ${docList.length}`
                                        : isPdf
                                        ? 'PDF दस्तावेज़'
                                        : 'फोटो दस्तावेज़'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerRight}>
                            {/* Open in external app */}
                            <TouchableOpacity
                                style={styles.headerActionBtn}
                                onPress={handleOpenExternal}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="open-in-app" size={20} color="#E2E8F0" />
                            </TouchableOpacity>

                            {/* Close Modal */}
                            <TouchableOpacity
                                style={[styles.headerActionBtn, styles.closeBtn]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* MAIN CONTENT AREA */}
                    <View style={styles.viewport}>
                        {docList.length === 0 ? (
                            <View style={styles.centerContainer}>
                                <MaterialCommunityIcons name="file-question-outline" size={64} color="#64748B" />
                                <Text style={styles.emptyText}>कोई दस्तावेज़ उपलब्ध नहीं है</Text>
                            </View>
                        ) : isPdf ? (
                            /* PDF VIEWER VIA WEBVIEW */
                            <View style={styles.pdfContainer}>
                                <WebView
                                    ref={webViewRef}
                                    source={{ uri: getPdfViewerUrl(currentDocUrl) }}
                                    style={styles.webView}
                                    scalesPageToFit={true}
                                    bounces={false}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    setBuiltInZoomControls={true}
                                    setDisplayZoomControls={false}
                                    startInLoadingState={true}
                                    injectedJavaScript={`
                                        (function() {
                                            var meta = document.querySelector('meta[name="viewport"]');
                                            if (!meta) {
                                                meta = document.createElement('meta');
                                                meta.name = 'viewport';
                                                document.getElementsByTagName('head')[0].appendChild(meta);
                                            }
                                            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
                                        })();
                                        true;
                                    `}
                                    onLoadStart={() => setPdfLoading(true)}
                                    onLoadEnd={() => setPdfLoading(false)}
                                    onError={() => {
                                        setPdfLoading(false);
                                        setPdfError(true);
                                    }}
                                />

                                {pdfLoading && (
                                    <View style={styles.loadingOverlay}>
                                        <ActivityIndicator size="large" color="#EF4444" />
                                        <Text style={styles.loadingText}>PDF लोड हो रहा है...</Text>
                                    </View>
                                )}

                                {pdfError && (
                                    <View style={styles.errorOverlay}>
                                        <MaterialCommunityIcons name="file-alert-outline" size={56} color="#EF4444" />
                                        <Text style={styles.errorTitle}>PDF लोड करने में असमर्थ</Text>
                                        <Text style={styles.errorSubtitle}>
                                            स्थानीय नेटवर्क या नेटवर्क समस्या के कारण इसे सीधे डिवाइस में खोलें।
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.retryBtn}
                                            onPress={handleOpenExternal}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons name="open-in-app" size={18} color="#FFFFFF" />
                                            <Text style={styles.retryBtnText}>बाहरी PDF रीडर में खोलें</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            /* IMAGE VIEWER WITH SMOOTH PINCH-TO-ZOOM, DRAG & ROTATE */
                            <View style={styles.imageViewport} collapsable={false} {...panResponder.panHandlers}>
                                <Animated.View
                                    pointerEvents="none"
                                    collapsable={false}
                                    style={[
                                        styles.imageAnimatedWrapper,
                                        {
                                            transform: [
                                                { translateX: pan.x },
                                                { translateY: pan.y },
                                                { scale: scale },
                                                { rotate: `${rotation}deg` },
                                            ],
                                        },
                                    ]}
                                >
                                    <Image
                                        source={{ uri: currentDocUrl }}
                                        style={styles.imageContent}
                                        resizeMode="contain"
                                        onLoadStart={() => {
                                            setImageLoading(true);
                                            setImageError(false);
                                        }}
                                        onLoadEnd={() => setImageLoading(false)}
                                        onError={() => {
                                            setImageLoading(false);
                                            setImageError(true);
                                        }}
                                    />
                                </Animated.View>

                                {imageLoading && (
                                    <View style={styles.loadingOverlay} pointerEvents="none">
                                        <ActivityIndicator size="large" color="#38BDF8" />
                                        <Text style={styles.loadingText}>छवि लोड हो रही है...</Text>
                                    </View>
                                )}

                                {imageError && (
                                    <View style={styles.errorOverlay} pointerEvents="box-none">
                                        <MaterialCommunityIcons name="image-broken-variant" size={56} color="#EF4444" />
                                        <Text style={styles.errorTitle}>छवि लोड नहीं हो सकी</Text>
                                        <Text style={styles.errorSubtitle}>
                                            छवि लिंक अनुपलब्ध हो सकता है।
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.retryBtn}
                                            onPress={handleOpenExternal}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons name="open-in-app" size={18} color="#FFFFFF" />
                                            <Text style={styles.retryBtnText}>ब्राउज़र में खोलें</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* MULTI-PAGE NAVIGATION FLOATING ARROWS (IF > 1 FILE) */}
                        {docList.length > 1 && (
                            <>
                                {currentIndex > 0 && (
                                    <TouchableOpacity
                                        style={[styles.floatingPageNav, styles.floatingPageNavLeft]}
                                        onPress={handlePrev}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}

                                {currentIndex < docList.length - 1 && (
                                    <TouchableOpacity
                                        style={[styles.floatingPageNav, styles.floatingPageNavRight]}
                                        onPress={handleNext}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>

                    {/* HINT BANNER */}
                    <View style={styles.hintBanner}>
                        <MaterialCommunityIcons name="gesture-pinch" size={16} color="#94A3B8" />
                        <Text style={styles.hintText}>
                            ज़ूम करने के लिए 2 उंगलियों से पिंच करें या नीचे +/- बटन दबाएं
                        </Text>
                    </View>

                    {/* BOTTOM FLOATING CONTROLS TOOLBAR */}
                    <View style={styles.bottomToolbarWrapper}>
                        <View style={styles.bottomToolbar}>
                            {/* Rotate Button (Available for images) */}
                            {!isPdf && (
                                <TouchableOpacity
                                    style={styles.toolBtn}
                                    onPress={handleRotate}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="rotate-right" size={22} color="#E2E8F0" />
                                </TouchableOpacity>
                            )}

                            {/* Zoom Out Button */}
                            <TouchableOpacity
                                style={styles.toolBtn}
                                onPress={handleZoomOut}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="remove" size={24} color="#E2E8F0" />
                            </TouchableOpacity>

                            {/* Zoom Level Badge */}
                            <TouchableOpacity
                                style={styles.zoomBadge}
                                onPress={handleReset}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.zoomBadgeText}>{zoomLevelPercent}%</Text>
                            </TouchableOpacity>

                            {/* Zoom In Button */}
                            <TouchableOpacity
                                style={styles.toolBtn}
                                onPress={handleZoomIn}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={24} color="#E2E8F0" />
                            </TouchableOpacity>

                            {/* Reset / Fit to Screen Button */}
                            <TouchableOpacity
                                style={styles.toolBtn}
                                onPress={handleReset}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="fit-to-screen-outline" size={22} color="#E2E8F0" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#090d16',
    },
    container: {
        flex: 1,
        backgroundColor: '#090d16',
        justifyContent: 'space-between',
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        backgroundColor: '#0f172a',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    headerIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pdfHeaderIconCircle: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    headerTextGroup: {
        flex: 1,
    },
    headerTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        backgroundColor: '#EF4444',
    },
    viewport: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 15,
        marginTop: 12,
        fontWeight: '600',
    },
    pdfContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
    },
    webView: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    imageViewport: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#020617',
    },
    imageAnimatedWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContent: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 13, 22, 0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 10,
    },
    loadingText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#090d16',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 10,
        zIndex: 10,
    },
    errorTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700',
        marginTop: 8,
    },
    errorSubtitle: {
        color: '#94A3B8',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 10,
        gap: 6,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    floatingPageNav: {
        position: 'absolute',
        top: '48%',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    floatingPageNavLeft: {
        left: 12,
    },
    floatingPageNavRight: {
        right: 12,
    },
    hintBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        backgroundColor: '#0f172a',
    },
    hintText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
    },
    bottomToolbarWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 8,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    bottomToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#1e293b',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: '#334155',
    },
    toolBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBadge: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    zoomBadgeText: {
        color: '#38BDF8',
        fontSize: 13,
        fontWeight: '800',
    },
});
