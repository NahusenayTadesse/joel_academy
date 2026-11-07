import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToBlocks, textToBlocks, type Block, type Inline } from './html';

const texts = (inlines: Inline[]) => inlines.map((inline) => (inline.kind === 'text' ? inline.text : '\n')).join('');

describe('htmlToBlocks', () => {
	it('reads paragraphs with their inline styles and links', () => {
		const [paragraph] = htmlToBlocks(
			'<p>Hello <strong>bold <em>both</em></strong> and <a href="https://example.com" target="_blank">a link</a></p>'
		);
		expect(paragraph).toEqual({
			type: 'paragraph',
			content: [
				{ kind: 'text', text: 'Hello ', style: {} },
				{ kind: 'text', text: 'bold ', style: { bold: true } },
				{ kind: 'text', text: 'both', style: { bold: true, italic: true } },
				{ kind: 'text', text: ' and ', style: {} },
				{ kind: 'text', text: 'a link', style: { href: 'https://example.com' } }
			]
		});
	});

	it('keeps only web and mail links', () => {
		const [paragraph] = htmlToBlocks('<p><a href="javascript:alert(1)">x</a><a href="mailto:a@b.c">y</a></p>');
		expect(paragraph.type === 'paragraph' && paragraph.content).toEqual([
			{ kind: 'text', text: 'x', style: {} },
			{ kind: 'text', text: 'y', style: { href: 'mailto:a@b.c' } }
		]);
	});

	it('reads the editor’s lists, nested ones inside their item', () => {
		const blocks = htmlToBlocks('<ul><li><p>One</p></li><li><p>Two</p><ol><li><p>Two a</p></li></ol></li></ul>');
		expect(blocks).toHaveLength(1);
		const list = blocks[0] as Extract<Block, { type: 'list' }>;
		expect(list.marker).toBe('bullet');
		expect(list.items).toHaveLength(2);
		expect(list.items[1].map((block) => block.type)).toEqual(['paragraph', 'list']);
		expect((list.items[1][1] as Extract<Block, { type: 'list' }>).marker).toBe('number');
	});

	it('collapses whitespace as a browser would, but keeps breaks and preformatted text', () => {
		const blocks = htmlToBlocks('<p>  one\n   two <br> three  </p><pre><code>  indented\n\tline</code></pre>');
		expect(texts((blocks[0] as Extract<Block, { type: 'paragraph' }>).content)).toBe('one two\nthree');
		expect(blocks[1]).toEqual({ type: 'code', text: '  indented\n\tline' });
	});

	it('maps headings, quotes, rules and pictures', () => {
		const blocks = htmlToBlocks('<h1>A</h1><h3>B</h3><h4>C</h4><blockquote><p>Q</p></blockquote><hr><img src="https://x/y.png" alt="Chart">');
		expect(blocks.map((block) => (block.type === 'heading' ? `h${block.level}` : block.type))).toEqual([
			'h2',
			'h3',
			'h4',
			'quote',
			'rule',
			'image'
		]);
		expect(blocks[5]).toEqual({ type: 'image', alt: 'Chart' });
	});

	it('prints a YouTube link on its own line as a video, other links as text', () => {
		const blocks = htmlToBlocks(
			'<p><a href="https://youtu.be/dQw4w9WgXcQ?t=30">https://youtu.be/dQw4w9WgXcQ?t=30</a></p><p><a href="https://youtu.be/dQw4w9WgXcQ">The demo</a></p>'
		);
		expect(blocks[0]).toEqual({ type: 'video', href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30' });
		expect(blocks[1].type).toBe('paragraph');
	});

	it('decodes entities and drops empty paragraphs', () => {
		const blocks = htmlToBlocks('<p></p><p>Tom &amp; Jerry &lt;3 &#8212; &#x1F600;</p><p> </p>');
		expect(blocks).toHaveLength(1);
		expect(texts((blocks[0] as Extract<Block, { type: 'paragraph' }>).content)).toBe('Tom & Jerry <3 — 😀');
	});

	it('reads loose text and unknown tags for their text', () => {
		expect(htmlToBlocks('Just text <span>inside</span>')).toEqual([
			{ type: 'paragraph', content: [{ kind: 'text', text: 'Just text ', style: {} }, { kind: 'text', text: 'inside', style: {} }] }
		]);
		expect(htmlToBlocks(null)).toEqual([]);
	});
});

describe('textToBlocks', () => {
	it('splits paragraphs on blank lines and keeps single newlines as breaks', () => {
		const blocks = textToBlocks('First line\nsecond line\n\n\nNext paragraph');
		expect(blocks.map((block) => texts((block as Extract<Block, { type: 'paragraph' }>).content))).toEqual([
			'First line\nsecond line',
			'Next paragraph'
		]);
	});
});

describe('decodeEntities', () => {
	it('leaves unknown entities alone', () => {
		expect(decodeEntities('&bogus; &amp;')).toBe('&bogus; &');
	});
});
