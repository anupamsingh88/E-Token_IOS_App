/**
 * API Configuration
 * 
 * IMPORTANT: Update the IP address here when your local network IP changes.
 * To find your current IP, run: node get_ip.js
 * 
 * Current IP: 10.176.84.154
 * Last Updated: 2026-03-11
 */

// Base URL for backend API
// IMPORTANT: Update this IP address if your local network IP changes
export const API_BASE_URL = 'http://192.168.1.55:8080/backend';
// export const API_BASE_URL = 'http://192.168.0.142/backend';
// export const API_BASE_URL = 'https://ayodhyatourist.in/backend';
// export const API_BASE_URL = 'https://risingayodhya.com/Urvarak/backend';

/**
 * API Endpoints
 * All API endpoints are defined here for easy maintenance
 */
export const API_ENDPOINTS = {
    // Farmer endpoints
    registerFarmer: `${API_BASE_URL}/register_farmer.php`,
    loginFarmer: `${API_BASE_URL}/login_farmer.php`,
    sendOtp: `${API_BASE_URL}/send_otp.php`,
    verifyOtp: `${API_BASE_URL}/verify_otp.php`,
    getDistricts: `${API_BASE_URL}/get_districts.php`,
    getLocations: `${API_BASE_URL}/get_locations.php`,
    getRetailersByArea: `${API_BASE_URL}/get_retailers_by_area.php`,
    requestRetailerChange: `${API_BASE_URL}/request_retailer_change.php`,
    getRetailerChangeRequests: `${API_BASE_URL}/request_retailer_change.php`,
    getFarmerQuota: `${API_BASE_URL}/get_farmer_quota.php`,
    getFarmerProfile: `${API_BASE_URL}/get_farmer_profile.php`,
    getFarmerBookings: `${API_BASE_URL}/get_farmer_bookings.php`,
    getRetailersWithStock: `${API_BASE_URL}/get_retailers_with_stock.php`,
    bookSlot: `${API_BASE_URL}/book_slot.php`,
    rescheduleBooking: `${API_BASE_URL}/reschedule_booking.php`,

    getRetailerForecast: `${API_BASE_URL}/get_retailer_forecast.php`, // Retailer forecast endpoint

    // Retailer endpoints
    registerRetailer: `${API_BASE_URL}/register_retailer.php`,
    loginRetailer: `${API_BASE_URL}/login_retailer.php`,

    // Super Admin endpoints
    getUsersPendingApproval: `${API_BASE_URL}/get_pending_approvals.php`, // Renamed from getPendingApprovals
    updateApprovalStatus: `${API_BASE_URL}/update_approval_status.php`,
    getSeasonalSetting: `${API_BASE_URL}/get_seasonal_setting.php`,
    updateSeasonalSetting: `${API_BASE_URL}/update_seasonal_setting.php`,
    manageUsers: `${API_BASE_URL}/manage_users.php`, // Moved from SuperAdmin User Management section
    getFertilizerPrices: `${API_BASE_URL}/get_fertilizer_prices.php`, // New endpoint

    // Advisory Tips — DEPRECATED (advisory_tips table removed)
    // Tips are now served via get_settings.php as settings.advisory_tips
    // getAdvisoryTips: `${API_BASE_URL}/get_advisory_tips.php`,     // REMOVED
    // manageAdvisoryTips: `${API_BASE_URL}/manage_advisory_tips.php`, // REMOVED

    // App Content Management endpoints
    getAppContent: `${API_BASE_URL}/get_app_content.php`,
    manageAppContent: `${API_BASE_URL}/manage_app_content.php`,

    // Settings endpoints
    getSettings: `${API_BASE_URL}/get_settings.php`,
    updateSetting: `${API_BASE_URL}/update_setting.php`,

    // Media Upload
    uploadMedia: `${API_BASE_URL}/upload_media.php`,
    uploadFarmerPhoto: `${API_BASE_URL}/upload_farmer_photo.php`,
    updateFarmerProfile: `${API_BASE_URL}/update_farmer_profile.php`,

    // Master Location Metadata (External)
    getMasterLocations: `https://upcod.in/api/master_block.php`,
    getRetailerInfo: `${API_BASE_URL}/get_retailer_info.php`,
    cancelBooking: `${API_BASE_URL}/cancel_booking.php`,
    confirmBooking: `${API_BASE_URL}/confirm_booking.php`,

    // Add more endpoints here as needed
} as const;

// SuperAdmin Credentials (hardcoded for now)
export const SUPERADMIN_CREDENTIALS = {
    username: 'sadmin',
    password: 'weknowtech'
} as const;

// Export for backwards compatibility
export { API_BASE_URL as API_URL };
