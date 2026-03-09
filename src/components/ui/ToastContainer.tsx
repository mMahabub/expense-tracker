'use client';

import { createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast, Toast } from '@/hooks/useToast';

interface ToastContextType {
  addToast: (message: string, type?: Toast['type']) => void;
}

export const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export function useToastContext() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastOverlay toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastOverlay({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-xl backdrop-blur-lg"
            style={{
              background:
                toast.type === 'success'
                  ? 'linear-gradient(135deg, #00d4aa, #00b894)'
                  : toast.type === 'error'
                  ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow:
                toast.type === 'success'
                  ? '0 8px 24px rgba(0, 212, 170, 0.3)'
                  : toast.type === 'error'
                  ? '0 8px 24px rgba(255, 107, 107, 0.3)'
                  : '0 8px 24px rgba(99, 102, 241, 0.3)',
            }}
          >
            {toast.type === 'success' && (
              <svg width={16} height={16} style={{ flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
