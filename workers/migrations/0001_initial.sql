CREATE TABLE garments (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  doll_size             TEXT NOT NULL,
  colors                TEXT NOT NULL DEFAULT '[]',
  tags                  TEXT NOT NULL DEFAULT '[]',
  image_url             TEXT,
  location_id           TEXT REFERENCES storage_locations(id),
  status                TEXT NOT NULL DEFAULT 'stored',
  last_scanned_at       INTEGER NOT NULL,
  confidence_decay_days INTEGER NOT NULL DEFAULT 30,
  checked_out_at        INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE TABLE storage_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 5,
  cols INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL
);

CREATE TABLE storage_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES storage_cases(id),
  label TEXT NOT NULL,
  row_num INTEGER NOT NULL,
  col_num INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE coordinates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  garment_ids TEXT NOT NULL DEFAULT '[]',
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_garments_user_id     ON garments(user_id);
CREATE INDEX idx_garments_location_id ON garments(location_id);
CREATE INDEX idx_garments_status      ON garments(status);
CREATE INDEX idx_locations_case_id    ON storage_locations(case_id);
