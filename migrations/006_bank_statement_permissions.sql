BEGIN;
INSERT INTO permissions(resource,action)
SELECT 'documents-bank-statement', action
FROM unnest(ARRAY['view','upload','edit','delete','export']::text[]) action
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE p.resource='documents-bank-statement' AND (
  r.name IN ('Owner','Super Admin') OR
  (r.name='Finance Manager' AND p.action IN ('view','upload','edit','export')) OR
  (r.name='Accounting' AND p.action IN ('view','upload','edit','export')) OR
  (r.name='Staff' AND p.action IN ('view','upload')) OR
  (r.name='Viewer' AND p.action='view')
) ON CONFLICT DO NOTHING;
COMMIT;
