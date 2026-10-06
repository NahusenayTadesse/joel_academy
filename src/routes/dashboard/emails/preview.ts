/*
 * Turning a logged email into something safe to show staff. The page puts the result in an
 * `<iframe sandbox srcdoc>` with scripts off; these add a second lock (a CSP that forbids scripts)
 * and make links open in a new tab, since a sandboxed frame cannot navigate the dashboard.
 */

const HEAD_EXTRAS =
	'<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; frame-src \'none\'; form-action \'none\'">' +
	'<base target="_blank">';

/** The stored HTML, ready for `srcdoc`. */
export function previewDocument(html: string): string {
	if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (head) => head + HEAD_EXTRAS);
	if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${HEAD_EXTRAS}</head>`);
	return `<!doctype html><html><head>${HEAD_EXTRAS}</head><body>${html}</body></html>`;
}

const decode = (value: string) =>
	value
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

/**
 * The web links in an email, once each, in order. Without SMTP, this is how a developer follows a
 * reset or confirmation link.
 */
export function emailLinks(html: string): string[] {
	const links = new Set<string>();
	for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*"([^"]*)"/gi)) {
		const href = decode(match[1].trim());
		if (/^https?:\/\//i.test(href)) links.add(href);
	}
	return [...links];
}

/** "password-reset" → "Password reset". */
export function kindLabel(kind: string): string {
	const words = kind.replace(/[-_]+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}
