import { describe, expect, it } from 'vitest';
import { parseLessonVideo } from './video';

describe('parseLessonVideo', () => {
	it('reads YouTube links in their usual shapes', () => {
		expect(parseLessonVideo('https://youtu.be/xTz_mlIin5c')).toEqual({ kind: 'youtube', id: 'xTz_mlIin5c', start: 0 });
		expect(parseLessonVideo('https://www.youtube.com/watch?v=xTz_mlIin5c&t=90')).toMatchObject({
			kind: 'youtube',
			start: 90
		});
	});

	it('reads public and unlisted Vimeo links', () => {
		expect(parseLessonVideo('https://vimeo.com/76979871')).toEqual({ kind: 'vimeo', id: '76979871', hash: null });
		expect(parseLessonVideo('https://vimeo.com/76979871/8272103f6e')).toEqual({
			kind: 'vimeo',
			id: '76979871',
			hash: '8272103f6e'
		});
		expect(parseLessonVideo('https://player.vimeo.com/video/76979871?h=8272103f6e&badge=0')).toEqual({
			kind: 'vimeo',
			id: '76979871',
			hash: '8272103f6e'
		});
	});

	it('reads Bunny Stream embed and play links', () => {
		const video = { kind: 'bunny', libraryId: '12345', videoId: '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0' };
		expect(parseLessonVideo('https://iframe.mediadelivery.net/embed/12345/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0')).toEqual(video);
		expect(
			parseLessonVideo('https://iframe.mediadelivery.net/play/12345/0B1C2D3E-4F50-6172-8394-A5B6C7D8E9F0?autoplay=false')
		).toEqual(video);
	});

	it('accepts direct https video files only', () => {
		expect(parseLessonVideo('https://cdn.example.com/lessons/intro.mp4')).toEqual({
			kind: 'file',
			url: 'https://cdn.example.com/lessons/intro.mp4'
		});
		expect(parseLessonVideo('http://cdn.example.com/intro.mp4')).toBeNull();
		expect(parseLessonVideo('javascript:alert(1)//.mp4')).toBeNull();
		expect(parseLessonVideo('https://example.com/page')).toBeNull();
		expect(parseLessonVideo('')).toBeNull();
	});
});
