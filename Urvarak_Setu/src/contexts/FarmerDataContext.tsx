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
}

const FarmerDataContext = createContext<FarmerDataContextType>({
    prefetchedData: null,
    isReady: false,
    prefetch: async () => { },
    clearData: () => { },
    refreshData: async () => { },
});

export const useFarmerData = () => useContext(FarmerDataContext);

export const FarmerDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [prefetchedData, setPrefetchedData] = useState<FarmerPrefetchData | null>(null);
    const [isReady, setIsReady] = useState(false);

    /**
     * Called as soon as login session is confirmed (during splash).
     * Loads from AsyncStorage cache instantly, then fires network fetch in parallel.
     */
    const prefetch = useCallback(async (farmerId: string, farmerName: string) => {
        const CACHE_KEY = `farmer_dashboard_${farmerId}`;

        // 1. Load cache immediately (< 5ms) so data is ready before splash ends
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                // Only use cache if it's less than 10 minutes old
                const isFresh = Date.now() - (data.timestamp || 0) < 10 * 60 * 1000;
                if (isFresh && data.fertilizers?.length) {
                    setPrefetchedData({
                        fertilizers: data.fertilizers || [],
                        bookings: data.bookings || [],
                        landArea: data.landArea || 0,
                        season: data.season || 'Rabi',
                        farmerName: data.farmerName || farmerName,
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
            const [quotaRes, bookingsRes] = await Promise.all([
                apiFetch(API_ENDPOINTS.getFarmerQuota, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ farmer_id: farmerId }),
                }).catch(() => null),
                apiFetch(API_ENDPOINTS.getFarmerBookings, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ farmer_id: farmerId }),
                }).catch(() => null),
            ]);

            let freshData: FarmerPrefetchData = {
                fertilizers: [],
                bookings: [],
                landArea: 0,
                season: 'Rabi',
                farmerName,
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

    /** Called on logout to wipe data */
    const clearData = useCallback(() => {
        setPrefetchedData(null);
        setIsReady(false);
    }, []);

    return (
        <FarmerDataContext.Provider value={{ prefetchedData, isReady, prefetch, clearData, refreshData }}>
            {children}
        </FarmerDataContext.Provider>
    );
};
