import {
	PageSizes,
	PDFDocument,
	PDFName,
	PDFString,
	rgb,
	setCharacterSpacing,
	StandardFonts,
	type PDFFont,
	type PDFImage,
	type PDFPage,
	type RGB
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ETHIOPIC, ethiopicBoldBytes, ethiopicRegularBytes, hex, runsOf, runsWidth, type Run } from './text';
import { plain, type Block, type Inline, type InlineStyle, type ListMarker } from './html';
// The logo's emblem on a white rounded tile, inlined like the fonts so the build needs no file beside it.
import logoData from './logo.png?inline';

/*
 * The academy's branded document: an A4 page with the logo, a navy cover band, a running header
 * and a numbered footer, and a flowing body laid out here (pdf-lib only places text, it does not
 * wrap or paginate). Course outlines, section workbooks and handouts are all this one layout, fed
 * different blocks. Coordinates are the sheet's (y downwards); `Y` turns them into PDF space.
 */

/** Blocks only generated documents use, beside those rich-editor HTML gives. */
export type DocBlock =
	| Block
	/** A numbered division: "SECTION 2" over its title, optionally on a fresh page. */
	| { type: 'chapter'; label: string; title: string; description?: Block[]; newPage?: boolean }
	/** A table of lessons: number, title, and a right-hand detail ("Video · 12:30"). */
	| { type: 'rows'; rows: OutlineRow[] }
	/** A shaded box with a brand-coloured edge. */
	| { type: 'note'; content: Inline[] }
	/** Labelled write-in lines, two to a row: "Name", "Date". */
	| { type: 'fields'; labels: string[] }
	/** Ruled lines to write on. */
	| { type: 'lines'; count: number };

export interface OutlineRow {
	number: string;
	title: string;
	detail?: string;
	/** A short flag under the detail, in the brand colour ("Free preview"). */
	tag?: string;
	/** Greyed out (a lesson the reader cannot open yet). */
	muted?: boolean;
}

export interface BrandedPdfInput {
	academyName: string;
	/** The site's address, printed and linked in every footer. */
	siteUrl: string;
	/** Above the title on the cover: "Course outline", "Checklist · Section 2". */
	kind: string;
	title: string;
	subtitle?: string | null;
	/** Named in the header of every page after the first; usually the course. */
	context?: string | null;
	/** Short facts in pills under the cover band: "12 lessons", "Beginner". */
	facts?: string[];
	blocks: DocBlock[];
	keywords?: string[];
}

const [W, H] = PageSizes.A4;
const Y = (y: number) => H - y;
/** Side margins, and where the body starts and must end on a page. */
const M = 56;
const CONTENT_W = W - 2 * M;
const TOP = 78;
const BOTTOM = H - 66;

/** The site's palette (`layout.css`) and the logo's own colours: its navy, blue and green. */
const C = {
	band: hex('#011a33'),
	bandMark: hex('#0a2a4d'),
	brand: hex('#17a202'),
	ink: hex('#0a5299'),
	dark: hex('#012a51'),
	text: hex('#0b1c2a'),
	muted: hex('#4a5e6d'),
	border: hex('#d8e3eb'),
	tint: hex('#eef5fa'),
	sky: hex('#7ab8ff'),
	skyLight: hex('#c9e2ff'),
	white: rgb(1, 1, 1)
};

interface TextStyle {
	size: number;
	leading: number;
	color: RGB;
	bold?: boolean;
	italic?: boolean;
}

const BODY: TextStyle = { size: 10.5, leading: 15.5, color: C.text };
const HEADINGS: Record<2 | 3 | 4, TextStyle & { before: number; after: number }> = {
	2: { size: 15, leading: 20, color: C.dark, bold: true, before: 16, after: 5 },
	3: { size: 12.5, leading: 17, color: C.text, bold: true, before: 12, after: 4 },
	4: { size: 11, leading: 15, color: C.ink, bold: true, before: 9, after: 2 }
};
const PARAGRAPH_GAP = 7;

