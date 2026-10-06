<script lang="ts">
	import type { PlayableVideo } from '$lib/video';
	import FilePlayer from './file-player.svelte';
	import HostedPlayer from './hosted-player.svelte';
	import YoutubePlayer from './youtube-player.svelte';

	let {
		video,
		title,
		completed,
		onWatched
	}: {
		video: PlayableVideo;
		title: string;
		/** The lesson is already complete, so it can be scrubbed freely. */
		completed: boolean;
		/** The video has been watched (or cannot report progress); completion may go ahead. */
		onWatched: () => void;
	} = $props();
</script>

<div class="space-y-2">
	<div class="flex items-center gap-2 px-0.5 text-xs text-sidebar-foreground/70">
		<span class="inline-block size-2 animate-pulse rounded-full bg-sidebar-primary"></span>
		<span class="font-medium text-white/80">Video Lesson</span>
	</div>
	{#if video.kind === 'youtube'}
		<YoutubePlayer videoId={video.id} start={video.start} {title} {completed} {onWatched} />
	{:else if video.kind === 'file'}
		<FilePlayer src={video.src} {title} {completed} {onWatched} />
	{:else}
		<HostedPlayer kind={video.kind} src={video.src} {title} {completed} {onWatched} />
	{/if}
</div>
