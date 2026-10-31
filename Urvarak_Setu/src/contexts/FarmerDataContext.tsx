import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/config';
import { apiFetch } from '../utils/apiClient';

export interface FarmerPrefetchData {
    fertilizers: any[];
    bookings: any[];
    landArea: number;
    season: string;
    farmerName: string;
    registry_id?: string;
    kisan_panjikaran_number?: string;
    retailer: any | null;
    counts: { daily: number; pending: number };
    fetchedAt: number; // timestamp — so screens know how fresh the data is
}

interface FarmerDataContextType {
    prefetchedData: FarmerPrefetchData | null;
    isReady: boolean; // true once prefetch is done (success or fail)
    prefetch: (farmerId: string, farmerName: string) => Promise<void>;
    clearData: () => void;
    refreshData: (farmerId: string, farmerName: string) => Promise<void>;
    updateKisanCode: (code: string, farmerId?: string) => Promise<void>;
}

const FarmerDataContext = createContext<FarmerDataContextType>({
    prefetchedData: null,
    isReady: false,
    prefetch: async () => { },
    clearData: () => { },
    refreshData: async () => { },
    updateKisanCode: async () => { },
});

export const useFarmerData = () => useContext(FarmerDataContext);

export const FarmerDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [prefetchedData, setPrefetchedData] = useState<FarmerPrefetchData | null>(null);
    const [isReady, setIsReady] = useState(false);

    /**
     * Called as soon as login session is confirmed (during splash).
     * Loads from AsyncStorage cache instantly (< 5ms), then fires network fetch in parallel.
     */
    const prefetch = useCallback(async (farmerId: string, farmerName: string) => {
        const CACHE_KEY = `farmer_dashboard_${farmerId}`;

        // 1. Instant Cache Hydration: Render in 0ms without waiting for network
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.fertilizers?.length || data.landArea || data.bookings) {
                    setPrefetchedData({
                        fertilizers: data.fertilizers || [],
                        bookings: data.bookings || [],
                        landArea: data.landArea || 0,
                        season: data.season || 'Rabi',
                        farmerName: data.farmerName || farmerName,
                        registry_id: data.registry_id || '',
                        kisan_panjikaran_number: data.kisan_panjikaran_number || '',
                        retailer: data.retailer || null,
                        counts: data.counts || { daily: 0, pending: 0 },
                        fetchedAt: data.timestamp || 0,
                    });
                    setIsReady(true); // Dashboard can render immediately from cache
                }
            }
        } catch (_) { }

        // 2. Fire network fetch in parallel (doesn't block the above)
        try {
            const timestamp = Date.now();
            const [quotaRes, bookingsRes] = await Promise.all([
                apiFetch(API_ENDPOINTS.getFarmerQuota, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ farmer_id: farmerId, _t: timestamp }),
                }).catch(() => null),
                apiFetch(API_ENDPOINTS.getFarmerBookings, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ farmer_id: farmerId, _t: timestamp }),
                }).catch(() => null),
            ]);

            let freshData: FarmerPrefetchData = {
                fertilizers: [],
                bookings: [],
                landArea: 0,
                season: 'Rabi',
                farmerName,
                registry_id: '',
                kisan_panjikaran_number: '',
                retailer: null,
                counts: { daily: 0, pending: 0 },
                fetchedAt: Date.now(),
            };

            if (quotaRes) {
                const quotaData = await quotaRes.json();
                if (quotaData.success && quotaData.data) {
                    freshData.fertilizers = quotaData.data.fertilizers || [];
                    freshData.landArea = quotaData.data.land_area || 0;
                    freshData.season = quotaData.data.season || 'Rabi';
                    freshData.farmerName = quotaData.data.farmer_name || farmerName;
                    freshData.registry_id = quotaData.data.registry_id || '';
                    freshData.kisan_panjikaran_number = quotaData.data.kisan_panjikaran_number || quotaData.data.kisan_code || '';
                    freshData.retailer = quotaData.data.retailer || null;
                    freshData.counts = {
                        daily: quotaData.data.daily_booking_count || 0,
                        pending: quotaData.data.pending_booking_count || 0,
                    };
                }
            }

            if (bookingsRes) {
                const bookingsData = await bookingsRes.json();
                if (bookingsData.success) {
                    freshData.bookings = bookingsData.data || [];
                }
            }

            // Update context with fresh data
            setPrefetchedData(freshData);
            setIsReady(true);

            // Save to AsyncStorage for next cold start
            try {
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                    ...freshData,
                    timestamp: Date.now(),
                }));
            } catch (_) { }

        } catch (error) {
            console.error('FarmerDataContext prefetch error:', error);
            setIsReady(true); // Mark ready even on error so dashboard doesn't hang
        }
    }, []);

    /** Silent background refresh — called by dashboard's pull-to-refresh or auto-interval */
    const refreshData = useCallback(async (farmerId: string, farmerName: string) => {
        await prefetch(farmerId, farmerName);
    }, [prefetch]);

    /** Update Kisan Code in context and cache instantly */
    const updateKisanCode = useCallback(async (code: string, farmerId?: string) => {
        setPrefetchedData(prev => prev ? { ...prev, kisan_panjikaran_number: code } : null);
        if (farmerId) {
            const CACHE_KEY = `farmer_dashboard_${farmerId}`;
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const data = JSON.parse(cached);
                    data.kisan_panjikaran_number = code;
                    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
                }
            } catch (_) { }
        }
    }, []);

    /** Called on logout to wipe data */
    const clearData = useCallback(() => {
        setPrefetchedData(null);
        setIsReady(false);
    }, []);

    return (
        <FarmerDataContext.Provider value={{ prefetchedData, isReady, prefetch, clearData, refreshData, updateKisanCode }}>
            {children}
        </FarmerDataContext.Provider>
    );
};