interface Fonts {
	regular: PDFFont;
	bold: PDFFont;
	italic: PDFFont;
	boldItalic: PDFFont;
	mono: PDFFont;
	ethiopic?: PDFFont;
	ethiopicBold?: PDFFont;
}

interface Piece {
	text: string;
	font: PDFFont;
	size: number;
	width: number;
	color: RGB;
	style: InlineStyle;
}
type Item = { kind: 'word'; pieces: Piece[]; width: number } | { kind: 'space'; width: number } | { kind: 'break' };
interface Line {
	pieces: (Piece & { x: number })[];
	width: number;
}

/** How the blocks being drawn sit: their indent, and a tone a quote lends its text. */
interface Context {
	indent: number;
	tone?: Partial<TextStyle>;
	/** Inside a list item: less space after paragraphs. */
	tight?: boolean;
}

const domainOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** A link as a PDF wants it: absolute and percent-encoded, or nothing. */
function linkTarget(href: string): string | null {
	try {
		const url = new URL(href);
		return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

class Writer {
	readonly pages: PDFPage[] = [];
	page!: PDFPage;
	y = 0;
	private links: { page: PDFPage; rect: number[]; url: string }[] = [];

	constructor(
		private pdf: PDFDocument,
		private fonts: Fonts,
		private logoImage: PDFImage
	) {}

	// ── Pages ────────────────────────────────────────────────────────────────

	newPage() {
		this.page = this.pdf.addPage([W, H]);
		this.pages.push(this.page);
		this.y = TOP;
	}

	/** Starts a new page unless `height` still fits on this one. */
	room(height: number) {
		if (this.y + height > BOTTOM) this.newPage();
	}

	get atTop() {
		return this.y <= TOP;
	}

	// ── Text ─────────────────────────────────────────────────────────────────

	fontFor(style: InlineStyle & { bold?: boolean; italic?: boolean }): { font: PDFFont; fallback?: PDFFont } {
		const { regular, bold, italic, boldItalic, mono, ethiopic, ethiopicBold } = this.fonts;
		if (style.code) return { font: mono, fallback: ethiopic };
		if (style.bold) return { font: style.italic ? boldItalic : bold, fallback: ethiopicBold };
		return { font: style.italic ? italic : regular, fallback: ethiopic };
	}

	/** Inline content → words and spaces, each word in the fonts that can draw it. */
	items(inlines: Inline[], base: TextStyle): Item[] {
		const out: Item[] = [];
		let word: Piece[] = [];
		const endWord = () => {
			if (word.length) out.push({ kind: 'word', pieces: word, width: word.reduce((sum, piece) => sum + piece.width, 0) });
			word = [];
		};
		for (const inline of inlines) {
			if (inline.kind === 'break') {
				endWord();
				out.push({ kind: 'break' });
				continue;
			}
			const style = { ...inline.style, bold: base.bold || inline.style.bold, italic: base.italic || inline.style.italic };
			const { font, fallback } = this.fontFor(style);
			const size = style.code ? base.size * 0.92 : base.size;
			const color = style.href ? C.ink : base.color;
			for (const part of inline.text.split(/( +)/)) {
				if (!part) continue;
				if (part.startsWith(' ')) {
					endWord();
					out.push({ kind: 'space', width: font.widthOfTextAtSize(' ', size) });
					continue;
				}
				for (const run of runsOf(part, font, fallback)) {
					word.push({ text: run.text, font: run.font, size, width: run.font.widthOfTextAtSize(run.text, size), color, style });
				}
			}
		}
		endWord();
		return out;
	}

	/** Greedy line breaking; a word wider than the line is cut between characters. */
	lines(items: Item[], width: number): Line[] {
		const lines: Line[] = [];
		let current: Line = { pieces: [], width: 0 };
		let space = 0;
		const finish = () => {
			lines.push(current);
			current = { pieces: [], width: 0 };
			space = 0;
		};
		const place = (pieces: Piece[], wordWidth: number) => {
			if (current.pieces.length && current.width + space + wordWidth > width) finish();
			let x = current.pieces.length ? current.width + space : 0;
			for (const piece of pieces) {
				current.pieces.push({ ...piece, x });
				x += piece.width;
			}
			current.width = x;
			space = 0;
		};
		for (const item of items) {
			if (item.kind === 'break') finish();
			else if (item.kind === 'space') space = current.pieces.length ? item.width : 0;
			else if (item.width <= width) place(item.pieces, item.width);
			else for (const chunk of this.cut(item.pieces, width)) place(chunk, chunk.reduce((sum, piece) => sum + piece.width, 0));
		}
		if (current.pieces.length) lines.push(current);
		return lines;
	}

	private cut(pieces: Piece[], width: number): Piece[][] {
		const chunks: Piece[][] = [];
		let chunk: Piece[] = [];
		let used = 0;
		for (const piece of pieces) {
			let text = '';
			for (const char of Array.from(piece.text)) {
				const w = piece.font.widthOfTextAtSize(char, piece.size);
				if (used + w > width && used > 0) {
					if (text) chunk.push({ ...piece, text, width: piece.font.widthOfTextAtSize(text, piece.size) });
					chunks.push(chunk);
					chunk = [];
					text = '';
					used = 0;
				}
				text += char;
				used += w;
			}
			if (text) chunk.push({ ...piece, text, width: piece.font.widthOfTextAtSize(text, piece.size) });
		}
		if (chunk.length) chunks.push(chunk);
		return chunks;
	}

	/** Where text of `size` sits in a line box of `leading` whose top is `top`. */
	static baseline(top: number, leading: number, size: number) {
		return top + leading / 2 + size * 0.34;
	}

	drawLine(line: Line, left: number, top: number, leading: number, align: 'left' | 'right' = 'left') {
		const shift = align === 'right' ? -line.width : 0;
		for (const piece of line.pieces) {
			const x = left + shift + piece.x;
			const base = Writer.baseline(top, leading, piece.size);
			if (piece.style.code) {
				this.rect(x - 1.5, base - piece.size * 0.82, piece.width + 3, piece.size * 1.12, { fill: C.tint });
			}
			this.page.drawText(piece.text, { x, y: Y(base), size: piece.size, font: piece.font, color: piece.color });
			if (piece.style.underline || piece.style.href) this.hline(x, x + piece.width, base + 1.6, piece.color, 0.5);
			if (piece.style.strike) this.hline(x, x + piece.width, base - piece.size * 0.3, piece.color, 0.6);
			const url = piece.style.href && linkTarget(piece.style.href);
			if (url) this.links.push({ page: this.page, rect: [x, Y(base + 3), x + piece.width, Y(base - piece.size)], url });
		}
	}

	/** Lays out and draws inline content, a line at a time, breaking pages between lines. */
	text(inlines: Inline[], style: TextStyle, left: number, width: number) {
		for (const line of this.lines(this.items(inlines, style), width)) {
			this.room(style.leading);
			this.drawLine(line, left, this.y, style.leading);
			this.y += style.leading;
		}
	}

	/** One line of plain text, shortened with an ellipsis to fit `maxWidth`. */
	single(text: string, style: TextStyle, x: number, baseline: number, maxWidth: number, align: 'left' | 'right' = 'left', spacing = 0) {
		const { font, fallback } = this.fontFor(style);
		let runs: Run[] = runsOf(text, font, fallback);
		// A little slack, so text measured to fit exactly is not shortened by rounding.
		if (runsWidth(runs, style.size, spacing) > maxWidth + 0.01) {
			const chars = Array.from(text);
			while (chars.length > 1 && runsWidth(runsOf(`${chars.join('')}…`, font, fallback), style.size, spacing) > maxWidth) chars.pop();
			runs = runsOf(`${chars.join('').trimEnd()}…`, font, fallback);
		}
		const width = runsWidth(runs, style.size, spacing);
		let cursor = align === 'right' ? x - width : x;
		if (spacing) this.page.pushOperators(setCharacterSpacing(spacing));
		for (const run of runs) {
			this.page.drawText(run.text, { x: cursor, y: Y(baseline), size: style.size, font: run.font, color: style.color });
			cursor += run.font.widthOfTextAtSize(run.text, style.size) + spacing * Array.from(run.text).length;
		}
		if (spacing) this.page.pushOperators(setCharacterSpacing(0));
		return width;
	}

	link(page: PDFPage, x: number, top: number, width: number, height: number, href: string) {
		const url = linkTarget(href);
		if (url) this.links.push({ page, rect: [x, Y(top + height), x + width, Y(top)], url });
	}

	// ── Shapes ───────────────────────────────────────────────────────────────

	rect(x: number, top: number, width: number, height: number, style: { fill?: RGB; stroke?: RGB; width?: number }, page = this.page) {
		page.drawRectangle({
			x,
			y: Y(top + height),
			width,
			height,
			color: style.fill,
			borderColor: style.stroke,
			borderWidth: style.stroke ? (style.width ?? 1) : undefined
		});
	}

	hline(x1: number, x2: number, y: number, color: RGB, thickness: number, page = this.page) {
		page.drawLine({ start: { x: x1, y: Y(y) }, end: { x: x2, y: Y(y) }, color, thickness });
	}

	/** The logo: the emblem on a white rounded tile, `size` points wide. */
	logo(page: PDFPage, x: number, top: number, size: number) {
		page.drawImage(this.logoImage, { x, y: Y(top + size), width: size, height: size });
	}

	// ── Chrome ───────────────────────────────────────────────────────────────

	cover(input: BrandedPdfInput) {
		this.newPage();
		const page = this.page;

		let titleStyle: TextStyle = { size: 26, leading: 31, color: C.white, bold: true };
		let titleLines = this.lines(this.items(plain(input.title), titleStyle), CONTENT_W - 40);
		if (titleLines.length > 3) {
			titleStyle = { size: 20, leading: 25, color: C.white, bold: true };
			titleLines = this.lines(this.items(plain(input.title), titleStyle), CONTENT_W - 40);
		}
		const subtitleStyle: TextStyle = { size: 11.5, leading: 16.5, color: C.skyLight };
		const subtitleLines = input.subtitle ? this.lines(this.items(plain(input.subtitle), subtitleStyle), CONTENT_W - 40) : [];

		const titleTop = 118;
		const subtitleTop = titleTop + titleLines.length * titleStyle.leading + 6;
		const bandBottom = Math.max(214, subtitleTop + subtitleLines.length * subtitleStyle.leading + 30);

		// The band, the logo's trail of pixel squares faint across its right side, and a brand stripe.
		this.rect(0, 0, W, bandBottom, { fill: C.band });
		for (const [col, row] of [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3]]) {
			this.rect(W - 190 + col * 34, bandBottom - 150 + row * 34, 26, 26, { fill: C.bandMark });
		}
		this.rect(0, bandBottom, W, 4, { fill: C.brand });

		this.logo(page, M, 34, 28);
		this.single(input.academyName, { size: 12, leading: 16, color: C.white, bold: true }, M + 38, 52.5, CONTENT_W - 200);
		const domain = domainOf(input.siteUrl);
		const domainWidth = this.single(domain, { size: 9, leading: 12, color: C.sky }, W - M, 52, 180, 'right');
		this.link(page, W - M - domainWidth, 42, domainWidth, 14, input.siteUrl);

		this.single(input.kind.toUpperCase(), { size: 9, leading: 12, color: C.sky, bold: true }, M, 104, CONTENT_W, 'left', 1.4);
		titleLines.forEach((line, i) => this.drawLine(line, M, titleTop + i * titleStyle.leading, titleStyle.leading));
		subtitleLines.forEach((line, i) => this.drawLine(line, M, subtitleTop + i * subtitleStyle.leading, subtitleStyle.leading));

		this.y = bandBottom + 4 + 22;
		const facts = (input.facts ?? []).filter(Boolean);
		if (facts.length) {
			const pill: TextStyle = { size: 8.5, leading: 12, color: C.ink, bold: true };
			const { font } = this.fontFor(pill);
			let x = M;
			for (const fact of facts) {
				const width = Math.min(runsWidth(runsOf(fact, font, this.fonts.ethiopicBold), pill.size) + 18, CONTENT_W);
				if (x > M && x + width > W - M) {
					x = M;
					this.y += 26;
				}
				this.page.drawSvgPath(roundedRect(0, 0, width, 20, 10), { x, y: Y(this.y), color: C.tint });
				this.single(fact, pill, x + 9, this.y + 13.5, width - 18);
				x += width + 6;
			}
			this.y += 20 + 22;
		}
	}

	/** Header (after the cover), footer and page numbers, once every page exists. */
	chrome(input: BrandedPdfInput) {
		const total = this.pages.length;
		const small: TextStyle = { size: 8, leading: 10, color: C.muted };
		const domain = domainOf(input.siteUrl);
		this.pages.forEach((page, index) => {
			this.page = page;
			if (index > 0) {
				this.logo(page, M, 24, 16);
				const nameWidth = this.single(input.academyName, { size: 9, leading: 12, color: C.dark, bold: true }, M + 23, 35.5, 220);
				this.single(input.context || input.title, { size: 8.5, leading: 12, color: C.muted }, W - M, 35.5, CONTENT_W - nameWidth - 60, 'right');
				this.hline(M, W - M, 50, C.border, 0.6);
			}
			this.hline(M, W - M, H - 48, C.border, 0.6);
			const footer = `${input.academyName} · ${domain}`;
			const footerWidth = this.single(footer, small, M, H - 33, CONTENT_W - 90);
			this.link(page, M, H - 42, footerWidth, 12, input.siteUrl);
			this.single(`Page ${index + 1} of ${total}`, small, W - M, H - 33, 90, 'right');
		});
	}

	/** Writes the collected link annotations onto their pages. */
	annotate() {
		for (const page of this.pages) {
			const mine = this.links.filter((link) => link.page === page);
			if (!mine.length) continue;
			page.node.set(
				PDFName.of('Annots'),
				this.pdf.context.obj(
					mine.map((link) =>
						this.pdf.context.register(
							this.pdf.context.obj({
								Type: 'Annot',
								Subtype: 'Link',
								Rect: link.rect,
								Border: [0, 0, 0],
								A: { Type: 'Action', S: 'URI', URI: PDFString.of(link.url) }
							})
						)
					)
				)
			);
		}
	}

	// ── Blocks ───────────────────────────────────────────────────────────────

	blocks(blocks: DocBlock[], ctx: Context) {
		for (const block of blocks) this.block(block, ctx);
	}

	block(block: DocBlock, ctx: Context) {
		const left = M + ctx.indent;
		const width = CONTENT_W - ctx.indent;
		const body: TextStyle = { ...BODY, ...ctx.tone };
		switch (block.type) {
			case 'paragraph':
				this.text(block.content, body, left, width);
				this.y += ctx.tight ? 2 : PARAGRAPH_GAP;
				break;

			case 'heading': {
				const style = HEADINGS[block.level];
				const lines = this.lines(this.items(block.content, style), width);
				// Kept with at least two lines of what follows it.
				if (this.y + style.before + lines.length * style.leading + 2 * BODY.leading > BOTTOM) this.newPage();
				else if (!this.atTop) this.y += style.before;
				if (block.level === 2) this.rect(left - 11, this.y + 4, 3, style.leading - 8, { fill: C.brand });
				for (const line of lines) {
					this.drawLine(line, left, this.y, style.leading);
					this.y += style.leading;
				}
				this.y += style.after;
				break;
			}

			case 'list':
				this.list(block, ctx);
				break;

			case 'quote': {
				const start = { page: this.pages.length - 1, y: this.y };
				this.blocks(block.blocks, { ...ctx, indent: ctx.indent + 14, tone: { italic: true, color: C.muted } });
				this.y -= PARAGRAPH_GAP;
				this.bar(start, left, C.border);
				this.y += PARAGRAPH_GAP + 2;
				break;
			}

			case 'code':
				this.code(block.text, left, width);
				break;

			case 'rule':
				this.room(22);
				this.y += 8;
				this.hline(left, W - M, this.y, C.border, 0.8);
				this.y += 12;
				break;

			case 'image':
				this.text(plain(block.alt ? `[Picture: ${block.alt}]` : '[Picture]', { italic: true }), { ...body, color: C.muted }, left, width);
				this.y += PARAGRAPH_GAP;
				break;

			case 'video':
				this.note([...plain('Video   ', { bold: true }), { kind: 'text', text: block.href, style: { href: block.href } }], left, width);
				break;

			case 'chapter':
				this.chapter(block, left, width);
				break;

			case 'rows':
				this.rows(block.rows, left, width);
				break;

			case 'note':
				this.note(block.content, left, width);
				break;

			case 'fields':
				this.fields(block.labels, left, width);
				break;

			case 'lines':
				this.ruled(block.count, left);
				break;
		}
	}

	/** A vertical bar beside what was drawn since `start`, across any page breaks. */
	private bar(start: { page: number; y: number }, x: number, color: RGB) {
		const end = this.pages.length - 1;
		for (let index = start.page; index <= end; index += 1) {
			const from = index === start.page ? start.y : TOP;
			const to = index === end ? this.y : BOTTOM;
			if (to > from) this.rect(x, from, 2.5, to - from, { fill: color }, this.pages[index]);
		}
	}

	private list(block: Extract<DocBlock, { type: 'list' }>, ctx: Context) {
		const left = M + ctx.indent;
		const depth = Math.round(ctx.indent / 18);
		const numberWidth = block.marker === 'number' ? this.fonts.bold.widthOfTextAtSize(`${block.items.length}.`, BODY.size) + 9 : 0;
		const markerWidth = Math.max(18, numberWidth);
		block.items.forEach((item, index) => {
			this.room(BODY.leading);
			this.marker(block.marker, index, depth, left, markerWidth);
			this.blocks(item, { ...ctx, indent: ctx.indent + markerWidth, tight: true });
			if (!item.length) this.y += BODY.leading;
			if (block.lines) this.ruled(block.lines, left + markerWidth);
			this.y += 3;
		});
		this.y += ctx.tight ? 0 : PARAGRAPH_GAP - 3;
	}

	private marker(marker: ListMarker, index: number, depth: number, left: number, width: number) {
		const middle = this.y + BODY.leading / 2;
		if (marker === 'number') {
			const label = `${index + 1}.`;
			this.single(label, { ...BODY, color: C.ink, bold: true }, left + width - 6, Writer.baseline(this.y, BODY.leading, BODY.size), width, 'right');
		} else if (marker === 'check') {
			this.page.drawSvgPath(roundedRect(0, 0, 9, 9, 1.5), { x: left + 1, y: Y(middle - 4.5), borderColor: C.ink, borderWidth: 0.9 });
		} else if (depth % 3 === 0) {
			this.page.drawCircle({ x: left + 5, y: Y(middle), size: 2.1, color: C.brand });
		} else if (depth % 3 === 1) {
			this.page.drawCircle({ x: left + 5, y: Y(middle), size: 2.1, borderColor: C.brand, borderWidth: 0.8 });
		} else {
			this.rect(left + 3.2, middle - 1.8, 3.6, 3.6, { fill: C.muted });
		}
	}

	/** Shaded, preformatted text in the monospaced font; long lines wrap at the margin. */
	private code(text: string, left: number, width: number) {
		const pad = 8;
		const style: TextStyle = { size: 9, leading: 12.5, color: C.text };
		const { font, fallback } = this.fontFor({ code: true });
		const inner = width - 2 * pad;
		const rows: string[] = [];
		for (const source of text.replace(/\t/g, '    ').split('\n')) {
			let row = '';
			let used = 0;
			for (const char of Array.from(source)) {
				const w = runsWidth(runsOf(char, font, fallback), style.size);
				if (used + w > inner && row) {
					rows.push(row);
					row = '';
					used = 0;
				}
				row += char;
				used += w;
			}
			rows.push(row);
		}
		// A short block is kept whole rather than leaving a line or two on the next page.
		const total = rows.length * style.leading + 2 * pad;
		if (total < (BOTTOM - TOP) / 3) this.room(total);
		rows.forEach((row, index) => {
			const first = index === 0;
			const last = index === rows.length - 1;
			const height = style.leading + (first ? pad : 0) + (last ? pad : 0);
			this.room(height);
			this.rect(left, this.y, width, height, { fill: C.tint });
			let x = left + pad;
			const base = Writer.baseline(this.y + (first ? pad : 0), style.leading, style.size);
			for (const run of runsOf(row, font, fallback)) {
				this.page.drawText(run.text, { x, y: Y(base), size: style.size, font: run.font, color: style.color });
				x += run.font.widthOfTextAtSize(run.text, style.size);
			}
			this.y += height;
		});
		this.y += PARAGRAPH_GAP + 2;
	}

	private note(content: Inline[], left: number, width: number) {
		const pad = 10;
		const lines = this.lines(this.items(content, BODY), width - 2 * pad - 3);
		this.room(Math.min(lines.length, 6) * BODY.leading + 2 * pad);
		lines.forEach((line, index) => {
			const first = index === 0;
			const last = index === lines.length - 1;
			const height = BODY.leading + (first ? pad : 0) + (last ? pad : 0);
			this.room(height);
			this.rect(left, this.y, width, height, { fill: C.tint });
			this.rect(left, this.y, 3, height, { fill: C.brand });
			this.drawLine(line, left + pad + 3, this.y + (first ? pad : 0), BODY.leading);
			this.y += height;
		});
		this.y += PARAGRAPH_GAP + 4;
	}

	private chapter(block: Extract<DocBlock, { type: 'chapter' }>, left: number, width: number) {
		const titleStyle: TextStyle = { size: 17, leading: 22, color: C.dark, bold: true };
		const titleLines = this.lines(this.items(plain(block.title), titleStyle), width);
		const needed = 16 + titleLines.length * titleStyle.leading + 14 + 3 * BODY.leading;
		if (block.newPage && !this.atTop) this.newPage();
		else if (this.y + 22 + needed > BOTTOM) this.newPage();
		else if (!this.atTop) this.y += 22;

		this.single(block.label.toUpperCase(), { size: 8.5, leading: 12, color: C.brand, bold: true }, left, this.y + 9, width, 'left', 1.2);
		this.y += 16;
		for (const line of titleLines) {
			this.drawLine(line, left, this.y, titleStyle.leading);
			this.y += titleStyle.leading;
		}
		this.rect(left, this.y + 4, 34, 3, { fill: C.brand });
		this.y += 18;
		if (block.description?.length) this.blocks(block.description, { indent: left - M, tone: { color: C.muted } });
	}

	private rows(rows: OutlineRow[], left: number, width: number) {
		const numberWidth = 30;
		const detailWidth = 118;
		const titleWidth = width - numberWidth - detailWidth - 10;
		const style: TextStyle = { size: 10, leading: 14, color: C.text };
		const small: TextStyle = { size: 8.5, leading: 14, color: C.muted };
		const pad = 6;
		this.room(pad * 2 + style.leading);
		this.hline(left, left + width, this.y, C.border, 0.6);
		for (const row of rows) {
			const lines = this.lines(this.items(plain(row.title), { ...style, color: row.muted ? C.muted : C.text }), titleWidth);
			const height = Math.max(lines.length, row.tag ? 2 : 1) * style.leading + pad * 2;
			this.room(height);
			const top = this.y + pad;
			this.single(row.number, { ...small, bold: true }, left, Writer.baseline(top, style.leading, small.size), numberWidth - 4);
			lines.forEach((line, index) => this.drawLine(line, left + numberWidth, top + index * style.leading, style.leading));
			if (row.detail) this.single(row.detail, small, left + width, Writer.baseline(top, style.leading, small.size), detailWidth, 'right');
			if (row.tag) {
				this.single(row.tag, { ...small, size: 8, color: C.brand, bold: true }, left + width, Writer.baseline(top + style.leading, style.leading, 8), detailWidth, 'right');
			}
			this.y += height;
			this.hline(left, left + width, this.y, C.border, 0.6);
		}
		this.y += PARAGRAPH_GAP + 4;
	}

	private fields(labels: string[], left: number, width: number) {
		const gap = 24;
		const column = (width - gap) / 2;
		for (let index = 0; index < labels.length; index += 2) {
			this.room(36);
			labels.slice(index, index + 2).forEach((label, offset) => {
				const x = left + offset * (column + gap);
				this.single(label.toUpperCase(), { size: 7.5, leading: 10, color: C.muted, bold: true }, x, this.y + 9, column, 'left', 0.8);
				this.hline(x, x + column, this.y + 30, C.muted, 0.6);
			});
			this.y += 42;
		}
		this.y += 4;
	}

	private ruled(count: number, left: number) {
		for (let index = 0; index < count; index += 1) {
			this.room(24);
			this.y += 24;
			this.hline(left, W - M, this.y, C.border, 0.7);
		}
		this.y += 8;
	}
}

function roundedRect(x: number, y: number, width: number, height: number, r: number) {
	return `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Builds a branded PDF document. */
export async function brandedPdf(input: BrandedPdfInput): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setTitle(input.title, { showInWindowTitleBar: true });
	pdf.setAuthor(input.academyName);
	pdf.setSubject(input.kind);
	pdf.setKeywords(input.keywords ?? []);
	pdf.setCreator(input.academyName);
	pdf.setProducer(input.academyName);
	pdf.setCreationDate(new Date());

	pdf.registerFontkit(fontkit);
	// The Ethiopic fonts are embedded (subset) only when some text needs them.
	const needsEthiopic = ETHIOPIC.test(JSON.stringify(input));
	const [regular, bold, italic, boldItalic, mono, ethiopic, ethiopicBold, logo] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold),
		pdf.embedFont(StandardFonts.HelveticaOblique),
		pdf.embedFont(StandardFonts.HelveticaBoldOblique),
		pdf.embedFont(StandardFonts.Courier),
		needsEthiopic ? pdf.embedFont(ethiopicRegularBytes(), { subset: true }) : undefined,
		needsEthiopic ? pdf.embedFont(ethiopicBoldBytes(), { subset: true }) : undefined,
		pdf.embedPng(Buffer.from(logoData.slice(logoData.indexOf(',') + 1), 'base64'))
	]);

	const writer = new Writer(pdf, { regular, bold, italic, boldItalic, mono, ethiopic, ethiopicBold }, logo);
	writer.cover(input);
	writer.blocks(input.blocks, { indent: 0 });
	writer.chrome(input);
	writer.annotate();
	return pdf.save();
}
