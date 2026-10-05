import { defineConfig } from "drizzle-kit";

// `generate` only reads the schema file and doesn't connect to a database, so it
// must work without DATABASE_URL set. `push`/`migrate` do connect and will fail
// with a clear connection error from the driver if this is left as a placeholder.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder",
  },
});
