-- WikiVenture Supabase Setup
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Table: tracks each user's tier and Stripe info
CREATE TABLE IF NOT EXISTS user_tiers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',           -- 'free' or 'paid'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: tracks daily usage per user
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  stories_started INTEGER NOT NULL DEFAULT 0,
  total_turns INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Enable Row Level Security
ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own data (functions use service role key which bypasses RLS)
CREATE POLICY "Users can read own tier" ON user_tiers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own usage" ON daily_usage
  FOR SELECT USING (auth.uid() = user_id);
