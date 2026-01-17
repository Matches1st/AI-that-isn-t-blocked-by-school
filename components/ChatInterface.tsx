import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ChatSession, GroundingChunk } from '../types';
import { sendMessageStream, resetChat } from '../lib/gemini';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { getChats, saveChats, createNewChat, updateChat, deleteChatById } from '../lib/storage';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import Sidebar from './Sidebar';
import { Sparkles, Menu } from 'lucide-react';

const ChatInterface: React.FC = () => {
  // State for Chats
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  
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
    scrollToBottom();
  }, [messages, isLoading]);

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

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      const updatedChats = deleteChatById(chats, id);
      setChats(updatedChats);
      saveChats(updatedChats);
      
      if (currentChatId === id) {
        // If we deleted the active chat, switch to another or create new
        if (updatedChats.length > 0) {
          setCurrentChatId(updatedChats[0].id);
        } else {
          handleNewChat();
        }
      }
    }
  };

  const handleClearAll = () => {
    setChats([]);
    saveChats([]);
    handleNewChat();
  };

  const handleSend = async (text: string, images: string[]) => {
    if (!currentChatId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      images: images.length > 0 ? images : undefined,
      timestamp: Date.now()
    };

    setIsLoading(true);

    // Optimistic update for user message
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === currentChatId);
      if (chatIndex === -1) return prev;

      const updatedChat = {
        ...prev[chatIndex],
        messages: [...prev[chatIndex].messages, userMessage],
        updatedAt: Date.now(),
        // Generate title if it's the first message and title is default
        title: prev[chatIndex].messages.length === 0 
          ? (text.slice(0, 40) + (text.length > 40 ? '...' : '')) 
          : prev[chatIndex].title
      };
      
      const newChats = [...prev];
      newChats[chatIndex] = updatedChat;
      return newChats;
    });

    // Create placeholder for bot message
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

    try {
      // We pass the *current* history (before the user message we just added visually, 
      // or including it? The SDK usually wants previous history + new prompt.
      // sendMessageStream takes the new message. The history should be previous messages.
      // My `sendMessageStream` wrapper handles initialization using history.
      // We need to pass the history *excluding* the streaming placeholder and the *new* user message 
      // because `sendMessageStream` sends the new message as the 'prompt'.
      
      const chatHistory = currentChat?.messages || []; 
      
      const result = await sendMessageStream(currentChatId, chatHistory, text, images);
      
      let fullText = '';
      let groundingSources: GroundingChunk[] = [];

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        
        const chunkText = c.text;
        if (chunkText) {
          fullText += chunkText;
        }

        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          const chunks = c.candidates[0].groundingMetadata.groundingChunks as unknown as GroundingChunk[];
          if (chunks) {
            groundingSources = [...groundingSources, ...chunks];
          }
        }

        // Update streaming message content
        setChats(prev => {
          const chatIndex = prev.findIndex(c => c.id === currentChatId);
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

      // Finalize message (remove streaming flag)
      setChats(prev => {
         const chatIndex = prev.findIndex(c => c.id === currentChatId);
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
         saveChats(newChats); // Ensure save on completion
         return newChats;
      });

    } catch (error) {
      console.error("Error generating content:", error);
      setChats(prev => {
        const chatIndex = prev.findIndex(c => c.id === currentChatId);
        if (chatIndex === -1) return prev;

        const updatedMessages = prev[chatIndex].messages.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: "I'm sorry, something went wrong. Please check your API key or try again later.", isStreaming: false } 
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

  return (
    <div className="flex h-screen bg-gemini-dark text-gemini-text overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onClearAll={handleClearAll}
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
                <span className="text-xs text-gray-400 border border-gray-600 px-2 py-0.5 rounded hidden sm:inline-block">1.5 Pro</span>
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
                <MessageBubble key={msg.id} message={msg} />
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