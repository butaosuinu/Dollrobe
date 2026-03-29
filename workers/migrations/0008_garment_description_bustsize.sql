-- Add description and set_contents columns to garments
ALTER TABLE garments ADD COLUMN description TEXT;
ALTER TABLE garments ADD COLUMN set_contents TEXT;

-- Migrate DollSize: DD → DD_M, MDD → MDD_M in garments.doll_sizes (JSON array)
-- Use exact JSON string matching to avoid replacing DDdy, DDS, DDP
-- Pattern: "DD" followed by " or , or ] (not followed by another letter/underscore)
UPDATE garments
SET doll_sizes = REPLACE(REPLACE(REPLACE(
  doll_sizes,
  '"DD"]', '"DD_M"]'),
  '"DD",', '"DD_M",'),
  ',"DD"', ',"DD_M"')
WHERE doll_sizes LIKE '%"DD"%'
  AND doll_sizes NOT LIKE '%"DD_M"%'
  AND doll_sizes NOT LIKE '%"DD_S"%'
  AND doll_sizes NOT LIKE '%"DD_L"%';

UPDATE garments
SET doll_sizes = REPLACE(REPLACE(REPLACE(
  doll_sizes,
  '"MDD"]', '"MDD_M"]'),
  '"MDD",', '"MDD_M",'),
  ',"MDD"', ',"MDD_M"')
WHERE doll_sizes LIKE '%"MDD"%'
  AND doll_sizes NOT LIKE '%"MDD_M"%'
  AND doll_sizes NOT LIKE '%"MDD_S"%'
  AND doll_sizes NOT LIKE '%"MDD_L"%';

-- Migrate DollSize in dolls.body_size
UPDATE dolls SET body_size = 'DD_M' WHERE body_size = 'DD';
UPDATE dolls SET body_size = 'MDD_M' WHERE body_size = 'MDD';
