// Chat theme definitions for per-conversation theming

export type ChatThemeName =
  | 'default'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'purple'
  | 'rose'
  | 'golden'
  | 'midnight'
  | 'cherry'
  | 'mint'
  | 'lavender'
  | 'coral'
  | 'sky'
  | 'neon'
  | 'monochrome';

interface ChatTheme {
  name: ChatThemeName;
  label: string;
  sentBubble: string;
  accent: string;
  styles: {
    '--chat-sent-bubble': string;
    '--chat-sent-text': string;
    '--chat-accent': string;
    '--chat-bg': string;
    '--chat-bg-dark': string;
    '--chat-reaction-bg': string;
    '--chat-reply-border': string;
    '--chat-input-focus': string;
    '--chat-bubble-shadow': string;
  };
  bgEffect?: string;
}

export const CHAT_THEMES: Record<ChatThemeName, ChatTheme> = {
  default: {
    name: 'default',
    label: 'Classic Blue',
    sentBubble: '#3b82f6',
    accent: '#3b82f6',
    styles: {
      '--chat-sent-bubble': '#3b82f6',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#3b82f6',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(59, 130, 246, 0.1)',
      '--chat-reply-border': '#3b82f6',
      '--chat-input-focus': '#3b82f6',
      '--chat-bubble-shadow': '',
    },
  },

  ocean: {
    name: 'ocean',
    label: 'Ocean Teal',
    sentBubble: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    accent: '#0891b2',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #0891b2, #06b6d4)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#0891b2',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(8, 145, 178, 0.1)',
      '--chat-reply-border': '#0891b2',
      '--chat-input-focus': '#0891b2',
      '--chat-bubble-shadow': '',
    },
    bgEffect: `
      .chat-bg-ocean::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 80% 40% at 50% 100%, rgba(8, 145, 178, 0.04) 0%, transparent 70%),
          radial-gradient(ellipse 60% 30% at 30% 80%, rgba(6, 182, 212, 0.03) 0%, transparent 70%),
          radial-gradient(ellipse 70% 35% at 70% 90%, rgba(8, 145, 178, 0.03) 0%, transparent 70%);
        z-index: 0;
      }
      .dark .chat-bg-ocean::before {
        background:
          radial-gradient(ellipse 80% 40% at 50% 100%, rgba(8, 145, 178, 0.06) 0%, transparent 70%),
          radial-gradient(ellipse 60% 30% at 30% 80%, rgba(6, 182, 212, 0.04) 0%, transparent 70%),
          radial-gradient(ellipse 70% 35% at 70% 90%, rgba(8, 145, 178, 0.04) 0%, transparent 70%);
      }
    `,
  },

  sunset: {
    name: 'sunset',
    label: 'Sunset Orange-Pink',
    sentBubble: 'linear-gradient(135deg, #f97316, #ec4899)',
    accent: '#f97316',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #f97316, #ec4899)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#f97316',
      '--chat-bg': 'linear-gradient(180deg, rgba(249, 115, 22, 0.02) 0%, rgba(236, 72, 153, 0.02) 100%)',
      '--chat-bg-dark': 'linear-gradient(180deg, rgba(249, 115, 22, 0.04) 0%, rgba(236, 72, 153, 0.04) 100%)',
      '--chat-reaction-bg': 'rgba(249, 115, 22, 0.1)',
      '--chat-reply-border': '#f97316',
      '--chat-input-focus': '#f97316',
      '--chat-bubble-shadow': '',
    },
  },

  forest: {
    name: 'forest',
    label: 'Forest Green',
    sentBubble: 'linear-gradient(135deg, #16a34a, #22c55e)',
    accent: '#22c55e',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #16a34a, #22c55e)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#22c55e',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(34, 197, 94, 0.1)',
      '--chat-reply-border': '#22c55e',
      '--chat-input-focus': '#16a34a',
      '--chat-bubble-shadow': '',
    },
    bgEffect: `
      .chat-bg-forest::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle 8px at 15% 25%, rgba(34, 197, 94, 0.03) 0%, transparent 100%),
          radial-gradient(circle 12px at 80% 15%, rgba(22, 163, 74, 0.02) 0%, transparent 100%),
          radial-gradient(circle 6px at 60% 70%, rgba(34, 197, 94, 0.03) 0%, transparent 100%),
          radial-gradient(circle 10px at 25% 85%, rgba(22, 163, 74, 0.02) 0%, transparent 100%),
          radial-gradient(circle 7px at 90% 60%, rgba(34, 197, 94, 0.02) 0%, transparent 100%);
        z-index: 0;
      }
      .dark .chat-bg-forest::before {
        background:
          radial-gradient(circle 8px at 15% 25%, rgba(34, 197, 94, 0.05) 0%, transparent 100%),
          radial-gradient(circle 12px at 80% 15%, rgba(22, 163, 74, 0.03) 0%, transparent 100%),
          radial-gradient(circle 6px at 60% 70%, rgba(34, 197, 94, 0.04) 0%, transparent 100%),
          radial-gradient(circle 10px at 25% 85%, rgba(22, 163, 74, 0.03) 0%, transparent 100%),
          radial-gradient(circle 7px at 90% 60%, rgba(34, 197, 94, 0.04) 0%, transparent 100%);
      }
    `,
  },

  purple: {
    name: 'purple',
    label: 'Royal Purple',
    sentBubble: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    accent: '#8b5cf6',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#8b5cf6',
      '--chat-bg': 'radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 70%)',
      '--chat-bg-dark': 'radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
      '--chat-reaction-bg': 'rgba(139, 92, 246, 0.1)',
      '--chat-reply-border': '#8b5cf6',
      '--chat-input-focus': '#7c3aed',
      '--chat-bubble-shadow': '',
    },
  },

  rose: {
    name: 'rose',
    label: 'Rose Pink',
    sentBubble: 'linear-gradient(135deg, #e11d48, #f43f5e)',
    accent: '#f43f5e',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #e11d48, #f43f5e)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#f43f5e',
      '--chat-bg': 'rgba(244, 63, 94, 0.015)',
      '--chat-bg-dark': 'rgba(244, 63, 94, 0.03)',
      '--chat-reaction-bg': 'rgba(244, 63, 94, 0.1)',
      '--chat-reply-border': '#f43f5e',
      '--chat-input-focus': '#e11d48',
      '--chat-bubble-shadow': '',
    },
  },

  golden: {
    name: 'golden',
    label: 'Golden Amber',
    sentBubble: 'linear-gradient(135deg, #d97706, #f59e0b)',
    accent: '#f59e0b',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #d97706, #f59e0b)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#f59e0b',
      '--chat-bg': 'rgba(245, 158, 11, 0.015)',
      '--chat-bg-dark': 'rgba(245, 158, 11, 0.03)',
      '--chat-reaction-bg': 'rgba(245, 158, 11, 0.1)',
      '--chat-reply-border': '#f59e0b',
      '--chat-input-focus': '#d97706',
      '--chat-bubble-shadow': '',
    },
  },

  midnight: {
    name: 'midnight',
    label: 'Midnight Indigo',
    sentBubble: 'linear-gradient(135deg, #4338ca, #4f46e5)',
    accent: '#6366f1',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #4338ca, #4f46e5)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#6366f1',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(99, 102, 241, 0.1)',
      '--chat-reply-border': '#6366f1',
      '--chat-input-focus': '#4338ca',
      '--chat-bubble-shadow': '',
    },
    bgEffect: `
      .chat-bg-midnight::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle 1px at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 2px),
          radial-gradient(circle 1px at 30% 50%, rgba(129, 140, 248, 0.06) 0%, transparent 2px),
          radial-gradient(circle 1px at 50% 10%, rgba(99, 102, 241, 0.07) 0%, transparent 2px),
          radial-gradient(circle 1px at 70% 40%, rgba(129, 140, 248, 0.05) 0%, transparent 2px),
          radial-gradient(circle 1px at 90% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 2px),
          radial-gradient(circle 1px at 20% 80%, rgba(129, 140, 248, 0.07) 0%, transparent 2px),
          radial-gradient(circle 1px at 60% 90%, rgba(99, 102, 241, 0.05) 0%, transparent 2px),
          radial-gradient(circle 1px at 85% 15%, rgba(129, 140, 248, 0.06) 0%, transparent 2px),
          radial-gradient(circle 1px at 45% 65%, rgba(99, 102, 241, 0.07) 0%, transparent 2px),
          radial-gradient(circle 0.5px at 5% 55%, rgba(129, 140, 248, 0.08) 0%, transparent 1px),
          radial-gradient(circle 0.5px at 75% 85%, rgba(99, 102, 241, 0.06) 0%, transparent 1px),
          radial-gradient(circle 0.5px at 95% 35%, rgba(129, 140, 248, 0.07) 0%, transparent 1px);
        z-index: 0;
      }
      .dark .chat-bg-midnight::before {
        background:
          radial-gradient(circle 1px at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 2px),
          radial-gradient(circle 1px at 30% 50%, rgba(129, 140, 248, 0.12) 0%, transparent 2px),
          radial-gradient(circle 1px at 50% 10%, rgba(99, 102, 241, 0.13) 0%, transparent 2px),
          radial-gradient(circle 1px at 70% 40%, rgba(129, 140, 248, 0.10) 0%, transparent 2px),
          radial-gradient(circle 1px at 90% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 2px),
          radial-gradient(circle 1px at 20% 80%, rgba(129, 140, 248, 0.13) 0%, transparent 2px),
          radial-gradient(circle 1px at 60% 90%, rgba(99, 102, 241, 0.10) 0%, transparent 2px),
          radial-gradient(circle 1px at 85% 15%, rgba(129, 140, 248, 0.12) 0%, transparent 2px),
          radial-gradient(circle 1px at 45% 65%, rgba(99, 102, 241, 0.13) 0%, transparent 2px),
          radial-gradient(circle 0.5px at 5% 55%, rgba(129, 140, 248, 0.15) 0%, transparent 1px),
          radial-gradient(circle 0.5px at 75% 85%, rgba(99, 102, 241, 0.12) 0%, transparent 1px),
          radial-gradient(circle 0.5px at 95% 35%, rgba(129, 140, 248, 0.13) 0%, transparent 1px);
      }
    `,
  },

  cherry: {
    name: 'cherry',
    label: 'Cherry Red',
    sentBubble: 'linear-gradient(135deg, #dc2626, #ef4444)',
    accent: '#ef4444',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #dc2626, #ef4444)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#ef4444',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(239, 68, 68, 0.1)',
      '--chat-reply-border': '#ef4444',
      '--chat-input-focus': '#dc2626',
      '--chat-bubble-shadow': '',
    },
  },

  mint: {
    name: 'mint',
    label: 'Fresh Mint',
    sentBubble: 'linear-gradient(135deg, #059669, #10b981)',
    accent: '#10b981',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #059669, #10b981)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#10b981',
      '--chat-bg': 'rgba(16, 185, 129, 0.015)',
      '--chat-bg-dark': 'rgba(16, 185, 129, 0.03)',
      '--chat-reaction-bg': 'rgba(16, 185, 129, 0.1)',
      '--chat-reply-border': '#10b981',
      '--chat-input-focus': '#059669',
      '--chat-bubble-shadow': '',
    },
  },

  lavender: {
    name: 'lavender',
    label: 'Soft Lavender',
    sentBubble: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    accent: '#a78bfa',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #7c3aed, #a78bfa)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#a78bfa',
      '--chat-bg': 'rgba(167, 139, 250, 0.02)',
      '--chat-bg-dark': 'rgba(167, 139, 250, 0.04)',
      '--chat-reaction-bg': 'rgba(167, 139, 250, 0.1)',
      '--chat-reply-border': '#a78bfa',
      '--chat-input-focus': '#7c3aed',
      '--chat-bubble-shadow': '',
    },
  },

  coral: {
    name: 'coral',
    label: 'Warm Coral',
    sentBubble: 'linear-gradient(135deg, #f97316, #fb923c)',
    accent: '#fb923c',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #f97316, #fb923c)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#fb923c',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(251, 146, 60, 0.1)',
      '--chat-reply-border': '#fb923c',
      '--chat-input-focus': '#f97316',
      '--chat-bubble-shadow': '',
    },
  },

  sky: {
    name: 'sky',
    label: 'Sky Blue',
    sentBubble: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    accent: '#38bdf8',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #0284c7, #38bdf8)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#38bdf8',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(56, 189, 248, 0.1)',
      '--chat-reply-border': '#38bdf8',
      '--chat-input-focus': '#0284c7',
      '--chat-bubble-shadow': '',
    },
    bgEffect: `
      .chat-bg-sky::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 120px 40px at 20% 30%, rgba(56, 189, 248, 0.03) 0%, transparent 100%),
          radial-gradient(ellipse 100px 30px at 70% 20%, rgba(2, 132, 199, 0.025) 0%, transparent 100%),
          radial-gradient(ellipse 80px 25px at 50% 60%, rgba(56, 189, 248, 0.02) 0%, transparent 100%),
          radial-gradient(ellipse 140px 35px at 85% 75%, rgba(2, 132, 199, 0.025) 0%, transparent 100%);
        z-index: 0;
      }
      .dark .chat-bg-sky::before {
        background:
          radial-gradient(ellipse 120px 40px at 20% 30%, rgba(56, 189, 248, 0.05) 0%, transparent 100%),
          radial-gradient(ellipse 100px 30px at 70% 20%, rgba(2, 132, 199, 0.04) 0%, transparent 100%),
          radial-gradient(ellipse 80px 25px at 50% 60%, rgba(56, 189, 248, 0.035) 0%, transparent 100%),
          radial-gradient(ellipse 140px 35px at 85% 75%, rgba(2, 132, 199, 0.04) 0%, transparent 100%);
      }
    `,
  },

  neon: {
    name: 'neon',
    label: 'Neon Glow',
    sentBubble: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    accent: '#06b6d4',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#06b6d4',
      '--chat-bg': 'radial-gradient(ellipse at 30% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(6, 182, 212, 0.03) 0%, transparent 50%)',
      '--chat-bg-dark': 'radial-gradient(ellipse at 30% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)',
      '--chat-reaction-bg': 'rgba(6, 182, 212, 0.1)',
      '--chat-reply-border': '#06b6d4',
      '--chat-input-focus': '#8b5cf6',
      '--chat-bubble-shadow': '0 0 12px rgba(139, 92, 246, 0.3), 0 0 24px rgba(6, 182, 212, 0.15)',
    },
  },

  monochrome: {
    name: 'monochrome',
    label: 'Elegant Gray',
    sentBubble: 'linear-gradient(135deg, #374151, #4b5563)',
    accent: '#6b7280',
    styles: {
      '--chat-sent-bubble': 'linear-gradient(135deg, #374151, #4b5563)',
      '--chat-sent-text': '#ffffff',
      '--chat-accent': '#6b7280',
      '--chat-bg': 'transparent',
      '--chat-bg-dark': 'transparent',
      '--chat-reaction-bg': 'rgba(107, 114, 128, 0.1)',
      '--chat-reply-border': '#6b7280',
      '--chat-input-focus': '#4b5563',
      '--chat-bubble-shadow': '',
    },
  },
};

/**
 * Returns a flat object of CSS variable key-value pairs for the given theme.
 * Can be spread as inline styles on a container element.
 */
export function getThemeStyles(themeName: string): Record<string, string> {
  const theme = CHAT_THEMES[themeName as ChatThemeName] ?? CHAT_THEMES.default;
  return { ...theme.styles };
}

/**
 * Returns the accent color string for the given theme.
 * Useful for rendering the colored dot in the conversation list.
 */
export function getThemeAccent(themeName: string): string {
  const theme = CHAT_THEMES[themeName as ChatThemeName] ?? CHAT_THEMES.default;
  return theme.accent;
}
