-- =====================================================================
-- CivicEye Engagement & Gamification schema (foundation)
-- Run this against the Supabase SQL editor to enable:
--   · Impact Score per profile (points from reporting / verifying / fixing)
--   · Badges array (Pothole Patrol, Eco-Warrior, Community Guardian, …)
--   · Civic level (derived from impact_score)
--   · Resolved-at / resolver tracking on reports (needed for thank-you emails)
--   · Upvote-to-escalate: reports with enough upvotes get boosted SLA priority
--   · Notifications push subscription table (VAPID Web Push)
--   · Petitions, Before/After reactions, and flash surveys (placeholder tables
--     for the next launch phases — wire up incrementally)
-- =====================================================================

-- 1. Profiles — add gamification columns ------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS impact_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS civic_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reports_submitted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_verified INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_resolved_contribution INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0;

-- 2. Reports — SLA / resolution / upvote-to-escalate columns --------------
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolver_name TEXT,
  ADD COLUMN IF NOT EXISTS upvote_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS community_confirms_required INTEGER NOT NULL DEFAULT 3;

-- Indexes for leaderboards and neighborhood queries
CREATE INDEX IF NOT EXISTS idx_profiles_impact_score ON profiles (impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_neighborhood ON profiles (neighborhood);
CREATE INDEX IF NOT EXISTS idx_reports_neighborhood ON reports (location_name);

-- 3. Web Push subscriptions (hyper-local alerts, safe commute radar) -------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_m INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own push subs" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Petitions (community asks — upvote triggers official review) ---------
CREATE TABLE IF NOT EXISTS petitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  scope TEXT NOT NULL DEFAULT 'city',   -- 'city' | 'campus'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_name TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signatures_count INTEGER NOT NULL DEFAULT 0,
  target_signatures INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'reviewing' | 'won' | 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS petition_signatures (
  petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (petition_id, user_id)
);
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE petition_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Petitions are public read" ON petitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create petitions" ON petitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can sign once" ON petition_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Before/After success feed reactions (emoji reactions on fixes) -------
CREATE TABLE IF NOT EXISTS fix_reactions (
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👏','❤️','🔥','🙌','💚')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);
ALTER TABLE fix_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are public read" ON fix_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON fix_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Flash surveys (1-tap pulse polls after viewing a fixed report) -------
CREATE TABLE IF NOT EXISTS flash_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS flash_survey_responses (
  survey_id UUID REFERENCES flash_surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  choice TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (survey_id, user_id)
);
ALTER TABLE flash_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Surveys public read" ON flash_surveys FOR SELECT USING (true);
CREATE POLICY "Authenticated users can respond" ON flash_survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- Badge definitions (informational — use inside the app):
--   pothole-patrol   → 5 road/category reports verified
--   eco-warrior      → 5 environmental reports verified
--   community-guardian → 10 confirmations on other reports
--   street-guardian  → 3 verified reports (already referenced in UI copy)
--   first-report     → first submitted report
--   resolver-champ   → N before/after proofs accepted
-- Levels: derived from impact_score (e.g. 0=Observer, 50=Reporter, 150=Guardian,
-- 500=Champion, 1500=Guardian+). Keep the formula in sync with the client.
-- =====================================================================

-- Helper to recompute civic level from impact_score
CREATE OR REPLACE FUNCTION compute_civic_level(score INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN score >= 1500 THEN 5
    WHEN score >= 500  THEN 4
    WHEN score >= 150  THEN 3
    WHEN score >= 50   THEN 2
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
