'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useSocketContext } from '@/context/SocketContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: 'none' | 'accepted' | 'pending_sent' | 'pending_received';
  isOnline: boolean;
  lastSeen: string;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  isOnline: boolean;
  lastSeen: string;
  friendshipId: string;
}

interface FriendRequest {
  id: string;
  requester: { id: string; name: string; email: string; avatar_url: string | null };
  createdAt: string;
}

interface SentRequest {
  id: string;
  addressee: { id: string; name: string; email: string; avatar_url: string | null };
  createdAt: string;
}

interface BlockedUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Avatar helper
// ---------------------------------------------------------------------------

const AVATAR_GRADIENTS = [
  ['#FF6B6B', '#EE5A24'],
  ['#7C3AED', '#A78BFA'],
  ['#06B6D4', '#22D3EE'],
  ['#F59E0B', '#FBBF24'],
  ['#10B981', '#34D399'],
  ['#EC4899', '#F472B6'],
  ['#6366F1', '#818CF8'],
  ['#14B8A6', '#2DD4BF'],
];

function getAvatarColor(name: string): [string, string] {
  const code = name.charCodeAt(0) + (name.length > 1 ? name.charCodeAt(1) : 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length] as [string, string];
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [c1, c2] = getAvatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.42,
        userSelect: 'none',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-card p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={onCancel} className="btn-ghost" disabled={loading}>
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium text-white rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  boxShadow: '0 4px 14px rgba(255, 107, 107, 0.3)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Processing...' : confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type Tab = 'friends' | 'requests' | 'blocked';

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FriendsPage() {
  const router = useRouter();
  useAuth();
  const { onlineUsers } = useSocketContext();

  const [activeTab, setActiveTab] = useState<Tab>('friends');

  // Friends list
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Requests
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Blocked
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);

  // Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    action: (() => Promise<void>) | null;
  }>({ open: false, title: '', message: '', confirmLabel: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const data = await apiFetch<{ friends: Friend[] }>('/api/friends');
      setFriends(data.friends);
    } catch {
      // silent
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const [recvData, sentData] = await Promise.all([
        apiFetch<{ requests: FriendRequest[] }>('/api/friends/requests'),
        apiFetch<{ sent: SentRequest[] }>('/api/friends/sent'),
      ]);
      setReceivedRequests(recvData.requests);
      setSentRequests(sentData.sent);
    } catch {
      // silent
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const fetchBlocked = useCallback(async () => {
    setBlockedLoading(true);
    try {
      const data = await apiFetch<{ blocked: BlockedUser[] }>('/api/friends/block');
      setBlockedUsers(data.blocked);
    } catch {
      // silent
    } finally {
      setBlockedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'blocked') fetchBlocked();
  }, [activeTab, fetchRequests, fetchBlocked]);

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await apiFetch<{ users: SearchUser[] }>('/api/friends/search', {
          method: 'POST',
          body: JSON.stringify({ query: searchTerm.trim() }),
        });
        setSearchResults(data.users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  async function sendFriendRequest(userId: string) {
    setActionLoadingId(userId);
    try {
      await apiFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: userId }),
      });
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'pending_sent' as const } : u)),
      );
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  async function acceptSearchResult(userId: string) {
    setActionLoadingId(userId);
    try {
      // Find the request for this user in received requests or do a direct accept
      const req = receivedRequests.find((r) => r.requester.id === userId);
      if (req) {
        await apiFetch(`/api/friends/accept/${req.id}`, { method: 'PUT' });
        setSearchResults((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: 'accepted' as const } : u)),
        );
        fetchFriends();
        fetchRequests();
      }
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  async function acceptRequest(requestId: string) {
    setActionLoadingId(requestId);
    try {
      await apiFetch(`/api/friends/accept/${requestId}`, { method: 'PUT' });
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchFriends();
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  async function rejectRequest(requestId: string) {
    setActionLoadingId(requestId);
    try {
      await apiFetch(`/api/friends/reject/${requestId}`, { method: 'PUT' });
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  async function cancelSentRequest(requestId: string) {
    setActionLoadingId(requestId);
    try {
      await apiFetch(`/api/friends/${requestId}`, { method: 'DELETE' });
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  function confirmUnfriend(friendshipId: string, friendName: string) {
    setOpenMenuId(null);
    setConfirmModal({
      open: true,
      title: 'Unfriend',
      message: `Are you sure you want to remove ${friendName} from your friends?`,
      confirmLabel: 'Unfriend',
      action: async () => {
        await apiFetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
        setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      },
    });
  }

  function confirmBlock(userId: string, userName: string) {
    setOpenMenuId(null);
    setConfirmModal({
      open: true,
      title: 'Block User',
      message: `Are you sure you want to block ${userName}? They will be removed from your friends list.`,
      confirmLabel: 'Block',
      action: async () => {
        await apiFetch('/api/friends/block', {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        setFriends((prev) => prev.filter((f) => f.id !== userId));
      },
    });
  }

  async function unblockUser(userId: string) {
    setActionLoadingId(userId);
    try {
      await apiFetch(`/api/friends/block/${userId}`, { method: 'DELETE' });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleConfirmAction() {
    if (!confirmModal.action) return;
    setConfirmLoading(true);
    try {
      await confirmModal.action();
    } catch {
      // silent
    } finally {
      setConfirmLoading(false);
      setConfirmModal({ open: false, title: '', message: '', confirmLabel: '', action: null });
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick() {
      setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderOnlineStatus(friendId: string, lastSeen: string) {
    const isOnline = onlineUsers.has(friendId);
    if (isOnline) {
      return (
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
            }}
          />
          Online
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            display: 'inline-block',
          }}
        />
        {lastSeen ? `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}` : 'Offline'}
      </span>
    );
  }

  function renderSearchStatusButton(result: SearchUser) {
    const isLoading = actionLoadingId === result.id;
    switch (result.status) {
      case 'none':
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => sendFriendRequest(result.id)}
            disabled={isLoading}
            className="btn-primary text-xs px-3 py-1.5"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Sending...' : 'Add Friend'}
          </motion.button>
        );
      case 'pending_sent':
        return (
          <span className="text-xs px-3 py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            Request Sent
          </span>
        );
      case 'pending_received':
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => acceptSearchResult(result.id)}
            disabled={isLoading}
            className="btn-primary text-xs px-3 py-1.5"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Accepting...' : 'Accept'}
          </motion.button>
        );
      case 'accepted':
        return (
          <span className="text-xs px-3 py-1.5 font-medium" style={{ color: 'var(--accent-teal)' }}>
            Already Friends
          </span>
        );
      default:
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Skeleton loaders
  // -----------------------------------------------------------------------

  function renderSkeletons(count: number) {
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className="glass-card p-4 flex items-center gap-4">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-48" />
        </div>
      </div>
    ));
  }

  // -----------------------------------------------------------------------
  // Tab content
  // -----------------------------------------------------------------------

  function renderFriendsTab() {
    return (
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <svg
            width={20}
            height={20}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search for friends by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-10"
          />
        </div>

        {/* Search results */}
        <AnimatePresence>
          {(searchResults.length > 0 || searchLoading) && searchTerm.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Search Results
              </p>
              {searchLoading ? (
                renderSkeletons(2)
              ) : (
                searchResults.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 flex items-center gap-3"
                  >
                    <Avatar name={result.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {result.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {result.email}
                      </p>
                    </div>
                    {renderSearchStatusButton(result)}
                  </motion.div>
                ))
              )}
              {!searchLoading && searchResults.length === 0 && searchTerm.trim() && (
                <div className="glass-card p-4 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends list */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Your Friends {!friendsLoading && `(${friends.length})`}
          </p>
          {friendsLoading ? (
            renderSkeletons(3)
          ) : friends.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-3">
              <svg
                width={48}
                height={48}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="mx-auto"
                style={{ color: 'var(--text-muted)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No friends yet. Use the search bar above to find people!
              </p>
            </div>
          ) : (
            friends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <div className="relative">
                  <Avatar name={friend.name} />
                  {onlineUsers.has(friend.id) && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: '2px solid var(--card-bg)',
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {friend.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {friend.email}
                  </p>
                  {renderOnlineStatus(friend.id, friend.lastSeen)}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/chat')}
                    className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                    Chat
                  </motion.button>
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === friend.id ? null : friend.id);
                      }}
                      className="btn-ghost p-1.5"
                    >
                      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                      </svg>
                    </motion.button>
                    <AnimatePresence>
                      {openMenuId === friend.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          className="absolute right-0 top-full mt-1 z-20 glass-card py-1 w-36"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => confirmUnfriend(friend.friendshipId, friend.name)}
                            className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Unfriend
                          </button>
                          <button
                            onClick={() => confirmBlock(friend.id, friend.name)}
                            className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent-coral)' }}
                          >
                            Block
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderRequestsTab() {
    if (requestsLoading) {
      return <div className="space-y-4">{renderSkeletons(3)}</div>;
    }

    return (
      <div className="space-y-6">
        {/* Received */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Received ({receivedRequests.length})
          </p>
          {receivedRequests.length === 0 ? (
            <div className="glass-card p-6 text-center space-y-3">
              <svg
                width={40}
                height={40}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="mx-auto"
                style={{ color: 'var(--text-muted)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending requests</p>
            </div>
          ) : (
            receivedRequests.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <Avatar name={req.requester.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {req.requester.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {req.requester.email}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => acceptRequest(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="btn-primary text-xs px-3 py-1.5"
                    style={{ opacity: actionLoadingId === req.id ? 0.7 : 1 }}
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => rejectRequest(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Reject
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Sent */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Sent ({sentRequests.length})
          </p>
          {sentRequests.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sent requests</p>
            </div>
          ) : (
            sentRequests.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <Avatar name={req.addressee.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {req.addressee.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {req.addressee.email}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => cancelSentRequest(req.id)}
                  disabled={actionLoadingId === req.id}
                  className="btn-ghost text-xs px-3 py-1.5"
                  style={{
                    color: 'var(--accent-coral)',
                    opacity: actionLoadingId === req.id ? 0.7 : 1,
                  }}
                >
                  Cancel
                </motion.button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderBlockedTab() {
    if (blockedLoading) {
      return <div className="space-y-4">{renderSkeletons(2)}</div>;
    }

    if (blockedUsers.length === 0) {
      return (
        <div className="glass-card p-8 text-center space-y-3">
          <svg
            width={48}
            height={48}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No blocked users</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {blockedUsers.map((blocked, index) => (
          <motion.div
            key={blocked.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-4 flex items-center gap-3"
          >
            <Avatar name={blocked.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {blocked.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {blocked.email}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => unblockUser(blocked.id)}
              disabled={actionLoadingId === blocked.id}
              className="btn-ghost text-xs px-3 py-1.5"
              style={{
                color: 'var(--accent-teal)',
                opacity: actionLoadingId === blocked.id ? 0.7 : 1,
              }}
            >
              Unblock
            </motion.button>
          </motion.div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: 'All Friends' },
    { key: 'requests', label: 'Requests' },
    { key: 'blocked', label: 'Blocked' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
          Friends
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Manage your friends, requests, and blocked users
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
              ...(activeTab === tab.key ? { color: '#fff' } : {}),
            }}
          >
            {tab.label}
            {tab.key === 'requests' && receivedRequests.length > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center text-xs font-bold rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: 'var(--accent-coral)',
                  color: '#fff',
                  fontSize: 10,
                }}
              >
                {receivedRequests.length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'blocked' && renderBlockedTab()}
      </motion.div>

      {/* Confirmation modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onCancel={() => setConfirmModal({ open: false, title: '', message: '', confirmLabel: '', action: null })}
        onConfirm={handleConfirmAction}
        loading={confirmLoading}
      />
    </div>
  );
}
