import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Linking,
    BackHandler,
    Platform,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ForceUpdateModalProps {
    visible: boolean;
    currentVersion: string;
    latestVersion?: string;
    title?: string;
    message?: string;
    playStoreUrl?: string;
    isOptional?: boolean;
    onSkip?: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
    visible,
    currentVersion,
    latestVersion,
    title = 'नया अपडेट उपलब्ध है',
    message = 'उर्वरक सेतु ऐप का नया और बेहतर वर्ज़न उपलब्ध है। आगे जारी रखने के लिए कृपया अभी अपडेट करें।',
    playStoreUrl = 'https://play.google.com/store/apps/details?id=com.weknowtech.urvaraksetu',
    isOptional = false,
    onSkip,
}) => {
    // Intercept hardware back press on Android so user cannot bypass if NOT optional
    useEffect(() => {
        if (!visible || isOptional) return;

        const onBackPress = () => {
            return true; // Prevent back press
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [visible, isOptional]);

    const handleUpdatePress = async () => {
        const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.weknowtech.urvaraksetu';
        const marketUrl = Platform.OS === 'android'
            ? 'market://details?id=com.weknowtech.urvaraksetu'
            : playStoreUrl;

        try {
            const targetUrl = playStoreUrl || marketUrl;
            const supported = await Linking.canOpenURL(targetUrl);
            if (supported) {
                await Linking.openURL(targetUrl);
            } else {
                await Linking.openURL(fallbackUrl);
            }
        } catch (e) {
            console.error('Error opening update URL:', e);
            Linking.openURL(fallbackUrl).catch(() => {});
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => {
                if (isOptional && onSkip) {
                    onSkip();
                }
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Glowing Header Icon */}
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.iconCircle}
                    >
                        <MaterialCommunityIcons name="cellphone-arrow-down" size={44} color="#FFFFFF" />
                    </LinearGradient>

                    {/* App Branding */}
                    <Text style={styles.appName}>🌾 उर्वरक सेतु</Text>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* Version Details */}
                    <View style={styles.versionContainer}>
                        <View style={styles.versionBox}>
                            <Text style={styles.versionLabel}>वर्तमान वर्ज़न</Text>
                            <Text style={styles.versionValue}>v{currentVersion}</Text>
                        </View>
                        <MaterialCommunityIcons name="arrow-right-bold" size={20} color="#D97706" />
                        <View style={[styles.versionBox, styles.newVersionBox]}>
                            <Text style={[styles.versionLabel, styles.newVersionLabel]}>नया वर्ज़न</Text>
                            <Text style={[styles.versionValue, styles.newVersionValue]}>
                                v{latestVersion || currentVersion}
                            </Text>
                        </View>
                    </View>

                    {/* Compulsion Warning Note */}
                    {!isOptional && (
                        <View style={styles.noteContainer}>
                            <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#B45309" />
                            <Text style={styles.noteText}>
                                यह अपडेट अनिवार्य है। बिना अपडेट किए आप ऐप का उपयोग नहीं कर पाएंगे।
                            </Text>
                        </View>
                    )}

                    {/* Big Action Button */}
                    <TouchableOpacity
                        style={styles.updateButton}
                        activeOpacity={0.85}
                        onPress={handleUpdatePress}
                    >
                        <LinearGradient
                            colors={['#16A34A', '#15803D']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBtn}
                        >
                            <MaterialCommunityIcons name="google-play" size={24} color="#FFFFFF" />
                            <Text style={styles.updateButtonText}>अभी अपडेट करें</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Skip Button for Optional Update */}
                    {isOptional && (
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={onSkip}
                        >
                            <Text style={styles.skipButtonText}>बाद में करें (Skip)</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: Math.min(SCREEN_WIDTH - 40, 380),
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingTop: 36,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 15,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    appName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    versionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    versionBox: {
        alignItems: 'center',
    },
    versionLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 2,
    },
    versionValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    newVersionBox: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    newVersionLabel: {
        color: '#92400E',
    },
    newVersionValue: {
        color: '#B45309',
    },
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        padding: 10,
        marginBottom: 22,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
    },
    noteText: {
        fontSize: 12,
        color: '#92400E',
        marginLeft: 8,
        flex: 1,
        lineHeight: 17,
        fontWeight: '500',
    },
    updateButton: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    skipButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    skipButtonText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ForceUpdateModal;
