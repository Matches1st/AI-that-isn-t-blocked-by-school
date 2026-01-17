export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[]; // Base64 strings
  isStreaming?: boolean;
  groundingSources?: GroundingChunk[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface StoredConfig {
  apiKey: string;
}

export interface StoredData {
  chats: ChatSession[];
  currentChatId: string | null;
}