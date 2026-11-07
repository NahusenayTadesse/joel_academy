import { parseYouTubeUrl, type YouTubeVideo } from '@nahu/admin-kit/youtube';

/**
 * A lesson body as the learning page draws it: runs of (sanitised) HTML, with a YouTube player
 * wherever staff pasted a YouTube link on a line of its own.
 *
 * Only a paragraph holding nothing but the link becomes a player — bare, or as a link whose text
 * is the address itself, which is what the editor makes of a paste. A worded link ("watch the
 * demo") inside a sentence stays a link.
 */
export type BodyPart = { kind: 'html'; html: string } | { kind: 'youtube'; video: YouTubeVideo };

const PARAGRAPH = /<p\b[^>]*>\s*(?:<a\b[^>]*?\bhref="([^"]*)"[^>]*>([^<]*)<\/a>|([^<]*))\s*(?:<br\s*\/?>\s*)*<\/p>/gi;
const TAG = /<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi;
const VOID = new Set(['br', 'hr', 'img', 'wbr', 'col', 'source', 'input']);

/** Sanitised HTML escapes `&` in addresses; the parser wants the address as typed. */
const unescape = (value: string) => value.replace(/&amp;/g, '&').replace(/&#x2F;|&#47;/gi, '/').trim();

/** The video a paragraph's link or text stands for, or `null` for any other paragraph. */
export function paragraphVideo(href: string | undefined, text: string): YouTubeVideo | null {
	const shown = parseYouTubeUrl(unescape(text));
	if (!shown) return null;
	return href === undefined ? shown : parseYouTubeUrl(unescape(href));
}

/** Where each top-level element starts: a list's or a quote's own paragraphs must stay inside it. */
function topLevelStarts(html: string): Set<number> {
	const starts = new Set<number>();
	let depth = 0;
	for (const tag of html.matchAll(TAG)) {
		const [, closing, name, selfClosing] = tag;
		if (VOID.has(name.toLowerCase()) || selfClosing) continue;
		if (closing) depth = Math.max(0, depth - 1);
		else {
			if (depth === 0) starts.add(tag.index);
			depth += 1;
		}
	}
	return starts;
}

export function splitLessonBody(html: string): BodyPart[] {
	const parts: BodyPart[] = [];
	const pushHtml = (chunk: string) => {
		if (chunk.trim()) parts.push({ kind: 'html', html: chunk });
	};
	const starts = topLevelStarts(html);
	let from = 0;
	for (const match of html.matchAll(PARAGRAPH)) {
		if (!starts.has(match.index)) continue;
		const [whole, href, linkText, bare] = match;
		const video = paragraphVideo(href, linkText ?? bare ?? '');
		if (!video) continue;
		pushHtml(html.slice(from, match.index));
		parts.push({ kind: 'youtube', video });
		from = match.index + whole.length;
	}
	pushHtml(html.slice(from));
	return parts;
}
