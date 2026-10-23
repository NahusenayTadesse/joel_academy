import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { m } from '$lib/paraglide/messages';

/*
 * Keeping bots and brute force off the public forms, in three cheap layers:
 *
 * - A honeypot field people never see (`website`): bots that fill every input fill it too.
 * - A signed timestamp issued with the form (`formToken`): a submission seconds after the page
 *   loaded, or with a forged or missing token, is a script.
 * - Sliding-window rate limits per client address (and per email for sign-in).
 *
 * The limits live in this process's memory: they reset on restart and are per Node process,
 * which is right for a single-process deploy. Behind a reverse proxy, set adapter-node's
 * ADDRESS_HEADER (e.g. X-Forwarded-For) so every visitor does not share the proxy's address.
 */

export const HONEYPOT_FIELD = 'website';
export const TOKEN_FIELD = 'formToken';

/** Faster than this is not a person reading and typing. */
const MIN_FILL_MS = 2_500;
/** A form left open longer than this is re-issued rather than trusted. */
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

const secret = () => env.BETTER_AUTH_SECRET || 'development-only-form-secret';
const sign = (issued: string) => createHmac('sha256', secret()).update(`form:${issued}`).digest('base64url');

/** A token for a form being rendered now. */
export function issueFormToken(now = Date.now()): string {
	const issued = String(now);
	return `${issued}.${sign(issued)}`;
}

export type BotVerdict = 'ok' | 'honeypot' | 'too-fast' | 'bad-token';

/** Judges a posted form by its honeypot and token. */
export function judgeSubmission(form: FormData, now = Date.now()): BotVerdict {
	if (String(form.get(HONEYPOT_FIELD) ?? '').trim() !== '') return 'honeypot';
	const token = String(form.get(TOKEN_FIELD) ?? '');
	const [issued, signature] = token.split('.');
	if (!issued || !signature) return 'bad-token';
	const expected = Buffer.from(sign(issued));
	const given = Buffer.from(signature);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'bad-token';
	const age = now - Number(issued);
	if (!Number.isFinite(age) || age < 0 || age > MAX_FORM_AGE_MS) return 'bad-token';
	if (age < MIN_FILL_MS) return 'too-fast';
	return 'ok';
}

// ── Rate limits ─────────────────────────────────────────────────────────────────────────────

interface Rule {
	limit: number;
	windowMs: number;
}

/** Per bucket: limits that all must hold (a short burst rule and a longer steady one). */
export const LIMITS = {
	contact: [
		{ limit: 3, windowMs: 10 * 60_000 },
		{ limit: 10, windowMs: 24 * 60 * 60_000 }
	],
	newsletter: [{ limit: 5, windowMs: 60 * 60_000 }],
	register: [
		{ limit: 3, windowMs: 10 * 60_000 },
		{ limit: 10, windowMs: 24 * 60 * 60_000 }
	],
	signInAddress: [{ limit: 20, windowMs: 15 * 60_000 }],
	signInEmail: [{ limit: 8, windowMs: 15 * 60_000 }],
	passwordReset: [{ limit: 5, windowMs: 60 * 60_000 }]
} satisfies Record<string, Rule[]>;

export type LimitBucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();
let lastSweep = 0;

/** Drops expired entries now and then, so the map cannot grow without bound. */
function sweep(now: number) {
	if (now - lastSweep < 60_000) return;
	lastSweep = now;
	const longest = Math.max(...Object.values(LIMITS).flat().map((rule) => rule.windowMs));
	for (const [key, times] of hits) {
		const fresh = times.filter((time) => now - time < longest);
		if (fresh.length) hits.set(key, fresh);
		else hits.delete(key);
	}
}

/**
 * Counts one attempt for `key` in `bucket`. Returns 0 when allowed, otherwise how many
 * milliseconds until the next attempt would be. A refused attempt is not counted.
 */
export function hit(bucket: LimitBucket, key: string, now = Date.now()): number {
	sweep(now);
	const id = `${bucket}:${key}`;
	const times = hits.get(id) ?? [];
	let wait = 0;
	for (const rule of LIMITS[bucket]) {
		const inWindow = times.filter((time) => now - time < rule.windowMs);
		if (inWindow.length >= rule.limit) wait = Math.max(wait, inWindow[0] + rule.windowMs - now);
	}
	if (wait > 0) return wait;
	times.push(now);
	hits.set(id, times);
	return 0;
}

/** Clears a key, e.g. a successful sign-in resets that email's failed attempts. */
export function forgive(bucket: LimitBucket, key: string) {
	hits.delete(`${bucket}:${key}`);
}

/** For tests. */
export function resetLimits() {
	hits.clear();
}

/** The visitor's address, as adapter-node reports it (see ADDRESS_HEADER above). */
export function clientAddress(event: Pick<RequestEvent, 'getClientAddress'>): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

/** "2 minutes", "1 hour" (in the request's language) — for "try again in …". */
export function waitText(ms: number): string {
	const minutes = Math.max(1, Math.ceil(ms / 60_000));
	if (minutes < 60) return m.info_wait_minutes({ count: minutes });
	const hours = Math.ceil(minutes / 60);
	return m.info_wait_hours({ count: hours });
}
