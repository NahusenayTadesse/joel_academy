import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { siteSetting } from '$lib/server/db/schema';
import { landingSchema, mergeLanding, type LandingSettings } from '$lib/content/landing';

export {
	DEFAULT_LANDING,
	landingSchema,
	type LandingSettings
} from '$lib/content/landing';

/*
 * The landing page CMS's storage: one JSON document under `site_setting.key = 'landing'`. Every
 * public page reads it (the announcement bar is in the layout), so it is cached like the catalog;
 * saving drops the cache, and the TTL bounds staleness across several Node processes.
 */

const KEY = 'landing';
const TTL_MS = 30_000;

let cached: { expires: number; value: LandingSettings } | undefined;
let pending: Promise<LandingSettings> | undefined;

export function invalidateLanding() {
	cached = undefined;
}

async function read(): Promise<LandingSettings> {
	const [row] = await db
		.select({ value: siteSetting.value })
		.from(siteSetting)
		.where(eq(siteSetting.key, KEY));
	// MariaDB's JSON is LONGTEXT, so the driver may hand back the raw string.
	const value = typeof row?.value === 'string' ? safeJson(row.value) : row?.value;
	return mergeLanding(value);
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

/** The current landing settings: stored values over the defaults. */
export async function getLandingSettings(): Promise<LandingSettings> {
	if (cached && cached.expires > Date.now()) return cached.value;
	pending ??= read().finally(() => (pending = undefined));
	const value = await pending;
	cached = { expires: Date.now() + TTL_MS, value };
	return value;
}

/** Validates and stores the whole document, then drops the cache so the site shows it at once. */
export async function saveLandingSettings(input: LandingSettings): Promise<LandingSettings> {
	const value = landingSchema.parse(input);
	await db
		.insert(siteSetting)
		.values({ key: KEY, value })
		.onDuplicateKeyUpdate({ set: { value } });
	invalidateLanding();
	return value;
}
