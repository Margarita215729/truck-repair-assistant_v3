-- Migration 014: Fix parts RLS — drop orphaned SELECT policy & clean NULL user_id rows
--
-- Problem: Migration 002 created a policy named "Authenticated users can view all parts"
-- (global SELECT for any authenticated user). Migration 006 introduced user-scoped policies
-- but only dropped policies with different names — so the old global SELECT survived.
-- Result: users can SEE all parts (including NULL-user_id orphans) but can only DELETE
-- parts where user_id = auth.uid(), causing "parts.removeFailed" errors.

-- 1. Drop the orphaned global SELECT policy from migration 002
DROP POLICY IF EXISTS "Authenticated users can view all parts" ON parts;

-- 2. Remove parts with no owner (created before user_id column existed)
DELETE FROM parts WHERE user_id IS NULL;

-- 3. Enforce user_id going forward so orphans can't recur
ALTER TABLE parts ALTER COLUMN user_id SET NOT NULL;
