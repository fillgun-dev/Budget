-- ============================================================
-- BUDGET_Live 완성형 스키마
-- Supabase SQL Editor에서 처음부터 실행하세요
-- ============================================================

-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users 테이블
-- ============================================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  display_name TEXT,
  show_stacked_chart BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 2. categories 테이블
-- ============================================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- 3. payment_methods 테이블
-- ============================================================
CREATE TABLE public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- 4. transactions 테이블
-- ============================================================
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  currency TEXT NOT NULL DEFAULT 'KRW',
  original_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
  krw_amount NUMERIC NOT NULL,
  try_amount NUMERIC,
  content TEXT NOT NULL,
  receipt_url TEXT,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 5. shared_links 테이블
-- ============================================================
CREATE TABLE public.shared_links (
  id TEXT PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  show_income BOOLEAN NOT NULL DEFAULT true,
  show_summary BOOLEAN NOT NULL DEFAULT true,
  display_currency TEXT NOT NULL DEFAULT 'KRW' CHECK (display_currency IN ('KRW', 'TRY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 6. category_budgets 테이블
-- ============================================================
CREATE TABLE public.category_budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  month TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, category_id, month)
);

-- ============================================================
-- 7. transaction_templates 테이블
-- ============================================================
CREATE TABLE public.transaction_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL DEFAULT 'expense',
  currency TEXT NOT NULL DEFAULT 'KRW',
  default_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 정책
-- ============================================================

-- users
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- categories (모든 인증 사용자)
CREATE POLICY "Allow authenticated read access" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- payment_methods (모든 인증 사용자)
CREATE POLICY "Allow authenticated read access" ON public.payment_methods
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.payment_methods
  FOR UPDATE USING (auth.role() = 'authenticated');

-- transactions (본인 것만)
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- shared_links
CREATE POLICY "Authenticated users can view shared links" ON public.shared_links
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create own shared links" ON public.shared_links
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete own shared links" ON public.shared_links
  FOR DELETE USING (auth.uid() = created_by);

-- category_budgets
CREATE POLICY "Users can view own budgets" ON public.category_budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.category_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.category_budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.category_budgets
  FOR DELETE USING (auth.uid() = user_id);

-- transaction_templates
CREATE POLICY "users manage own templates" ON public.transaction_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Storage: 'receipts' 버킷은 Supabase 대시보드에서 수동으로 생성하세요
-- Storage > New bucket > 이름: receipts, Public: ON
-- ============================================================
