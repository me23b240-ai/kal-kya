# Kal Kya?

Household meal-decision tool. This step: project setup + data layer only.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Public? | Notes |

|---|---|---|

| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |

| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon key |

| `SUPABASE_SERVICE_ROLE_KEY` | **no** | server-only, never prefix with NEXT_PUBLIC_ |

| `GEMINI_API_KEY` | **no** | server-only, not used yet |

## Run the schema

1. Supabase dashboard → SQL Editor.

2. Paste and run `supabase/schema.sql` (once, on a fresh project).

3. Paste and run `supabase/seed.sql`.

## Run locally

```

npm install

npm run dev

```

Open [http://localhost:3000](http://localhost:3000). You should see 4 members.

## Demo warning

Row Level Security is OFF on all tables. Do not use real data.

## Check: duplicate vote is rejected

In the SQL editor (run all at once; the last statement should fail with error 23505):

```sql

insert into plan_days (id, household_id, day)

values ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001', current_date);

insert into votes values ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001');

insert into votes values ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002');

```

Clean up afterwards: `delete from plan_days where id = 'd0000000-0000-0000-0000-000000000001';`

## Check: no secrets in the client bundle

```

npm run build

Get-ChildItem .next\static -Recurse -File | Select-String -Pattern "SUPABASE_SERVICE_ROLE_KEY","GEMINI_API_KEY"

```

Also search for the actual key values (the service key's JWT is base64, so searching the word "service_role" won't find it). Expect no output from either.

## Vercel

Add the same four variables in Project Settings → Environment Variables.