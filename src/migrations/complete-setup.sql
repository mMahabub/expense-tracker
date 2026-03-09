-- ============================================================
-- FinMate - Complete Database Setup
-- Run this in Neon SQL Editor to set up the entire database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE TABLES (no foreign key dependencies)
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    avatar_url text,
    email_verified boolean DEFAULT false,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    is_online boolean DEFAULT false,
    last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    description text NOT NULL,
    icon character varying(10) NOT NULL,
    category character varying(30) NOT NULL,
    xp_reward integer DEFAULT 0,
    requirement_type character varying(30) NOT NULL,
    requirement_value integer NOT NULL,
    CONSTRAINT badges_category_check CHECK (category IN ('streak', 'budget', 'logging', 'social', 'milestone', 'special'))
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    type character varying(10) DEFAULT 'direct' NOT NULL,
    name character varying(100),
    avatar_url text,
    created_by uuid REFERENCES users(id),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversations_type_check CHECK (type IN ('direct', 'group'))
);

-- Monthly Challenges
CREATE TABLE IF NOT EXISTS monthly_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    icon character varying(10) NOT NULL,
    challenge_type character varying(30) NOT NULL,
    target_value numeric(10,2) NOT NULL,
    category character varying(50),
    month character varying(7) NOT NULL,
    xp_reward integer DEFAULT 100,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLES WITH user_id FOREIGN KEY
-- ============================================================

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    category character varying(50) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    recurring character varying(20) DEFAULT 'none',
    created_at timestamp with time zone DEFAULT now()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category character varying(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    month character varying(7) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT budgets_user_id_category_month_key UNIQUE (user_id, category, month)
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status character varying(20) DEFAULT 'pending' NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT friendships_check CHECK (requester_id <> addressee_id),
    CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'blocked')),
    CONSTRAINT friendships_requester_id_addressee_id_key UNIQUE (requester_id, addressee_id)
);

-- Blocked Users
CREATE TABLE IF NOT EXISTS blocked_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT blocked_users_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    message text,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_type_check CHECK (type IN ('friend_request', 'friend_accepted', 'new_message', 'group_invite', 'expense_reminder', 'reaction'))
);

-- Bill Reminders
CREATE TABLE IF NOT EXISTS bill_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name character varying(200) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD',
    category character varying(50) NOT NULL,
    frequency character varying(20) NOT NULL,
    due_date date NOT NULL,
    next_due_date date NOT NULL,
    reminder_days_before integer DEFAULT 1,
    is_active boolean DEFAULT true,
    is_auto_add boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bill_reminders_frequency_check CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time'))
);

-- Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token character varying(255) NOT NULL UNIQUE,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- User Stats (Gamification)
CREATE TABLE IF NOT EXISTS user_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    xp_points integer DEFAULT 0,
    level integer DEFAULT 1,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_activity_date date,
    total_expenses_logged integer DEFAULT 0,
    total_days_active integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. TABLES WITH MULTIPLE FOREIGN KEYS
-- ============================================================

-- Conversation Members
CREATE TABLE IF NOT EXISTS conversation_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role character varying(10) DEFAULT 'member',
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_muted boolean DEFAULT false,
    chat_theme character varying(20) DEFAULT 'default',
    chat_wallpaper character varying(30) DEFAULT 'none',
    CONSTRAINT conversation_members_role_check CHECK (role IN ('admin', 'member')),
    CONSTRAINT conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type character varying(20) DEFAULT 'text',
    reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    media_url text,
    media_type character varying(20),
    media_metadata jsonb,
    CONSTRAINT messages_message_type_check CHECK (message_type IN ('text', 'image', 'file', 'system', 'emoji', 'gif', 'voice'))
);

-- Message Reads
CREATE TABLE IF NOT EXISTS message_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_reads_message_id_user_id_key UNIQUE (message_id, user_id)
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji)
);

-- Bill Payments
CREATE TABLE IF NOT EXISTS bill_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    reminder_id uuid NOT NULL REFERENCES bill_reminders(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
    paid_amount numeric(10,2) NOT NULL,
    paid_date date NOT NULL,
    status character varying(20) DEFAULT 'paid',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bill_payments_status_check CHECK (status IN ('paid', 'partial', 'skipped'))
);

-- Call Logs
CREATE TABLE IF NOT EXISTS call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    caller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_type character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'ringing' NOT NULL,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    duration integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT call_logs_call_type_check CHECK (call_type IN ('audio', 'video')),
    CONSTRAINT call_logs_status_check CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined', 'failed'))
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id)
);

-- User Challenges
CREATE TABLE IF NOT EXISTS user_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id uuid NOT NULL REFERENCES monthly_challenges(id) ON DELETE CASCADE,
    current_value numeric(10,2) DEFAULT 0,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    CONSTRAINT user_challenges_user_id_challenge_id_key UNIQUE (user_id, challenge_id)
);

-- ============================================================
-- 4. EXCHANGE RATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    base_currency character varying(3) NOT NULL DEFAULT 'USD',
    target_currency character varying(3) NOT NULL,
    rate numeric(16,8) NOT NULL,
    fetched_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT exchange_rates_pair_key UNIQUE (base_currency, target_currency)
);

-- ============================================================
-- 5. SPLIT EXPENSE TABLES
-- ============================================================

-- Split Groups
CREATE TABLE IF NOT EXISTS split_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    description text,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Split Group Members
CREATE TABLE IF NOT EXISTS split_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role character varying(10) DEFAULT 'member',
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT split_group_members_role_check CHECK (role IN ('admin', 'member')),
    CONSTRAINT split_group_members_group_id_user_id_key UNIQUE (group_id, user_id)
);

