// App Constants
export const APP_NAME = 'उर्वरक वितरण प्रणाली'; // Fertilizer Distribution System

// API Configuration - See src/config/config.ts for actual backend URLs
// This is kept for backwards compatibility only
export const API_BASE_URL = 'https://api.example.com';

// Color Palette - Darker, Premium Theme
export const COLORS = {
  // Primary Colors (Deep Purple)
  primary: '#7C3AED',           // Deep Purple
  primaryLight: '#A855F7',      // Vibrant Purple
  primaryDark: '#6D28D9',       // Darker Purple

  // Secondary Colors (Hot Pink)
  secondary: '#EC4899',         // Deep Pink
  secondaryLight: '#F472B6',    // Hot Pink
  secondaryDark: '#DB2777',     // Darker Pink

  // Fertilizer Colors
  ureaBlue: '#3B82F6',         // Blue for Urea (N)
  dapRed: '#DC2626',           // Red for DAP (P)
  npkYellow: '#FBBF24',        // Yellow/Gold for NPK
  mopBrown: '#92400E',         // Brown for MOP (K)

  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',

  // Backgrounds
  background: '#F9FAFB',       // Light Gray
  backgroundLight: '#FFFFFF',
  backgroundDark: '#F3F4F6',

  // Text
  textPrimary: '#111827',      // Almost Black
  textSecondary: '#6B7280',    // Gray
  textLight: '#9CA3AF',        // Light Gray
  textOnPrimary: '#FFFFFF',    // White on colored backgrounds

  // Grays
  gray: '#D1D5DB',
  grayLight: '#E5E7EB',
  grayDark: '#9CA3AF',

  // States
  success: '#10B981',          // Green
  warning: '#F59E0B',          // Orange
  error: '#EF4444',            // Red
  danger: '#EF4444',           // Red (alias for error)
  info: '#3B82F6',             // Blue

  // Premium Gold
  gold: '#D97706',             // Dark Gold
  goldLight: '#FBBF24',        // Bright Gold
  goldDark: '#B45309',         // Deep Gold
  goldBorder: '#FDE68A',       // Pale Gold for borders
};

// Gradients
export const GRADIENTS = {
  primary: ['#7C3AED', '#A855F7'] as const,        // Deep to Vibrant Purple
  secondary: ['#EC4899', '#F472B6'] as const,      // Deep to Hot Pink
  purple: ['#7C3AED', '#EC4899'] as const,         // Purple to Pink
  pink: ['#F472B6', '#FBBF24'] as const,           // Pink to Gold
  blue: ['#3B82F6', '#2563EB'] as const,           // Blue gradient
  warm: ['#FFF3E0', '#FFFBF5'] as const,           // Warm backgrounds
  gold: ['#D97706', '#F59E0B'] as const,           // Gold Gradient (Dark to Light)
  glass: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.3)'] as const, // Glass effect
};

// Spacing
import { moderateScale, verticalScale } from '../utils/responsive';

export const SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

// Font Sizes
export const FONT_SIZES = {
  xs: moderateScale(15),
  sm: moderateScale(17),
  md: moderateScale(19),
  lg: moderateScale(22),
  xl: moderateScale(26),
  xxl: moderateScale(32),
  xxxl: moderateScale(40),
};

// Font Weights
export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  round: 999,
};

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Button Sizes
export const BUTTON_SIZES = {
  small: verticalScale(44),
  medium: verticalScale(52),
  large: verticalScale(60),
};

// Input Height
export const INPUT_HEIGHT = verticalScale(65);

// Hindi Text
export const HINDI_TEXT = {
  // Navigation
  home: 'होम',
  advice: 'सलाह',
  market: 'बाज़ार',
  profile: 'प्रोफाइल',

  // Common
  welcome: 'स्वागत है',
  namaste: 'नमस्ते',
  back: 'वापस जाएं',
  submit: 'जमा करें',
  cancel: 'रद्द करें',
  continue: 'जारी रखें',
  logout: 'लॉगआउट',

  // Auth
  login: 'लॉगिन करें',
  register: 'पंजीकरण करें',
  farmerLogin: 'किसान लॉगिन',
  farmerRegistration: 'किसान पंजीकरण',
  retailerLogin: 'दुकानदार लॉगिन',
  retailerRegistration: 'दुकानदार पंजीकरण',

  // Form Fields
  name: 'नाम',
  mobileNumber: 'मोबाइल नंबर',
  password: 'पासवर्ड',
  address: 'पता',
  aadhaarNumber: 'आधार नंबर',
  landArea: 'जमीन का क्षेत्रफल',

  // Dashboard
  bookSlot: 'स्लॉट बुक करें',
  myBookings: 'मेरी बुकिंग',
  fertilizerQuota: 'उर्वरक कोटा',
  remainingQuota: 'शेष कोटा',
  selectFertilizer: 'उर्वरक चुनें',
  selectRetailer: 'दुकान चुनें',
  selectTimeSlot: 'समय चुनें',
  confirmBooking: 'बुकिंग पुष्टि करें',
  bookingConfirmed: 'बुकिंग पूर्ण',

  // Fertilizers
  urea: 'यूरिया',
  dap: 'डी.ए.पी.',
  npk: 'एन.पी.के.',
  mop: 'एम.ओ.पी.',

  // Units
  kg: 'किलो',
  bags: 'बोरी',
  perBag: 'प्रति बोरी',
  rupees: '₹',
  quantity: 'मात्रा',

  //  Stats
  used: 'उपयोग किया',
  remaining: 'शेष',
  total: 'कुल',

  // Token
  token: 'टोकन',
  qrCode: 'QR कोड',
  saveQR: 'QR कोड सेव करें',
  share: 'शेयर करें',
};
