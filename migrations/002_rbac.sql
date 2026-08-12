BEGIN;
CREATE TABLE IF NOT EXISTS roles(id bigserial PRIMARY KEY,name text UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS permissions(id bigserial PRIMARY KEY,resource text NOT NULL,action text NOT NULL,UNIQUE(resource,action));
CREATE TABLE IF NOT EXISTS role_permissions(role_id bigint REFERENCES roles(id) ON DELETE CASCADE,permission_id bigint REFERENCES permissions(id) ON DELETE CASCADE,PRIMARY KEY(role_id,permission_id));
CREATE TABLE IF NOT EXISTS user_permissions(user_id uuid REFERENCES users(id) ON DELETE CASCADE,permission_id bigint REFERENCES permissions(id) ON DELETE CASCADE,allowed boolean NOT NULL,PRIMARY KEY(user_id,permission_id));
INSERT INTO roles(name) VALUES('Super Admin'),('Finance Manager'),('Accounting'),('Staff'),('Viewer') ON CONFLICT DO NOTHING;
COMMIT;
