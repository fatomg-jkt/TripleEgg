BEGIN;
CREATE TABLE IF NOT EXISTS user_activation_otps(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,otp_hash text NOT NULL,expires_at timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),last_sent_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS activation_otp_user_created_idx ON user_activation_otps(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_rate_limits(key text PRIMARY KEY,count integer NOT NULL,window_start timestamptz NOT NULL);
INSERT INTO roles(name) VALUES('Owner') ON CONFLICT DO NOTHING;
COMMIT;
