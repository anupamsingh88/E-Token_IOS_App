/**
 * API Client - Drop-in replacement for `fetch` with automatic logging
 * 
 * Usage:
 *   import { apiFetch } from '../utils/apiClient';
 *   const res = await apiFetch(url, options);  // Same as fetch()
 */

import Logger from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache for the auth token to avoid repeated AsyncStorage reads
let cachedToken: string | null = null;
let tokenLoaded = false;

// Sensitive fields to redact from logs (passwords etc.)
const REDACT_FIELDS = ['password', 'otp', 'otp_code', 'pin', 'secret'];

/**
 * Sanitize request body - remove sensitive fields before logging
 */
function sanitizeBody(body: string | null | undefined): string | undefined {
    if (!body) return undefined;
    try {
        const parsed = JSON.parse(body);
        const sanitized = { ...parsed };
        REDACT_FIELDS.forEach(field => {
            if (sanitized[field]) sanitized[field] = '***';
        });
        return JSON.stringify(sanitized);
    } catch {
        return body.substring(0, 500); // Not JSON, just truncate
    }
}

/**
 * apiFetch - Same API as native fetch(), but logs every request/response/error to backend
 */
export async function apiFetch(
    input: string | URL | Request,
    init?: RequestInit
): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();

    // 1. Prepare Headers with Auth Token
    const headers = new Headers(init?.headers || {});

    // Load token from cache or storage
    if (!tokenLoaded) {
        cachedToken = await AsyncStorage.getItem('@auth_token');
        tokenLoaded = true;
    }

    if (cachedToken) {
        headers.set('Authorization', `Bearer ${cachedToken}`);
    }

    if (init?.body) {
        if (init.body instanceof FormData) {
            if (headers.get('Content-Type') === 'multipart/form-data') {
                headers.delete('Content-Type');
            }
        } else if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
    }

    const newInit: RequestInit = {
        ...init,
        headers: headers
    };

    // Log the request (sanitize body)
    const bodyStr = newInit.body
        ? sanitizeBody(typeof newInit.body === 'string' ? newInit.body : String(newInit.body))
        : undefined;

    Logger.apiRequest(url, method, bodyStr);

    try {
        const response = await fetch(input, newInit);

        // OPTIMIZATION: Only read/log response body on failure or if it's small.
        // For successful requests, we just log the status code to save bandwidth/latency.
        if (response.ok) {
            Logger.apiResponse(url, method, response.status, '[Body omitted for performance]');
        } else {
            // Clone only on error to help debugging without slowing down the happy path
            const cloned = response.clone();
            try {
                const errorText = await cloned.text();
                Logger.apiResponse(url, method, response.status, errorText.substring(0, 800));
            } catch {
                Logger.apiResponse(url, method, response.status, '[Could not read error body]');
            }
        }

        return response;
    } catch (error: any) {
        Logger.apiError(url, method, error);
        throw error;
    }
}

/** Reset token cache (call on logout) */
export function resetApiTokenCache() {
    cachedToken = null;
    tokenLoaded = false;
}

/** Explicitly set token cache (call on login) */
export function setApiTokenCache(token: string) {
    cachedToken = token;
    tokenLoaded = true;
}

export default apiFetch;

