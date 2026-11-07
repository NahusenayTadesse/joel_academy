import { describe, expect, it } from 'vitest';
import { splitLessonBody } from './lesson-body';

const kinds = (html: string) => splitLessonBody(html).map((part) => (part.kind === 'youtube' ? `yt:${part.video.id}` : 'html'));

describe('splitLessonBody', () => {
	it('turns a pasted YouTube link on its own line into a player, keeping the text around it', () => {
		const parts = splitLessonBody(
			'<p>Watch first:</p><p><a href="https://youtu.be/dQw4w9WgXcQ?t=90" target="_blank" rel="noopener noreferrer">https://youtu.be/dQw4w9WgXcQ?t=90</a></p><p>Then read on.</p>'
		);
		expect(parts).toEqual([
			{ kind: 'html', html: '<p>Watch first:</p>' },
			{ kind: 'youtube', video: { id: 'dQw4w9WgXcQ', start: 90, isShort: false } },
			{ kind: 'html', html: '<p>Then read on.</p>' }
		]);
	});

	it('reads a bare link, escaped ampersands and Shorts', () => {
		expect(kinds('<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ&amp;t=1m</p>')).toEqual(['yt:dQw4w9WgXcQ']);
		const [short] = splitLessonBody('<p> youtube.com/shorts/abcdefghijk <br></p>');
		expect(short).toEqual({ kind: 'youtube', video: { id: 'abcdefghijk', start: 0, isShort: true } });
	});

	it('leaves worded links, links in a sentence and other sites alone', () => {
		for (const html of [
			'<p><a href="https://youtu.be/dQw4w9WgXcQ">Watch the demo</a></p>',
			'<p>See https://youtu.be/dQw4w9WgXcQ for more</p>',
			'<p>https://vimeo.com/123456</p>',
			'<p>https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ</p>'
		]) {
			expect(kinds(html)).toEqual(['html']);
		}
	});

	it('never splits inside a list or a quote', () => {
		const html = '<ul><li><p>https://youtu.be/dQw4w9WgXcQ</p></li></ul><blockquote><p>https://youtu.be/dQw4w9WgXcQ</p></blockquote>';
		expect(splitLessonBody(html)).toEqual([{ kind: 'html', html }]);
	});

	it('needs the link text and the link to agree', () => {
		expect(kinds('<p><a href="https://evil.test/">https://youtu.be/dQw4w9WgXcQ</a></p>')).toEqual(['html']);
	});

	it('gives nothing for an empty body', () => {
		expect(splitLessonBody('')).toEqual([]);
	});
});
