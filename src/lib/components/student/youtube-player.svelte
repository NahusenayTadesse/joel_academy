<script lang="ts" module>
	interface YTPlayer {
		playVideo(): void;
		pauseVideo(): void;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		getCurrentTime(): number;
		getDuration(): number;
		mute(): void;
		unMute(): void;
		isMuted(): boolean;
		setVolume(volume: number): void;
		getVolume(): number;
		setPlaybackRate(rate: number): void;
		destroy(): void;
	}

	interface YTNamespace {
		Player: new (
			element: HTMLElement,
			options: {
				host?: string;
				videoId: string;
				playerVars?: Record<string, string | number>;
				events?: {
					onReady?: (event: { target: YTPlayer }) => void;
					onStateChange?: (event: { data: number; target: YTPlayer }) => void;
					onError?: (event: { data: number }) => void;
				};
			}
		) => YTPlayer;
		PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
	}

	declare global {
		interface Window {
			YT?: YTNamespace;
			onYouTubeIframeAPIReady?: () => void;
		}
	}

	let api: Promise<YTNamespace> | undefined;

	/** YouTube's IFrame API, loaded once per page; it announces itself through a global callback. */
	function loadYouTubeApi(): Promise<YTNamespace> {
		if (window.YT?.Player) return Promise.resolve(window.YT);
		api ??= new Promise<YTNamespace>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('YouTube did not load')), 15_000);
			const previous = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				previous?.();
				clearTimeout(timer);
				if (window.YT) resolve(window.YT);
			};
			const script = document.createElement('script');
			script.src = 'https://www.youtube.com/iframe_api';
			script.async = true;
			script.onerror = () => {
				clearTimeout(timer);
				reject(new Error('YouTube did not load'));
			};
			document.head.append(script);
		}).catch((error) => {
			api = undefined;
			throw error;
		});
		return api;
	}

	const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
</script>

