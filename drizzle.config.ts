import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "workers/src/db/schema.ts",
  out: "workers/drizzle",
  dialect: "sqlite",
});
