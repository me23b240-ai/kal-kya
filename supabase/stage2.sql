-- Stage 2 additions. Run once in the Supabase SQL Editor, after schema.sql and seed.sql.
-- DEMO ONLY: Row Level Security is OFF on these tables too (no login yet).

create table if not exists turn_skips (
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  reason      text not null check (reason in ('pass','silent')),
  created_at  timestamptz not null default now(),
  primary key (plan_day_id, member_id)
);

-- Stores the one extra tie-break pick a member makes before lock.
create table if not exists tie_picks (
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  dish_id     uuid not null references dishes(id),
  primary key (plan_day_id, member_id)
);

alter table turn_skips disable row level security;
alter table tie_picks  disable row level security;

-- All writes and vote reads now go through server code using the service key.
grant all on turn_skips, tie_picks to service_role;
grant all on all tables in schema public to service_role;

-- Keep votes unreadable from the browser key, so choices stay hidden until lock.
revoke select on votes, tie_picks, turn_skips from anon, authenticated;
