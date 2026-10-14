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

	/**
	 * `resumedFrom` is where a returning student left off: what played before then counts as
	 * watched, so resuming there (or scrubbing back) is never mistaken for a skip.
	 */
	constructor(
		private readonly free: boolean,
		private readonly onWatched: () => void,
		resumedFrom = 0
	) {
		if (free) this.watched = true;
		this.maxWatched = Math.max(0, resumedFrom);
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

/** Where to start a resumed video: the saved point, unless it is at (or past) the end. */
export function resumeStart(saved: number, duration: number): number {
	if (!(saved > 0)) return 0;
	return duration > 0 && saved >= duration - END_MARGIN_SECONDS ? 0 : saved;
}

/** A saved position this close to the end starts the video over rather than at its last frame. */
const END_MARGIN_SECONDS = 5;
/** How often the position is saved while a video plays. */
const SAVE_EVERY_MS = 15_000;

/**
 * Sends a lesson video's position to the server: every 15 s while it plays, and whenever it
 * pauses or the page is hidden or left — the last one by `sendBeacon`, which outlives the page.
 * Players call `report` with the position as it plays and `flush` when it stops.
 */
export class PositionReporter {
	private last = -1;
	// The first timed save waits a full interval: a player's first reports can come before it has
	// moved to the resume point, and must not overwrite it with 0.
	private sentAt = Date.now();
	private current = -1;

	constructor(
		private readonly url: string | null,
		private readonly lessonId: number
	) {}

	/** The position now; sent when the last save is old enough. */
	report(seconds: number) {
		if (!Number.isFinite(seconds) || seconds < 0) return;
		this.current = seconds;
		if (Date.now() - this.sentAt >= SAVE_EVERY_MS) this.flush();
	}

	/** Sends the latest position now, unless it is the one already sent. */
	flush() {
		if (!this.url || this.current < 0) return;
		const seconds = Math.floor(this.current);
		this.sentAt = Date.now();
		if (seconds === this.last) return;
		this.last = seconds;
		const body = new URLSearchParams({ lessonId: String(this.lessonId), seconds: String(seconds) });
		try {
			if (navigator.sendBeacon?.(this.url, body)) return;
		} catch {
			// Falls through to fetch.
		}
		void fetch(this.url, { method: 'POST', body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
	}

	/**
	 * Saves on the way out: tab hidden, page left. Returns the cleanup, which saves once more (the
	 * player is going away — another lesson, or another page in the app).
	 */
	attach(): () => void {
		const onHidden = () => {
			if (document.visibilityState === 'hidden') this.flush();
		};
		const onLeave = () => this.flush();
		document.addEventListener('visibilitychange', onHidden);
		window.addEventListener('pagehide', onLeave);
		return () => {
			document.removeEventListener('visibilitychange', onHidden);
			window.removeEventListener('pagehide', onLeave);
			this.flush();
		};
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
