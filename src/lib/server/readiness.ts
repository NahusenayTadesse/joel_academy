/**
 * Whether the database has every migration this build was made with — what `/health/ready`
 * answers, and what the deploy script waits for. A build shipped ahead of its migration would
 * otherwise start, answer `/health`, and 500 on every page that reads the new column.
 *
 * Migrations are matched by the SHA-256 of their SQL, the key drizzle records in
 * `__drizzle_migrations`, so a file edited after it was applied counts as missing.
 */
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import journal from '../../../drizzle/meta/_journal.json';

const migrations = import.meta.glob('/drizzle/*.sql', { query: '?raw', import: 'default', eager: true });

/** The hashes of the migrations in `drizzle/`, in journal order. */
export const requiredMigrations = journal.entries.map((entry) => {
	const source = migrations[`/drizzle/${entry.tag}.sql`];
	if (typeof source !== 'string') throw new Error(`Missing migration: ${entry.tag}`);
	return createHash('sha256').update(source).digest('hex');
});

/** True when every required hash is among the applied ones. */
export function migrationsReady(applied: Iterable<string>, required = requiredMigrations): boolean {
	const hashes = new Set(applied);
	return required.every((hash) => hashes.has(hash));
}

/** Reads the migration log and says whether this build's schema is in place. */
export async function schemaReady(): Promise<boolean> {
	const [rows] = await db.execute(sql`SELECT hash FROM __drizzle_migrations`);
	return migrationsReady((rows as unknown as { hash: string }[]).map((r) => r.hash));
}
