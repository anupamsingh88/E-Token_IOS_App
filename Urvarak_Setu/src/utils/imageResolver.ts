import { API_BASE_URL } from '../config/config';

/**
 * Resolves an image URL from database/settings.
 * If absolute (http/https), returns as uri.
 * If relative path (e.g. assets/urvarak_setu/icon.png), prepends API_BASE_URL.
 * If empty or invalid, returns the bundled fallbackAsset.
 */
export const resolveAppImage = (imageUrl?: string | null, fallbackAsset?: any) => {
    if (imageUrl && typeof imageUrl === 'string') {
        const trimmed = imageUrl.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return { uri: trimmed, cache: 'force-cache' as const };
        }
        const cleanPath = trimmed.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
        if (cleanPath.length > 0) {
            return { uri: `${API_BASE_URL}/${cleanPath}`, cache: 'force-cache' as const };
        }
    }
    return fallbackAsset;
};
