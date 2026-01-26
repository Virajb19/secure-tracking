import { Client, Account, Databases, Storage } from "react-native-appwrite";

/**
 * Appwrite Configuration
 * 
 * Environment variables must be prefixed with EXPO_PUBLIC_ to be accessible in client.
 * Make sure your .env file has:
 * - EXPO_PUBLIC_APPWRITE_ENDPOINT
 * - EXPO_PUBLIC_APPWRITE_PROJECT_ID
 */
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '';

console.log('[Appwrite] Endpoint:', APPWRITE_ENDPOINT);
console.log('[Appwrite] Project ID:', APPWRITE_PROJECT_ID);

if (!APPWRITE_PROJECT_ID) {
    console.warn('[Appwrite] Project ID not configured. Set EXPO_PUBLIC_APPWRITE_PROJECT_ID in .env');
}

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform("gov.securedelivery.app");

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
