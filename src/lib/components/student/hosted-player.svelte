<script lang="ts" module>
	/** The slice of Vimeo's player.js and Bunny's player.js (the playerjs spec) used here. */
	interface HostedPlayer {
		on(event: string, handler: (data: { seconds: number; duration: number }) => void): void;
		setCurrentTime(seconds: number): unknown;
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
	import { loadScript, WatchProgress } from './watch-progress.svelte';

	let {
		kind,
		src,
		title,
		completed,
		onWatched
	}: {
		kind: 'vimeo' | 'bunny';
		src: string;
		title: string;
		completed: boolean;
		onWatched: () => void;
	} = $props();

	/*
	 * Vimeo and Bunny keep their own players: the protection there is the host's (Vimeo's domain
	 * restriction, Bunny's signed links), not hidden controls. Their player APIs report progress,
	 * which drives the same watch-to-complete rule as YouTube.
	 */

	// svelte-ignore state_referenced_locally
	const progress = new WatchProgress(completed, () => onWatched());

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
					});
					player.on('ended', () => progress.markWatched());
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
