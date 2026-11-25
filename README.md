# Kal Kya

A household meal-decision tool. Stage 1: setup and data layer. Stage 2: voting, locking, tie-breaks.

## Environment variables
Copy `.env.example` to `.env.local`.

| Variable | Public? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | server-only. All reads and writes for the vote screen use it |
| `GEMINI_API_KEY` | **no** | server-only, not used yet |

## Database
Run in the Supabase SQL Editor, in this order: `supabase/schema.sql`, `supabase/seed.sql`, `supabase/stage2.sql`.
Row Level Security is OFF on every table (demo only, no login yet). Do not use real data.

## Run
```
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for the lock rules
```

## How a day works
- The screen shows **tomorrow**. It locks at `households.lock_time` on the evening before (default 21:00, Asia/Kolkata).
- The first request after that time locks the day. "Lock now" does it early (demo only).
- If it is already past lock time when a new day is first opened, it locks straight away with no votes (option A). For testing, push the time later:
```sql
update households set lock_time = '23:59';
```

## Test again after a day has locked
```sql
delete from plan_days;   -- also clears votes, tie picks and skips
update households set turn_member_id = 'b0000000-0000-0000-0000-000000000001';
```

## Try the tie-break
Open the page as Mom, Dad, Sister, Me in turn. Vote 2 to 2. Whoever holds the turn (Mom at first) sees a tie panel: pick a dish or pass. Then press "Lock now".

## Checks
- A second vote by one member on one day is rejected by the `votes` primary key; changing a vote replaces it.
- Secrets: `npm run build`, then search `.next\static` for the key names and values (see stage 1 steps).
