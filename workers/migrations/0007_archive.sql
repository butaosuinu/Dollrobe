ALTER TABLE garments ADD COLUMN archived_at INTEGER;
ALTER TABLE dolls ADD COLUMN archived_at INTEGER;
CREATE INDEX idx_garments_archived_at ON garments(archived_at);
