import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit's own built-in env loader (and a bare `dotenv/config` import) only
// ever reads a file literally named `.env` — never `.env.local`. This project
// follows the Next.js convention of keeping local secrets in `.env.local`, so it
// must be loaded explicitly here.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in with your Neon connection string.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});