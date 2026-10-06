/**
 * Creates a dashboard account. Public sign-up is closed (see `src/lib/server/auth.ts`), so this is
 * how people get in.
 *
 *     npm run admin:create -- --email joel@example.com --name "Joel Talargie"
 *     npm run admin:create -- --email joel@example.com --name "Joel" --password '…'
 *
 * Without `--password` a strong one is generated and printed once. The account is written the way
 * better-auth writes an email sign-up — a `user` row and a `credential` account holding the hash —
 * so signing in at /login works exactly as if they had registered.
 */
import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { hashPassword } from 'better-auth/crypto';
import { account, user, staffRole } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const { values } = parseArgs({
	options: {
		email: { type: 'string' },
		name: { type: 'string' },
		password: { type: 'string' }
	}
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
if (!email || !name) {
	console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name"');
	process.exit(1);
}
if (values.password !== undefined && values.password.length < 8) {
	console.error('The password must be at least 8 characters.');
	process.exit(1);
}

const password = values.password ?? randomBytes(12).toString('base64url');
const client = mysql.createPool({ uri: process.env.DATABASE_URL, timezone: 'Z' });
// UTC on both sides, as in src/lib/server/db/index.ts: Drizzle writes and reads timestamps as UTC.
client.pool.on('connection', (connection) => {
	connection.query("SET time_zone = '+00:00'");
});
const db = drizzle(client);

try {
	const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	if (existing) {
		console.error(`An account for ${email} already exists.`);
		process.exitCode = 1;
	} else {
		const userId = randomUUID();
		const hash = await hashPassword(password);
		await db.transaction(async (tx) => {
			await tx.insert(user).values({ id: userId, name, email, emailVerified: true });
			await tx.insert(staffRole).values({ userId, role: 'admin' });
			await tx.insert(account).values({
				id: randomUUID(),
				accountId: userId,
				providerId: 'credential',
				userId,
				password: hash
			});
		});
		console.log(`Created ${email}.`);
		if (!values.password) console.log(`Password (shown once): ${password}`);
	}
} finally {
	await client.end();
}
