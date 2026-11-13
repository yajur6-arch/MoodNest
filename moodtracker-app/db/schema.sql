
create extension if not exists "pgcrypto";
create type user_role as enum ('student','counsellor');
create type sentiment_label as enum ('negative','neutral','positive');
create type request_status as enum ('open','contacted','closed');

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id text unique not null,            -- id from Auth0/Firebase
  email text unique not null,
  display_name text,
  role user_role not null default 'student',
  institution text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz                   -- soft delete, then purge (POPIA)
);
create table consent_settings (
  user_id uuid primary key references users(id) on delete cascade,
  wearable_sharing boolean not null default false,
  research_use boolean not null default false,
  counsellor_sharing boolean not null default false,
  policy_version text not null,            -- privacy notice version consented to
  updated_at timestamptz not null default now()
);
create table mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mood_score smallint not null check (mood_score between 1 and 5),
  journal_text text,                       -- encrypt at column or app level
  sentiment sentiment_label,
  sentiment_score real,
  sentiment_confirmed boolean not null default false,  -- student agreed/corrected the tag
  model_version text,
  created_at timestamptz not null default now()
);
create index on mood_entries (user_id, created_at desc);
create table wearable_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,                  -- 'fitbit','health_connect','healthkit'
  recorded_on date not null,
  sleep_hours real, resting_hr smallint, steps integer,
  unique (user_id, provider, recorded_on)
);
create table coping_recommendations (
  id uuid primary key default gen_random_uuid(),
  mood_entry_id uuid not null references mood_entries(id) on delete cascade,
  tip_text text not null,
  category text,
  created_at timestamptz not null default now()
);
create table safety_events (
  event_id uuid primary key,
  session_id text not null,
  occurred_at timestamptz not null,
  rule_category text not null check (rule_category in ('self_harm','diagnosis_request','medication_request','out_of_scope','service_error')),
  model_version text not null,
  action_taken text not null,              -- template_backstop | model_self_harm_handoff | model_refusal_redirect | fallback_message
  handoff_succeeded boolean not null default false   -- set when the app confirms the support card was shown
);
alter table safety_events enable row level security;  

create table support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mood_entry_id uuid references mood_entries(id) on delete set null,
  status request_status not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create table counsellor_notes (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references support_requests(id) on delete restrict, 
  counsellor_id uuid not null references users(id),
  note text not null,
  created_at timestamptz not null default now()
);
alter table mood_entries enable row level security;
alter table wearable_data enable row level security;
alter table support_requests enable row level security;
create policy own_entries on mood_entries using (user_id = (select id from users where auth_id = auth.uid()::text));
create policy own_wearable on wearable_data using (user_id = (select id from users where auth_id = auth.uid()::text));
create policy own_requests on support_requests using (user_id = (select id from users where auth_id = auth.uid()::text));
