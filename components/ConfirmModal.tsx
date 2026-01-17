import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmLabel = "Delete"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#1E1F20] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-medium text-[#E3E3E3] mb-2">{title}</h3>
          <p className="text-[#C4C7C5] text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-[#28292A] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#A8C7FA] hover:bg-[#A8C7FA]/10 rounded-full text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-[#FFB4AB] hover:bg-[#FFB4AB]/10 rounded-full text-sm font-medium transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;