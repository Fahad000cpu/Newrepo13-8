// src/lib/cloudinary.ts

// IMPORTANT: This file centralizes the Cloudinary configuration.
// All file uploads in the application will use these values.
// It will try to use environment variables first (for Vercel),
// and fall back to the values in the .env file if they are not found.

export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
