-- dolls テーブル新規作成
CREATE TABLE dolls (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  head_model  TEXT,
  body_size   TEXT NOT NULL,
  image_url   TEXT,
  memo        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_dolls_user_id ON dolls(user_id);

-- garments: doll_size (単一) → doll_sizes (JSON配列) に移行
ALTER TABLE garments ADD COLUMN doll_sizes TEXT NOT NULL DEFAULT '[]';

UPDATE garments SET doll_sizes = '["' || doll_size || '"]' WHERE doll_size IS NOT NULL AND doll_size != '';

ALTER TABLE garments DROP COLUMN doll_size;
