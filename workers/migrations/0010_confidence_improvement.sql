ALTER TABLE storage_locations ADD COLUMN last_visited_at INTEGER;
ALTER TABLE storage_locations ADD COLUMN confirm_all_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE storage_locations ADD COLUMN correction_count INTEGER NOT NULL DEFAULT 0;

-- confidence_decay_days は自動算出値、override はユーザー明示指定用
ALTER TABLE garments ADD COLUMN confidence_decay_days_override INTEGER;
ALTER TABLE garments ADD COLUMN recent_checkout_count INTEGER NOT NULL DEFAULT 0;
