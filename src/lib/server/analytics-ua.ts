/*
 * Reading a page view's request: is it a person, on what kind of device, from which other site.
 * Pure functions, so they are tested without a database.
 */

/** Crawlers, link previewers, uptime checks and audit tools: not visitors. */
const BOT =
	/bot|crawl|spider|slurp|scrape|fetch|preview|monitor|uptime|headless|lighthouse|pagespeed|gtmetrix|curl|wget|python|httpclient|axios|node-fetch|go-http|java\/|facebookexternalhit|whatsapp|embedly|quora link|vkshare|bitlybot|pinterest/i;

export function isBot(userAgent: string): boolean {
	return !userAgent || userAgent.length < 20 || BOT.test(userAgent);
}

export type Device = 'mobile' | 'tablet' | 'desktop';

export interface Client {
	device: Device;
	browser: string;
	os: string;
}

/** A rough reading of the User-Agent: enough to group, not to fingerprint. */
export function readUserAgent(userAgent: string): Client {
	const ua = userAgent;
	const tablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
	const mobile = !tablet && /Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(ua);

	const os = /Windows/i.test(ua)
		? 'Windows'
		: /iPhone|iPad|iPod/i.test(ua)
			? 'iOS'
			: /Android/i.test(ua)
				? 'Android'
				: /CrOS/i.test(ua)
					? 'ChromeOS'
					: /Mac OS X|Macintosh/i.test(ua)
						? 'macOS'
						: /Linux/i.test(ua)
							? 'Linux'
							: 'Other';

	// Order matters: Edge and Opera also say "Chrome"; Chrome also says "Safari".
	const browser = /Edg\//i.test(ua)
		? 'Edge'
		: /OPR\/|Opera/i.test(ua)
			? 'Opera'
			: /SamsungBrowser/i.test(ua)
				? 'Samsung Internet'
				: /Firefox|FxiOS/i.test(ua)
					? 'Firefox'
					: /Chrome|CriOS/i.test(ua)
						? 'Chrome'
						: /Safari/i.test(ua)
							? 'Safari'
							: 'Other';

	return { device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', browser, os };
}

/**
 * The host of an outside site that linked here ("t.me", "google.com"), or null when the visit
 * came from this site, an app that sends no referrer, or something unreadable.
 */
export function referrerHost(referrer: string | null | undefined, ownHost: string): string | null {
	if (!referrer || !URL.canParse(referrer)) return null;
	const url = new URL(referrer);
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	const host = url.hostname.replace(/^www\./, '').toLowerCase();
	const own = ownHost.replace(/^www\./, '').toLowerCase();
	if (!host || host === own || host.endsWith(`.${own}`)) return null;
	return host.slice(0, 255);
}

/** A tracking parameter, trimmed and capped; empty becomes null. */
export function utm(value: string | null | undefined): string | null {
	const text = value?.trim().slice(0, 100);
	return text ? text.toLowerCase() : null;
}
