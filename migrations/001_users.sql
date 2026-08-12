BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL,
  company text NOT NULL DEFAULT 'All',
  department text NOT NULL DEFAULT 'All',
  cost_center text NOT NULL DEFAULT 'All',
  status text NOT NULL DEFAULT 'Active',
  last_login timestamptz,
  require_password_change boolean NOT NULL DEFAULT false,
  session_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Rename the legacy administrator only when the target address is still free.
UPDATE users SET email='tripleegg@obsidian-managementgroup.com',name='Raisa Admin',
  role='Super Admin',company='All',department='All',cost_center='All',status='Active',updated_at=now()
WHERE lower(email)='raisa@tripleegg.co.id'
  AND NOT EXISTS (SELECT 1 FROM users WHERE lower(email)='tripleegg@obsidian-managementgroup.com');

-- If both addresses pre-existed, retain the canonical account and remove the legacy duplicate.
DELETE FROM users WHERE lower(email)='raisa@tripleegg.co.id'
  AND EXISTS (SELECT 1 FROM users WHERE lower(email)='tripleegg@obsidian-managementgroup.com');

COMMIT;
