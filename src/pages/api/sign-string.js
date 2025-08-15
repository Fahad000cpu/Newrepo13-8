// /src/pages/api/sign-string.js
import { v2 as cloudinary } from 'cloudinary';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paramsToSign } = req.body;

    if (!process.env.CLOUDINARY_API_SECRET) {
      console.error("Cloudinary API Secret is not set.");
      return res.status(500).json({ error: 'Cloudinary configuration is missing on the server.' });
    }
    
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({ signature });
  } catch (error) {
    console.error('Error signing Cloudinary params:', error);
    res.status(500).json({ error: 'Failed to sign upload parameters.' });
  }
}
