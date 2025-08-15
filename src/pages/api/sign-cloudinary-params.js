// /src/pages/api/sign-cloudinary-params.js
import { v2 as cloudinary } from 'cloudinary';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { folder } = req.body;

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("Cloudinary environment variables are not set properly.");
      return res.status(500).json({ error: 'Cloudinary configuration is missing on the server.' });
    }
    
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    
    const timestamp = Math.round((new Date).getTime()/1000);

    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
      folder: folder,
    }, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({ signature, timestamp });
  } catch (error) {
    console.error('Error signing Cloudinary params:', error);
    res.status(500).json({ error: 'Failed to sign upload parameters.' });
  }
}
