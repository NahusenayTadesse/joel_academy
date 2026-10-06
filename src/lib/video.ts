import { parseYouTubeUrl } from '@nahu/admin-kit/youtube';

/**
 * Where a lesson's video lives, read from the link staff paste into the lesson form.
 *
 * YouTube is the easy, free option, but an unlisted YouTube link plays for anyone who has it.
 * Vimeo (domain-restricted embeds) and Bunny Stream (signed, expiring links) can keep paid
 * lessons playable only on this site, so moving a video there is just pasting its new link.
 */
export type LessonVideo =
	| { kind: 'youtube'; id: string; start: number }
	| { kind: 'vimeo'; id: string; hash: string | null }
	| { kind: 'bunny'; libraryId: string; videoId: string }
	| { kind: 'file'; url: string };

const VIMEO =
	/^(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]{6,}))?\/?(?:[?#].*)?$/i;
const BUNNY =
	/^(?:https?:\/\/)?(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f-]{36})\/?(?:[?#].*)?$/i;
const FILE = /^https:\/\/[^\s?#]+\.(?:mp4|webm|ogg|m4v|mov)(?:[?#]\S*)?$/i;

/** What the learning page's player receives: built on the server, so signing keys never leave it. */
export type PlayableVideo =
	| { kind: 'youtube'; id: string; start: number }
	| { kind: 'vimeo' | 'bunny'; src: string }
	| { kind: 'file'; src: string };

export function parseLessonVideo(input: string | null | undefined): LessonVideo | null {
	const value = input?.trim();
	if (!value) return null;

	const youtube = parseYouTubeUrl(value);
	if (youtube) return { kind: 'youtube', id: youtube.id, start: youtube.start };

	const vimeo = value.match(VIMEO);
	if (vimeo) {
		// Unlisted videos carry their privacy hash either as a path segment or as `?h=`.
		const queryHash = /[?&]h=([0-9a-f]+)/i.exec(value)?.[1];
		return { kind: 'vimeo', id: vimeo[1], hash: vimeo[2] ?? queryHash ?? null };
	}

	const bunny = value.match(BUNNY);
	if (bunny) return { kind: 'bunny', libraryId: bunny[1], videoId: bunny[2].toLowerCase() };

	if (FILE.test(value)) return { kind: 'file', url: value };
	return null;
}

export const LESSON_VIDEO_HINT =
	'Paste a YouTube, Vimeo or Bunny Stream link, or an https link to an .mp4/.webm file';
