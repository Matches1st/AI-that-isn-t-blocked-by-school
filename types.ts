export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface MessageVersion {
  id: string;
  text: string;
  images?: string[];
  timestamp: number;
  // Stores the conversation flow that followed this specific version
  subsequentMessages: ChatMessage[]; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[]; // Base64 strings
  isStreaming?: boolean;
  groundingSources?: GroundingChunk[];
  timestamp: number;
  
  // Versioning (Universes)
  versions?: MessageVersion[];
  currentVersionIndex?: number;
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