import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN_WIDTH * 0.85, 380);

interface CustomImageCropperProps {
    visible: boolean;
    imageUri: string | null;
    onCrop: (uri: string) => void;
    onCancel: () => void;
}

export default function CustomImageCropper({ visible, imageUri, onCrop, onCancel }: CustomImageCropperProps) {
    const [loading, setLoading] = useState(false);
    const [imageSize, setImageSize] = useState({ width: moderateScale(0), height: 0 });
    const scrollViewRef = useRef<ScrollView>(null);
    
    // We'll track the content offset and zoom scale to calculate the crop area
    const [contentOffset, setContentOffset] = useState({ x: 0, y: 0 });
    const [zoomScale, setZoomScale] = useState(1);

    const onImageLoad = (event: any) => {
        const { width, height } = event.nativeEvent.source;
        setImageSize({ width, height });
    };

    const handleDone = async () => {
        if (!imageUri || !imageSize.width) {
            alert('कृपया फोटो लोड होने का इंतज़ार करें');
            return;
        }
        setLoading(true);

        try {
            // Coordinate Calculation Refined
            // 1. We know the image is scaled to fit SCREEN_WIDTH
            const scaleFactor = imageSize.width / SCREEN_WIDTH;
            
            // 2. We need to find what portion of the ORIGINAL image is visible in the CROP_SIZE window
            // Since ScrollView might center the content, we need to be careful.
            // For now, let's assume simple top-left alignment inside ScrollView content
            
            const cropX = (contentOffset.x * scaleFactor) / zoomScale;
            const cropY = (contentOffset.y * scaleFactor) / zoomScale;
            const cropSize = (CROP_SIZE * scaleFactor) / zoomScale;


            const result = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    {
                        crop: {
                            originX: Math.max(0, Math.round(cropX)),
                            originY: Math.max(0, Math.round(cropY)),
                            width: Math.min(imageSize.width - Math.round(cropX), Math.round(cropSize)),
                            height: Math.min(imageSize.height - Math.round(cropY), Math.round(cropSize)),
                        },
                    },
                    { resize: { width: moderateScale(1000), height: 1000 } }
                ],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            if (result.uri) {
                onCrop(result.uri);
            } else {
                throw new Error('Manipulator returned empty URI');
            }
        } catch (error: any) {
            console.error('Crop Error:', error);
            alert('फोटो क्रॉप करने में समस्या आई: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!imageUri) return null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>फोटो क्रॉप करें</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.cropperContainer}>
                    {/* The "Window" for cropping */}
                    <View style={styles.cropWindow}>
                        <ScrollView
                            ref={scrollViewRef}
                            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                            maximumZoomScale={5}
                            minimumZoomScale={1}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            onScroll={(e) => {
                                setContentOffset(e.nativeEvent.contentOffset);
                                setZoomScale(e.nativeEvent.zoomScale || 1);
                            }}
                            scrollEventThrottle={16}
                            centerContent
                        >
                            <Image
                                source={{ uri: imageUri }}
                                style={{
                                    width: SCREEN_WIDTH,
                                    height: SCREEN_WIDTH * (imageSize.height / imageSize.width || 1),
                                }}
                                onLoad={onImageLoad}
                                resizeMode="contain"
                            />
                        </ScrollView>
                        
                        {/* Static Overlay Grids */}
                        <View style={styles.overlay} pointerEvents="none">
                            <View style={styles.gridLineV} />
                            <View style={[styles.gridLineV, { left: '66%' }]} />
                            <View style={styles.gridLineH} />
                            <View style={[styles.gridLineH, { top: '66%' }]} />
                        </View>
                    </View>
                    
                    <Text style={styles.instruction}>फोटो को सही जगह सेट करने के लिए हिलाएं या ज़ूम करें</Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.doneBtn} 
                        onPress={handleDone}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#F9A825', '#E67C00']}
                            style={styles.gradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.doneBtnText}>ठीक है (Done)</Text>
                                    <MaterialCommunityIcons name="check-bold" size={24} color="#FFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: moderateScale(18),
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 5,
    },
    cropperContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cropWindow: {
        width: CROP_SIZE,
        height: CROP_SIZE,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#F9A825',
        backgroundColor: '#111',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '33.3%',
        width: moderateScale(1),
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '33.3%',
        height: verticalScale(1),
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    instruction: {
        color: 'rgba(255,255,255,0.7)',
        marginTop: 30,
        fontSize: moderateScale(14),
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
        alignItems: 'center',
    },
    doneBtn: {
        width: '100%',
        maxWidth: 420,
        height: verticalScale(56),
        borderRadius: 28,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: moderateScale(18),
        fontWeight: 'bold',
    },
});
