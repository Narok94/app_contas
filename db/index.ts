import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: NodePgDatabase<typeof schema> | null = null;

export const getDb = () => {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing. Please configure it in your environment variables.');
    }
    const pool = new Pool({ connectionString });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
};

// Also export a proxy for easier usage
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(target, prop) {
    return (getDb() as any)[prop];
  }
});
