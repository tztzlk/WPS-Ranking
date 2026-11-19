import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    // Read lazily instead of env(): `prisma generate` (build time) must work
    // without database credentials; migrate/db commands still need DATABASE_URL.
    url: process.env.DATABASE_URL ?? '',
  },
});
