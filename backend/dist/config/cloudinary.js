"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudinaryConfigured = void 0;
exports.uploadToCloudinary = uploadToCloudinary;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);
exports.isCloudinaryConfigured = isConfigured;
if (isConfigured) {
    cloudinary_1.v2.config({
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
async function uploadToCloudinary(localPath, folder = 'quickhelp', resourceType = 'auto') {
    if (!isConfigured)
        return null;
    try {
        const result = await cloudinary_1.v2.uploader.upload(localPath, {
            folder,
            resource_type: resourceType,
        });
        // Clean up local temp file
        try {
            fs_1.default.unlinkSync(localPath);
        }
        catch { }
        return result.secure_url;
    }
    catch (err) {
        console.error('Cloudinary upload failed:', err);
        return null;
    }
}
//# sourceMappingURL=cloudinary.js.map