-- Migration: Add authUserId to public."User" with robust foreign key, uniqueness validation, and nullable passwordHash
-- Target: Supabase Postgres
-- Notes: Does NOT alter remote database; local migration file for review.

BEGIN;

-- ============================================================================
-- 1. Check existing column type: fail if column exists and is NOT UUID
-- ============================================================================
DO $$
DECLARE
  v_udt_name text;
BEGIN
  SELECT udt_name INTO v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'authUserId';

  IF v_udt_name IS NOT NULL AND v_udt_name <> 'uuid' THEN
    RAISE EXCEPTION 'Schema drift detected: public."User"."authUserId" exists but has type "%" instead of "uuid".', v_udt_name;
  END IF;

  IF v_udt_name IS NULL THEN
    ALTER TABLE public."User" ADD COLUMN "authUserId" UUID;
  END IF;
END $$;

-- ============================================================================
-- 2. Verify or add UNIQUE constraint (checking both constraints and standalone indexes)
-- ============================================================================
DO $$
DECLARE
  v_unique_count int;
  v_index_count int;
BEGIN
  -- Check if a unique constraint exists on exactly ("authUserId") alone
  SELECT COUNT(*) INTO v_unique_count
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public."User"'::regclass
    AND c.contype = 'u'
    AND a.attname = 'authUserId'
    AND cardinality(c.conkey) = 1;

  -- Check if a standalone unique index exists on exactly ("authUserId") alone
  SELECT COUNT(*) INTO v_index_count
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE i.indrelid = 'public."User"'::regclass
    AND i.indisunique = true
    AND a.attname = 'authUserId'
    AND i.indnatts = 1;

  IF v_unique_count = 0 AND v_index_count = 0 THEN
    ALTER TABLE public."User" ADD CONSTRAINT "User_authUserId_key" UNIQUE ("authUserId");
  END IF;
END $$;

-- ============================================================================
-- 3. Verify or add single-column FOREIGN KEY constraint strictly matching:
--    local column:  public."User"."authUserId"
--    target column: auth.users.id
--    on delete:     SET NULL ('n')
-- ============================================================================
DO $$
DECLARE
  v_fk_count int;
  v_invalid_fk text;
BEGIN
  -- Detect any foreign key on public."User" that includes "authUserId" but does not match specifications
  SELECT c.conname INTO v_invalid_fk
  FROM pg_constraint c
  JOIN pg_attribute a_local ON a_local.attrelid = c.conrelid AND a_local.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public."User"'::regclass
    AND c.contype = 'f'
    AND a_local.attname = 'authUserId'
    AND (
      cardinality(c.conkey) <> 1                                     -- Must be single-column
      OR c.confrelid <> 'auth.users'::regclass                       -- Must target auth.users
      OR cardinality(c.confkey) <> 1                                 -- Must target single column
      OR (SELECT attname FROM pg_attribute WHERE attrelid = c.confrelid AND attnum = c.confkey[1]) <> 'id' -- Must target auth.users.id
      OR c.confdeltype <> 'n'                                        -- Must be ON DELETE SET NULL ('n')
    )
  LIMIT 1;

  IF v_invalid_fk IS NOT NULL THEN
    RAISE EXCEPTION 'Schema drift detected: Foreign key "%" on public."User" references an unexpected target or does not match single-column auth.users.id with ON DELETE SET NULL.',
      v_invalid_fk;
  END IF;

  -- Check if valid FK already exists
  SELECT COUNT(*) INTO v_fk_count
  FROM pg_constraint c
  JOIN pg_attribute a_local ON a_local.attrelid = c.conrelid AND a_local.attnum = c.conkey[1]
  JOIN pg_attribute a_foreign ON a_foreign.attrelid = c.confrelid AND a_foreign.attnum = c.confkey[1]
  WHERE c.conrelid = 'public."User"'::regclass
    AND c.contype = 'f'
    AND cardinality(c.conkey) = 1
    AND a_local.attname = 'authUserId'
    AND c.confrelid = 'auth.users'::regclass
    AND a_foreign.attname = 'id'
    AND c.confdeltype = 'n';

  IF v_fk_count = 0 THEN
    ALTER TABLE public."User"
    ADD CONSTRAINT "User_authUserId_fkey"
    FOREIGN KEY ("authUserId")
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. Make passwordHash nullable for Supabase-managed staff accounts
-- ============================================================================
ALTER TABLE public."User" ALTER COLUMN "passwordHash" DROP NOT NULL;

COMMIT;
