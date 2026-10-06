import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache for the auth token to avoid repeated AsyncStorage reads
let cachedToken: string | null = null;
let tokenLoaded = false;

/**
 * A wrapper around the native Web fetch API that automatically injects 
 * the JWT token from AsyncStorage into the Authorization header.
 * 
 * @param input URL or Request object
 * @param init Request options
 * @returns Promise<Response>
 */
export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    try {
        // Load token from cache or storage
        if (!tokenLoaded) {
            cachedToken = await AsyncStorage.getItem('retailer_token');
            tokenLoaded = true;
        }

        // Create or copy the headers object
        const headers = new Headers(init?.headers);

        // Inject the token if it exists
        if (cachedToken) {
            headers.set('Authorization', `Bearer ${cachedToken}`);
        }

        // Return the fetch promise with the augmented headers
        return fetch(input, {
            ...init,
            headers
        });
    } catch (error) {
        console.error('apiFetch helper failed:', error);
        throw error;
    }
}

/** Reset token cache (call on logout) */
export function resetRetailerTokenCache() {
    cachedToken = null;
    tokenLoaded = false;
}

/** Explicitly set token cache (call on login) */
export function setRetailerTokenCache(token: string) {
    cachedToken = token;
    tokenLoaded = true;
}
