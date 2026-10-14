<script lang="ts" module>
	/** The slice of Vimeo's player.js and Bunny's player.js (the playerjs spec) used here. */
	interface HostedPlayer {
		on(event: string, handler: (data: { seconds: number; duration: number }) => void): void;
		setCurrentTime(seconds: number): unknown;
		/** Vimeo answers with a promise; playerjs (Bunny) through the callback. */
		getDuration(callback?: (seconds: number) => void): unknown;
	}

	/** The video's length in seconds from either API, or 0 when it does not say in time. */
	function durationOf(player: HostedPlayer): Promise<number> {
		return new Promise((resolve) => {
			const timer = setTimeout(() => resolve(0), 5_000);
			const done = (seconds: unknown) => {
				clearTimeout(timer);
				resolve(Number(seconds) || 0);
			};
			const answer = player.getDuration(done) as PromiseLike<number> | undefined;
			// Any thenable: Vimeo's promise need not be this window's `Promise`.
			if (typeof answer?.then === 'function') answer.then(done, () => done(0));
		});
	}

	declare global {
		interface Window {
			Vimeo?: { Player: new (iframe: HTMLIFrameElement) => HostedPlayer };
			playerjs?: { Player: new (iframe: HTMLIFrameElement) => HostedPlayer & { on(event: 'ready', handler: () => void): void } };
		}
	}

	const SCRIPTS = {
		vimeo: 'https://player.vimeo.com/api/player.js',
		bunny: 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js'
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { loadScript, PositionReporter, resumeStart, WatchProgress } from './watch-progress.svelte';

	let {
		kind,
		src,
		title,
		completed,
		onWatched,
		lessonId,
		resumeAt = 0,
		startAt = 0,
		positionUrl = null,
		onResumed
	}: {
		kind: 'vimeo' | 'bunny';
		src: string;
		title: string;
		completed: boolean;
		onWatched: () => void;
		lessonId: number;
		/** Where the student left off: counted as watched. */
		resumeAt?: number;
		/** Where to start this time (the resume point, or 0 after "Start over"). */
		startAt?: number;
		positionUrl?: string | null;
		onResumed?: (seconds: number) => void;
	} = $props();

	/*
	 * Vimeo and Bunny keep their own players: the protection there is the host's (Vimeo's domain
	 * restriction, Bunny's signed links), not hidden controls. Their player APIs report progress,
	 * which drives the same watch-to-complete rule as YouTube.
	 */

	// svelte-ignore state_referenced_locally
	const progress = new WatchProgress(completed, () => onWatched(), resumeAt);
	// svelte-ignore state_referenced_locally
	const reporter = new PositionReporter(positionUrl, lessonId);

	onMount(() => reporter.attach());

	function track(iframe: HTMLIFrameElement) {
		let cancelled = false;
		loadScript(SCRIPTS[kind])
			.then(() => {
				if (cancelled) return;
				const player =
					kind === 'vimeo' ? new window.Vimeo!.Player(iframe) : new window.playerjs!.Player(iframe);
				const attach = () => {
					player.on('timeupdate', ({ seconds, duration }) => {
						const back = progress.observe(seconds, duration);
						if (back !== null) player.setCurrentTime(back);
						else reporter.report(seconds);
					});
					player.on('pause', () => reporter.flush());
					player.on('ended', () => {
						progress.markWatched();
						reporter.flush();
					});
					if (startAt > 0) {
						void durationOf(player).then((length) => {
							const from = resumeStart(startAt, length);
							if (cancelled || from <= 0) return;
							Promise.resolve(player.setCurrentTime(from)).catch(() => {});
							onResumed?.(from);
						});
					}
				};
				// playerjs only accepts listeners once the frame says it is ready; Vimeo queues them.
				if (kind === 'bunny') (player as { on(event: 'ready', handler: () => void): void }).on('ready', attach);
				else attach();
			})
			// Without the API there is no way to know the video was watched; never trap the student.
			.catch(() => !cancelled && progress.markWatched());
		return {
			destroy() {
				cancelled = true;
			}
		};
	}
</script>

<div class="relative aspect-video w-full overflow-hidden rounded-xl border border-sidebar-border bg-black shadow-2xl">
	<iframe
		use:track
		{src}
		{title}
		class="absolute inset-0 size-full"
		allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
		allowfullscreen
		referrerpolicy="strict-origin-when-cross-origin"
	></iframe>
</div>
