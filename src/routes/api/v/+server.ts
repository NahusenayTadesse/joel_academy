import { delocalizePath } from '$lib/i18n';
import { isBot } from '$lib/server/analytics-ua';
import { recordPageView } from '$lib/server/analytics';
import type { RequestHandler } from './$types';

/*
 * Where the analytics beacon reports a page view (a short, neutral path, so content blockers
 * that match "analytics" or "track" leave the site's own counting alone). Always answers 204:
 * a page view that is refused or fails to save must never surface in the browser.
 */

const NOT_COUNTED = /^\/(dashboard|api|media|lesson-files|offline)(\/|$)/;

/** Page views per address per minute; anything faster is a script, not a reader. */
const LIMIT = 120;
let window = { start: Date.now(), hits: new Map<string, number>() };

function allowed(ip: string): boolean {
	if (Date.now() - window.start > 60_000) window = { start: Date.now(), hits: new Map() };
	const hits = (window.hits.get(ip) ?? 0) + 1;
	window.hits.set(ip, hits);
	return hits <= LIMIT;
}

const done = () => new Response(null, { status: 204 });

export const POST: RequestHandler = async (event) => {
	const { request, url, locals } = event;
	const userAgent = request.headers.get('user-agent') ?? '';
	if (isBot(userAgent)) return done();

	let body: { p?: unknown; r?: unknown; ref?: unknown; q?: unknown };
	try {
		body = await request.json();
	} catch {
		return done();
	}
	if (typeof body.p !== 'string' || !body.p.startsWith('/') || body.p.length > 512) return done();

	const localized = body.p;
	const path = delocalizePath(localized);
	if (NOT_COUNTED.test(path)) return done();

	const ip =
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		event.getClientAddress();
	if (!allowed(ip)) return done();

	try {
		await recordPageView({
			path,
			route: typeof body.r === 'string' ? body.r : null,
			locale: localized === '/am' || localized.startsWith('/am/') ? 'am' : 'en',
			referrer: typeof body.ref === 'string' ? body.ref : null,
			search: new URLSearchParams(typeof body.q === 'string' ? body.q.slice(0, 1000) : ''),
			userAgent,
			ip,
			ownHost: url.hostname,
			country: request.headers.get('cf-ipcountry'),
			userId: locals.user?.id ?? null
		});
	} catch (error) {
		console.error('analytics: page view not saved', error);
	}
	return done();
};
