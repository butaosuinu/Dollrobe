-- Issue #44: ドール服メタデータ変更
-- brand カラム追加
ALTER TABLE garments ADD COLUMN brand TEXT;

-- DollSize マイグレーション: "1/3" → "SD", "1/6" → "other"
UPDATE garments SET doll_size = 'SD' WHERE doll_size = '1/3';
UPDATE garments SET doll_size = 'other' WHERE doll_size = '1/6';
