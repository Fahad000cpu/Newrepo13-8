'use server';

import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const corsPlugin: Plugin = async (config) => {
  return {
    'http:middleware': [
      {
        name: 'cors',
        async handler(req, res, next) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, OPTIONS, PUT, PATCH, DELETE'
          );
          res.setHeader(
            'Access-Control-Allow-Headers',
            'X-Requested-With,content-type'
          );
          if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
          }
          next();
        },
      },
    ],
  };
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    corsPlugin,
  ],
});
