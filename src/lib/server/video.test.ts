import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { BUNNY_STREAM_TOKEN_KEY: 'library-secret' } }));
const { bunnyToken, playableVideo } = await import('./video');

describe('playableVideo', () => {
	it('signs Bunny links with an expiring token', () => {
		const now = Date.UTC(2026, 9, 5, 12);
		const expires = now / 1000 + 6 * 60 * 60;
		const id = '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0';
		const video = playableVideo(`https://iframe.mediadelivery.net/play/12345/${id}`, now);
		expect(video?.kind).toBe('bunny');
		const src = new URL((video as { src: string }).src);
		expect(src.pathname).toBe(`/embed/12345/${id}`);
		expect(src.searchParams.get('expires')).toBe(String(expires));
		expect(src.searchParams.get('token')).toBe(
			createHash('sha256').update(`library-secret${id}${expires}`).digest('hex')
		);
		expect(bunnyToken('library-secret', id, expires)).toBe(src.searchParams.get('token'));
	});

	it('hides the title and byline on Vimeo and keeps the privacy hash', () => {
		const video = playableVideo('https://vimeo.com/76979871/8272103f6e');
		const src = new URL((video as { src: string }).src);
		expect(src.origin + src.pathname).toBe('https://player.vimeo.com/video/76979871');
		expect(src.searchParams.get('h')).toBe('8272103f6e');
		expect(src.searchParams.get('title')).toBe('0');
	});

	it('passes YouTube through as an id and refuses unknown links', () => {
		expect(playableVideo('https://youtu.be/xTz_mlIin5c')).toEqual({ kind: 'youtube', id: 'xTz_mlIin5c', start: 0 });
		expect(playableVideo('https://example.com/watch')).toBeNull();
	});
});
