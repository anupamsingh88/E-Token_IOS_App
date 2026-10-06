import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_ENDPOINTS } from '../config/config';
import { apiFetch } from '../utils/apiClient';

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
    app_instructions?: AppInstructions[];
    notices?: string[];
    helpline_number?: string;
    helpline_title?: string;
    helpline_description?: string;
    helpline_button_text?: string;
    farmer_advice_title?: string;
    notices_title?: string;
    advice_screen_title?: string;
    advice_screen_subtitle?: string;
    min_app_version?: string;
    latest_app_version?: string;
    latest_app_version_name?: string;
    force_update?: boolean;
    force_update_active?: boolean;
    farmer_app_min_version_code?: number;
    min_app_version_code?: number;
    play_store_url?: string;
    update_title?: string;
    update_message?: string;
    // legacy — kept for any other screens that may still use it
    app_content?: Record<string, string>;
}

interface AppInstructions {
    title: string;
    description: string;
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
    advisory_tips: [],
    app_instructions: [],
    notices: [],
    app_content: {},
    helpline_number: '1800-180-1551',
    helpline_title: 'किसान सहायता केंद्र',
    helpline_description: 'किसी भी सहायता के लिए कॉल करें',
    helpline_button_text: 'कॉल करें',
    farmer_advice_title: '🌾 किसान सलाह',
    notices_title: '📢 महत्वपूर्ण सूचना',
    advice_screen_title: '💡 ऐप निर्देश और सहायता',
    advice_screen_subtitle: 'ऐप का उपयोग कैसे करें',
    min_app_version: '1.0.0',
    latest_app_version: '1.0.0',
    latest_app_version_name: '1.0.0',
    force_update: false,
    force_update_active: false,
    farmer_app_min_version_code: 1,
    min_app_version_code: 1,
    play_store_url: 'https://play.google.com/store/apps/details?id=com.weknowtech.urvaraksetu',
    update_title: 'नया अपडेट उपलब्ध है',
    update_message: 'उर्वरक सेतु ऐप का नया वर्ज़न उपलब्ध है। आगे जारी रखने के लिए कृपया अभी अपडेट करें।',
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

            const response = await apiFetch(API_ENDPOINTS.getSettings);
            const result = await response.json();

            if (result.success) {
                setSettings(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch settings');
            }
        } catch (err: any) {
            console.error('Settings fetch error:', err);
            setError(err.message);
            // Keep default settings on error
            setSettings(defaultSettings);
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
