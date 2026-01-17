/**
 * Device ID Management
 * 
 * CRITICAL SECURITY COMPONENT
 * 
 * Device ID is used for device binding:
 * 1. Generated ONCE on first app launch
 * 2. Stored PERMANENTLY in SecureStore
 * 3. Sent with EVERY login request
 * 4. Backend BINDS it on first login
 * 5. Subsequent logins MUST match
 * 
 * If device_id changes (reinstall, new device):
 * - Login will FAIL with 403
 * - User must contact admin for device reset
 * 
 * AUDIT NOTE:
 * This ensures one account = one device.
 * Prevents credential sharing.
 */

import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS } from '../constants/config';
import { getSecureItem, setSecureItem } from './storage';

/**
 * Get or generate the device ID.
 * 
 * If device ID exists in storage, returns it.
 * Otherwise, generates a new UUID v4 and stores it.
 * 
 * This function is IDEMPOTENT - calling it multiple times
 * returns the same device ID.
 * 
 * @returns The device's unique identifier
 */
export async function getDeviceId(): Promise<string> {
    // Try to get existing device ID
    let deviceId = await getSecureItem(STORAGE_KEYS.DEVICE_ID);

    if (deviceId) {
        console.log('[Device] Using existing device ID');
        return deviceId;
    }

    // Generate new device ID
    deviceId = uuidv4();
    console.log('[Device] Generated new device ID');

    // Store permanently
    await setSecureItem(STORAGE_KEYS.DEVICE_ID, deviceId);

    return deviceId;
}

/**
 * Check if device ID exists.
 * Useful for debugging/diagnostics.
 */
export async function hasDeviceId(): Promise<boolean> {
    const deviceId = await getSecureItem(STORAGE_KEYS.DEVICE_ID);
    return deviceId !== null;
}

/**
 * Get device ID without generating (for display only).
 * Returns null if not yet generated.
 */
export async function peekDeviceId(): Promise<string | null> {
    return getSecureItem(STORAGE_KEYS.DEVICE_ID);
}
