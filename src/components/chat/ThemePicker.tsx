'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';
import { CHAT_THEMES } from '@/lib/chatThemes';

// ---------- Types ----------

interface ThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

// ---------- Component ----------

export default function ThemePicker({
  isOpen,
  onClose,
  conversationId,
  currentTheme,
  onThemeChange,
}: ThemePickerProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Reset selectedTheme when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTheme(currentTheme);
      setShowToast(false);
    }
  }, [isOpen, currentTheme]);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const themeEntries = Object.entries(CHAT_THEMES);
  const activeTheme = CHAT_THEMES[selectedTheme as keyof typeof CHAT_THEMES] || CHAT_THEMES['default'];
  const handleApply = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/conversations/${conversationId}/theme`, {
        method: 'PUT',
        body: JSON.stringify({ theme: selectedTheme }),
      });
      onThemeChange(selectedTheme);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 800);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const previewMessages = [
    { text: 'Hey! How are you?', sent: true, time: '10:30 AM' },
    { text: "I'm great! You?", sent: false, time: '10:31 AM' },
    { text: 'Let\u2019s catch up soon! \ud83d\ude0a', sent: true, time: '10:32 AM' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="theme-picker-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            key="theme-picker-modal"
            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: isMobile ? '20px 20px 0 0' : 16,
              padding: 24,
              position: 'relative',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r="2.5" />
                  <circle cx="19" cy="11.5" r="2.5" />
                  <circle cx="17" cy="18" r="2.5" />
                  <circle cx="8.5" cy="18" r="2.5" />
                  <circle cx="5" cy="11.5" r="2.5" />
                  <path d="M12 2a10 10 0 0 0-1 19.8c.5.1 1-.2 1-.7v-1.5c0-.4.2-.7.5-.9a7 7 0 0 1-1-13.7" />
                </svg>
                <span style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  Chat Theme
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  color: 'var(--text-secondary)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Theme Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)',
              gap: 14,
              marginBottom: 24,
            }}>
              {themeEntries.map(([key, theme]) => {
                const isSelected = selectedTheme === key;
                return (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: isSelected ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={() => setSelectedTheme(key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: theme.sentBubble,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected
                        ? `0 0 0 3px var(--card-bg), 0 0 0 6px ${theme.accent}`
                        : 'none',
                      transition: 'box-shadow 0.2s ease',
                    }}>
                      {isSelected && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {theme.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Live Preview */}
            <div style={{
              border: '1px solid var(--card-border)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              background: 'var(--card-bg)',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                marginBottom: 12,
              }}>
                Preview
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previewMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sent ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{
                        background: msg.sent ? activeTheme.sentBubble : 'var(--card-border)',
                        color: msg.sent ? '#fff' : 'var(--text-primary)',
                        padding: '8px 14px',
                        borderRadius: msg.sent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: 13,
                        maxWidth: 220,
                        transition: 'all 0.3s ease',
                        lineHeight: 1.4,
                      }}>
                        {msg.text}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                        textAlign: msg.sent ? 'right' : 'left',
                        paddingLeft: msg.sent ? 0 : 4,
                        paddingRight: msg.sent ? 4 : 0,
                      }}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 12,
                border: 'none',
                background: activeTheme.accent,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {saving ? 'Applying...' : 'Apply Theme'}
            </button>

            {/* Toast */}
            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--text-primary)',
                    color: 'var(--card-bg)',
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  Applied!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
