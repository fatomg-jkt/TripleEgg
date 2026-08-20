BEGIN;

-- Keep the migration independently safe if it is applied after an older 004.
INSERT INTO restaurants(id,slug,name) VALUES
 ('00000000-0000-0000-0000-000000000001','triple-egg','Triple Egg'),
 ('00000000-0000-0000-0000-000000000002','wok-this-way','Wok This Way')
ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name;

-- Existing non-administrators keep their current scope. Owners and Super Admins
-- receive both restaurants without deleting or replacing any existing access.
INSERT INTO user_restaurants(user_id,restaurant_id)
SELECT u.id,r.id
FROM users u
CROSS JOIN restaurants r
WHERE u.role IN ('Owner','Super Admin')
  AND r.slug IN ('triple-egg','wok-this-way')
ON CONFLICT DO NOTHING;

COMMIT;
