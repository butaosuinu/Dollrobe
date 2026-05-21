-- Smoke test for D1 CD pipeline (#233).
-- No-op statement: verifies that `wrangler d1 migrations apply` reaches
-- the remote database and records this migration in the d1_migrations table.
-- `SELECT 1` is required because D1's applyD1Migrations rejects files with
-- no executable statements ("SQL code did not contain a statement").
SELECT 1;
