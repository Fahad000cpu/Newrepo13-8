'use server';
/**
 * @fileoverview A chat flow for the AI assistant.
 *
 * - chatFlow - A function that handles the chat process.
 * - ChatMessage - The type for a single chat message.
 * - ChatInput - The input type for the chatFlow function.
 */

import { ai } from '@/ai/genkit';
import { generate } from 'genkit';
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatInputSchema = z.object({
  history: z.array(ChatMessageSchema),
  message: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const SystemPrompt = `You are a helpful and friendly chat assistant for an app called LinkShare.
LinkShare is a social platform where users can discover, share, and purchase unique products curated by a community.
Your role is to assist users with their questions about the app, suggest products, and help them navigate its features.
Keep your responses concise, friendly, and helpful.`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // Convert the input history to the format Genkit expects for history
    const history = input.history.map((msg) => ({
      role: msg.role,
      content: [{ text: msg.content }],
    }));

    const response = await generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: input.message,
      system: SystemPrompt,
      history: history,
    });

    return response.text;
  }
);

export { chatFlow };
