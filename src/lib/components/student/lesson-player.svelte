<script lang="ts">
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { m } from '$lib/paraglide/messages';
	import type { PlayableVideo } from '$lib/video';
	import FilePlayer from './file-player.svelte';
	import HostedPlayer from './hosted-player.svelte';
	import YoutubePlayer from './youtube-player.svelte';
	import { formatClock } from './watch-progress.svelte';

	let {
		video,
		title,
		completed,
		onWatched,
		lessonId,
		resumeAt = 0,
		positionUrl = null
	}: {
		video: PlayableVideo;
		title: string;
		/** The lesson is already complete, so it can be scrubbed freely. */
		completed: boolean;
		/** The video has been watched (or cannot report progress); completion may go ahead. */
		onWatched: () => void;
		lessonId: number;
		/** The saved position, in seconds: the video starts there, and what came before counts as watched. */
		resumeAt?: number;
		/** Where the player saves its position, or `null` when positions are not kept. */
		positionUrl?: string | null;
	} = $props();

	/*
	 * "Start over" rebuilds the player from the beginning. What was watched before still counts:
	 * the restriction on skipping ahead is about what has played, not about this sitting.
	 */
	// svelte-ignore state_referenced_locally
	let startAt = $state(resumeAt);
	let resumedAt = $state(0);
	let round = $state(0);

	function startOver() {
		startAt = 0;
		resumedAt = 0;
		round += 1;
	}

	const shared = $derived({
		title,
		completed,
		onWatched,
		lessonId,
		resumeAt,
		startAt,
		positionUrl,
		onResumed: (seconds: number) => (resumedAt = seconds)
	});
</script>

<div class="space-y-2">
	<div class="flex items-center gap-2 px-0.5 text-xs text-sidebar-foreground/70">
		<span class="inline-block size-2 animate-pulse rounded-full bg-sidebar-primary"></span>
		<span class="font-medium text-white/80">{m.learn_video_lesson()}</span>
		{#if resumedAt > 0}
			<span class="ml-auto flex items-center gap-1.5" role="status">
				<span>{m.learn_resumed_at()} <span class="tabular-nums">{formatClock(resumedAt)}</span></span>
				<span aria-hidden="true">·</span>
				<button
					type="button"
					onclick={startOver}
					class="inline-flex items-center gap-1 font-medium text-sidebar-primary hover:underline"
				>
					<RotateCcw class="size-3" aria-hidden="true" />
					{m.learn_start_over()}
				</button>
			</span>
		{/if}
	</div>
	{#key round}
		{#if video.kind === 'youtube'}
			<YoutubePlayer videoId={video.id} start={video.start} {...shared} />
		{:else if video.kind === 'file'}
			<FilePlayer src={video.src} {...shared} />
		{:else}
			<HostedPlayer kind={video.kind} src={video.src} {...shared} />
		{/if}
	{/key}
</div>
