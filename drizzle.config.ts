import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env');
export default defineConfig({ schema: './src/lib/server/db/schema.ts', out: './drizzle', dialect: 'mysql', dbCredentials: { url: process.env.DATABASE_URL }, strict: true });
