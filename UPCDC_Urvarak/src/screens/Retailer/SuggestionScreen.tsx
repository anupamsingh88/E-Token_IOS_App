import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../../constants';

const SUGGESTIONS = [
    {
        id: '1',
        title: 'कम स्टॉक अलर्ट',
        desc: 'यूरिया का स्टॉक 10% से कम है। कृपया ऑर्डर करें।',
        icon: 'alert-circle',
        color: '#EF4444',
        bg: '#FEF2F2',
    },
    {
        id: '2',
        title: 'बाजार का रुझान',
        desc: 'इस सप्ताह डी.ए.पी. की मांग 20% बढ़ने की संभावना है।',
        icon: 'trending-up',
        color: '#10B981',
        bg: '#F0FDF4',
    },
    {
        id: '3',
        title: 'मौसम की चेतावनी',
        desc: 'अगले 3 दिनों में बारिश की संभावना। खाद को सुरक्षित रखें।',
        icon: 'rainy',
        color: '#3B82F6',
        bg: '#EFF6FF',
    },
];

export default function SuggestionScreen({ retailerName }: { retailerName?: string }) {
    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>स्मार्ट सुझाव (Suggestions)</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {SUGGESTIONS.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.card}>
                        <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
                            <Text style={styles.cardDesc}>{item.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: SPACING.lg,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        ...SHADOWS.small,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});
