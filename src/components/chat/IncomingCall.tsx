'use client';
import { motion } from 'framer-motion';

interface IncomingCallProps {
  caller: { name: string; avatar_url: string | null };
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCall({ caller, callType, onAccept, onDecline }: IncomingCallProps) {
  const initial = caller.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Pulse rings */}
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(34, 197, 94, 0.4)',
            }}
          />
        ))}

        {/* Avatar */}
        <div
          style={{
            position: 'absolute',
            inset: 30,
            borderRadius: '50%',
            background: caller.avatar_url
              ? `url(${caller.avatar_url}) center/cover no-repeat`
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)',
          }}
        >
          {!caller.avatar_url && (
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>
              {initial}
            </span>
          )}
        </div>
      </div>

      {/* Caller name */}
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 600, margin: 0, marginBottom: 8 }}>
        {caller.name}
      </h2>

      {/* Call type label */}
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, margin: 0, marginBottom: 64 }}>
        {callType === 'video' ? 'Video Call' : 'Audio Call'}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 48 }}>
        {/* Decline */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onDecline}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
          }}
          aria-label="Decline call"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </motion.button>

        {/* Accept */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onAccept}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
          }}
          aria-label="Accept call"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}
