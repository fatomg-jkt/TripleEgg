BEGIN;
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO restaurants(id,slug,name) VALUES
 ('00000000-0000-0000-0000-000000000001','triple-egg','Triple Egg'),
 ('00000000-0000-0000-0000-000000000002','wok-this-way','Wok This Way')
ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name;
CREATE TABLE IF NOT EXISTS user_restaurants (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,restaurant_id)
);
-- Preserve existing behavior and assign every existing user to Triple Egg only.
INSERT INTO user_restaurants(user_id,restaurant_id)
SELECT id,'00000000-0000-0000-0000-000000000001'::uuid FROM users
ON CONFLICT DO NOTHING;
COMMIT;
