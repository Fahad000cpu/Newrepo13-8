'use server';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type ChatInput = {
  history: ChatMessage[];
  message: string;
};

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
const SYSTEM_PROMPT = `You are a helpful and friendly chat assistant for an app called Flow v3.
Flow v3 is a social platform where users can discover, share, and purchase unique products curated by a community.
Your role is to assist users with their questions about the app, suggest products, and help them navigate its features.
Keep your responses concise, friendly, and helpful.`;

export async function chatWithGoogle(input: ChatInput): Promise<string> {
  const { history, message } = input;

  const contents = [
    // Convert history to Gemini's format
    ...history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }],
    })),
    // Add the new user message
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            { text: SYSTEM_PROMPT }
          ]
        },
        generationConfig: {
            // Optional: configure temperature, topP, etc.
            temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Google AI API Error:', errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the text from the response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        console.error('Invalid response structure from API:', data);
        throw new Error('Could not extract text from API response.');
    }

    return text;
  } catch (error) {
    console.error('Failed to fetch from Google AI API:', error);
    throw new Error('There was a problem communicating with the AI service.');
  }
}
