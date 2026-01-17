import { GoogleGenAI, type Chat, type Content, type Part } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from './constants';
import { ChatMessage } from '../types';

let client: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let activeChatId: string | null = null;

export const initializeGemini = (apiKey: string) => {
  client = new GoogleGenAI({ apiKey });
};

export const testApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const tempClient = new GoogleGenAI({ apiKey });
    // Try a simple generateContent call to verify the key works
    await tempClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [{ text: 'Hello' }] }
    });
    return true;
  } catch (error) {
    console.error("API Key Test Failed:", error);
    throw error;
  }
};

// Convert app messages to SDK Content format
const formatHistory = (messages: ChatMessage[]): Content[] => {
  // Filter out streaming or empty messages that shouldn't be in history
  return messages
    .filter(msg => !msg.isStreaming && msg.text.trim() !== '')
    .map(msg => {
      const parts: Part[] = [];
      
      if (msg.images && msg.images.length > 0) {
        msg.images.forEach(img => {
          // Remove data URL prefix if present for the SDK
          const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        });
      }
      
      if (msg.text) {
        parts.push({ text: msg.text });
      }

      return {
        role: msg.role,
        parts: parts
      };
    });
};

export const createChatSession = (chatId: string, previousMessages: ChatMessage[] = []) => {
  if (!client) throw new Error("Gemini client not initialized");
  
  const history = formatHistory(previousMessages);

  chatSession = client.chats.create({
    model: GEMINI_MODEL,
    history: history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
    },
  });
  
  activeChatId = chatId;
  return chatSession;
};

export const resetChat = () => {
  chatSession = null;
  activeChatId = null;
};

export const sendMessageStream = async (
  chatId: string,
  historyMessages: ChatMessage[],
  text: string,
  images: string[] = []
) => {
  // If we switched chats or don't have a session, recreate it with the correct history
  if (!client) throw new Error("Gemini client not initialized");

  if (!chatSession || activeChatId !== chatId) {
    createChatSession(chatId, historyMessages);
  }

  if (!chatSession) throw new Error("Failed to create chat session");

  // Construct message parts
  const parts: Part[] = [];
  
  if (images.length > 0) {
    images.forEach(img => {
      const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    });
  }

  if (text) {
    parts.push({ text });
  }

  // Use the new SDK's sendMessageStream
  return await chatSession.sendMessageStream({ 
    message: parts 
  });
};