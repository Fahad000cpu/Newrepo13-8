'use server';
/**
 * @fileoverview A chat flow for the AI assistant.
 *
 * - chatFlow - A function that handles the chat process.
 * - ChatMessage - The type for a single chat message.
 * - ChatInput - The input type for the chatFlow function.
 */

import { ai } from '@/ai/genkit';
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

const chatPrompt = ai.definePrompt(
  {
    name: 'chatPrompt',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
    system: SystemPrompt,
    prompt: `
    {{#each history}}
      {{#if (eq role "user")}}
        User: {{content}}
      {{else}}
        Assistant: {{content}}
      {{/if}}
    {{/each}}
    User: {{message}}
    Assistant:
  `,
    config: {
      model: 'googleai/gemini-1.5-flash',
      temperature: 0.7,
    },
  },
);

export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await chatPrompt(input);
    return output!;
  }
);
