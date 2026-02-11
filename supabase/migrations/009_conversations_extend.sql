-- ============================================================================
-- 009 — Add missing columns to conversations table
-- ============================================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS truck_make TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS truck_model TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS truck_year INT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);
