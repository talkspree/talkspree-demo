-- ============================================================================
-- 077: Bug Reports / Feedback Tickets
--
-- Creates a `bug_reports` table that backs the in-app "Report a bug / give
-- feedback" button. Each row is a ticket that an admin can later triage
-- (status = 'unsolved' | 'solved').
-- ============================================================================

CREATE TABLE IF NOT EXISTS bug_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Categorisation chosen by the user in the modal
  type        TEXT NOT NULL CHECK (type IN ('bug', 'ui', 'perf', 'idea')),

  -- 1 (Low / cosmetic) .. 5 (Critical). NULL for type = 'idea' (suggestion).
  severity    SMALLINT CHECK (severity IS NULL OR severity BETWEEN 1 AND 5),

  -- Free-text description (steps to reproduce, expected vs actual, etc.)
  details     TEXT NOT NULL CHECK (length(trim(details)) > 0),

  -- Triage state for the future admin manager interface
  status      TEXT NOT NULL DEFAULT 'unsolved'
              CHECK (status IN ('unsolved', 'solved')),

  -- Optional: who marked it solved + when (filled in by admin tooling later)
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id
  ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status
  ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
  ON bug_reports(created_at DESC);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- A user can submit reports for themselves
CREATE POLICY "Users can submit their own bug reports"
  ON bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user can view their own reports (lets us show "thanks, we have it" UX)
CREATE POLICY "Users can view their own bug reports"
  ON bug_reports FOR SELECT
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-bump updated_at and auto-stamp resolved_at when status flips to solved
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_bug_reports_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.status = 'solved'
     AND (OLD.status IS DISTINCT FROM 'solved')
     AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;

  IF NEW.status = 'unsolved' THEN
    NEW.resolved_at := NULL;
    NEW.resolved_by := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bug_reports_updated_at ON bug_reports;
CREATE TRIGGER bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_reports_timestamps();

COMMENT ON TABLE  bug_reports         IS 'In-app feedback / bug tickets submitted by users.';
COMMENT ON COLUMN bug_reports.type    IS 'bug | ui | perf | idea';
COMMENT ON COLUMN bug_reports.severity IS '1=Low cosmetic .. 5=Critical. NULL for ideas/suggestions.';
COMMENT ON COLUMN bug_reports.status  IS 'unsolved (default) | solved';

NOTIFY pgrst, 'reload schema';
