import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFString } from 'pdf-lib';
import { brandedPdf, type BrandedPdfInput } from './branded';
import { htmlToBlocks, plain } from './html';

const input: BrandedPdfInput = {
	academyName: 'Ethio AI School',
	siteUrl: 'https://academy.example/',
	kind: 'Checklist',
	title: 'Week 1 setup',
	subtitle: 'Everything to have ready before the first live session',
	context: 'Introduction to AI',
	facts: ['3 lessons', 'Beginner'],
	blocks: htmlToBlocks('<h2>Install</h2><ul><li><p>The app</p></li></ul><p>See <a href="https://docs.example/start">the guide</a>.</p>')
};

/**
 * The text drawn in the standard fonts, page by page: pdf-lib writes it as hex strings in each
 * page's (deflated) content stream, one byte per WinAnsi character.
 */
async function pageTexts(bytes: Uint8Array): Promise<string[]> {
	const pdf = await PDFDocument.load(bytes);
	return pdf.getPages().map((page) => {
		const contents = page.node.Contents();
		const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => pdf.context.lookup(ref)) : [contents];
		return streams
			.map((stream) => {
				const raw = stream as PDFRawStream;
				const filtered = raw.dict.get(PDFName.of('Filter'));
				return (filtered ? inflateSync(raw.contents) : Buffer.from(raw.contents)).toString('latin1');
			})
			.join('\n')
			.match(/<([0-9A-Fa-f]*)> Tj/g)!
			.map((op) => Buffer.from(op.slice(1, op.indexOf('>')), 'hex').toString('latin1'))
			.join(' ');
	});
}

async function linksOf(bytes: Uint8Array): Promise<string[]> {
	const pdf = await PDFDocument.load(bytes);
	return pdf.getPages().flatMap((page) => {
		const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
		return (annots?.asArray() ?? []).map((ref) => {
			const action = (pdf.context.lookup(ref) as PDFDict).lookup(PDFName.of('A'), PDFDict);
			return (action.lookup(PDFName.of('URI')) as PDFString).decodeText();
		});
	});
}

const fontNames = async (bytes: Uint8Array) => {
	const pdf = await PDFDocument.load(bytes);
	return pdf.context
		.enumerateIndirectObjects()
		.map(([, object]) => object)
		.filter((object): object is PDFDict => object instanceof PDFDict && object.get(PDFName.of('Type')) === PDFName.of('Font'))
		.map((font) => String(font.get(PDFName.of('BaseFont'))));
};

describe('brandedPdf', () => {
	it('draws the cover, the body and a numbered footer', async () => {
		const bytes = await brandedPdf(input);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(1);
		expect(pdf.getTitle()).toBe('Week 1 setup');
		expect(pdf.getAuthor()).toBe('Ethio AI School');

		const [text] = await pageTexts(bytes);
		for (const expected of ['Ethio AI School', 'CHECKLIST', 'Week 1 setup', '3 lessons', 'Install', 'The app', 'Page 1 of 1']) {
			expect(text).toContain(expected);
		}
	});

	it('breaks long content across pages, with the running header after the cover', async () => {
		const long = `<p>${'A sentence that takes up some room on the page. '.repeat(400)}</p>`;
		const bytes = await brandedPdf({ ...input, blocks: htmlToBlocks(long) });
		const pages = await pageTexts(bytes);
		expect(pages.length).toBeGreaterThan(2);
		expect(pages[0]).not.toContain('Introduction to AI');
		expect(pages[1]).toContain('Introduction to AI');
		expect(pages.at(-1)).toContain(`Page ${pages.length} of ${pages.length}`);
	});

	it('makes links clickable: the body’s and the site’s', async () => {
		const links = await linksOf(await brandedPdf(input));
		expect(links).toContain('https://docs.example/start');
		expect(links).toContain('https://academy.example/');
	});

	it('embeds the Ethiopic font only when the text needs it', async () => {
		expect((await fontNames(await brandedPdf(input))).some((name) => name.includes('Ethiopic'))).toBe(false);
		const amharic = await brandedPdf({ ...input, title: 'የሳምንት 1 ዝግጅት', blocks: [{ type: 'paragraph', content: plain('ሰላም') }] });
		expect((await fontNames(amharic)).some((name) => name.includes('Ethiopic'))).toBe(true);
	});

	it('lays out every generated block without failing', async () => {
		const bytes = await brandedPdf({
			...input,
			blocks: [
				{ type: 'chapter', label: 'Section 1', title: 'Basics', description: htmlToBlocks('<p>Intro</p>'), newPage: true },
				{ type: 'rows', rows: [{ number: '1.1', title: 'Welcome', detail: 'Video · 4:00', tag: 'Free preview' }, { number: '1.2', title: 'Locked', muted: true }] },
				{ type: 'note', content: plain('A note') },
				{ type: 'fields', labels: ['Name', 'Date', 'Cohort'] },
				{ type: 'lines', count: 3 },
				{ type: 'list', marker: 'check', items: [htmlToBlocks('<p>Tick</p>')], lines: 2 },
				...htmlToBlocks('<blockquote><p>Quote</p></blockquote><pre><code>x = 1</code></pre><hr><img alt="Pic">'),
				{ type: 'video', href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
			]
		});
		const text = (await pageTexts(bytes)).join(' ');
		for (const expected of ['SECTION 1', 'Basics', 'Welcome', 'Free preview', 'A note', 'NAME', 'COHORT', 'Tick', 'Quote', 'x = 1', '[Picture: Pic]', 'Video']) {
			expect(text).toContain(expected);
		}
		expect(await linksOf(bytes)).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	});
});
