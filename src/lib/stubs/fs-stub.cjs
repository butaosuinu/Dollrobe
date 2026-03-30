// Turbopack resolveAlias stub for bare "fs" imports.
// Server (Node.js): delegate to real fs via node: protocol.
// Browser: provide empty object (opencv.js guards with ENVIRONMENT_HAS_NODE).
try {
  module.exports = require("node:fs");
} catch {
  module.exports = {};
}
