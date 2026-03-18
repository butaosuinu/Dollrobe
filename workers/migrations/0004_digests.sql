CREATE TABLE digests (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  unknown_items   TEXT NOT NULL DEFAULT '[]',
  orphaned_items  TEXT NOT NULL DEFAULT '[]',
  unknown_count   INTEGER NOT NULL DEFAULT 0,
  orphaned_count  INTEGER NOT NULL DEFAULT 0,
  total_garments  INTEGER NOT NULL DEFAULT 0,
  is_read         INTEGER NOT NULL DEFAULT 0,
  generated_at    INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_digests_user_id ON digests(user_id);
CREATE INDEX idx_digests_generated_at ON digests(generated_at);
