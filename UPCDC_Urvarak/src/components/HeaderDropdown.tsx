import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../constants';

const { width } = Dimensions.get('window');

interface HeaderDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    retailerName: string;
    onProfilePress: () => void;
    onSettingsPress: () => void;
}

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
    isOpen,
    onClose,
    onProfilePress,
}) => {
    const insets = useSafeAreaInsets();
    // Match TopHeader height logic
    const HEADER_HEIGHT = Platform.OS === 'ios' ? insets.top + 75 : insets.top + 100;

    const slideAnim = useRef(new Animated.Value(-250)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const [isRendered, setIsRendered] = React.useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -250,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsRendered(false);
            });
        }
    }, [isOpen]);

    if (!isRendered && !isOpen) return null;

    return (
        <View style={styles.overlay} pointerEvents={isOpen ? 'auto' : 'none'}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.dropdownContainer,
                    {
                        top: HEADER_HEIGHT,
                        transform: [{ translateY: slideAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            >
                {/* Connector Strip matching Header color */}
                <View style={styles.attachmentStrip} />

                <View style={styles.content}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { onClose(); onProfilePress(); }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="person" size={26} color="#3B82F6" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.itemTitle}>प्रोफ़ाइल (Profile)</Text>
                            <Text style={styles.itemSub}>रिटेलर की जानकारी देखें</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomEdge} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90, // Lower than TopHeader (100)
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    dropdownContainer: {
        width: '80%',
        alignSelf: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        overflow: 'hidden',
        zIndex: 90,
        ...SHADOWS.large,
        elevation: 5,
    },
    attachmentStrip: {
        height: 12,
        backgroundColor: '#3b82f6', // Match header color
        width: '100%',
    },
    content: {
        padding: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 15,
        backgroundColor: '#F8FAFC',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    itemSub: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    bottomEdge: {
        height: 6,
        width: '100%',
        backgroundColor: '#F1F5F9',
    }
});

export default HeaderDropdown;
