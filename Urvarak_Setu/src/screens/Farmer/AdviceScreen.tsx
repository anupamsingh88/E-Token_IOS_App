import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants';
import ParticleBackground from '../../components/ParticleBackground';
import { useSettings } from '../../contexts/SettingsContext';
import { scale, verticalScale, moderateScale, isTablet, useResponsive } from '../../utils/responsive';


interface AdviceScreenProps {
    farmerName: string;
}

interface AdvisoryTip {
    id: number;
    title: string;
    description: string;
}

interface AppInstructions {
    title: string;
    description: string;
}

export default function AdviceScreen({ farmerName }: AdviceScreenProps) {
    const { settings, loading: settingsLoading } = useSettings();
    const { isTablet: isTabletMode, isLandscape } = useResponsive();

    // All data comes directly from settings (single API call via SettingsContext)
    const tips = useMemo(() => settings?.advisory_tips || [], [settings]);
    const notices = useMemo(() => settings?.notices || [], [settings]);
    const instructions = useMemo(() => settings?.app_instructions || [], [settings]);

    const handleCallHelpline = () => {
        const number = settings?.helpline_number || '1800-180-1551';
        Linking.openURL(`tel:${number}`);
    };

    if (settingsLoading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>विषय-सामग्री लोड हो रही है...</Text>
            </View>
        );
    }

    return (
        <ParticleBackground>
            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, isTabletMode && { alignItems: 'center' }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.mainWrapper, isTabletMode && { maxWidth: isLandscape ? 920 : 760, width: '100%' }]}>
                        {/* Header - Dynamic from settings */}
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, isTabletMode && { fontSize: 30, lineHeight: 46 }]}>
                                {settings?.advice_screen_title || '💡 ऐप निर्देश और सहायता'}
                            </Text>
                            <Text style={[styles.headerSubtitle, isTabletMode && { fontSize: 18 }]}>
                                {settings?.advice_screen_subtitle || 'ऐप का उपयोग कैसे करें'}
                            </Text>
                        </View>

                        {/* Instructions - Dynamic from app_instructions in app_settings */}
                        <View style={styles.section}>
                            <View style={isTabletMode ? styles.gridRow : undefined}>
                                {instructions.length > 0 ? (
                                    instructions.map((instruction, index) => (
                                        <View key={index} style={[styles.stepCard, isTabletMode && styles.gridCol]}>
                                            <View style={styles.stepNumberContainer}>
                                                <Text style={styles.stepNumber}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.stepContent}>
                                                <Text style={styles.stepTitle}>{instruction.title}</Text>
                                                <Text style={styles.stepResult}>{instruction.description}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.infoText}>कोई निर्देश उपलब्ध नहीं हैं।</Text>
                                )}
                            </View>
                        </View>

                        {/* Advisory Tips - Dynamic */}
                        {tips.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, isTabletMode && { fontSize: 24, lineHeight: 36 }]}>
                                    {settings?.farmer_advice_title || '🌾 किसान सलाह'}
                                </Text>
                                <View style={isTabletMode ? styles.gridRow : undefined}>
                                    {tips.map((tip) => (
                                        <View key={tip.id} style={[styles.tipCard, isTabletMode && styles.gridCol]}>
                                            <View style={styles.tipHeader}>
                                                <Text style={styles.tipEmoji}>💡</Text>
                                                <View style={styles.tipTextContainer}>
                                                    <Text style={styles.tipTitle}>{tip.title}</Text>
                                                    <Text style={styles.tipDescription}>{tip.description}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Helpline - Dynamic */}
                        <TouchableOpacity onPress={handleCallHelpline} activeOpacity={0.9}>
                            <View style={[styles.helplineCard, isTabletMode && { padding: 24 }]}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={[styles.helplineContent, { flex: 1, marginRight: 8 }]}>
                                    <Text style={[styles.helplineEmoji, isTabletMode && { fontSize: 38 }]}>📞</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.helplineTitle, isTabletMode && { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
                                            {settings?.helpline_title || 'किसान सहायता केंद्र'}
                                        </Text>
                                        <Text style={[styles.helplineNumber, isTabletMode && { fontSize: 26 }]} numberOfLines={1} adjustsFontSizeToFit>
                                            {settings?.helpline_number || '1800-180-1551'}
                                        </Text>
                                        <Text style={[styles.helplineSubtext, isTabletMode && { fontSize: 14 }]} numberOfLines={2}>
                                            {settings?.helpline_description || 'किसी भी सहायता के लिए कॉल करें'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.callButton, isTabletMode && { paddingHorizontal: 20, paddingVertical: 10 }]}>
                                    <Text style={[styles.callButtonText, isTabletMode && { fontSize: 16 }]}>
                                        {settings?.helpline_button_text || 'कॉल करें'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Important Notices - Dynamic */}
                        {notices.length > 0 && (
                            <View style={[styles.infoCard, { marginTop: SPACING.lg }]}>
                                <Text style={[styles.infoTitle, isTabletMode && { fontSize: 18 }]}>
                                    {settings?.notices_title || '📢 महत्वपूर्ण सूचना'}
                                </Text>
                                {notices.map((notice, index) => (
                                    <Text key={index} style={[styles.infoText, isTabletMode && { fontSize: 16, lineHeight: 26 }]}>• {notice}</Text>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </ParticleBackground>
    );
}

const styles = StyleSheet.create({
    loadingScreen: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    container: {
        flex: 1,
        // backgroundColor: COLORS.background, // Removed to show ParticleBackground
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        paddingTop: 25, // Extra space at the top
    },
    mainWrapper: {
        width: '100%',
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridCol: {
        width: '48.8%',
    },
    header: {
        marginBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
        lineHeight: 42, // Increased for Hindi
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        marginBottom: SPACING.md,
        lineHeight: 35, // Increased for Hindi
    },
    loadingContainer: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
    tipCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        paddingTop: SPACING.md, // More space at top
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.small,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tipEmoji: {
        fontSize: moderateScale(24),
        marginRight: SPACING.sm,
    },
    tipTextContainer: {
        flex: 1,
    },
    tipTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: 4,
        lineHeight: 25, // Increased for Hindi
    },
    tipDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 25,
    },
    stepCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
        alignItems: 'flex-start',
    },
    stepNumberContainer: {
        width: moderateScale(32),
        height: verticalScale(32),
        borderRadius: 16,
        backgroundColor: '#cac9948c',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        marginTop: 2,
    },
    stepNumber: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    stepResult: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    helplineCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    helplineContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    helplineEmoji: {
        fontSize: moderateScale(32),
    },
    helplineTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.white,
        opacity: 0.9,
    },
    helplineNumber: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    helplineSubtext: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.white,
        opacity: 0.8,
    },
    callButton: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.round,
    },
    callButtonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: '#059669',
    },
    infoCard: {
        backgroundColor: '#FFF7ED',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    infoTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: '#C2410C',
        marginBottom: SPACING.sm,
    },
    infoText: {
        fontSize: FONT_SIZES.sm,
        color: '#9A3412',
        marginBottom: 4,
        lineHeight: 23,
    },
});
