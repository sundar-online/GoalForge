import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * A premium, responsive confirmation dialog before destructive actions.
 * Perfect for deleting Goals or Tasks safely in GoalForge.
 */
export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  itemName = '',
  message = 'This action cannot be undone. All associated history, streaks, and statistics will be permanently removed.'
}) => {
  // Listen for escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Modal Container */}
      <div
        className="relative bg-bg-card border border-border-light rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-float overflow-hidden space-y-6 animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        {/* Warning Icon Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto shadow-inner select-none animate-bounce">
          <AlertTriangle size={28} />
        </div>

        {/* Text Header */}
        <div className="space-y-2">
          <h3 id="delete-modal-title" className="text-xl md:text-2xl font-black text-text-main tracking-tight leading-none">
            {title}
          </h3>
          {itemName && (
            <div className="bg-bg-input/50 rounded-xl px-4 py-2.5 max-w-full inline-block border border-border-light/40">
              <span className="text-xs font-black text-rose-400 break-words line-clamp-2">
                "{itemName}"
              </span>
            </div>
          )}
          <p className="text-sm text-text-muted font-bold leading-relaxed pt-1">
            {message}
          </p>
        </div>

        {/* Actions Button Group */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 rounded-xl bg-bg-input hover:bg-bg-input/80 text-text-main font-black text-sm tracking-wide transition-all border border-border-light/60 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 active:scale-95"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>

        {/* Optional absolute top corner X dismiss */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-text-muted/40 hover:text-text-main p-1.5 rounded-xl transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
