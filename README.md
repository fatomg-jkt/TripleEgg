# Triple Egg Financial Dashboard

## Production authentication

Authentication uses PostgreSQL only. Configure these Vercel Environment Variables for Preview and Production:

- `DATABASE_URL`: PostgreSQL/Supabase connection string.
- `AUTH_SECRET`: a long random value used to sign HTTP-only session cookies.
- `SUPER_ADMIN_PASSWORD`: initial password used **only when** the users table has no canonical Super Admin. It is bcrypt-hashed before insertion.
- `PASSWORD_RESET_WEBHOOK_URL` and `APP_URL`: optional mail-provider/webhook integration for delivering one-time reset links.

On the first database request the application safely creates the required tables, migrates the legacy admin email, and optionally seeds **Raisa Admin** as `tripleegg@obsidian-managementgroup.com`. For controlled deployments, `migrations/001_users.sql` can also be run in the Supabase SQL editor before deployment. Never expose these variables with a `NEXT_PUBLIC_` prefix.

If `DATABASE_URL` or `AUTH_SECRET` is absent, compilation still succeeds and authentication APIs return a JSON configuration error. There is deliberately no filesystem or JSON fallback.

## Preview verification

After assigning the Preview environment variables and deploying, verify login, wrong-password JSON, session refresh, persisted `last_login`, add/edit/disable user behavior, then run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Persistent RBAC
Roles and menu/action grants (`View`, `Upload`, `Edit`, `Delete`, `Export`, `Approve`) are stored in PostgreSQL tables created by `migrations/002_rbac.sql`. The sidebar reads effective grants from the authenticated server session; Administration changes use permission-validated APIs and survive refreshes and redeployments.

<!-- Deployment refresh: Vercel Preview rebuild trigger; no application behavior changed. -->

## Activation email and Owner bootstrap
Configure server-only `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MAIL_FROM`, and `APP_URL` for Microsoft Graph activation/reset email. `OWNER_EMAIL` and `OWNER_PASSWORD` bootstrap the first Owner only when none exists; credentials are never overwritten on later deploys.
