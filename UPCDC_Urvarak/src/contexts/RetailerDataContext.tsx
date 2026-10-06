import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/apiClient';
import { API_BASE_URL, API_ENDPOINTS } from '../config/config';

interface RequestCounts {
    registrations: { pending: number; approved: number; rejected: number };
    bookings: { pending: number; approved: number; cancelled: number; extended: number; collected: number };
    stock: { urea: number; dap: number; npk: number; mop: number };
    total_farmers: number;
}

interface RetailerDataContextType {
    retailerDetails: any;
    counts: RequestCounts | null;
    loading: boolean;
    isReady: boolean;
    refreshData: (retailerId: string) => Promise<void>;
    clearData: () => Promise<void>;
}

const RetailerDataContext = createContext<RetailerDataContextType | undefined>(undefined);

const CACHE_KEY_DETAILS = '@Urvarak_Retailer_Details_Cache';
const CACHE_KEY_COUNTS = '@Urvarak_Retailer_Counts_Cache';
const CACHE_TIME_KEY = '@Urvarak_Retailer_Cache_Time';

export const RetailerDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [retailerDetails, setRetailerDetails] = useState<any>(null);
    const [counts, setCounts] = useState<RequestCounts | null>(null);
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const isReadyRef = React.useRef(false);
    const latestRequestedIdRef = React.useRef<string | null>(null);
    const currentLoadedIdRef = React.useRef<string | null>(null);

    const refreshData = useCallback(async (rId: string) => {
        if (!rId) return;
        latestRequestedIdRef.current = rId;
        
        // If the retailer ID is changing, clear any in-memory old data immediately to prevent flashing old data
        if (currentLoadedIdRef.current !== rId) {
            setRetailerDetails(null);
            setCounts(null);
            setIsReady(false);
            isReadyRef.current = false;
        }

        setLoading(true);
        try {
            // 1. Load from cache first for instant UI, but only if not already ready
            if (!isReadyRef.current) {
                const [cachedDetails, cachedCounts, cacheTime] = await Promise.all([
                    AsyncStorage.getItem(CACHE_KEY_DETAILS),
                    AsyncStorage.getItem(CACHE_KEY_COUNTS),
                    AsyncStorage.getItem(CACHE_TIME_KEY),
                ]);

                if (latestRequestedIdRef.current !== rId) return;

                if (cachedDetails && cachedCounts) {
                    const parsedDetails = JSON.parse(cachedDetails);
                    // Only restore from cache if the IDs match to prevent cross-session pollution
                    if (parsedDetails.id?.toString() === rId || parsedDetails.retailer_id?.toString() === rId) {
                        setRetailerDetails(parsedDetails);
                        setCounts(JSON.parse(cachedCounts));
                        currentLoadedIdRef.current = rId;
                        setIsReady(true);
                        isReadyRef.current = true;
                    } else {
                        // Cache belongs to a different user, clear it!
                        AsyncStorage.multiRemove([CACHE_KEY_DETAILS, CACHE_KEY_COUNTS, CACHE_TIME_KEY]);
                    }
                }
            }

            // 2. Fetch fresh data from server
            const timestamp = Date.now();
            const detailsPromise = apiFetch(`${API_ENDPOINTS.getLocations}?type=retailer_details&parent_id=${rId}&_t=${timestamp}`);
            const requestsPromise = apiFetch(API_ENDPOINTS.getRetailerRequests, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retailer_id: rId, _t: timestamp })
            });

            const [detailsRes, requestsRes] = await Promise.all([detailsPromise, requestsPromise]);
            if (latestRequestedIdRef.current !== rId) return;

            const detailsJson = await detailsRes.json();
            const requestsJson = await requestsRes.json();
            if (latestRequestedIdRef.current !== rId) return;

            if (detailsJson.success && detailsJson.data) {
                setRetailerDetails(detailsJson.data);
                currentLoadedIdRef.current = rId;
                await AsyncStorage.setItem(CACHE_KEY_DETAILS, JSON.stringify(detailsJson.data));
            }

            if (latestRequestedIdRef.current !== rId) return;

            if (requestsJson.status === 'success') {
                const data = requestsJson.data;
                const bookingsList = data.bookings || [];
                
                const uniquePending = new Set(
                    bookingsList
                        .filter((b: any) => {
                            const s = b.status?.toLowerCase();
                            return s === 'pending' || s === 'booked';
                        })
                        .map((b: any) => b.order_id || b.booking_id || b.id)
                ).size;

                const uniqueApproved = new Set(
                    bookingsList
                        .filter((b: any) => {
                            const s = b.status?.toLowerCase();
                            return s === 'approved' || s === 'confirmed';
                        })
                        .map((b: any) => b.order_id || b.booking_id || b.id)
                ).size;

                const regSummary = data.today_summary?.registrations || { pending: 0, approved: 0, rejected: 0 };
                const bookSummary = data.today_summary?.bookings || { pending: 0, approved: 0, cancelled: 0, collected: 0 };

                const totalFarmers = 
                    data.retailer_info?.total_farmers ||
                    data.total_farmers || 
                    data.total_members || 
                    0;

                const newCounts: RequestCounts = {
                    registrations: regSummary,
                    bookings: { 
                        ...bookSummary,
                        pending: uniquePending,
                        approved: uniqueApproved
                    },
                    stock: data.current_stock || { urea: 0, dap: 0, npk: 0, mop: 0 },
                    total_farmers: totalFarmers
                };

                setCounts(newCounts);
                await AsyncStorage.setItem(CACHE_KEY_COUNTS, JSON.stringify(newCounts));
                await AsyncStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            }
        } catch (error) {
            console.error('Retailer Data Refresh Error:', error);
        } finally {
            if (latestRequestedIdRef.current === rId) {
                setLoading(false);
                setIsReady(true);
            }
        }
    }, []);

    const clearData = useCallback(async () => {
        latestRequestedIdRef.current = null;
        currentLoadedIdRef.current = null;
        setRetailerDetails(null);
        setCounts(null);
        setIsReady(false);
        isReadyRef.current = false;
        try {
            await AsyncStorage.multiRemove([CACHE_KEY_DETAILS, CACHE_KEY_COUNTS, CACHE_TIME_KEY]);
        } catch (e) {
            console.error('Failed to clear AsyncStorage cache:', e);
        }
    }, []);

    return (
        <RetailerDataContext.Provider value={{ retailerDetails, counts, loading, isReady, refreshData, clearData }}>
            {children}
        </RetailerDataContext.Provider>
    );
};

export const useRetailerData = () => {
    const context = useContext(RetailerDataContext);
    if (context === undefined) {
        throw new Error('useRetailerData must be used within a RetailerDataProvider');
    }
    return context;
};
