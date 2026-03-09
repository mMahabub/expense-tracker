'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';
import { useSocketContext } from '@/context/SocketContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

const LIMIT = 20;

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'friend_request':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
      );
    case 'friend_accepted':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(20, 184, 166, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      );
    case 'new_message':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      );
    case 'group_invite':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(168, 85, 247, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      );
    case 'reaction':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(236, 72, 153, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      );
    case 'expense_reminder':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      );
    default:
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(107, 114, 128, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      );
  }
}

function getNotificationRoute(notification: Notification): string {
  const data = notification.data || {};
  switch (notification.type) {
    case 'friend_request':
      return '/friends?tab=requests';
    case 'friend_accepted':
      return '/friends';
    case 'new_message':
      return data.conversationId ? `/chat?c=${data.conversationId}` : '/chat';
    case 'group_invite':
      return '/chat';
    case 'reaction':
      return data.conversationId ? `/chat?c=${data.conversationId}` : '/chat';
    case 'expense_reminder':
      return '/expenses';
    default:
      return '/';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { onNewNotification, setUnreadNotifCount } = useSocketContext();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const data = await apiFetch<NotificationsResponse>(
        `/api/notifications?page=${pageNum}&limit=${LIMIT}`
      );
      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
      setUnreadNotifCount(data.unreadCount);
    } catch {
      // Silently handle fetch errors
    }
  }, [setUnreadNotifCount]);

  useEffect(() => {
    fetchNotifications(1, false).finally(() => setLoading(false));
  }, [fetchNotifications]);

  useEffect(() => {
    onNewNotification((data) => {
      const newNotif: Notification = {
        id: crypto.randomUUID(),
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setTotal((prev) => prev + 1);
      setUnreadCount((prev) => prev + 1);
    });
  }, [onNewNotification]);

  async function handleMarkAllRead() {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    try {
      await apiFetch('/api/notifications/read', {
        method: 'PUT',
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      setUnreadNotifCount(0);
    } catch {
      // Silently handle errors
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      try {
        await apiFetch('/api/notifications/read', {
          method: 'PUT',
          body: JSON.stringify({ ids: [notification.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue with navigation even if marking read fails
      }
    }
    router.push(getNotificationRoute(notification));
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (notif && !notif.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    }
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch {
      // Re-add if delete fails
      if (notif) {
        setNotifications((prev) => [...prev, notif].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        setTotal((prev) => prev + 1);
        if (!notif.is_read) {
          setUnreadCount((prev) => prev + 1);
          setUnreadNotifCount((prev) => prev + 1);
        }
      }
    }
  }

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchNotifications(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1
            className="text-2xl font-heading font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Notifications
          </h1>
          {total > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-ghost"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            style={{
              fontSize: 14,
              color: 'var(--accent-primary)',
              opacity: markingAllRead ? 0.6 : 1,
            }}
          >
            {markingAllRead ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center',
          }}
        >
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 20, opacity: 0.5 }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)', marginBottom: 8 }}
          >
            No notifications yet
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: 320 }}>
            When you get friend requests, messages, or reactions, they&apos;ll appear here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
                transition={{ delay: index < LIMIT ? index * 0.03 : 0 }}
                className="glass-card"
                onClick={() => handleNotificationClick(notification)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  position: 'relative',
                  background: notification.is_read ? undefined : 'rgba(99, 102, 241, 0.05)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = notification.is_read
                    ? 'rgba(99, 102, 241, 0.03)'
                    : 'rgba(99, 102, 241, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.is_read
                    ? ''
                    : 'rgba(99, 102, 241, 0.05)';
                }}
              >
                <NotificationIcon type={notification.type} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: notification.is_read ? 500 : 600,
                      fontSize: 14,
                      lineHeight: 1.4,
                      marginBottom: 2,
                    }}
                  >
                    {notification.title}
                  </p>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {notification.message}
                  </p>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      marginTop: 4,
                      opacity: 0.7,
                    }}
                  >
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  {!notification.is_read && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="btn-ghost"
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-coral)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    aria-label="Delete notification"
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {total > notifications.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 8,
              }}
            >
              <button
                className="btn-primary"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  fontSize: 14,
                  padding: '10px 28px',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