-- Split Expenses
CREATE TABLE IF NOT EXISTS split_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
    paid_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD',
    category character varying(50) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    split_method character varying(20) DEFAULT 'equal' NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT split_expenses_split_method_check CHECK (split_method IN ('equal', 'exact', 'percentage'))
);

-- Split Shares
CREATE TABLE IF NOT EXISTS split_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    split_expense_id uuid NOT NULL REFERENCES split_expenses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    is_settled boolean DEFAULT false,
    settled_at timestamp without time zone,
    CONSTRAINT split_shares_split_expense_id_user_id_key UNIQUE (split_expense_id, user_id)
);

-- Settlements
CREATE TABLE IF NOT EXISTS settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
    payer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD',
    note text,
    settled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT settlements_check CHECK (payer_id <> payee_id)
);

-- ============================================================
-- 6. INDEXES
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_online ON users USING btree (is_online);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions USING btree (refresh_token);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses USING btree (date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses USING btree (user_id, date);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets USING btree (user_id, month);

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships USING btree (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships USING btree (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships USING btree (status);

-- Blocked Users
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users USING btree (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users USING btree (blocked_id);

-- Conversations & Members
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members USING btree (user_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages USING btree (reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING gin (to_tsvector('english', content));

-- Message Reads & Reactions
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads USING btree (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions USING btree (message_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications USING btree (user_id, is_read) WHERE (is_read = false);

-- Bill Reminders & Payments
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user ON bill_reminders USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_next_due ON bill_reminders USING btree (next_due_date);
CREATE INDEX IF NOT EXISTS idx_bill_payments_reminder ON bill_payments USING btree (reminder_id);

-- Call Logs
CREATE INDEX IF NOT EXISTS idx_call_logs_conversation ON call_logs USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs USING btree (caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_callee ON call_logs USING btree (callee_id);

-- Password Resets
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets USING btree (token);

-- Split Tables
CREATE INDEX IF NOT EXISTS idx_split_group_members_group ON split_group_members USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_split_group_members_user ON split_group_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_split_expenses_group ON split_expenses USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_split_expenses_paid_by ON split_expenses USING btree (paid_by);
CREATE INDEX IF NOT EXISTS idx_split_shares_expense ON split_shares USING btree (split_expense_id);
CREATE INDEX IF NOT EXISTS idx_split_shares_user ON split_shares USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer ON settlements USING btree (payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payee ON settlements USING btree (payee_id);

-- Exchange Rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates USING btree (base_currency, target_currency);

-- ============================================================
-- 7. SEED DATA - Default Badges
-- ============================================================

INSERT INTO badges (name, description, icon, category, xp_reward, requirement_type, requirement_value) VALUES
    ('Early Bird',       'Join the app',                          '🐣', 'milestone', 10,  'account_created',  1),
    ('Getting Started',  'Log your first expense',                '✨', 'logging',   10,  'total_expenses',   1),
    ('Tracker',          'Log 50 expenses',                       '📝', 'logging',   50,  'total_expenses',   50),
    ('Data Driven',      'Log 200 expenses',                      '📊', 'logging',   150, 'total_expenses',   200),
    ('Finance Guru',     'Log 1000 expenses',                     '🧠', 'logging',   500, 'total_expenses',   1000),
    ('First Step',       'Log expenses for 1 day',                '👣', 'streak',    10,  'streak_days',      1),
    ('Week Warrior',     'Log expenses 7 days in a row',          '🔥', 'streak',    50,  'streak_days',      7),
    ('Monthly Master',   'Log expenses 30 days in a row',         '💪', 'streak',    200, 'streak_days',      30),
    ('Streak Legend',    'Log expenses 100 days in a row',        '🏆', 'streak',    500, 'streak_days',      100),
    ('Budget Beginner',  'Stay within budget for 1 month',        '🎯', 'budget',    100, 'budget_months',    1),
    ('Budget Pro',       'Stay within budget 3 months in a row',  '💰', 'budget',    300, 'budget_months',    3),
    ('Budget Master',    'Stay within budget 6 months',           '👑', 'budget',    500, 'budget_months',    6),
    ('Social Butterfly', 'Add 5 friends',                         '🦋', 'social',    50,  'friends_count',    5),
    ('Team Player',      'Create a split group',                  '🤝', 'social',    30,  'split_groups',     1),
    ('Generous',         'Settle 10 split expenses',              '❤️', 'social',    100, 'settlements',      10),
    ('Scanner Pro',      'Scan 10 receipts',                      '📸', 'milestone', 75,  'receipts_scanned', 10),
    ('AI Explorer',      'Ask AI assistant 20 questions',         '🤖', 'milestone', 50,  'ai_questions',     20)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 8. SEED DATA - Monthly Challenges (March 2026)
-- ============================================================

INSERT INTO monthly_challenges (title, description, icon, challenge_type, target_value, category, month, xp_reward) VALUES
    ('Daily Logger',     'Log expenses every day this month',       '📅', 'daily_logging',  30.00,   NULL,   TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 150),
    ('Budget Champion',  'Keep total spending under 2000',          '🏅', 'total_limit',    2000.00, NULL,   TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 120),
    ('Food Saver',       'Spend less than 500 on Food this month',  '🥗', 'category_limit', 500.00,  'Food', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 100),
    ('Social Connector', 'Add 3 new friends',                       '👥', 'friends_added',  3.00,    NULL,   TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 80)
ON CONFLICT DO NOTHING;
