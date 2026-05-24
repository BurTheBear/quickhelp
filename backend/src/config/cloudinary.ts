import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Upload a local file to Cloudinary and return its secure URL.
 * Deletes the local file after upload.
 * If Cloudinary is not configured, returns null and leaves the file in place.
 */
export async function uploadToCloudinary(
  localPath: string,
  folder = 'quickhelp',
  resourceType: 'image' | 'video' | 'auto' = 'auto',
): Promise<string | null> {
  if (!isConfigured) return null;

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder,
      resource_type: resourceType,
    });
    // Clean up local temp file
    try { fs.unlinkSync(localPath); } catch {}
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return null;
  }
}

export { isConfigured as isCloudinaryConfigured };
