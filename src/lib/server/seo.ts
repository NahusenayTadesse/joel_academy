import { siteConfig } from '$lib/site';

/*
 * Search and social metadata every public page shares. Pages already set their own <title> and
 * description; this fills in what they leave out — a canonical URL, Open Graph and Twitter tags
 * built from that same title and description, and the default share image — so a link pasted
 * into Telegram, Facebook or X shows a proper card. Anything a page sets itself is kept.
 */

/** Never indexed: private, transactional or staff pages. */
export const PRIVATE_PATHS =
	/^\/(dashboard|api|account|my|my-courses|my-certificates|my-wishlist|my-payments|my-notifications|checkout|login|register|logout|forgot-password|reset-password|verify-email|offline|media|newsletter)(\/|$)/;

export const SHARE_IMAGE = { path: '/og-image.jpg', width: 1200, height: 630 };

/** The page's canonical address: no query string, except a page number past the first. */
export function canonicalUrl(origin: string, url: URL): string {
	const page = Number(url.searchParams.get('page'));
	const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/';
	return `${origin}${path}${Number.isInteger(page) && page > 1 ? `?page=${page}` : ''}`;
}

const has = (head: string, pattern: RegExp) => pattern.test(head);
const attr = (value: string) => value.replace(/"/g, '&quot;');

/**
 * Adds the missing tags just before </head>. `html` is a rendered page; its <title> and
 * description are already HTML-escaped, so they are reused as they are.
 */
export function withSeoTags(html: string, url: URL, origin: string): string {
	const end = html.indexOf('</head>');
	if (end === -1) return html;
	const head = html.slice(0, end);
	if (/<meta name="robots" content="[^"]*noindex/.test(head)) return html;

	const title = /<title>([^<]*)<\/title>/.exec(head)?.[1]?.trim();
	const description = /<meta name="description" content="([^"]*)"/.exec(head)?.[1]?.trim();
	const canonical = canonicalUrl(origin, url);
	const image = `${origin}${SHARE_IMAGE.path}`;
	const tags: string[] = [];

	if (!has(head, /rel="canonical"/)) tags.push(`<link rel="canonical" href="${attr(canonical)}">`);
	if (!has(head, /property="og:site_name"/)) tags.push(`<meta property="og:site_name" content="${attr(siteConfig.name)}">`);
	if (!has(head, /property="og:type"/)) tags.push('<meta property="og:type" content="website">');
	if (!has(head, /property="og:locale"/)) tags.push('<meta property="og:locale" content="en_US">');
	if (!has(head, /property="og:url"/)) tags.push(`<meta property="og:url" content="${attr(canonical)}">`);
	if (title && !has(head, /property="og:title"/)) tags.push(`<meta property="og:title" content="${title}">`);
	if (description && !has(head, /property="og:description"/)) {
		tags.push(`<meta property="og:description" content="${description}">`);
	}
	if (!has(head, /property="og:image"/)) {
		tags.push(
			`<meta property="og:image" content="${image}">`,
			`<meta property="og:image:width" content="${SHARE_IMAGE.width}">`,
			`<meta property="og:image:height" content="${SHARE_IMAGE.height}">`,
			`<meta property="og:image:alt" content="${attr(siteConfig.name)}">`
		);
	}
	if (!has(head, /name="twitter:card"/)) tags.push('<meta name="twitter:card" content="summary_large_image">');

	return tags.length ? `${head}${tags.join('')}${html.slice(end)}` : html;
}
