-- Add rematch consent column to matchmaking_queue.
-- When two users are the only ones available and they just had a call,
-- both must set rematch_willing_with pointing at each other before
-- they are re-paired. NULL means no consent given yet.
--
-- Intentionally no FK to profiles: a second FK from matchmaking_queue
-- to profiles would make PostgREST's implicit join ambiguous (PGRST201)
-- and break the findMatches query.

ALTER TABLE matchmaking_queue
ADD COLUMN IF NOT EXISTS rematch_willing_with UUID DEFAULT NULL;
