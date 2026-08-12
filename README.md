# Financial & Accounting Triple Egg

## Password reset configuration

The self-service forgot-password flow uses the existing `users` table and password/session conventions. Apply `database/migrations/20260812_password_reset_tokens.sql` to the same PostgreSQL database used by login/RBAC. Set these variables in **both Preview and Production** in Vercel (use environment-specific values where appropriate):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing authentication PostgreSQL database |
| `MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID |
| `MICROSOFT_CLIENT_ID` | Entra application/client ID |
| `MICROSOFT_CLIENT_SECRET` | Entra client secret (server-only) |
| `MAIL_FROM` | Licensed/company mailbox allowed to send mail |
| `APP_URL` | Public deployment origin, e.g. `https://triple-egg.vercel.app` |

None of the Microsoft variables may use the `NEXT_PUBLIC_` prefix. Missing Graph configuration does not fail the build: the API safely records a configuration error server-side and still returns the same generic response to the browser.

### Microsoft Entra / Graph setup

1. Register a single-tenant application in Microsoft Entra ID.
2. Under **API permissions**, add Microsoft Graph **Application** permission `Mail.Send` (not Delegated), then grant tenant-wide admin consent.
3. Create a client secret and save its value in `MICROSOFT_CLIENT_SECRET`; save the directory and application IDs in the corresponding variables.
4. Set `MAIL_FROM` to an Exchange Online mailbox. For least privilege, configure an Exchange Online Application RBAC assignment (or an Application Access Policy where still used) limiting the app to that mailbox.
5. Set a distinct `APP_URL` for Vercel Preview and Production so emailed links return to the correct deployment.

The server obtains an app-only token from Microsoft Identity Platform with `https://graph.microsoft.com/.default`, then calls `POST /v1.0/users/{MAIL_FROM}/sendMail`. Tokens and passwords are never logged. Reset tokens expire after 30 minutes, are stored only as SHA-256 hashes, and are consumed transactionally once. Successful resets increment `users.session_version` and remove rows from `sessions` when that existing table is present.

## Commands

```bash
npm install
npm test
npm run lint
npx tsc --noEmit
npm run build
```
