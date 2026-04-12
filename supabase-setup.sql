-- ============================================================
-- Trading Game — Supabase Schema Setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create a dedicated schema for this project
CREATE SCHEMA IF NOT EXISTS trading_game;

-- 2. Grant usage to the API roles so PostgREST can access it
GRANT USAGE ON SCHEMA trading_game TO anon, authenticated, service_role;

-- 3. Set default privileges so future tables are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA trading_game
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA trading_game
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 4. Expose the schema through the PostgREST API
-- NOTE: You must ALSO add "trading_game" to your project's
--       "Exposed schemas" in Supabase Dashboard:
--       Settings > API > Exposed schemas > add "trading_game"
--       (comma-separated, e.g. "public, trading_game")

-- ============================================================
-- TABLES
-- ============================================================

-- Conversations (migrated from aui_conversations)
CREATE TABLE trading_game.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trading profiles (one per user/account, gamification state)
CREATE TABLE trading_game.trading_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Trader',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_trade_date DATE,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade history (every executed trade)
CREATE TABLE trading_game.trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES trading_game.trading_profiles(id) ON DELETE CASCADE,
  contract_id BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  buy_price NUMERIC(12,2) NOT NULL,
  sell_price NUMERIC(12,2),
  pnl NUMERIC(12,2),
  duration INTEGER,
  duration_unit TEXT,
  entry_tick NUMERIC(12,5),
  exit_tick NUMERIC(12,5),
  is_won BOOLEAN,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES trading_game.conversations(id) ON DELETE SET NULL
);

-- Achievements (unlocked per profile)
CREATE TABLE trading_game.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES trading_game.trading_profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, achievement_key)
);

-- Leaderboard snapshots (materialized daily for fast reads)
CREATE TABLE trading_game.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_id UUID REFERENCES trading_game.trading_profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  win_rate NUMERIC(5,2),
  total_pnl NUMERIC(12,2),
  UNIQUE(snapshot_date, profile_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_conversations_updated ON trading_game.conversations(updated_at DESC);
CREATE INDEX idx_conversations_title ON trading_game.conversations USING gin(title gin_trgm_ops);

CREATE INDEX idx_trade_history_profile ON trading_game.trade_history(profile_id);
CREATE INDEX idx_trade_history_opened ON trading_game.trade_history(opened_at DESC);
CREATE INDEX idx_trade_history_symbol ON trading_game.trade_history(symbol);

CREATE INDEX idx_achievements_profile ON trading_game.achievements(profile_id);

CREATE INDEX idx_leaderboard_date ON trading_game.leaderboard_snapshots(snapshot_date DESC);
CREATE INDEX idx_leaderboard_rank ON trading_game.leaderboard_snapshots(snapshot_date, rank);

-- ============================================================
-- RLS (Row Level Security) — permissive for now
-- Tighten these when auth is added in Phase 5
-- ============================================================

ALTER TABLE trading_game.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.trading_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon/authenticated (pre-auth phase)
CREATE POLICY "Allow all on conversations" ON trading_game.conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on trading_profiles" ON trading_game.trading_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on trade_history" ON trading_game.trade_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on achievements" ON trading_game.achievements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on leaderboard_snapshots" ON trading_game.leaderboard_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE
-- ============================================================
-- After running this SQL, go to:
--   Supabase Dashboard > Settings > API > Exposed schemas
--   Add "trading_game" to the comma-separated list
-- ============================================================
