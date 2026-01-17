/**
 * Application Configuration
 * 
 * SECURITY NOTE:
 * These values are bundled into the app.
 * Do NOT include secrets here.
 */

/**
 * API Configuration
 * 
 * IMPORTANT FOR DEVELOPMENT:
 * - Android Emulator: Use 10.0.2.2 (maps to host machine's localhost)
 * - iOS Simulator: Use localhost
 * - Physical Device: Use your computer's local IP (e.g., 192.168.x.x)
 * 
 * For production, this would be the actual server URL.
 */
export const API_CONFIG = {
    /**
     * Backend API base URL.
     * 
     * NOTE: 10.0.2.2 is Android emulator's special IP for host machine.
     * Change this to your computer's IP for physical device testing.
     * Example: 'http://192.168.1.100:3001/api'
     */
    BASE_URL: 'http://10.1.6.37:3001/api',

    /**
     * Request timeout in milliseconds.
     * Government networks may be slow - give it time.
     */
    TIMEOUT: 30000,
} as const;

/**
 * Storage Keys
 * Used for SecureStore.
 */
export const STORAGE_KEYS = {
    /** JWT access token */
    ACCESS_TOKEN: 'access_token',
    /** Unique device identifier */
    DEVICE_ID: 'device_id',
    /** Cached user data (JSON) */
    USER_DATA: 'user_data',
} as const;

/**
 * User Roles
 * Must match backend enum exactly.
 */
export const USER_ROLES = {
    ADMIN: 'ADMIN',
    DELIVERY: 'DELIVERY',
} as const;
