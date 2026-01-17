import React, { useMemo } from 'react';
import { Plus, MessageSquare, Trash2, X, History, Key } from 'lucide-react';
import { ChatSession } from '../types';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onChangeKey: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAll,
  onChangeKey
}) => {
  // Group chats by date
  const groupedChats = useMemo(() => {
    const groups: Record<string, ChatSession[]> = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': []
    };

    chats.sort((a, b) => b.updatedAt - a.updatedAt).forEach(chat => {
      const date = new Date(chat.updatedAt);
      if (isToday(date)) {
        groups['Today'].push(chat);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(chat);
      } else if (isThisWeek(date)) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    return groups;
  }, [chats]);

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={cn(
          "fixed md:relative top-0 left-0 h-full w-[260px] bg-gemini-gray md:bg-gemini-dark z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-gemini-accent/20",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden"
        )}
      >
        <div className="p-4 flex-none">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h2 className="text-lg font-semibold text-gray-200">Menu</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-white/10 rounded-full">
              <X size={20} />
            </button>
          </div>

          <button 
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gemini-user text-gemini-text rounded-full hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            <span className="truncate">New chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
          {Object.entries(groupedChats).map(([label, groupChats]) => (
            groupChats.length > 0 && (
              <div key={label} className="mb-6">
                <h3 className="px-4 text-xs font-medium text-gray-500 mb-2">{label}</h3>
                {groupChats.map(chat => (
                  <div 
                    key={chat.id}
                    className={cn(
                      "group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors relative",
                      currentChatId === chat.id ? "bg-[#004A77]/50 text-white" : "text-gray-300 hover:bg-gray-800/50"
                    )}
                    onClick={() => {
                      onSelectChat(chat.id);
                      if (window.innerWidth < 768) onClose();
                    }}
                  >
                    <MessageSquare size={16} className="flex-shrink-0 text-gray-400" />
                    <span className="text-sm truncate flex-1 pr-6" title={chat.title}>
                      {chat.title}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-2 p-1.5 text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-red-400 hover:bg-white/10 rounded-full transition-all"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )
          ))}

          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-500 px-4 text-center">
              <History size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No chat history</p>
            </div>
          )}
        </div>

        <div className="p-2 flex-none border-t border-gemini-accent/20">
          <button 
            onClick={() => {
              if(window.confirm("Change API Key? Your chat history will be preserved.")) {
                onChangeKey();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors text-sm group mb-1"
          >
            <Key size={18} className="group-hover:text-white transition-colors" />
            <span className="group-hover:text-gray-200 transition-colors">Change API Key</span>
          </button>

          {chats.length > 0 && (
            <button 
              onClick={onClearAll}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors text-sm group"
            >
              <Trash2 size={18} className="group-hover:text-red-400 transition-colors" />
              <span className="group-hover:text-gray-200 transition-colors">Clear all conversations</span>
            </button>
          )}
          <div className="px-4 py-2 text-[10px] text-gray-600 flex items-center gap-1 mt-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
             Clone Location: Client-side
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;