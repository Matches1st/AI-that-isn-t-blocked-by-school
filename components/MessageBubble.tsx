import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Pencil, ChevronLeft, ChevronRight, X, Image as ImageIcon, Save } from 'lucide-react';
import { ChatMessage, GroundingChunk } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  onImageClick?: (src: string) => void;
  onEdit?: (messageId: string, newText: string, newImages: string[]) => void;
  onVersionChange?: (messageId: string, direction: -1 | 1) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onImageClick, 
  onEdit,
  onVersionChange
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editing state
  const [editText, setEditText] = useState(message.text);
  const [editImages, setEditImages] = useState<string[]>(message.images || []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset edit state when message changes (e.g. switching versions)
  useEffect(() => {
    setEditText(message.text);
    setEditImages(message.images || []);
    setIsEditing(false);
  }, [message.id, message.text, message.images]);

  // Adjust textarea height
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(message.id, editText, editImages);
    }
    setIsEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setEditImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeEditImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  // Version navigation data
  const versions = message.versions || [];
  const currentVerIndex = message.currentVersionIndex ?? 0;
  const hasMultipleVersions = versions.length > 1;

  return (
    <div className={`flex gap-4 mb-8 w-full max-w-4xl mx-auto px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-gemini-user' : 'bg-transparent'}`}>
        {isUser ? (
          <User size={18} className="text-white" />
        ) : (
          <div className="relative w-8 h-8">
            <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-full h-full" />
            {message.isStreaming && (
              <div className="absolute inset-0 animate-pulse bg-white/20 rounded-full"></div>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative group ${isUser ? 'max-w-full' : 'w-full'}`}>
          
          {isEditing ? (
            /* Inline Editor */
            <div className="bg-[#28292A] rounded-2xl p-4 border border-gemini-accent w-full min-w-[300px]">
              {editImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {editImages.map((img, idx) => (
                    <div key={idx} className="relative group/img">
                      <img src={img} alt="Edit preview" className="w-16 h-16 object-cover rounded-md border border-gray-600" />
                      <button 
                        onClick={() => removeEditImage(idx)}
                        className="absolute -top-1 -right-1 bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent text-white resize-none focus:outline-none text-base leading-relaxed mb-3"
                rows={1}
                placeholder="Edit your message..."
              />
              
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <ImageIcon size={18} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text);
                      setEditImages(message.images || []);
                    }}
                    className="px-3 py-1.5 text-sm text-[#A8C7FA] hover:bg-[#A8C7FA]/10 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() && editImages.length === 0}
                    className="px-3 py-1.5 text-sm bg-white text-gemini-dark font-medium rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Message View */
            <>
              {/* User Images */}
              {message.images && message.images.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3 justify-end">
                   {message.images.map((img, idx) => (
                     <img 
                       key={idx} 
                       src={img} 
                       alt="User upload" 
                       onClick={() => onImageClick?.(img)}
                       className="max-w-[200px] max-h-[200px] rounded-xl border border-gray-700 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                     />
                   ))}
                 </div>
              )}

              {/* Text Content */}
              <div className={`prose prose-invert max-w-none break-words ${isUser ? 'bg-gemini-user px-5 py-3 rounded-3xl rounded-tr-sm text-base' : 'text-base leading-7'}`}>
                 <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-gemini-blue hover:underline" />
                    }}
                 >
                   {message.text}
                 </Markdown>
              </div>

              {/* Grounding Sources */}
              {message.groundingSources && message.groundingSources.length > 0 && !isUser && (
                <div className="mt-4 pt-3 border-t border-gemini-accent/30">
                  <p className="text-sm text-gray-400 mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {message.groundingSources.map((source, idx) => {
                       if (!source.web?.uri) return null;
                       return (
                        <a 
                          key={idx}
                          href={source.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-gemini-gray hover:bg-gemini-accent/50 px-3 py-2 rounded-full text-xs transition-colors border border-gemini-accent/30 max-w-full truncate"
                        >
                          <div className="w-4 h-4 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-[8px]">
                            {idx + 1}
                          </div>
                          <span className="truncate max-w-[150px]">{source.web.title}</span>
                        </a>
                       );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2 flex items-center gap-2 min-h-[24px]">
                {/* Copy Button (Model Only) */}
                {!isUser && !message.isStreaming && (
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy response"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}

                {/* Edit Button (User Only) */}
                {isUser && !message.isStreaming && (
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                     title="Edit message"
                   >
                     <Pencil size={14} />
                   </button>
                )}

                {/* Universe/Version Navigation */}
                {hasMultipleVersions && (
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gemini-user/50 rounded-full px-1">
                    <button 
                      onClick={() => onVersionChange?.(message.id, -1)}
                      disabled={currentVerIndex === 0}
                      className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="min-w-[24px] text-center select-none">
                      {currentVerIndex + 1}/{versions.length}
                    </span>
                    <button 
                      onClick={() => onVersionChange?.(message.id, 1)}
                      disabled={currentVerIndex === versions.length - 1}
                      className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;