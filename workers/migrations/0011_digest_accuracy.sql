ALTER TABLE digests DROP COLUMN unknown_items;
ALTER TABLE digests DROP COLUMN orphaned_items;
ALTER TABLE digests DROP COLUMN orphaned_count;
ALTER TABLE digests ADD COLUMN accuracy_score REAL NOT NULL DEFAULT 1.0;
ALTER TABLE digests ADD COLUMN confirmed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE digests ADD COLUMN uncertain_count INTEGER NOT NULL DEFAULT 0;
