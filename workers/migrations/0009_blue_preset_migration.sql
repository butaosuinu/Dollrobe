-- Migrate old blue preset value after saturation adjustment (70% -> 55%)
-- colors is a JSON array stored as TEXT, so use REPLACE on the JSON string
UPDATE garments
SET colors = REPLACE(colors, '"hsl(210, 70%, 55%)"', '"hsl(210, 55%, 55%)"'),
    updated_at = unixepoch() * 1000
WHERE colors LIKE '%hsl(210, 70%, 55%)%';
