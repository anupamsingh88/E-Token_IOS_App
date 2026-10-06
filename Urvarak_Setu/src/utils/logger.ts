/**
 * App Logger - Sends logs to backend server for production debugging
 * Logs are stored in MySQL database and viewable at /backend/view_logs.php
 */

import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Config ───────────────────────────────────────────────────────────────────
const LOG_ENDPOINT = `${API_BASE_URL}/save_log.php`;
const APP_LOG_SECRET = 'sfms_log_2026'; // Must match LOG_SECRET in save_log.php
const APP_VERSION = '1.0.0';
const BATCH_INTERVAL_MS = 5000;  // Send logs every 5 seconds
const MAX_QUEUE_SIZE = 50;       // Send immediately if queue is this big

// ─── Types ────────────────────────────────────────────────────────────────────
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'API_REQ' | 'API_RES' | 'API_ERR';

interface LogEntry {
    level: LogLevel;
    url?: string;
    method?: string;
    requestBody?: string;
    statusCode?: number;
    response?: string;
    error?: string;
    farmerId?: string;
    deviceInfo?: string;
    appVersion?: string;
    timestamp?: string;
}

// ─── Internal State ───────────────────────────────────────────────────────────
let logQueue: LogEntry[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let currentFarmerId: string | null = null;

const deviceInfo = `${Platform.OS} ${Platform.Version}`;

// ─── Get Farmer ID (from session) ─────────────────────────────────────────────
async function loadFarmerId(): Promise<void> {
    try {
        const session = await AsyncStorage.getItem('user_session');
        if (session) {
            const data = JSON.parse(session);
            currentFarmerId = data.farmer_id ?? null;
        }
    } catch (_) { /* ignore */ }
}

// ─── Build Log Entry ──────────────────────────────────────────────────────────
function buildEntry(partial: Partial<LogEntry> & { level: LogLevel }): LogEntry {
    return {
        ...partial,
        farmerId: currentFarmerId ?? undefined,
        deviceInfo,
        appVersion: APP_VERSION,
        timestamp: new Date().toISOString(),
    };
}

// ─── Add to Queue ─────────────────────────────────────────────────────────────
function enqueue(entry: LogEntry): void {
    // Always print to console in dev
    const prefix = `[${entry.level}]`;
    if (entry.level === 'ERROR' || entry.level === 'API_ERR') {
        console.error(`${prefix} ${entry.url ?? ''} ${entry.error ?? ''}`);
    } else if (entry.level === 'WARN') {
        console.warn(`${prefix} ${entry.url ?? ''}`);
    } else {
        console.log(`${prefix} ${entry.url ?? entry.response ?? ''}`);
    }

    logQueue.push(entry);

    // Send immediately if queue is large enough
    if (logQueue.length >= MAX_QUEUE_SIZE) {
        flush();
        return;
    }

    // Otherwise schedule a batch send
    if (!batchTimer) {
        batchTimer = setTimeout(() => flush(), BATCH_INTERVAL_MS);
    }
}

// ─── Flush Queue to Server ────────────────────────────────────────────────────
async function flush(): Promise<void> {
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }
    if (logQueue.length === 0) return;

    const toSend = [...logQueue];
    logQueue = [];

    try {
        await fetch(LOG_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Secret': APP_LOG_SECRET,
            },
            body: JSON.stringify({ logs: toSend }),
        });
    } catch (e) {
        // Silently fail - don't let logging crash the app
        // Put failed logs back (max 20 to avoid memory growth)
        logQueue = [...toSend.slice(-20), ...logQueue];
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const Logger = {
    /** Call once when app starts */
    init: async (): Promise<void> => {
        await loadFarmerId();
        console.log('[LOGGER] Initialized. Logs → backend/view_logs.php');
    },

    /** Call when farmer logs in to attach their ID to future logs */
    setFarmerId: (id: string | null): void => {
        currentFarmerId = id;
    },

    info: (message: string): void => {
        enqueue(buildEntry({ level: 'INFO', response: message }));
    },

    warn: (message: string): void => {
        enqueue(buildEntry({ level: 'WARN', error: message }));
    },

    error: (message: string, err?: any): void => {
        const errorStr = err
            ? `${message}: ${err?.message ?? String(err)}`
            : message;
        enqueue(buildEntry({ level: 'ERROR', error: errorStr }));
    },

    apiRequest: (url: string, method: string, body?: string): void => {
        enqueue(buildEntry({ level: 'API_REQ', url, method, requestBody: body }));
    },

    apiResponse: (url: string, method: string, statusCode: number, response: string): void => {
        enqueue(buildEntry({ level: 'API_RES', url, method, statusCode, response }));
    },

    apiError: (url: string, method: string, error: any): void => {
        const errorStr = error?.message ?? String(error);
        enqueue(buildEntry({ level: 'API_ERR', url, method, error: errorStr }));
    },

    /** Force-send all pending logs (call on app background / logout) */
    flush,
};

export default Logger;
