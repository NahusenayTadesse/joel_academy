<script lang="ts">
	import { WatchProgress } from './watch-progress.svelte';

	let {
		src,
		title,
		completed,
		onWatched
	}: { src: string; title: string; completed: boolean; onWatched: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const progress = new WatchProgress(completed, () => onWatched());

	function check(event: Event & { currentTarget: HTMLVideoElement }) {
		const video = event.currentTarget;
		const back = progress.observe(video.currentTime, video.duration);
		if (back !== null) video.currentTime = back;
	}
</script>

<div class="relative aspect-video w-full overflow-hidden rounded-xl border border-sidebar-border bg-black shadow-2xl">
	<!-- Lesson videos carry no caption tracks yet. -->
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		{src}
		{title}
		controls
		controlslist="nodownload"
		disablepictureinpicture
		preload="metadata"
		playsinline
		class="size-full"
		oncontextmenu={(event) => event.preventDefault()}
		ontimeupdate={check}
		onseeking={check}
		onended={() => progress.markWatched()}
	></video>
</div>