<script lang="ts">
	import Maximize from '@lucide/svelte/icons/maximize';
	import Minimize from '@lucide/svelte/icons/minimize';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import VolumeX from '@lucide/svelte/icons/volume-x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { onMount } from 'svelte';
	import { formatClock, WatchProgress } from './watch-progress.svelte';

	let {
		videoId,
		start = 0,
		title,
		completed,
		onWatched
	}: {
		videoId: string;
		start?: number;
		title: string;
		/** The lesson is already complete: seeking is unrestricted. */
		completed: boolean;
		onWatched: () => void;
	} = $props();

	/*
	 * YouTube's own controls, keyboard shortcuts and fullscreen button are switched off: they are
	 * where "Copy link" and "Watch on YouTube" live. These controls drive the player through the
	 * IFrame API instead. Whenever nothing is playing (before the first play, while paused, after the
	 * end) the academy's own cover sits over the frame, because that is when YouTube draws its title
	 * and channel links, share button and suggested videos. During playback the frame is uncovered.
	 *
	 * This makes the link harder to stumble on, not secret: the video id is still in the page.
	 */

	// svelte-ignore state_referenced_locally
	const progress = new WatchProgress(completed, () => onWatched());

	let shell = $state<HTMLDivElement>();
	let player: YTPlayer | undefined;

	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let started = $state(false);
	let playing = $state(false);
	let paused = $state(false);
	let ended = $state(false);
	let current = $state(0);
	let muted = $state(false);
	let volume = $state(100);
	let speed = $state(1);
	let fullscreen = $state(false);
	let controlsVisible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let attempt = $state(0);

	const duration = $derived(progress.duration);
	const playedPercent = $derived(duration > 0 ? (current / duration) * 100 : 0);
	const reachablePercent = $derived(
		duration > 0 ? Math.min(100, (Math.min(progress.seekLimit, duration) / duration) * 100) : 0
	);

	function tick() {
		if (!player) return;
		const position = player.getCurrentTime();
		const back = progress.observe(position, player.getDuration());
		if (back !== null) {
			player.seekTo(back, true);
			current = back;
		} else {
			current = position;
		}
	}

	/** Builds the YouTube player inside `node`; rebuilt from scratch when "Try again" remounts it. */
	function youtube(node: HTMLDivElement) {
		let cancelled = false;
		let poll: ReturnType<typeof setInterval> | undefined;
		const target = document.createElement('div');
		node.append(target);

		loadYouTubeApi()
			.then((YT) => {
				if (cancelled) return;
				player = new YT.Player(target, {
					host: 'https://www.youtube-nocookie.com',
					videoId,
					playerVars: {
						controls: 0,
						disablekb: 1,
						fs: 0,
						rel: 0,
						iv_load_policy: 3,
						modestbranding: 1,
						playsinline: 1,
						enablejsapi: 1,
						origin: window.location.origin,
						start
					},
					events: {
						onReady: ({ target: ready }) => {
							if (cancelled) return;
							progress.observe(start, ready.getDuration());
							current = start;
							muted = ready.isMuted();
							volume = ready.getVolume();
							status = 'ready';
						},
						onStateChange: ({ data }) => {
							playing = data === YT.PlayerState.PLAYING;
							paused = data === YT.PlayerState.PAUSED;
							if (playing) {
								started = true;
								ended = false;
								poll ??= setInterval(tick, 250);
							} else {
								clearInterval(poll);
								poll = undefined;
								tick();
							}
							if (data === YT.PlayerState.ENDED) {
								ended = true;
								progress.markWatched();
							}
							showControls();
						},
						onError: () => {
							if (!cancelled) status = 'error';
						}
					}
				});
			})
			.catch(() => {
				if (!cancelled) status = 'error';
			});

		return {
			destroy() {
				cancelled = true;
				clearInterval(poll);
				player?.destroy();
				player = undefined;
				target.remove();
			}
		};
	}

	onMount(() => {
		const onFullscreenChange = () => (fullscreen = document.fullscreenElement === shell);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => {
			clearTimeout(hideTimer);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
		};
	});

	function togglePlay() {
		if (!player || status !== 'ready') return;
		if (ended) seek(0);
		if (playing) player.pauseVideo();
		else player.playVideo();
	}

	function seek(seconds: number) {
		if (!player) return;
		const to = Math.max(0, Math.min(seconds, progress.seekLimit, duration || seconds));
		player.seekTo(to, true);
		current = to;
	}

	function toggleMute() {
		if (!player) return;
		if (muted) player.unMute();
		else player.mute();
		muted = !muted;
	}

	function setVolume(value: number) {
		if (!player) return;
		volume = value;
		player.setVolume(value);
		if (value > 0 && muted) {
			player.unMute();
			muted = false;
		}
	}

	function cycleSpeed() {
		speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
		player?.setPlaybackRate(speed);
	}

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await shell?.requestFullscreen().catch(() => {});
	}

	function showControls() {
		controlsVisible = true;
		clearTimeout(hideTimer);
		if (playing) hideTimer = setTimeout(() => (controlsVisible = false), 2500);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement) return;
		const actions: Record<string, () => void> = {
			' ': togglePlay,
			k: togglePlay,
			ArrowLeft: () => seek(current - 5),
			ArrowRight: () => seek(current + 5),
			m: toggleMute,
			f: toggleFullscreen
		};
		const action = actions[event.key];
		if (!action) return;
		event.preventDefault();
		action();
		showControls();
	}

	function retry() {
		// Remounting is simplest: the `{#key}` below rebuilds the player from scratch.
		status = 'loading';
		started = playing = paused = ended = false;
		attempt += 1;
	}
</script>

