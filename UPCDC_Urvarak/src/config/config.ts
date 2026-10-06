/**
 * API Configuration
 * 
 * IMPORTANT: Update the IP address here when your local network IP changes.
 * To find your current IP, run: node get_ip.js
 * 
 * Current IP: 192.168.29.97
 * Last Updated: 2026-02-10
 */

// Base URL for backend API
// IMPORTANT: Update this IP address if your local network IP changes
export const API_BASE_URL = 'http://192.168.1.55:8080/backend';
// export const API_BASE_URL = 'https://risingayodhya.com/Urvarak/backend';

// Centralized UPCDC Web Portal URLs (Single Source of Truth)
export const UPCDC_BASE_URL = 'https://upcdc.in';
export const UPCDC_PORTAL_URL = `${UPCDC_BASE_URL}/index_1.php?is_from_app=1`;
export const UPCDC_CHECK_URL = `${UPCDC_BASE_URL}/index_1.php`;

/**
 * API Endpoints
 * All API endpoints are defined here for easy maintenance
 */
export const API_ENDPOINTS = {
    // UPCDC Web Portal
    upcdcPortal: UPCDC_PORTAL_URL,
    upcdcCheck: UPCDC_CHECK_URL,

    // Retailer Auth
    registerRetailer: `${API_BASE_URL}/retailer_register.php`,
    loginRetailer: `${API_BASE_URL}/retailer_login.php`,

    // Retailer Approvals
    getRetailerRequests: `${API_BASE_URL}/retailer_get_requests.php`,
    manageRegistration: `${API_BASE_URL}/retailer_manage_registration.php`,
    updateFarmer: `${API_BASE_URL}/retailer_update_farmer.php`,
    manageBooking: `${API_BASE_URL}/retailer_manage_booking.php`,
    manageRetailerChange: `${API_BASE_URL}/retailer_manage_change.php`,

    // Location Data
    getLocations: `${API_BASE_URL}/retailer_get_locations.php`,

    // Media Upload
    uploadMedia: `${API_BASE_URL}/retailer_upload_media.php`,

    // Settings
    getSettings: `${API_BASE_URL}/retailer_get_settings.php`,
    updateSetting: `${API_BASE_URL}/retailer_update_setting.php`,
    completeSetup: `${API_BASE_URL}/retailer_complete_setup.php`,
    updateStock: `${API_BASE_URL}/retailer_update_stock.php`,
    requestStock: `${API_BASE_URL}/retailer_request_stock.php`,
    getDailyRequests: `${API_BASE_URL}/retailer_get_daily_requests.php`,

    // Add more endpoints here as needed
    getBookingByToken: `${API_BASE_URL}/retailer_get_booking_by_token.php`,

    // Security
    changePassword: `${API_BASE_URL}/retailer_change_password.php`,

    // Profile
    updateProfile: `${API_BASE_URL}/retailer_update_profile.php`,

    // Help Center
    getHelp: `${API_BASE_URL}/retailer_get_help.php`,
} as const;


/**
 * Helper function to build location API URL with query parameters
 */
export const buildLocationUrl = (type: string, parentId?: string): string => {
    let url = `${API_ENDPOINTS.getLocations}?type=${type}`;
    if (parentId) {
        url += `&parent_id=${parentId}`;
    }
    return url;
};

// Export for backwards compatibility
export { API_BASE_URL as API_URL };
