/*
 * Rich-editor HTML (lesson bodies, handouts) as the block model the branded PDF lays out. The
 * input is always sanitised first (`sanitizeLessonHtml`), so it is well-formed and holds only
 * the editor's tags; anything else met here is read for its text and otherwise ignored. Nothing
 * here is ever put back on a web page.
 */

import { youtubeWatchUrl } from '@nahu/admin-kit/youtube';
import { paragraphVideo } from '$lib/lesson-body';

export interface InlineStyle {
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	underline?: boolean;
	strike?: boolean;
	/** An http(s) or mailto link. */
	href?: string;
}

export type Inline = { kind: 'text'; text: string; style: InlineStyle } | { kind: 'break' };

export type ListMarker = 'bullet' | 'number' | 'check';

export type Block =
	| { type: 'heading'; level: 2 | 3 | 4; content: Inline[] }
	| { type: 'paragraph'; content: Inline[] }
	/** Each item is its own blocks (a paragraph, maybe a nested list). `lines`: answer lines after each item. */
	| { type: 'list'; marker: ListMarker; items: Block[][]; lines?: number }
	| { type: 'quote'; blocks: Block[] }
	| { type: 'code'; text: string }
	| { type: 'rule' }
	/** Pictures are not fetched into the PDF; the reader is told one was there. */
	| { type: 'image'; alt: string }
	/** A YouTube link on a line of its own, which the web page plays: printed as its watch link. */
	| { type: 'video'; href: string };

interface Element {
	tag: string;
	attrs: Record<string, string>;
	children: Node[];
}
type Node = Element | string;

const VOID = new Set(['br', 'hr', 'img', 'wbr']);
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|[^<]+|</g;
const ATTR = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
		if (name[0] === '#') {
			const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
		}
		return NAMED[name.toLowerCase()] ?? whole;
	});
}

function parseTree(html: string): Node[] {
	const root: Element = { tag: '#root', attrs: {}, children: [] };
	const stack: Element[] = [root];
	for (const match of html.matchAll(TOKEN)) {
		const [whole, closing, rawTag, rawAttrs] = match;
		const top = stack[stack.length - 1];
		if (whole.startsWith('<!--')) continue;
		if (!rawTag) {
			top.children.push(decodeEntities(whole));
			continue;
		}
		const tag = rawTag.toLowerCase();
		if (closing) {
			// Close back to the matching element; a stray closing tag closes nothing.
			const at = stack.findLastIndex((element) => element.tag === tag);
			if (at > 0) stack.length = at;
			continue;
		}
		const attrs: Record<string, string> = {};
		for (const [, name, double, single, bare] of (rawAttrs ?? '').matchAll(ATTR)) {
			attrs[name.toLowerCase()] = decodeEntities(double ?? single ?? bare ?? '');
		}
		const element: Element = { tag, attrs, children: [] };
		top.children.push(element);
		if (!VOID.has(tag) && !rawAttrs?.trimEnd().endsWith('/')) stack.push(element);
	}
	return root.children;
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'img', 'table']);

const linkOf = (href: string | undefined) => (href && /^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : undefined);

function inlinesOf(node: Node, style: InlineStyle): Inline[] {
	if (typeof node === 'string') return [{ kind: 'text', text: node.replace(/[ \t\n\r\f]+/g, ' '), style }];
	switch (node.tag) {
		case 'br':
			return [{ kind: 'break' }];
		case 'img':
			return node.attrs.alt ? [{ kind: 'text', text: `[${node.attrs.alt}]`, style: { ...style, italic: true } }] : [];
		case 'strong':
		case 'b':
			style = { ...style, bold: true };
			break;
		case 'em':
		case 'i':
			style = { ...style, italic: true };
			break;
		case 'u':
			style = { ...style, underline: true };
			break;
		case 's':
		case 'strike':
		case 'del':
			style = { ...style, strike: true };
			break;
		case 'code':
			style = { ...style, code: true };
			break;
		case 'a': {
			const href = linkOf(node.attrs.href);
			if (href) style = { ...style, href };
			break;
		}
	}
	return node.children.flatMap((child) => inlinesOf(child, style));
}

