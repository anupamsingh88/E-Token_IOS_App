import { apiFetch } from '../utils/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_ENDPOINTS } from '../config/config';

// Settings interface
interface AppSettings {
    app_name: string;
    app_heading: string;
    app_tagline: string;
    logo_url: string;
    icon_url: string;
    urea_price: number;
    dap_price: number;
    npk_price: number;
    mop_price: number;
    current_season: string;
    enable_registrations: boolean;
    seasonal_settings: {
        [season: string]: {
            [fertilizer: string]: number;
        };
    };
    advisory_tips: AdvisoryTip[];
}

interface AdvisoryTip {
    id: number;
    title: string;
    description: string;
    type: string;
    season: string;
    order: number;
}

interface SettingsContextType {
    settings: AppSettings | null;
    loading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
    updateSetting: (key: string, value: any) => Promise<boolean>;
}

const defaultSettings: AppSettings = {
    app_name: 'उर्वरक वितरण प्रणाली',
    app_heading: 'स्वागत है',
    app_tagline: 'किसानों की सेवा में',
    logo_url: '',
    icon_url: '',
    urea_price: 300,
    dap_price: 1350,
    npk_price: 1200,
    mop_price: 1100,
    current_season: 'Rabi',
    enable_registrations: true,
    seasonal_settings: {},
    advisory_tips: []
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    loading: false,
    error: null,
    refreshSettings: async () => { },
    updateSetting: async () => false
});

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings | null>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Fetching settings from:', API_ENDPOINTS.getSettings);
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 30000)
            );

            // Race fetch against timeout
            const response = await Promise.race([
                apiFetch(API_ENDPOINTS.getSettings),
                timeoutPromise
            ]) as Response;

            const result = await response.json();

            if (result.success) {
                setSettings(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch settings');
            }
        } catch (err: any) {
            console.log('Settings fetch failed (using defaults):', err.message);
            // Don't set visible error state for network issues to avoid UI disruption
            // just use default settings silently or with a log
            setSettings(defaultSettings);

            // Only set error if it's NOT a network error, to avoid scaring the user
            // or maybe set a specific "offline" flag if needed in future
            if (err.message !== 'Network request failed' && err.message !== 'Request timed out') {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshSettings = async () => {
        await fetchSettings();
    };

    const updateSetting = async (key: string, value: any): Promise<boolean> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.updateSetting, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    setting_key: key,
                    setting_value: value
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update local settings
                await refreshSettings();
                return true;
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            console.error('Setting update error:', err);
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                loading,
                error,
                refreshSettings,
                updateSetting
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};
