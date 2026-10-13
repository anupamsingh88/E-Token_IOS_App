import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PickedMedia {
    uri: string;
    name: string;
    type: string;
    isPdf?: boolean;
}

// Compress image to optimized size (< 500KB)
export const compressImage = async (uri: string): Promise<string> => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        return manipResult.uri;
    } catch (error) {
        console.warn('Image compression fallback to original uri:', error);
        return uri;
    }
};

// Pick from camera (Photo)
export const pickFromCamera = async (
    onSuccess: (media: PickedMedia) => void,
    onError?: (msg: string) => void
) => {
    try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            onError?.('कैमरा उपयोग के लिए अनुमति दें');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            const compressed = await compressImage(asset.uri);
            const ext = 'jpg';
            const filename = `camera_${Date.now()}.${ext}`;
            onSuccess({
                uri: compressed,
                name: filename,
                type: 'image/jpeg',
                isPdf: false,
            });
        }
    } catch (err) {
        console.error('Error taking photo:', err);
        onError?.('फोटो खींचने में समस्या आई');
    }
};

// Pick from Gallery (Photo)
export const pickFromGallery = async (
    onSuccess: (media: PickedMedia) => void,
    onError?: (msg: string) => void
) => {
    try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            onError?.('गैलरी उपयोग के लिए अनुमति दें');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            const compressed = await compressImage(asset.uri);
            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const filename = `gallery_${Date.now()}.${ext}`;
            onSuccess({
                uri: compressed,
                name: filename,
                type: ext === 'png' ? 'image/png' : 'image/jpeg',
                isPdf: false,
            });
        }
    } catch (err) {
        console.error('Error picking from gallery:', err);
        onError?.('गैलरी से फोटो चुनने में समस्या आई');
    }
};

// Pick Document / PDF or Image
export const pickDocumentFile = async (
    onSuccess: (media: PickedMedia) => void,
    onError?: (msg: string) => void
) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const file = result.assets[0];
            const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf';
            let uri = file.uri;
            if (!isPdf) {
                uri = await compressImage(file.uri);
            }
            onSuccess({
                uri,
                name: file.name,
                type: isPdf ? 'application/pdf' : 'image/jpeg',
                isPdf,
            });
        }
    } catch (err) {
        console.error('Error picking document:', err);
        onError?.('दस्तावेज़ चुनने में समस्या आई');
    }
};
