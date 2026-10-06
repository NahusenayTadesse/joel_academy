/** A jump this far past the furthest point watched counts as skipping, not normal playback. */
const SKIP_TOLERANCE_SECONDS = 3;
/** Watching this much of a video counts as watching it (closing credits need not play out). */
const WATCHED_FRACTION = 0.95;

/**
 * Whether a lesson video has been watched, for the "Complete & Next" button, and how far it may be
 * scrubbed: until it is watched, only back to what has already played. Once a lesson is complete
 * (`free`), seeking is unrestricted, so a rewatch can jump straight to the part that is needed.
 *
 * It is a nudge in the browser, not proof: the server cannot see a video play.
 */
export class WatchProgress {
	maxWatched = $state(0);
	duration = $state(0);
	watched = $state(false);

	constructor(
		private readonly free: boolean,
		private readonly onWatched: () => void
	) {
		if (free) this.watched = true;
	}

	/** The furthest point the viewer may seek to right now. */
	get seekLimit() {
		return this.free || this.watched ? Infinity : this.maxWatched;
	}

	/**
	 * Called with the current position as the video plays. Returns where to send the playhead back
	 * to when the viewer skipped ahead, or `null` when the position is fine.
	 */
	observe(seconds: number, duration?: number): number | null {
		if (duration && duration > 0) this.duration = duration;
		if (!this.free && !this.watched && seconds > this.maxWatched + SKIP_TOLERANCE_SECONDS) {
			return this.maxWatched;
		}
		this.maxWatched = Math.max(this.maxWatched, seconds);
		if (this.duration > 0 && this.maxWatched >= this.duration * WATCHED_FRACTION) this.markWatched();
		return null;
	}

	/** The video reached its end, or the player could not report progress at all. */
	markWatched() {
		if (this.watched) return;
		this.watched = true;
		this.onWatched();
	}
}

const scripts = new Map<string, Promise<void>>();

/** Loads a third-party player API script once per page, failing after `timeoutMs`. */
export function loadScript(src: string, timeoutMs = 15_000): Promise<void> {
	let pending = scripts.get(src);
	if (!pending) {
		pending = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			const timer = setTimeout(() => reject(new Error(`Timed out loading ${src}`)), timeoutMs);
			script.src = src;
			script.async = true;
			script.onload = () => {
				clearTimeout(timer);
				resolve();
			};
			script.onerror = () => {
				clearTimeout(timer);
				reject(new Error(`Could not load ${src}`));
			};
			document.head.append(script);
		}).catch((error) => {
			// Let a later lesson try again instead of remembering the failure.
			scripts.delete(src);
			throw error;
		});
		scripts.set(src, pending);
	}
	return pending;
}

export function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const whole = Math.floor(seconds);
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	const rest = String(whole % 60).padStart(2, '0');
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
