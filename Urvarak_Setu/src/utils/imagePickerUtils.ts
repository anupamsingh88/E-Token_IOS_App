import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';

// Image compression function - targets < 500kb
export const compressImage = async (uri: string): Promise<string> => {
    try {
        // First pass: Resize to max 1024px and compress
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        return manipResult.uri;
    } catch (error) {
        console.error('Error compressing image:', error);
        return uri;
    }
};

// Pick document (PDF)
export const pickDocument = async (
    onSuccess: (uri: string, name: string) => void,
    onError?: (message: string) => void
) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
            const file = result.assets[0];
            // Check file size (limit to 2MB)
            if (file.size && file.size > 2 * 1024 * 1024) {
                if (onError) onError('दस्तावेज़ का आकार 2MB से कम होना चाहिए। कृपया छोटी फ़ाइल चुनें।');
                return;
            }
            onSuccess(file.uri, file.name);
        }
    } catch (error) {
        console.error('Error picking document:', error);
        if (onError) onError('फ़ाइल चुनने में समस्या आई');
    }
};

// Pick farmer photo from camera or gallery
export const pickFarmerPhoto = async (
    source: 'camera' | 'gallery',
    onSuccess: (uri: string) => void,
    onError?: (message: string) => void
) => {
    try {
        let result;
        if (source === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                if (onError) onError('कैमरा उपयोग के लिए अनुमति दें');
                return;
            }
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, 
                quality: 1,
            });
        } else {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                if (onError) onError('गैलरी उपयोग के लिए अनुमति दें');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, 
                quality: 1,
            });
        }

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            // Check file size (limit raw image to 5MB to avoid compression crash)
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                if (onError) onError('फ़ोटो का आकार 5MB से कम होना चाहिए। कृपया छोटी फ़ोटो चुनें।');
                return;
            }
            // Return raw URI, compression will happen after custom crop
            onSuccess(asset.uri);
        }
    } catch (error) {
        console.error('Error picking farmer photo:', error);
        if (onError) onError('फोटो चुनने में समस्या आई');
    }
};

// Simplified Aadhaar Picker Wrapper (Handles logic in screen)
export const pickAadhaarPhoto = async (
    source: 'camera' | 'gallery',
    onSuccess: (uri: string) => void,
    onError?: (message: string) => void
) => {
    return pickFarmerPhoto(source, onSuccess, onError);
};
