import "dotenv/config";
import { defineConfig } from "prisma/config";

const DIRECT_DATABASE_URL = process.env["DIRECT_DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DIRECT_DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
