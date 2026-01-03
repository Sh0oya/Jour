-- Enable RLS for security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entries ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  tier TEXT DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO')),
  goal TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Users can read own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- RLS: Users can update own profile except tier
DROP POLICY IF EXISTS "Users can update own profile except tier" ON public.profiles;
CREATE POLICY "Users can update own profile except tier" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (SELECT tier FROM public.profiles WHERE id = auth.uid())
  );

-- Index for Stripe search
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Create entries table
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  summary TEXT NOT NULL,
  transcript TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('GREAT', 'GOOD', 'NEUTRAL', 'BAD', 'TERRIBLE')),
  tags TEXT[] DEFAULT '{}',
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Users can read own entries
DROP POLICY IF EXISTS "Users can read own entries" ON public.entries;
CREATE POLICY "Users can read own entries" ON public.entries
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: Users can insert own entries
DROP POLICY IF EXISTS "Users can insert own entries" ON public.entries;
CREATE POLICY "Users can insert own entries" ON public.entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for date sorting
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, date DESC);
