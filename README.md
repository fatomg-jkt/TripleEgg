# Financial & Accounting Triple Egg

## Authentication

Authentication uses signed, HTTP-only, SameSite cookies. Users are accessed through the server-only repository in `lib/auth/users.ts`; the JSON adapter is intended for local development and can be replaced by PostgreSQL/Supabase without changing the API contracts. Set `AUTH_SECRET` in production. Development seed accounts are created on first run; their password comes from the server-only `DEV_SEED_PASSWORD` environment variable (development fallback: `TripleEgg123!`) and must be changed on first login.

Forgot-password deliberately returns a generic response. Email delivery is backend-ready but not configured: connect the queue/provider at the documented hook in `app/api/auth/forgot-password/route.ts`.
