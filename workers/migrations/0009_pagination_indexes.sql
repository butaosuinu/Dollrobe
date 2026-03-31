-- Composite indexes for cursor-based pagination and delta sync
CREATE INDEX IF NOT EXISTS idx_garments_user_updated ON garments(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_garments_user_archived ON garments(user_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_dolls_user_updated ON dolls(user_id, updated_at);

-- Tombstone table for tracking deletions (required for delta sync)
CREATE TABLE IF NOT EXISTS tombstones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tombstones_user_deleted ON tombstones(user_id, deleted_at);
