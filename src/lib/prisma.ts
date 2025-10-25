// src/lib/prisma.ts
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaClient as GeneratedPrismaClient } from '@/generated/prisma/client';
import { PrismaClient as PrismaC } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

declare global {
  // allow globalThis.prisma to persist across module reloads in dev
  // eslint-disable-next-line no-var
  var prisma: PrismaC | undefined;
}

const connectionString = String(process.env.DATABASE_URL || '');
const adapter = new PrismaNeon({ connectionString });

// create one client instance and cache it in globalThis for dev hot-reloads
const prismaClient =
  globalThis.prisma ??
  new GeneratedPrismaClient({
    adapter,
    ...(process.env.NODE_ENV === 'development'
      ? { log: ['query', 'info', 'warn', 'error'] as ('query' | 'info' | 'warn' | 'error')[] }
      : {}),
  });

if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prismaClient;
}

export default prismaClient;
export type Prisma = typeof prismaClient;
