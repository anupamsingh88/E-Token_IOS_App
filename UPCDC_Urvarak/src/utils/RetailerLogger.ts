import { apiFetch } from './apiClient';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/config';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'API_REQ' | 'API_RES' | 'API_ERR';

export const logToBackend = async (
    level: LogLevel,
    message: string,
    retailerId?: string | null,
    details?: {
        apiUrl?: string;
        method?: string;
        requestBody?: any;
        statusCode?: number;
        response?: any;
        errorMsg?: string;
    }
) => {
    try {
        const payload = {
            log_level: level,
            message,
            retailer_id: retailerId || 'UNKNOWN',
            api_url: details?.apiUrl || '',
            method: details?.method || '',
            request_body: details?.requestBody ? JSON.stringify(details.requestBody) : '',
            status_code: details?.statusCode || null,
            response: details?.response ? JSON.stringify(details.response) : '',
            error_msg: details?.errorMsg || '',
            device_info: `${Platform.OS} ${Platform.Version}`,
            app_version: '1.0.0' // Should match package.json
        };

        await apiFetch(`${API_BASE_URL}/app_logger.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        // Silent fail for logger
        console.warn('Logger failed:', e);
    }
};

export const RetailerLogger = {
    info: (msg: string, retailerId?: string | null) => logToBackend('INFO', msg, retailerId),
    warn: (msg: string, retailerId?: string | null) => logToBackend('WARN', msg, retailerId),
    error: (msg: string, error?: any, retailerId?: string | null) => logToBackend('ERROR', msg, retailerId, { errorMsg: String(error) }),

    apiReq: (url: string, method: string, body: any, retailerId?: string | null) =>
        logToBackend('API_REQ', `API Request: ${url}`, retailerId, { apiUrl: url, method, requestBody: body }),

    apiRes: (url: string, status: number, response: any, retailerId?: string | null) =>
        logToBackend('API_RES', `API Response from ${url}`, retailerId, { apiUrl: url, statusCode: status, response }),

    apiErr: (url: string, status: number, error: any, retailerId?: string | null) =>
        logToBackend('API_ERR', `API Error from ${url}`, retailerId, { apiUrl: url, statusCode: status, errorMsg: String(error) })
};
