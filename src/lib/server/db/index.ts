import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = mysql.createPool({ uri: env.DATABASE_URL, timezone: 'Z' });

/*
 * Drizzle reads TIMESTAMP values as UTC, while `now()` defaults and the conversion of TIMESTAMP
 * columns follow the session time zone — the server's local one unless told otherwise. Pinning
 * every connection to UTC keeps what is written and what is read on the same clock.
 */
client.pool.on('connection', (connection) => {
	connection.query("SET time_zone = '+00:00'");
});

export const db = drizzle(client, { schema, mode: 'default' });
