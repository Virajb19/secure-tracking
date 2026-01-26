import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Storage, ID } from 'node-appwrite';
import { env } from '../env.validation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
// const { InputFile } = require('node-appwrite/file');

import { InputFile } from 'node-appwrite/file';
import { en } from 'zod/v4/locales';

/**
 * Appwrite Service
 * Handles file uploads to Appwrite Storage bucket.
 *
 * Required environment variables:
 *   APPWRITE_ENDPOINT   - e.g. https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID - Your project ID
 *   APPWRITE_API_KEY    - API key with storage write scope
 *   APPWRITE_BUCKET_ID  - The storage bucket ID for circulars
 */
@Injectable()
export class AppwriteService implements OnModuleInit {
    private client: Client;
    private storage: Storage;
    private bucketId: string;
    private isInitialized = false;

    onModuleInit() {
        const endpoint = env.APPWRITE_ENDPOINT;
        const projectId = env.APPWRITE_PROJECT_ID;
        const apiKey = env.APPWRITE_API_KEY;
        this.bucketId = env.APPWRITE_BUCKET_ID || '';

        if (!endpoint || !projectId || !apiKey || !this.bucketId) {
            console.warn('[AppwriteService] Missing Appwrite env vars:');
            console.warn('  APPWRITE_ENDPOINT:', endpoint ? '✓' : '✗ MISSING');
            console.warn('  APPWRITE_PROJECT_ID:', projectId ? '✓' : '✗ MISSING');
            console.warn('  APPWRITE_API_KEY:', apiKey ? '✓' : '✗ MISSING');
            console.warn('  APPWRITE_BUCKET_ID:', this.bucketId ? '✓' : '✗ MISSING');
            return;
        }

        this.client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(apiKey);

        this.storage = new Storage(this.client);
        this.isInitialized = true;
        console.log('[AppwriteService] Initialized successfully with bucket:', this.bucketId);
    }

    /**
     * Upload a file buffer to Appwrite Storage.
     * @param buffer - File buffer
     * @param fileName - Original file name
     * @param mimeType - MIME type of the file
     * @returns Public file URL or null if upload skipped/failed
     */
    async uploadFile(
        buffer: Buffer,
        fileName: string,
        mimeType: string,
    ): Promise<string | null> {
        if (!this.isInitialized || !this.storage) {
            console.error('[AppwriteService] Storage not initialized. Check Appwrite env vars.');
            return null;
        }

        try {
            const fileId = ID.unique();
            console.log('[AppwriteService] Uploading file:', fileName, 'Size:', buffer.length, 'bytes');

            // Use InputFile.fromBuffer for proper file upload
            const inputFile = InputFile.fromBuffer(buffer, fileName);

            const result = await this.storage.createFile(
                this.bucketId,
                fileId,
                inputFile,
            );

            // Build public URL
            // Appwrite public file URL pattern (if bucket has read permission for guests):
            const endpoint = env.APPWRITE_ENDPOINT!;
            const projectId = env.APPWRITE_PROJECT_ID!;
            const publicUrl = `${endpoint}/storage/buckets/${this.bucketId}/files/${result.$id}/view?project=${projectId}`;
            console.log('[AppwriteService] Upload successful:', publicUrl);
            return publicUrl;
        } catch (err: any) {
            console.error('[AppwriteService] Upload failed:', err.message || err);
            console.error('[AppwriteService] Error details:', JSON.stringify(err, null, 2));
            return null;
        }
    }
}
