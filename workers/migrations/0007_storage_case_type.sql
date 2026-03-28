ALTER TABLE storage_cases ADD COLUMN type TEXT NOT NULL DEFAULT 'grid';
ALTER TABLE storage_cases ADD COLUMN description TEXT;
ALTER TABLE storage_locations ADD COLUMN custom_name TEXT;
ALTER TABLE storage_locations ADD COLUMN description TEXT;
