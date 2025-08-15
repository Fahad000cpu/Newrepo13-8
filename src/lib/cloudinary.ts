// src/lib/cloudinary.ts

// IMPORTANT: This file centralizes the Cloudinary configuration.
// All file uploads in the application will use these values.

export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
