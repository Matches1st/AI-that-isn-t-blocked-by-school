import { GoogleGenAI, Chat, Content } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from './constants';
import { ChatMessage } from '../types';

let geminiClient: GoogleGenAI | null = null;
let currentChat: Chat | null = null;
let currentChatId: string | null = null;

export const initializeGemini = (apiKey: string) => {
  geminiClient = new GoogleGenAI({ apiKey });
};

// Convert app messages to SDK Content format
const convertToHistory = (messages: ChatMessage[]): Content[] => {
  // Filter out streaming or empty messages that shouldn't be in history
  return messages
    .filter(msg => !msg.isStreaming && msg.text.trim() !== '')
    .map(msg => {
      const parts: any[] = [];
      
      if (msg.images && msg.images.length > 0) {
        msg.images.forEach(img => {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: img.split(',')[1]
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
  if (!geminiClient) throw new Error("Gemini client not initialized");
  
  const history = convertToHistory(previousMessages);

  currentChat = geminiClient.chats.create({
    model: GEMINI_MODEL,
    history: history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
    },
  });
  
  currentChatId = chatId;
  return currentChat;
};

export const resetChat = () => {
  currentChat = null;
  currentChatId = null;
};

export const sendMessageStream = async (
  chatId: string,
  historyMessages: ChatMessage[],
  text: string,
  images: string[] = []
) => {
  // If we switched chats or don't have a session, recreate it with the correct history
  if (!currentChat || currentChatId !== chatId) {
    createChatSession(chatId, historyMessages);
  }

  if (!currentChat) throw new Error("Failed to create chat session");

  let messageInput: any;

  if (images.length > 0) {
    messageInput = {
      parts: [
        ...images.map(img => ({
          inlineData: {
            mimeType: 'image/jpeg', // Assuming jpeg for simplicity
            data: img.split(',')[1]
          }
        })),
        { text }
      ]
    };
  } else {
    messageInput = text;
  }

  return await currentChat.sendMessageStream({ message: messageInput });
};