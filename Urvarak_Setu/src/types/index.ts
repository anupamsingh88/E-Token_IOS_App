// TypeScript Type Definitions

export interface User {
    id: string;
    name: string;
    mobileNumber: string;
    role: 'farmer' | 'retailer';
    createdAt: string;
}

export interface Farmer extends User {
    role: 'farmer';
    address?: string;
    aadhaarNumber?: string;
    landArea?: number; // in hectares
    district?: string;
    village?: string;
}

export interface Retailer extends User {
    role: 'retailer';
    shopName: string;
    address: string;
    licenseNumber?: string;
    district: string;
    location?: {
        latitude: number;
        longitude: number;
    };
}

export interface Fertilizer {
    id: string;
    name: string;
    nameHindi: string;
    pricePerBag: number;
    weightPerBag: number; // in kg
    imageUrl?: string;
    description?: string;
    descriptionHindi?: string;
}

export interface FertilizerQuota {
    fertilizerId: string;
    allowedQuantity: number; // in bags
    usedQuantity: number;
    remainingQuantity: number;
    calculatedBasedOn: 'landArea' | 'fixed';
}

export interface TimeSlot {
    id: string;
    startTime: string; // ISO string or HH:MM format
    endTime: string;
    availableSlots: number;
    bookedSlots: number;
    isAvailable: boolean;
}

export interface BookingItem {
    id: string; // Fertilizer ID
    name: string;
    nameHindi: string;
    quantity: number;
    price: number;
}

export interface Booking {
    id: string;
    farmerId: string;
    retailerId: string;
    items: BookingItem[];
    totalPrice: number;
    timeSlot?: TimeSlot; // Optional or just remove if date is enough
    bookingDate: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    tokenNumber: string;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
}

export interface BookingRequest {
    fertilizerId: string;
    retailerId: string;
    quantity: number;
    timeSlotId: string;
    bookingDate: string;
}

// Navigation Types
export type RootStackParamList = {
    Splash: undefined;
    Home: undefined;
    FarmerRegistration: undefined;
    FarmerLogin: undefined;
    RetailerRegistration: undefined;
    RetailerLogin: undefined;
    FarmerDashboard: undefined;
    RetailerSelection: { fertilizerId: string };
    SlotBooking: { fertilizerId: string; retailerId: string };
    TokenQR: { bookingId: string };
    RetailerDashboard: undefined;
};

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface LoginResponse {
    user: Farmer | Retailer;
    token: string;
}

export interface RegistrationResponse {
    user: Farmer | Retailer;
    token: string;
    message: string;
}
