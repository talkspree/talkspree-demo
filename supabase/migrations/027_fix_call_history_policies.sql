-- Fix call_history RLS so participants can receive realtime inserts and read their calls
-- Assumes auth.uid() is set (Supabase auth)

-- Enable RLS if not already
alter table call_history enable row level security;

-- Drop existing policies if any to avoid conflicts
drop policy if exists "call_history_select_participants" on call_history;
drop policy if exists "call_history_insert_auth" on call_history;
drop policy if exists "call_history_update_participants" on call_history;

-- Allow participants (caller or recipient) to select/read their calls
create policy "call_history_select_participants"
on call_history
for select
using (auth.uid() = caller_id or auth.uid() = recipient_id);

-- Allow authenticated users to insert their own call rows
create policy "call_history_insert_auth"
on call_history
for insert
with check (auth.uid() = caller_id);

-- Allow participants to update their own call rows (e.g., status, matched_at)
create policy "call_history_update_participants"
on call_history
for update
using (auth.uid() = caller_id or auth.uid() = recipient_id)
with check (auth.uid() = caller_id or auth.uid() = recipient_id);

