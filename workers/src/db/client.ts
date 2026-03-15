import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createDrizzle = (db: D1Database) => drizzle(db, { schema });

export type DrizzleDB = ReturnType<typeof createDrizzle>;
