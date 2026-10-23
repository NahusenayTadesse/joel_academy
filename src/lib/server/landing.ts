import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { siteSetting } from '$lib/server/db/schema';
import { landingSchema, mergeLanding, type LandingSettings } from '$lib/content/landing-schema';
import { baseLocale, getLocale, isLocale, type Locale } from '$lib/i18n';

export { DEFAULT_LANDING, DEFAULT_LANDING_AM } from '$lib/content/landing';
export { landingSchema, type LandingSettings } from '$lib/content/landing-schema';

/*
 * The landing page CMS's storage: one JSON document per language in `site_setting` — English
 * under 'landing' (the key it always had), every other language under 'landing:<locale>'. Every
 * public page reads it (the announcement bar is in the layout), so it is cached like the catalog;
 * saving drops that language's cache, and the TTL bounds staleness across several Node processes.
 */

const TTL_MS = 30_000;

/** The `site_setting` key holding `locale`'s document. */
function keyFor(locale: Locale): string {
	return locale === baseLocale ? 'landing' : `landing:${locale}`;
}

const cached = new Map<Locale, { expires: number; value: LandingSettings }>();
const pending = new Map<Locale, Promise<LandingSettings>>();

/** Drops the cache of one language, or of all of them. */
export function invalidateLanding(locale?: Locale) {
	if (locale) cached.delete(locale);
	else cached.clear();
}

/** The current request's language; English outside a request (scripts, tests). */
function currentLocale(): Locale {
	try {
		const locale = getLocale();
		return isLocale(locale) ? locale : baseLocale;
	} catch {
		return baseLocale;
	}
}

async function read(locale: Locale): Promise<LandingSettings> {
	const [row] = await db
		.select({ value: siteSetting.value })
		.from(siteSetting)
		.where(eq(siteSetting.key, keyFor(locale)));
	// MariaDB's JSON is LONGTEXT, so the driver may hand back the raw string.
	const value = typeof row?.value === 'string' ? safeJson(row.value) : row?.value;
	return mergeLanding(value, locale);
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

/**
 * The current landing settings in `locale` (the page's own language by default): that language's
 * stored values over its defaults.
 */
export async function getLandingSettings(
	locale: Locale = currentLocale()
): Promise<LandingSettings> {
	const hit = cached.get(locale);
	if (hit && hit.expires > Date.now()) return hit.value;
	let request = pending.get(locale);
	if (!request) {
		request = read(locale).finally(() => pending.delete(locale));
		pending.set(locale, request);
	}
	const value = await request;
	cached.set(locale, { expires: Date.now() + TTL_MS, value });
	return value;
}

/** Validates and stores `locale`'s whole document, then drops its cache so the site shows it at once. */
export async function saveLandingSettings(
	input: LandingSettings,
	locale: Locale = baseLocale
): Promise<LandingSettings> {
	const value = landingSchema.parse(input);
	await db
		.insert(siteSetting)
		.values({ key: keyFor(locale), value })
		.onDuplicateKeyUpdate({ set: { value } });
	invalidateLanding(locale);
	return value;
}
