-- Restart vote count (fresh start when website is pushed to GitHub)
-- Run in Supabase Dashboard → SQL Editor

-- Delete all votes from the votes table
DELETE FROM votes;

-- If your Edge Functions use a different storage (e.g. KV, another table),
-- check the vote/results function code and clear that storage instead.
