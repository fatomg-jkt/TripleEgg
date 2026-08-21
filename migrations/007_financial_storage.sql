CREATE TABLE IF NOT EXISTS financial_imports (
  id uuid PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  statement_type text NOT NULL,
  module text NOT NULL,
  period text NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  file_name text NOT NULL,
  original_file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Success',
  uploaded_by text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_failed integer NOT NULL DEFAULT 0,
  replaced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, company_id, statement_type, period, version)
);

CREATE INDEX IF NOT EXISTS financial_imports_active_lookup_idx
  ON financial_imports (restaurant_id, company_id, statement_type, period)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS financial_imports_restaurant_period_idx
  ON financial_imports (restaurant_id, year, month, is_active);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id text PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES financial_imports(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  debit numeric(24,4) NOT NULL DEFAULT 0,
  credit numeric(24,4) NOT NULL DEFAULT 0,
  company_id text NOT NULL,
  department_id text NOT NULL,
  cost_center_id text NOT NULL,
  period text NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  description text NOT NULL DEFAULT '',
  report_category text,
  statement_type text NOT NULL,
  source_file_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS financial_transactions_report_idx
  ON financial_transactions (restaurant_id, statement_type, year, month, company_id);
CREATE INDEX IF NOT EXISTS financial_transactions_import_idx ON financial_transactions (import_id);

CREATE TABLE IF NOT EXISTS financial_budgets (
  id text PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES financial_imports(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  period text NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  company_id text NOT NULL,
  department_id text NOT NULL,
  cost_center_id text NOT NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  category text NOT NULL,
  budget numeric(24,4) NOT NULL DEFAULT 0,
  source_file_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS financial_budgets_report_idx
  ON financial_budgets (restaurant_id, year, month, company_id, department_id, cost_center_id);
CREATE INDEX IF NOT EXISTS financial_budgets_import_idx ON financial_budgets (import_id);
