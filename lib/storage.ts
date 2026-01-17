import { ChatSession, ChatMessage } from '../types';

const STORAGE_KEY = 'gemini_chats_v1';

export const getChats = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load chats', error);
    return [];
  }
};

export const saveChats = (chats: ChatSession[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to save chats', error);
  }
};

export const createNewChat = (firstMessage?: ChatMessage): ChatSession => {
  return {
    id: Date.now().toString(),
    title: firstMessage ? firstMessage.text.slice(0, 40) || 'New Chat' : 'New Chat',
    messages: firstMessage ? [firstMessage] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export const updateChat = (chats: ChatSession[], updatedChat: ChatSession): ChatSession[] => {
  const exists = chats.some(c => c.id === updatedChat.id);
  if (exists) {
    return chats.map(c => c.id === updatedChat.id ? updatedChat : c);
  }
  return [updatedChat, ...chats];
};

export const deleteChatById = (chats: ChatSession[], id: string): ChatSession[] => {
  return chats.filter(c => c.id !== id);
};