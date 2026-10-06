import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { parseLessonVideo, type PlayableVideo } from '$lib/video';

/** How long a signed Bunny link plays for: long enough for a lesson and a pause, short enough to go stale once shared. */
const BUNNY_TOKEN_TTL_SECONDS = 6 * 60 * 60;

/**
 * Bunny Stream's embed token: SHA-256 (hex) of the library's token security key, the video id and
 * the expiry, in that order. With "Token authentication" switched on for the library, a link
 * without a valid, unexpired token is refused — so a link copied out of the page stops working.
 */
export function bunnyToken(securityKey: string, videoId: string, expires: number): string {
	return createHash('sha256').update(`${securityKey}${videoId}${expires}`).digest('hex');
}

export function playableVideo(url: string | null | undefined, now = Date.now()): PlayableVideo | null {
	const video = parseLessonVideo(url);
	if (!video) return null;

	switch (video.kind) {
		case 'youtube':
			return video;
		case 'vimeo': {
			// title/byline/portrait off: no clickable title or channel link over the video.
			const params = new URLSearchParams({ title: '0', byline: '0', portrait: '0', dnt: '1', pip: '0' });
			if (video.hash) params.set('h', video.hash);
			return { kind: 'vimeo', src: `https://player.vimeo.com/video/${video.id}?${params}` };
		}
		case 'bunny': {
			const params = new URLSearchParams({ autoplay: 'false', preload: 'true', responsive: 'true' });
			if (env.BUNNY_STREAM_TOKEN_KEY) {
				const expires = Math.floor(now / 1000) + BUNNY_TOKEN_TTL_SECONDS;
				params.set('token', bunnyToken(env.BUNNY_STREAM_TOKEN_KEY, video.videoId, expires));
				params.set('expires', String(expires));
			}
			return {
				kind: 'bunny',
				src: `https://iframe.mediadelivery.net/embed/${video.libraryId}/${video.videoId}?${params}`
			};
		}
		case 'file':
			return { kind: 'file', src: video.url };
	}
}
