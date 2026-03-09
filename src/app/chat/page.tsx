'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useSocketContext } from '@/context/SocketContext';
import ChatWindow from '@/components/chat/ChatWindow';
import { getThemeAccent } from '@/lib/chatThemes';

// ---------- Types ----------

interface ConversationMember {
  id: string;
  name: string;
  avatar_url: string | null;
  isOnline: boolean;
  role: string;
}

interface LastMessage {
  content: string;
  senderName: string;
  messageType: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string | null;
  isOnline: boolean;
  lastMessage: LastMessage | null;
  unreadCount: number;
  memberCount: number;
  chatTheme?: string;
  chatWallpaper?: string;
  members: ConversationMember[];
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

// ---------- Avatar ----------

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316','#ef4444'];
function getAvatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: getAvatarColor(name), fontSize: size * 0.4 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------- Time Formatting ----------

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------- Main Page ----------

export default function ChatPage() {
  const { user } = useAuth();
  const {
    onlineUsers, typingUsers, setActiveConversation,
    onNewMessage, refreshUnreadCounts,
  } = useSocketContext();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const selectedConvRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConvRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiFetch<{ conversations: Conversation[] }>('/api/conversations');
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch friends for modals
  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const data = await apiFetch<{ friends: Friend[] }>('/api/friends');
      setFriends(data.friends);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showNewChatModal || showNewGroupModal) {
      fetchFriends();
    }
  }, [showNewChatModal, showNewGroupModal, fetchFriends]);

  // Socket: new message handler
  useEffect(() => {
    onNewMessage((message: {
      id: string;
      conversationId: string;
      content: string;
      messageType: string;
      sender: { id: string; name: string; avatar_url: string | null };
      createdAt: string;
    }) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === message.conversationId);
        if (idx === -1) {
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          content: message.content,
          senderName: message.sender.name,
          messageType: message.messageType,
          createdAt: message.createdAt,
        };
        if (selectedConvRef.current !== conv.id) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    });
  }, [onNewMessage, fetchConversations]);

  // Select a conversation
  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setMobileView('chat');
    setActiveConversation(conv.id);

    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    );
  }, [setActiveConversation]);

  // Mobile back
  const handleBack = useCallback(() => {
    setMobileView('list');
    setActiveConversation(null);
    setSelectedConversation(null);
    refreshUnreadCounts();
  }, [setActiveConversation, refreshUnreadCounts]);

  // Filter & sort conversations
  const filteredConversations = conversations
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  // New chat: find or open direct conversation with a friend
  const handleStartChat = useCallback((friend: Friend) => {
    const existing = conversations.find(c =>
      c.type === 'direct' && c.members.some(m => m.id === friend.id)
    );
    if (existing) {
      handleSelectConversation(existing);
    }
    setShowNewChatModal(false);
  }, [conversations, handleSelectConversation]);

  // New group
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setCreatingGroup(true);
    try {
      const data = await apiFetch<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ name: groupName.trim(), memberIds: selectedMembers }),
      });
      setConversations(prev => [data.conversation, ...prev]);
      handleSelectConversation(data.conversation);
      setShowNewGroupModal(false);
      setGroupName('');
      setSelectedMembers([]);
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreatingGroup(false);
    }
  }, [groupName, selectedMembers, handleSelectConversation]);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (!user) return null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Desktop layout */}
      <div className="hidden md:flex flex-1" style={{ height: 'calc(100vh - 2.5rem)' }}>
        {/* Conversation List - Desktop */}
        <div className="glass-card flex flex-col" style={{ width: 320, flexShrink: 0, borderRadius: '16px 0 0 16px', overflow: 'hidden' }}>
          <ConversationListContent
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredConversations={filteredConversations}
            selectedConversation={selectedConversation}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
            user={user}
            onSelect={handleSelectConversation}
            onNewChat={() => setShowNewChatModal(true)}
            onNewGroup={() => setShowNewGroupModal(true)}
          />
        </div>

        {/* Chat Window or Empty State - Desktop */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              onBack={handleBack}
              currentUserId={user.id}
              currentUserName={user.name}
            />
          ) : (
            <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4" style={{ borderRadius: '0 16px 16px 0' }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-1 flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
        <AnimatePresence mode="wait">
          {mobileView === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card flex-1 flex flex-col"
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <ConversationListContent
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredConversations={filteredConversations}
                selectedConversation={selectedConversation}
                onlineUsers={onlineUsers}
                typingUsers={typingUsers}
                user={user}
                onSelect={handleSelectConversation}
                onNewChat={() => setShowNewChatModal(true)}
                onNewGroup={() => setShowNewGroupModal(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
              style={{ minHeight: 0 }}
            >
              {selectedConversation && (
                <ChatWindow
                  conversation={selectedConversation}
                  onBack={handleBack}
                  currentUserId={user.id}
                  currentUserName={user.name}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={() => setShowNewChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 420, maxHeight: '70vh', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>Start a Conversation</h2>
                <button
                  className="btn-ghost"
                  onClick={() => setShowNewChatModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {friendsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
                  ))
                ) : friends.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No friends yet. Add friends to start chatting!</p>
                ) : (
                  friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleStartChat(friend)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        borderRadius: 12, border: 'none', background: 'transparent',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ position: 'relative' }}>
                        <Avatar name={friend.name} size={40} />
                        {friend.isOnline && (
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                            borderRadius: '50%', background: '#22c55e',
                            border: '2px solid var(--card-bg)',
                          }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: 0 }}>{friend.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={() => setShowNewGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 420, maxHeight: '80vh', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>Create Group</h2>
                <button
                  className="btn-ghost"
                  onClick={() => { setShowNewGroupModal(false); setGroupName(''); setSelectedMembers([]); }}
                  style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <input
                className="glass-input"
                placeholder="Group name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                style={{ marginBottom: 16, width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14 }}
              />

              <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Add Members {selectedMembers.length > 0 && `(${selectedMembers.length} selected)`}
              </p>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {friendsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
                  ))
                ) : friends.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No friends to add</p>
                ) : (
                  friends.map(friend => {
                    const isSelected = selectedMembers.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleMember(friend.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                          borderRadius: 12, border: 'none',
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                          cursor: 'pointer', width: '100%', textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          border: isSelected ? 'none' : '2px solid var(--input-border)',
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {isSelected && (
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <Avatar name={friend.name} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: 0 }}>{friend.name}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{friend.email}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                className="btn-primary"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  opacity: (!groupName.trim() || selectedMembers.length === 0) ? 0.5 : 1,
                }}
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Conversation List Content ----------

interface ConversationListContentProps {
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredConversations: Conversation[];
  selectedConversation: Conversation | null;
  onlineUsers: Set<string>;
  typingUsers: Record<string, { userId: string; name: string }[]>;
  user: { id: string; name: string; email: string };
  onSelect: (c: Conversation) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
}

function ConversationListContent({
  loading, searchQuery, setSearchQuery,
  filteredConversations, selectedConversation,
  onlineUsers, typingUsers, user,
  onSelect, onNewChat, onNewGroup,
}: ConversationListContentProps) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Chats</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-ghost"
            onClick={onNewChat}
            title="New Chat"
            style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </button>
          <button
            className="btn-ghost"
            onClick={onNewGroup}
            title="New Group"
            style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 16px' }}>
        <div style={{ position: 'relative' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="glass-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Conversation items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12, marginBottom: 4 }} />
          ))
        ) : filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isSelected = selectedConversation?.id === conv.id;
            const otherMember = conv.type === 'direct'
              ? conv.members.find(m => m.id !== user.id)
              : null;
            const isOnline = otherMember ? onlineUsers.has(otherMember.id) : false;
            const typing = typingUsers[conv.id];
            const hasTyping = typing && typing.length > 0;

            let preview = 'No messages yet';
            if (hasTyping) {
              const names = typing.map(t => t.name).join(', ');
              preview = `${names} ${typing.length === 1 ? 'is' : 'are'} typing...`;
            } else if (conv.lastMessage) {
              const prefix = conv.lastMessage.senderName === user.name ? 'You: ' : '';
              const content = conv.lastMessage.messageType === 'system'
                ? conv.lastMessage.content
                : `${prefix}${conv.lastMessage.content}`;
              preview = content.length > 40 ? content.slice(0, 40) + '...' : content;
            }

            return (
              <motion.button
                key={conv.id}
                onClick={() => onSelect(conv)}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px', borderRadius: 12, border: 'none',
                  background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative' }}>
                  {conv.type === 'group' ? (
                    <div className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ width: 48, height: 48, background: 'rgba(99,102,241,0.15)' }}>
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                  ) : (
                    <Avatar name={conv.name} size={48} />
                  )}
                  {conv.type === 'direct' && isOnline && (
                    <div style={{
                      position: 'absolute', bottom: 1, right: 1, width: 13, height: 13,
                      borderRadius: '50%', background: '#22c55e',
                      border: '2.5px solid var(--card-bg)',
                    }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {conv.chatTheme && conv.chatTheme !== 'default' && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: getThemeAccent(conv.chatTheme),
                        }} />
                      )}
                      <p style={{
                        color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150,
                      }}>{conv.name}</p>
                    </div>
                    {conv.lastMessage && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                        {formatMessageTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                      color: hasTyping ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontSize: 13, margin: 0, fontStyle: hasTyping ? 'italic' : 'normal',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: conv.unreadCount > 0 ? 160 : 200,
                    }}>{preview}</p>
                    {conv.unreadCount > 0 && (
                      <span className="badge-pulse" style={{
                        background: 'var(--accent-primary)', color: 'white',
                        fontSize: 11, fontWeight: 700, borderRadius: 10,
                        minWidth: 20, height: 20, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 6px', flexShrink: 0,
                      }}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </>
  );
}
