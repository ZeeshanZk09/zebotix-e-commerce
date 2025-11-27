import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('db', 'migrations'),
  },
});
