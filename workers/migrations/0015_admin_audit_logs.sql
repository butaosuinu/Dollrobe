CREATE TABLE admin_audit_logs (
  id              TEXT PRIMARY KEY,
  actor_user_id   TEXT NOT NULL,
  action          TEXT NOT NULL,
  target_user_id  TEXT,
  metadata        TEXT,
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor      ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target     ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
