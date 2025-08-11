// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import 'dotenv/config';

export const ai = genkit({
    plugins: [
        googleAI(),
    ],
    logSinks: [],
    traceStore: undefined,
    enableTracingAndMetrics: true,
});
