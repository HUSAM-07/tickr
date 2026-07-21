-- ============================================================
-- tickr / Trading Game — Supabase schema setup
-- Dedicated application schema; Supabase Auth remains in the
-- project-managed auth schema.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS trading_game;

GRANT USAGE ON SCHEMA trading_game TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA trading_game
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA trading_game
  GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA trading_game
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA trading_game
  GRANT ALL ON SEQUENCES TO authenticated, service_role;

-- Add `trading_game` to Project Settings > Data API > Exposed schemas.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS trading_game.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_game.trading_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS trading_game.trade_history (
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

CREATE TABLE IF NOT EXISTS trading_game.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES trading_game.trading_profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS trading_game.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_id UUID REFERENCES trading_game.trading_profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  win_rate NUMERIC(5,2),
  total_pnl NUMERIC(12,2),
  UNIQUE(snapshot_date, profile_id)
);

CREATE TABLE IF NOT EXISTS trading_game.api_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('chat', 'deriv-auth')),
  minute_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  minute_requests INTEGER NOT NULL DEFAULT 0,
  day_started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  day_requests INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope)
);

-- ============================================================
-- Timestamps and indexes
-- ============================================================

CREATE OR REPLACE FUNCTION trading_game.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_set_updated_at
  ON trading_game.conversations;
CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON trading_game.conversations
  FOR EACH ROW EXECUTE FUNCTION trading_game.set_updated_at();

DROP TRIGGER IF EXISTS trading_profiles_set_updated_at
  ON trading_game.trading_profiles;
CREATE TRIGGER trading_profiles_set_updated_at
  BEFORE UPDATE ON trading_game.trading_profiles
  FOR EACH ROW EXECUTE FUNCTION trading_game.set_updated_at();

CREATE OR REPLACE FUNCTION trading_game.consume_api_rate_limit(rate_scope TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  minute_limit INTEGER;
  daily_limit INTEGER;
  request_allowed BOOLEAN;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  CASE rate_scope
    WHEN 'chat' THEN
      minute_limit := 10;
      daily_limit := 200;
    WHEN 'deriv-auth' THEN
      minute_limit := 6;
      daily_limit := 100;
    ELSE
      RETURN false;
  END CASE;

  WITH consumed AS (
    INSERT INTO trading_game.api_rate_limits AS limits (
      user_id,
      scope,
      minute_started_at,
      minute_requests,
      day_started_on,
      day_requests,
      updated_at
    )
    VALUES (
      current_user_id,
      rate_scope,
      pg_catalog.now(),
      1,
      CURRENT_DATE,
      1,
      pg_catalog.now()
    )
    ON CONFLICT (user_id, scope) DO UPDATE
    SET
      minute_started_at = CASE
        WHEN limits.minute_started_at <= pg_catalog.now() - INTERVAL '1 minute'
          THEN pg_catalog.now()
        ELSE limits.minute_started_at
      END,
      minute_requests = CASE
        WHEN limits.minute_started_at <= pg_catalog.now() - INTERVAL '1 minute'
          THEN 1
        ELSE limits.minute_requests + 1
      END,
      day_started_on = CASE
        WHEN limits.day_started_on < CURRENT_DATE THEN CURRENT_DATE
        ELSE limits.day_started_on
      END,
      day_requests = CASE
        WHEN limits.day_started_on < CURRENT_DATE THEN 1
        ELSE limits.day_requests + 1
      END,
      updated_at = pg_catalog.now()
    WHERE
      (
        limits.minute_started_at <= pg_catalog.now() - INTERVAL '1 minute'
        OR limits.minute_requests < minute_limit
      )
      AND (
        limits.day_started_on < CURRENT_DATE
        OR limits.day_requests < daily_limit
      )
    RETURNING true
  )
  SELECT COALESCE(pg_catalog.bool_or(true), false)
    INTO request_allowed
    FROM consumed;

  RETURN request_allowed;
END;
$$;

REVOKE ALL ON FUNCTION trading_game.consume_api_rate_limit(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trading_game.consume_api_rate_limit(TEXT)
  TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON trading_game.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_profile
  ON trading_game.trade_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_opened
  ON trading_game.trade_history(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol
  ON trading_game.trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_achievements_profile
  ON trading_game.achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_date
  ON trading_game.leaderboard_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
  ON trading_game.leaderboard_snapshots(snapshot_date, rank);

-- ============================================================
-- Grants and row-level security
-- ============================================================

REVOKE ALL ON ALL TABLES IN SCHEMA trading_game FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA trading_game
  TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA trading_game TO service_role;
GRANT SELECT ON trading_game.leaderboard_snapshots TO anon;

ALTER TABLE trading_game.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.trading_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_game.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON trading_game.api_rate_limits FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can read their conversations"
  ON trading_game.conversations;
CREATE POLICY "Users can read their conversations"
  ON trading_game.conversations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create their conversations"
  ON trading_game.conversations;
CREATE POLICY "Users can create their conversations"
  ON trading_game.conversations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their conversations"
  ON trading_game.conversations;
CREATE POLICY "Users can update their conversations"
  ON trading_game.conversations FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their conversations"
  ON trading_game.conversations;
CREATE POLICY "Users can delete their conversations"
  ON trading_game.conversations FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their trading profile"
  ON trading_game.trading_profiles;
CREATE POLICY "Users can read their trading profile"
  ON trading_game.trading_profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create their trading profile"
  ON trading_game.trading_profiles;
CREATE POLICY "Users can create their trading profile"
  ON trading_game.trading_profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their trading profile"
  ON trading_game.trading_profiles;
CREATE POLICY "Users can update their trading profile"
  ON trading_game.trading_profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their trading profile"
  ON trading_game.trading_profiles;
CREATE POLICY "Users can delete their trading profile"
  ON trading_game.trading_profiles FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their trade history"
  ON trading_game.trade_history;
CREATE POLICY "Users can read their trade history"
  ON trading_game.trade_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Users can create their trade history"
  ON trading_game.trade_history;
CREATE POLICY "Users can create their trade history"
  ON trading_game.trade_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Users can update their trade history"
  ON trading_game.trade_history;
CREATE POLICY "Users can update their trade history"
  ON trading_game.trade_history FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Users can delete their trade history"
  ON trading_game.trade_history;
CREATE POLICY "Users can delete their trade history"
  ON trading_game.trade_history FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read their achievements"
  ON trading_game.achievements;
CREATE POLICY "Users can read their achievements"
  ON trading_game.achievements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Users can create their achievements"
  ON trading_game.achievements;
CREATE POLICY "Users can create their achievements"
  ON trading_game.achievements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM trading_game.trading_profiles profile
    WHERE profile.id = profile_id
      AND profile.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Anyone can read leaderboard snapshots"
  ON trading_game.leaderboard_snapshots;
CREATE POLICY "Anyone can read leaderboard snapshots"
  ON trading_game.leaderboard_snapshots FOR SELECT TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
