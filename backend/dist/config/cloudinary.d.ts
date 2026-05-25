declare const isConfigured: boolean;
/**
 * Upload a local file to Cloudinary and return its secure URL.
 * Deletes the local file after upload.
 * If Cloudinary is not configured, returns null and leaves the file in place.
 */
export declare function uploadToCloudinary(localPath: string, folder?: string, resourceType?: 'image' | 'video' | 'auto'): Promise<string | null>;
export { isConfigured as isCloudinaryConfigured };
//# sourceMappingURL=cloudinary.d.ts.map