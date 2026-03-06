import "dotenv/config";
import { defineConfig } from "prisma/config";

const DIRECT_DATABASE_URL = process.env["DIRECT_DATABASE_URL"];
const DATABASE_URL = process.env["DATABASE_URL"];

if (!DIRECT_DATABASE_URL?.trim()) {
  console.error(
    "Error: DIRECT_DATABASE_URL is required for Prisma schema operations (db push, migrate, generate).\n" +
      "Set it in .env to the direct Supabase URL (db.<ref>.supabase.co:5432 with ?sslmode=require)."
  );
  process.exit(1);
}

if (!DATABASE_URL?.trim()) {
  console.error(
    "Error: DATABASE_URL is required for the application runtime.\n" +
      "Set it in .env (e.g. Supabase pooler URL on port 6543)."
  );
  process.exit(1);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DIRECT_DATABASE_URL,
  },
});
