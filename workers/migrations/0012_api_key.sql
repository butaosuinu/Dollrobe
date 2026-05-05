CREATE TABLE "apikey" (
  id TEXT PRIMARY KEY,
  configId TEXT NOT NULL DEFAULT 'default',
  name TEXT,
  start TEXT,
  referenceId TEXT NOT NULL,
  prefix TEXT,
  key TEXT NOT NULL,
  refillInterval INTEGER,
  refillAmount INTEGER,
  lastRefillAt INTEGER,
  enabled INTEGER DEFAULT 1,
  rateLimitEnabled INTEGER DEFAULT 1,
  rateLimitTimeWindow INTEGER,
  rateLimitMax INTEGER,
  requestCount INTEGER DEFAULT 0,
  remaining INTEGER,
  lastRequest INTEGER,
  expiresAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  permissions TEXT,
  metadata TEXT
);

CREATE INDEX idx_apikey_configId ON "apikey"(configId);
CREATE INDEX idx_apikey_referenceId ON "apikey"(referenceId);
CREATE INDEX idx_apikey_key ON "apikey"(key);
