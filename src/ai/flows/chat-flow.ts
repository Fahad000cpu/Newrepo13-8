'use server';
/**
 * @fileOverview A simple chat assistant flow for the app.
 *
 * - chat - A function that handles the chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatMessage - The type for a single message in the history.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {z} from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatInputSchema = z.object({
  history: z.array(ChatMessageSchema),
  message: z.string().describe('The new message from the user.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

export const ChatOutputSchema = z.string();
export type ChatOutput = z.infer<typeof ChatOutputSchema>;


export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async ({history, message}) => {

    const systemPrompt = `You are a helpful and friendly chat assistant for an app called Flow v3.
Flow v3 is a social platform where users can discover, share, and purchase unique products curated by a community.
Your role is to assist users with their questions about the app, suggest products, and help them navigate its features.
Keep your responses concise, friendly, and helpful.`;

    const llm = googleAI.model('gemini-1.5-flash');

    const response = await ai.generate({
      model: llm,
      system: systemPrompt,
      history: history,
      prompt: message,
    });

    return response.text;
  }
);
