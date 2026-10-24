create table if not exists safety_events (
  event_id uuid primary key,
  session_id text not null,
  occurred_at timestamptz not null,
  rule_category text not null,
  model_version text not null,
  action_taken text not null,
  handoff_succeeded boolean not null default false
);
alter table safety_events enable row level security;  -- no policies: only the server's database login can use it
