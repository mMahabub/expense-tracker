'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';

type RecordingState = 'idle' | 'recording' | 'uploading';

const MAX_DURATION = 300; // 5 minutes

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MicIcon = ({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="1" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="8" y1="21" x2="16" y2="21" />
  </svg>
);

const CancelIcon = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      strokeDasharray="60"
      strokeDashoffset="20"
      strokeLinecap="round"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    />
  </svg>
);

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number) => void;
}

export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (blob.size === 0) {
          cleanup();
          setState('idle');
          return;
        }

        setState('uploading');

        try {
          const formData = new FormData();
          const ext = recorder.mimeType?.includes('webm')
            ? 'webm'
            : recorder.mimeType?.includes('mp4')
              ? 'mp4'
              : 'ogg';
          formData.append('audio', blob, `recording.${ext}`);
          formData.append('duration', String(Math.round(finalElapsed)));

          const data = await apiFetch<{ url: string; duration: number }>('/api/upload/voice', {
            method: 'POST',
            body: formData,
          });

          onSend(data.url, data.duration);
        } catch (error) {
          console.error('Voice upload error:', error);
        } finally {
          cleanup();
          setState('idle');
        }
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      setState('recording');

      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
        if (secs >= MAX_DURATION) {
          stopRecording();
        }
      }, 200);
    } catch (error) {
      console.error('Failed to start recording:', error);
      cleanup();
      setState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, onSend]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
    cleanup();
    setState('idle');
  }, [cleanup]);

  const handleMicClick = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {state === 'recording' && (
        <>
          <button
            onClick={cancelRecording}
            type="button"
            className="btn btn-ghost"
            style={{
              width: '28px',
              height: '28px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              minHeight: 'unset',
            }}
            aria-label="Cancel recording"
          >
            <CancelIcon size={16} />
          </button>
          <span
            style={{
              fontSize: '13px',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-text-secondary, #888)',
              minWidth: '32px',
            }}
          >
            {formatTime(elapsed)}
          </span>
        </>
      )}

      <motion.button
        onClick={handleMicClick}
        disabled={state === 'uploading'}
        type="button"
        className="btn btn-ghost"
        style={{
          width: '36px',
          height: '36px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          minHeight: 'unset',
          backgroundColor: state === 'recording' ? 'var(--color-error, #ef4444)' : undefined,
          color: state === 'recording' ? '#fff' : undefined,
        }}
        animate={
          state === 'recording'
            ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }
            : {}
        }
        transition={
          state === 'recording'
            ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
            : {}
        }
        aria-label={
          state === 'idle'
            ? 'Start recording'
            : state === 'recording'
              ? 'Stop recording'
              : 'Uploading voice message'
        }
      >
        {state === 'uploading' ? (
          <Spinner size={20} />
        ) : (
          <MicIcon size={20} color={state === 'recording' ? '#fff' : 'currentColor'} />
        )}
      </motion.button>
    </div>
  );
}
