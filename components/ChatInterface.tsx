import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatSession, GroundingChunk, MessageVersion } from '../types';
import { sendMessageStream, resetChat } from '../lib/gemini';
import { GenerateContentResponse } from "@google/genai";
import { getChats, saveChats, createNewChat, deleteChatById } from '../lib/storage';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import ImageModal from './ImageModal';
import { Sparkles, Menu, Info } from 'lucide-react';
import { generateId } from '../lib/utils';

interface ChatInterfaceProps {
  onChangeKey: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onChangeKey }) => {
  // State for Chats
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'delete-one' | 'clear-all';
    chatId?: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'delete-one',
    title: '',
    message: ''
  });

  // Image View State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Derived state: Current messages
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats on mount
  useEffect(() => {
    const loadedChats = getChats();
    setChats(loadedChats);
    
    // Select most recent chat or create new if none
    if (loadedChats.length > 0) {
      // Sort by updated (desc) and pick first
      const mostRecent = loadedChats.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setCurrentChatId(mostRecent.id);
    } else {
      const newChat = createNewChat();
      setChats([newChat]);
      setCurrentChatId(newChat.id);
      saveChats([newChat]);
    }

    // Responsive sidebar
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll if loading or if the last message is new
    scrollToBottom();
  }, [messages.length, isLoading]);

  // Handle saving whenever chats change
  useEffect(() => {
    if (chats.length > 0) {
      saveChats(chats);
    }
  }, [chats]);

  const handleNewChat = () => {
    const newChat = createNewChat();
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    // Reset SDK context
    resetChat();
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const openDeleteModal = (id: string) => {
    setModalConfig({
      isOpen: true,
      type: 'delete-one',
      chatId: id,
      title: 'Delete chat?',
      message: 'You\'ll no longer be able to see this chat. This cannot be undone.'
    });
  };

  const openClearAllModal = () => {
    setModalConfig({
      isOpen: true,
      type: 'clear-all',
      title: 'Clear all conversations?',
      message: 'This will delete all your chat history. This action cannot be undone.'
    });
  };

  const handleConfirmDelete = () => {
    if (modalConfig.type === 'delete-one' && modalConfig.chatId) {
      const idToDelete = modalConfig.chatId;
      const updatedChats = deleteChatById(chats, idToDelete);
      
      setChats(updatedChats);
      saveChats(updatedChats); // Explicitly save to ensure persistence
      
      // If we deleted the active chat
      if (currentChatId === idToDelete) {
        if (updatedChats.length > 0) {
          // Switch to most recent remaining chat
          const mostRecent = updatedChats.sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setCurrentChatId(mostRecent.id);
          resetChat();
        } else {
          // No chats left, create new
          handleNewChat();
        }
      }
    } else if (modalConfig.type === 'clear-all') {
      setChats([]);
      saveChats([]);
      handleNewChat();
    }
    
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const processStream = async (chatId: string, history: ChatMessage[], prompt: string, images: string[], botMessageId: string) => {
    try {
      const result = await sendMessageStream(chatId, history, prompt, images);
      
      let fullText = '';
      let groundingSources: GroundingChunk[] = [];

      for await (const chunk of result) {
        const chunkText = chunk.text; 
        
        if (chunkText) {
          fullText += chunkText;
        }

        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          const chunks = chunk.candidates[0].groundingMetadata.groundingChunks as unknown as GroundingChunk[];
          if (chunks) {
            groundingSources = [...groundingSources, ...chunks];
          }
        }

        // Update streaming message content
        setChats(prev => {
          const chatIndex = prev.findIndex(c => c.id === chatId);
          if (chatIndex === -1) return prev;

          const updatedMessages = prev[chatIndex].messages.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, text: fullText, groundingSources: groundingSources.length > 0 ? groundingSources : undefined } 
              : msg
          );

          const updatedChat = { ...prev[chatIndex], messages: updatedMessages };
          const newChats = [...prev];
          newChats[chatIndex] = updatedChat;
          return newChats;
        });
      }

      // Finalize message
      setChats(prev => {
         const chatIndex = prev.findIndex(c => c.id === chatId);
         if (chatIndex === -1) return prev;

         const updatedMessages = prev[chatIndex].messages.map(msg => 
           msg.id === botMessageId ? { ...msg, isStreaming: false, timestamp: Date.now() } : msg
         );
         
         const updatedChat = { 
           ...prev[chatIndex], 
           messages: updatedMessages,
           updatedAt: Date.now()
         };
         const newChats = [...prev];
         newChats[chatIndex] = updatedChat;
         saveChats(newChats); 
         return newChats;
      });

    } catch (error: any) {
      console.error("Error generating content:", error);
      
      let errorMessage = "I'm sorry, something went wrong. Please check your network connection.";
      const errString = error.message || error.toString();

      if (errString.includes("403")) {
        errorMessage = "Access Denied. If you are using a key from Google AI Studio, please ensure it has NO HTTP referrer restrictions (or allows *.netlify.app).";
      } else if (errString.includes("401") || errString.includes("API key not valid")) {
        errorMessage = "Invalid API Key. Please update your key.";
      } else if (errString.includes("429")) {
        errorMessage = "Rate limit reached. Try again later, use a different key, or enable pay-as-you-go billing.";
      } else if (errString.includes("404") || errString.includes("not found")) {
        errorMessage = "The requested model is not available for this API key. Please check your project settings.";
      } else if (errString.includes("fetch failed")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }

      setChats(prev => {
        const chatIndex = prev.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return prev;

        const updatedMessages = prev[chatIndex].messages.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: errorMessage, isStreaming: false } 
            : msg
        );
        const newChats = [...prev];
        newChats[chatIndex] = { ...prev[chatIndex], messages: updatedMessages };
        return newChats;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (text: string, images: string[]) => {
    if (!currentChatId) return;

    // Initial Version setup for new message
    const initialVersion: MessageVersion = {
      id: generateId(),
      text,
      images,
      timestamp: Date.now(),
      subsequentMessages: []
    };

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      images: images.length > 0 ? images : undefined,
      timestamp: Date.now(),
      versions: [initialVersion],
      currentVersionIndex: 0
    };

    setIsLoading(true);

    // Optimistic update
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === currentChatId);
      if (chatIndex === -1) return prev;

      const updatedChat = {
        ...prev[chatIndex],
        messages: [...prev[chatIndex].messages, userMessage],
        updatedAt: Date.now(),
        title: prev[chatIndex].messages.length === 0 
          ? (text.slice(0, 40) + (text.length > 40 ? '...' : '')) 
          : prev[chatIndex].title
      };
      
      const newChats = [...prev];
      newChats[chatIndex] = updatedChat;
      return newChats;
    });

    const botMessageId = (Date.now() + 1).toString();
    const botMessagePlaceholder: ChatMessage = {
      id: botMessageId,
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: Date.now()
    };

    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === currentChatId);
      if (chatIndex === -1) return prev;
      
      const updatedChat = {
        ...prev[chatIndex],
        messages: [...prev[chatIndex].messages, botMessagePlaceholder]
      };
      const newChats = [...prev];
      newChats[chatIndex] = updatedChat;
      return newChats;
    });

    // We pass the current chat history excluding the placeholder
    const chatHistory = currentChat ? [...currentChat.messages, userMessage] : [userMessage];
    await processStream(currentChatId, chatHistory, text, images, botMessageId);
  };

  const handleEditMessage = async (messageId: string, newText: string, newImages: string[]) => {
    if (!currentChatId || isLoading) return;

    // 1. Find message index
    const chatIndex = chats.findIndex(c => c.id === currentChatId);
    if (chatIndex === -1) return;
    
    const currentMessages = chats[chatIndex].messages;
    const msgIndex = currentMessages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMessage = currentMessages[msgIndex];
    if (targetMessage.role !== 'user') return;

    setIsLoading(true);

    // 2. Snapshot current state into the *current* version slot
    // We save everything that happened AFTER this message in this version's history
    const subsequentMessages = currentMessages.slice(msgIndex + 1);
    
    // 3. Create new version
    const newVersion: MessageVersion = {
      id: generateId(),
      text: newText,
      images: newImages,
      timestamp: Date.now(),
      subsequentMessages: [] // New timeline, no future yet
    };

    // GENERATE ID HERE (BEFORE setChats)
    const botMessageId = generateId();

    // 4. Update Chat State:
    setChats(prev => {
      const cIndex = prev.findIndex(c => c.id === currentChatId);
      if (cIndex === -1) return prev;

      const oldMessages = [...prev[cIndex].messages];
      const msg = { ...oldMessages[msgIndex] };
      
      // Ensure versions array exists
      const versions = msg.versions ? [...msg.versions] : [{
        id: generateId(),
        text: msg.text,
        images: msg.images,
        timestamp: msg.timestamp,
        subsequentMessages: []
      }];
      
      // Update the *previous* active version with its history snapshot
      const currentVerIdx = msg.currentVersionIndex ?? 0;
      if (versions[currentVerIdx]) {
        versions[currentVerIdx] = {
          ...versions[currentVerIdx],
          subsequentMessages: subsequentMessages
        };
      }

      // Add new version
      versions.push(newVersion);
      
      // Update message display properties
      msg.versions = versions;
      msg.currentVersionIndex = versions.length - 1;
      msg.text = newText;
      msg.images = newImages.length > 0 ? newImages : undefined;

      // Truncate list (keep messages up to this one)
      const newMsgList = oldMessages.slice(0, msgIndex);
      newMsgList.push(msg);

      // Add Bot Placeholder
      newMsgList.push({
        id: botMessageId,
        role: 'model',
        text: '',
        isStreaming: true,
        timestamp: Date.now()
      });

      const updatedChat = { ...prev[cIndex], messages: newMsgList, updatedAt: Date.now() };
      const newChats = [...prev];
      newChats[cIndex] = updatedChat;
      return newChats;
    });

    // 5. Trigger Generation
    // History is everything up to the edited message
    const historyForStream = currentMessages.slice(0, msgIndex);
    await processStream(currentChatId, historyForStream, newText, newImages, botMessageId);
  };

  const handleVersionChange = (messageId: string, direction: -1 | 1) => {
    if (!currentChatId || isLoading) return;

    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === currentChatId);
      if (chatIndex === -1) return prev;

      const currentMessages = [...prev[chatIndex].messages];
      const msgIndex = currentMessages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return prev;

      const msg = { ...currentMessages[msgIndex] };
      if (!msg.versions) return prev;

      const currentIndex = msg.currentVersionIndex ?? 0;
      const newIndex = currentIndex + direction;

      if (newIndex < 0 || newIndex >= msg.versions.length) return prev;

      // 1. Snapshot current future into the *current* version
      const currentFuture = currentMessages.slice(msgIndex + 1);
      const updatedVersions = [...msg.versions];
      
      updatedVersions[currentIndex] = {
        ...updatedVersions[currentIndex],
        subsequentMessages: currentFuture
      };

      // 2. Load target version
      const targetVersion = updatedVersions[newIndex];
      
      // 3. Restore message state
      msg.text = targetVersion.text;
      msg.images = targetVersion.images;
      msg.currentVersionIndex = newIndex;
      msg.versions = updatedVersions;

      // 4. Restore future from target version
      const newMsgList = currentMessages.slice(0, msgIndex);
      newMsgList.push(msg);
      
      // Append the stored history of the target version
      if (targetVersion.subsequentMessages) {
        newMsgList.push(...targetVersion.subsequentMessages);
      }

      const updatedChat = { ...prev[chatIndex], messages: newMsgList };
      const newChats = [...prev];
      newChats[chatIndex] = updatedChat;
      return newChats;
    });
  };

  return (
    <div className="flex h-screen bg-gemini-dark text-gemini-text overflow-hidden">
      
      {/* Modal */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={modalConfig.title}
        message={modalConfig.message}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        src={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={openDeleteModal}
        onClearAll={openClearAllModal}
        onChangeKey={onChangeKey}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gemini-accent/20 flex-shrink-0 z-10 bg-gemini-dark/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
               className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
             >
               <Menu size={20} />
             </button>
             <div className="flex items-center gap-2" >
                <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Gemini</span>
                <span className="text-xs text-gray-400 border border-gray-600 px-2 py-0.5 rounded hidden sm:inline-flex items-center gap-1 group relative cursor-help">
                  2.5 Flash
                  <Info size={10} className="text-gray-500 group-hover:text-blue-400" />
                  <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-gray-800 text-xs text-gray-300 rounded shadow-xl border border-gray-700 invisible group-hover:visible z-50">
                     Model: gemini-2.5-flash
                     <br/>
                     Limits apply (Free Tier)
                  </div>
                </span>
             </div>
          </div>
          <div className="hidden sm:block">
             <button onClick={handleNewChat} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
               <Sparkles size={16} /> New Chat
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-4 pt-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
               <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Sparkles size={32} className="text-blue-400" />
               </div>
               <h1 className="text-3xl font-medium mb-2 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">Hello, Human</h1>
               <p className="text-gray-400 max-w-md text-lg">How can I help you today?</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  onImageClick={(src) => setSelectedImage(src)}
                  onEdit={!isLoading ? handleEditMessage : undefined}
                  onVersionChange={!isLoading ? handleVersionChange : undefined}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 z-20 bg-gemini-dark">
          <InputArea onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;