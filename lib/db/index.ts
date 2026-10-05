import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let instance: Database | undefined;

// Lazy: constructed on first actual use, not at module import time. This lets
// Next.js statically analyze pages that transitively import this module (e.g.
// via auth) without requiring DATABASE_URL at build time — only at request time.
function getDb(): Database {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    }
    const sql = neon(process.env.DATABASE_URL);
    instance = drizzle(sql, { schema });
  }
  return instance;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