{#key attempt}
	<!-- Shortcuts bubble up from the player's own buttons; each one is also a real control. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={shell}
		class="group relative aspect-video w-full overflow-hidden rounded-xl border border-sidebar-border bg-black shadow-2xl"
		role="region"
		aria-label="Video player: {title}"
		tabindex="-1"
		onpointermove={showControls}
		onkeydown={onKeydown}
	>
		<div use:youtube class="size-full [&>iframe]:size-full"></div>

		{#if status === 'error'}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
				<span class="flex size-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
					<TriangleAlert class="size-6" />
				</span>
				<div class="space-y-1">
					<h3 class="text-base font-semibold tracking-tight text-white">The video could not load</h3>
					<p class="text-xs leading-relaxed text-slate-300">
						Your network may be blocking YouTube. You can try again, or continue with the lesson.
					</p>
				</div>
				<button
					type="button"
					onclick={retry}
					class="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
				>
					<RotateCcw class="size-3.5" /> Try again
				</button>
			</div>
		{:else if !started || ended}
			<!-- The academy's poster, over YouTube's title bar before play and its suggestions after. -->
			<button
				type="button"
				onclick={togglePlay}
				disabled={status !== 'ready'}
				aria-label={ended ? 'Replay video' : 'Play video'}
				class="absolute inset-0 flex items-center justify-center bg-black"
			>
				<img
					src="https://i.ytimg.com/vi/{videoId}/hqdefault.jpg"
					alt=""
					class="absolute inset-0 size-full object-cover opacity-60"
				/>
				<span class="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-black/30"></span>
				<span
					class="relative flex size-16 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-xl transition-transform hover:scale-105"
				>
					{#if status !== 'ready'}
						<LoaderCircle class="size-7 animate-spin" />
					{:else if ended}
						<RotateCcw class="size-7" />
					{:else}
						<Play class="ml-1 size-7 fill-current" />
					{/if}
				</span>
				{#if ended}
					<span class="absolute bottom-6 text-sm font-medium text-white/90">Watch again</span>
				{/if}
			</button>
		{:else if paused}
			<button
				type="button"
				onclick={togglePlay}
				aria-label="Resume video"
				class="absolute inset-0 flex items-center justify-center bg-black/95"
			>
				<span
					class="flex size-16 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-xl transition-transform hover:scale-105"
				>
					<Play class="ml-1 size-7 fill-current" />
				</span>
			</button>
		{/if}

		{#if status === 'ready' && started && !ended}
			<div
				class="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-black/90 via-black/60 to-transparent px-4 pt-10 pb-3 transition-opacity duration-300 {controlsVisible ||
				!playing
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
			>
				<div class="relative h-1.5 w-full">
					<div class="absolute inset-0 rounded-full bg-white/20"></div>
					<div class="absolute inset-y-0 left-0 rounded-full bg-white/30" style:width="{reachablePercent}%"></div>
					<div class="absolute inset-y-0 left-0 rounded-full bg-sidebar-primary" style:width="{playedPercent}%"></div>
					<input
						type="range"
						min="0"
						max={duration || 0}
						step="0.1"
						value={current}
						oninput={(event) => seek(Number(event.currentTarget.value))}
						aria-label="Seek"
						class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					/>
				</div>
				<div class="flex items-center gap-3 text-white">
					<button type="button" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} class="rounded p-1 hover:bg-white/10">
						{#if playing}<Pause class="size-5 fill-current" />{:else}<Play class="size-5 fill-current" />{/if}
					</button>
					<button type="button" onclick={() => seek(current - 10)} aria-label="Back 10 seconds" class="rounded p-1 hover:bg-white/10">
						<RotateCcw class="size-4" />
					</button>
					<span class="text-xs tabular-nums text-white/80">{formatClock(current)} / {formatClock(duration)}</span>
					<div class="ml-auto flex items-center gap-2">
						<button type="button" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} class="rounded p-1 hover:bg-white/10">
							{#if muted || volume === 0}<VolumeX class="size-5" />{:else}<Volume2 class="size-5" />{/if}
						</button>
						<input
							type="range"
							min="0"
							max="100"
							value={muted ? 0 : volume}
							oninput={(event) => setVolume(Number(event.currentTarget.value))}
							aria-label="Volume"
							class="hidden w-20 accent-sidebar-primary sm:block"
						/>
						<button
							type="button"
							onclick={cycleSpeed}
							aria-label="Playback speed"
							class="min-w-11 rounded px-1.5 py-1 text-xs font-semibold tabular-nums hover:bg-white/10"
						>
							{speed}×
						</button>
						<button
							type="button"
							onclick={toggleFullscreen}
							aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
							class="rounded p-1 hover:bg-white/10"
						>
							{#if fullscreen}<Minimize class="size-5" />{:else}<Maximize class="size-5" />{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/key}
