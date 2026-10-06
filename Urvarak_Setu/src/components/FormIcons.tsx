import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

// User Icon
export const UserIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
);

// Phone Icon
export const PhoneIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// ID Card Icon
export const IdCardIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="2"
            stroke={color}
            strokeWidth="2"
        />
        <Circle cx="8" cy="11" r="2" stroke={color} strokeWidth="2" />
        <Path
            d="M5 15a3 3 0 0 1 6 0"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
        <Path
            d="M14 10h5M14 14h3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </Svg>
);

// Map Pin Icon (for location fields)
export const MapPinIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </Svg>
);

// Document Icon (for Khasra number)
export const DocumentIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// Area/Measurement Icon (for land area)
export const AreaIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M3 9h18M9 21V9"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </Svg>
);

// Lock Icon (for OTP/password fields)
export const LockIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M7 11V7a5 5 0 0 1 10 0v4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// Shield Check Icon (for security)
export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Wheat Icon (for agriculture theme)
export const WheatIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M2.05 13a9 9 0 0 1 13 6 9 9 0 0 1-6 3m-4.38-2.38A9 9 0 0 1 11 11m0 0a9 9 0 0 0 10.5 4 9 9 0 0 1-5 2m4.63-2.38a9 9 0 0 0-4-11 9 9 0 0 1-2 5m2.37-4.63a9 9 0 0 1-5.75 1.5 9 9 0 0 0-5 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12 11V2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Chevron Right Icon
export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Log Out Icon
export const LogOutIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 17l5-5-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
// Pie Chart Icon
export const PieChartIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <Path d="M22 12A10 10 0 0 0 12 2v10z" />
    </Svg>
);
