import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Linking } from 'react-native';

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

/**
 * Ensures camera permission is active.
 * 1. Checks current status.
 * 2. If not granted, triggers system permission prompt.
 * 3. If permanently denied, triggers custom card prompt or settings dialog.
 */
export const ensureCameraPermission = async (
    showSettingsAlert: boolean = true,
    onPermissionRequired?: () => void
): Promise<boolean> => {
    try {
        const status = await ImagePicker.getCameraPermissionsAsync();
        if (status.granted) {
            return true;
        }

        // If can ask again or undetermined, request directly so system prompt appears immediately
        if (status.canAskAgain || status.status === ImagePicker.PermissionStatus.UNDETERMINED) {
            const req = await ImagePicker.requestCameraPermissionsAsync();
            if (req.granted) {
                return true;
            }
        }

        if (onPermissionRequired) {
            onPermissionRequired();
            return false;
        }

        if (showSettingsAlert) {
            Alert.alert(
                'कैमरा अनुमति आवश्यक है 📷',
                'फोटो खींचने के लिए ऐप को कैमरे की अनुमति की आवश्यकता है। कृपया सेटिंग्स में जाकर कैमरा अनुमति चालू (Allow) करें।',
                [
                    { text: 'रद्द करें', style: 'cancel' },
                    {
                        text: 'अनुमति दें (सेटिंग्स)',
                        onPress: () => {
                            Linking.openSettings().catch(() => {});
                        }
                    }
                ]
            );
        }
        return false;
    } catch (e) {
        console.warn('Camera permission check failed:', e);
        return false;
    }
};

/**
 * Ensures gallery / media library permission is active.
 */
export const ensureGalleryPermission = async (
    showSettingsAlert: boolean = true,
    onPermissionRequired?: () => void
): Promise<boolean> => {
    try {
        const status = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status.granted) {
            return true;
        }

        if (status.canAskAgain || status.status === ImagePicker.PermissionStatus.UNDETERMINED) {
            const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (req.granted) {
                return true;
            }
        }

        if (onPermissionRequired) {
            onPermissionRequired();
            return false;
        }

        if (showSettingsAlert) {
            Alert.alert(
                'गैलरी अनुमति आवश्यक है 🖼️',
                'फोटो चुनने के लिए ऐप को गैलरी उपयोग की अनुमति चाहिए। कृपया सेटिंग्स में जाकर अनुमति चालू (Allow) करें।',
                [
                    { text: 'रद्द करें', style: 'cancel' },
                    {
                        text: 'अनुमति दें (सेटिंग्स)',
                        onPress: () => {
                            Linking.openSettings().catch(() => {});
                        }
                    }
                ]
            );
        }
        return false;
    } catch (e) {
        console.warn('Gallery permission check failed:', e);
        return false;
    }
};

// Pick from camera (Photo)
export const pickFromCamera = async (
    onSuccess: (media: PickedMedia) => void,
    onError?: (msg: string) => void,
    onPermissionRequired?: () => void
) => {
    try {
        const hasPermission = await ensureCameraPermission(true, onPermissionRequired);
        if (!hasPermission) {
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
    } catch (err: any) {
        console.error('Error taking photo:', err);
        onError?.(err?.message || 'फोटो खींचने में समस्या आई');
    }
};

// Pick from Gallery (Photo)
export const pickFromGallery = async (
    onSuccess: (media: PickedMedia) => void,
    onError?: (msg: string) => void,
    onPermissionRequired?: () => void
) => {
    try {
        const hasPermission = await ensureGalleryPermission(true, onPermissionRequired);
        if (!hasPermission) {
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
    } catch (err: any) {
        console.error('Error picking from gallery:', err);
        onError?.(err?.message || 'गैलरी से फोटो चुनने में समस्या आई');
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
    } catch (err: any) {
        console.error('Error picking document:', err);
        onError?.(err?.message || 'दस्तावेज़ चुनने में समस्या आई');
    }
};
