-- Migration 006: Simplify parts table for live vendor pricing model
-- Parts catalog now fetches prices live from eBay/FinditParts/vendor URLs.
-- DB only stores AI recommendation metadata (no prices, no vendor links).

-- 1. Add user_id column (scope recommendations per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE parts ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Drop pricing / vendor columns that are now fetched live
ALTER TABLE parts
  DROP COLUMN IF EXISTS price_min,
  DROP COLUMN IF EXISTS price_max,
  DROP COLUMN IF EXISTS vendor_links,
  DROP COLUMN IF EXISTS interchangeable_parts,
  DROP COLUMN IF EXISTS installation_guides,
  DROP COLUMN IF EXISTS forum_discussions,
  DROP COLUMN IF EXISTS average_rating,
  DROP COLUMN IF EXISTS review_count,
  DROP COLUMN IF EXISTS fitment_confidence,
  DROP COLUMN IF EXISTS average_lifespan,
  DROP COLUMN IF EXISTS year_range_from,
  DROP COLUMN IF EXISTS year_range_to,
  DROP COLUMN IF EXISTS added_by;

-- 3. Drop GIN indexes that referenced removed columns
DROP INDEX IF EXISTS idx_parts_fts;

-- 4. Update RLS policies — scope to user_id
DROP POLICY IF EXISTS "parts_select_authenticated" ON parts;
DROP POLICY IF EXISTS "parts_insert_authenticated" ON parts;
DROP POLICY IF EXISTS "parts_update_own" ON parts;
DROP POLICY IF EXISTS "authenticated_users_can_read_parts" ON parts;
DROP POLICY IF EXISTS "authenticated_users_can_insert_parts" ON parts;
DROP POLICY IF EXISTS "users_can_update_own_parts" ON parts;

CREATE POLICY "users_read_own_parts"
  ON parts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_parts"
  ON parts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_parts"
  ON parts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_parts"
  ON parts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Index for user lookups
CREATE INDEX IF NOT EXISTS idx_parts_user_id ON parts(user_id);
CREATE INDEX IF NOT EXISTS idx_parts_user_category ON parts(user_id, category);