/** Drops the whitespace a browser would not show: at the ends, around breaks, and doubled spaces. */
export function tidyInlines(inlines: Inline[]): Inline[] {
	const out: Inline[] = [];
	let lastEndsInSpace = true; // the start of the block counts as a space
	for (const inline of inlines) {
		if (inline.kind === 'break') {
			trimEnd(out);
			out.push(inline);
			lastEndsInSpace = true;
			continue;
		}
		let text = inline.text;
		if (lastEndsInSpace) text = text.replace(/^ +/, '');
		if (!text) continue;
		out.push({ ...inline, text });
		lastEndsInSpace = text.endsWith(' ');
	}
	trimEnd(out);
	while (out[0]?.kind === 'break') out.shift();
	while (out[out.length - 1]?.kind === 'break') out.pop();
	return out;
}

function trimEnd(out: Inline[]) {
	while (out.length) {
		const last = out[out.length - 1];
		if (last.kind !== 'text') return;
		const text = last.text.replace(/ +$/, '');
		if (text) {
			out[out.length - 1] = { ...last, text };
			return;
		}
		out.pop();
	}
}

const textOf = (node: Node): string =>
	typeof node === 'string' ? node : node.tag === 'br' ? '\n' : node.children.map(textOf).join('');

function blocksOf(nodes: Node[]): Block[] {
	const blocks: Block[] = [];
	let loose: Inline[] = [];
	const flush = () => {
		const content = tidyInlines(loose);
		if (content.length) blocks.push({ type: 'paragraph', content });
		loose = [];
	};

	for (const node of nodes) {
		if (typeof node === 'string' || !BLOCK_TAGS.has(node.tag)) {
			loose.push(...inlinesOf(node, {}));
			continue;
		}
		flush();
		switch (node.tag) {
			case 'p': {
				const content = tidyInlines(node.children.flatMap((child) => inlinesOf(child, {})));
				if (content.length) blocks.push({ type: 'paragraph', content });
				break;
			}
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6': {
				const content = tidyInlines(node.children.flatMap((child) => inlinesOf(child, {})));
				const level = node.tag === 'h1' || node.tag === 'h2' ? 2 : node.tag === 'h3' ? 3 : 4;
				if (content.length) blocks.push({ type: 'heading', level, content });
				break;
			}
			case 'ul':
			case 'ol': {
				const items = node.children
					.filter((child): child is Element => typeof child !== 'string' && child.tag === 'li')
					.map((item) => blocksOf(item.children));
				if (items.length) blocks.push({ type: 'list', marker: node.tag === 'ol' ? 'number' : 'bullet', items });
				break;
			}
			case 'blockquote': {
				const inner = blocksOf(node.children);
				if (inner.length) blocks.push({ type: 'quote', blocks: inner });
				break;
			}
			case 'pre': {
				const text = textOf(node).replace(/^\n/, '').replace(/\s+$/, '');
				if (text) blocks.push({ type: 'code', text });
				break;
			}
			case 'hr':
				blocks.push({ type: 'rule' });
				break;
			case 'img':
				blocks.push({ type: 'image', alt: node.attrs.alt?.trim() ?? '' });
				break;
			default:
				// div, a stray li, a table: their contents, as blocks.
				blocks.push(...blocksOf(node.children));
		}
	}
	flush();
	return blocks;
}

/** A top-level paragraph that is only a YouTube link, as `$lib/lesson-body` reads it for the web page. */
function videoOf(block: Block): Block {
	if (block.type !== 'paragraph') return block;
	const texts = block.content.filter((inline) => inline.kind === 'text');
	const hrefs = new Set(texts.map((inline) => inline.style.href));
	if (hrefs.size !== 1) return block;
	const video = paragraphVideo([...hrefs][0], texts.map((inline) => inline.text).join(''));
	return video ? { type: 'video', href: youtubeWatchUrl(video) } : block;
}

/** Sanitised rich-editor HTML → blocks. */
export function htmlToBlocks(html: string | null | undefined): Block[] {
	return html ? blocksOf(parseTree(html)).map(videoOf) : [];
}

/** Plain text typed into a textarea → paragraphs (blank lines) with line breaks (single newlines). */
export function textToBlocks(text: string | null | undefined): Block[] {
	return (text ?? '')
		.split(/\n\s*\n/)
		.map((paragraph) =>
			tidyInlines(
				paragraph
					.split('\n')
					.flatMap((line, index): Inline[] => [
						...(index ? [{ kind: 'break' } as const] : []),
						{ kind: 'text', text: line.replace(/[ \t]+/g, ' '), style: {} }
					])
			)
		)
		.filter((content) => content.length)
		.map((content) => ({ type: 'paragraph', content }));
}

/** One line of plain text as inline content. */
export const plain = (text: string, style: InlineStyle = {}): Inline[] => [{ kind: 'text', text, style }];
