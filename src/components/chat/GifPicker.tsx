'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';

// ---------- Types ----------

interface GifItem {
  id: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  title: string;
}

interface GifSearchResponse {
  gifs: GifItem[];
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: { url: string; width: number; height: number; title: string }) => void;
}

// ---------- Component ----------

export default function GifPicker({ isOpen, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = useCallback(async (searchQuery: string, newOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `/api/gifs/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20&offset=${newOffset}`
        : `/api/gifs/trending?limit=20&offset=${newOffset}`;

      const data = await apiFetch<GifSearchResponse>(endpoint);
      const results = data.gifs || [];

      setGifs(prev => append ? [...prev, ...results] : results);
      setHasMore(results.length >= 20);
      setOffset(newOffset + results.length);
    } catch {
      if (!append) setGifs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setGifs([]);
      setOffset(0);
      setHasMore(true);
      fetchGifs('', 0, false);
    }
  }, [isOpen, fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      fetchGifs(query, 0, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, fetchGifs]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      fetchGifs(query, offset, true);
    }
  }, [loading, hasMore, query, offset, fetchGifs]);

  const handleSelect = (gif: GifItem) => {
    onSelect({ url: gif.url, width: gif.width, height: gif.height, title: gif.title });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />

      {/* Picker */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ duration: 0.15 }}
        className="glass-card"
        style={{
          position: 'absolute',
          bottom: 56,
          left: 16,
          width: 320,
          maxHeight: 400,
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 12,
        }}
      >
        {/* Search bar */}
        <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="glass-input"
              type="text"
              placeholder="Search GIFs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: 10,
                height: 34,
                fontSize: 13,
                borderRadius: 8,
              }}
              autoFocus
            />
          </div>
        </div>

        {/* GIF grid */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 10px 6px',
          }}
          className="gif-picker-scroll"
        >
          {loading && gifs.length === 0 ? (
            /* Skeleton grid */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '100%',
                    height: 90,
                    borderRadius: 8,
                    background: 'var(--bg-tertiary, rgba(255,255,255,0.06))',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : gifs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}>
              {query ? 'No GIFs found' : 'No trending GIFs available'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {gifs.map(gif => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  style={{
                    position: 'relative',
                    display: 'block',
                    width: '100%',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: 8,
                    overflow: 'hidden',
                    lineHeight: 0,
                  }}
                  title={gif.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.preview_url}
                    alt={gif.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: 8,
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  {/* Play icon overlay on hover */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 8,
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                      pointerEvents: 'none',
                    }}
                    className="gif-hover-overlay"
                  >
                    <svg width={28} height={28} viewBox="0 0 24 24" fill="white" stroke="none">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && gifs.length > 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 20,
                height: 20,
                border: '2px solid var(--text-secondary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                margin: '0 auto',
              }} />
            </div>
          )}
        </div>

        {/* Powered by GIPHY */}
        <div style={{
          padding: '6px 10px 8px',
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--text-secondary)',
          opacity: 0.7,
          flexShrink: 0,
        }}>
          Powered by GIPHY
        </div>
      </motion.div>

      {/* Scoped styles */}
      <style jsx global>{`
        .gif-picker-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .gif-picker-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .gif-picker-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .gif-picker-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        button:hover .gif-hover-overlay {
          opacity: 1 !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
