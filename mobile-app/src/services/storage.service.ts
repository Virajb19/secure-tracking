/**
 * Storage Service
 * 
 * Handles file uploads to Backend Server (Local Storage).
 * Replaced Appwrite with direct backend upload.
 */

import { API_CONFIG } from '../constants/config';

/**
 * Upload result interface.
 */
export interface UploadResult {
    success: boolean;
    fileId?: string;
    fileUrl?: string;
    error?: string;
}

/**
 * Upload profile image to Backend Server.
 * 
 * @param imageUri - Local URI of the image to upload
 * @returns Upload result with file URL
 */
export async function uploadProfileImage(imageUri: string): Promise<UploadResult> {
    try {
        if (!imageUri) {
            return { success: true }; // No image to upload
        }

        console.log('[Storage] Uploading profile image to backend server...');

        // Extract filename from URI
        const uriParts = imageUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `profile_${Date.now()}.jpg`;
        
        // Determine MIME type from extension
        const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeTypes: { [key: string]: string } = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
        };
        const mimeType = mimeTypes[extension] || 'image/jpeg';

        console.log('[Storage] File info:', { fileName, mimeType });

        // Create form data
        const formData = new FormData();
        
        // React Native file format
        const file = {
            uri: imageUri,
            type: mimeType,
            name: fileName,
        } as any;

        formData.append('image', file);

        // Upload to backend
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/upload-profile-image`, {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData - fetch will set it with boundary
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Upload failed');
        }

        const data = await response.json();

        console.log('[Storage] Upload successful:', data.url);

        // Build full URL - remove /api from BASE_URL since static files are served from root
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        const fullUrl = `${baseUrl}${data.url}`;

        return {
            success: true,
            fileUrl: fullUrl,
        };
    } catch (error) {
        console.error('[Storage] Upload failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
        
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Get preview URL for an image.
 * Since images are stored on backend, just return the URL as-is.
 */
export function getImagePreviewUrl(imageUrl: string | undefined | null): string | null {
    if (!imageUrl) return null;
    
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // If it's a relative path, prepend base URL (without /api)
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
}
