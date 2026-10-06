import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';

// Image compression function - targets < 500kb
export const compressImage = async (uri: string): Promise<string> => {
    try {
        // Aggressive compression: max width 800px and compress 0.3 for optimized uploads
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
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
            // Check file size (limit to 10MB)
            if (file.size && file.size > 10 * 1024 * 1024) {
                if (onError) onError('दस्तावेज़ का आकार 10MB से कम होना चाहिए। कृपया छोटी फ़ाइल चुनें।');
                return;
            }
            onSuccess(file.uri, file.name);
        }
    } catch (error) {
        console.error('Error picking document:', error);
        if (onError) onError('फ़ाइल चुनने में समस्या आई');
    }
};

// Pick Multiple Documents (PDF)
export const pickMultipleDocuments = async (
    onSuccess: (files: {uri: string, name: string}[]) => void,
    onError?: (message: string) => void
) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
            multiple: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const validFiles = result.assets.filter(f => !f.size || f.size <= 10 * 1024 * 1024);
            if (validFiles.length < result.assets.length) {
                if (onError) onError('कुछ दस्तावेज़ 10MB से बड़े थे और उन्हें छोड़ दिया गया।');
            }
            if (validFiles.length > 0) {
                onSuccess(validFiles.map(f => ({uri: f.uri, name: f.name})));
            }
        }
    } catch (error) {
        console.error('Error picking multiple documents:', error);
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
            // Check file size (limit raw image to 10MB to avoid compression crash)
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                if (onError) onError('फ़ोटो का आकार 10MB से कम होना चाहिए। कृपया छोटी फ़ोटो चुनें।');
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

// Pick multiple photos (for Khatauni)
export const pickMultipleKhatauniPhotos = async (
    source: 'camera' | 'gallery',
    onSuccess: (uris: string[]) => void,
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
            if (!result.canceled && result.assets[0]) {
                onSuccess([result.assets[0].uri]);
            }
        } else {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                if (onError) onError('गैलरी उपयोग के लिए अनुमति दें');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 5,
                quality: 1,
            });
            if (!result.canceled && result.assets.length > 0) {
                onSuccess(result.assets.map(asset => asset.uri));
            }
        }
    } catch (error) {
        console.error('Error picking multiple photos:', error);
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
