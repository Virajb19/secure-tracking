import { Client, Storage, ID } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const storage = new Storage(client);

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

/**
 * Upload a file to Appwrite bucket with progress callback
 */
export async function uploadFile(
    file: File | undefined,
    onProgress?: (progress: number) => void
) {
    if (!file) throw new Error('File is undefined');

    const fileId = ID.unique();
    const res = await storage.createFile(
        BUCKET_ID,
        fileId,
        file,
        undefined,
        (progress) => onProgress?.(progress.progress)
    );

    return { fileName: res.name, fileKey: res.$id };
}

/**
 * Delete a file from Appwrite bucket
 */
export async function deleteFile(fileKey: string) {
    try {
        await storage.deleteFile(BUCKET_ID, fileKey);
        return true;
    } catch (error) {
        console.error('Failed to delete file:', error);
        return false;
    }
}

/**
 * Get file view URL
 */
export const getFileURL = (fileKey: string) =>
    storage.getFileView(BUCKET_ID, fileKey);

/**
 * Get file preview URL with optional dimensions
 */
export const getFilePreview = (fileKey: string, width?: number, height?: number) =>
    storage.getFilePreview(BUCKET_ID, fileKey, width, height);