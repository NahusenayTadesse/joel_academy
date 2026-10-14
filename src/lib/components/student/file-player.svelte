<script lang="ts">
	import { onMount } from 'svelte';
	import { PositionReporter, resumeStart, WatchProgress } from './watch-progress.svelte';

	let {
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

	// svelte-ignore state_referenced_locally
	const progress = new WatchProgress(completed, () => onWatched(), resumeAt);
	// svelte-ignore state_referenced_locally
	const reporter = new PositionReporter(positionUrl, lessonId);

	onMount(() => reporter.attach());

	function check(event: Event & { currentTarget: HTMLVideoElement }) {
		const video = event.currentTarget;
		const back = progress.observe(video.currentTime, video.duration);
		if (back !== null) video.currentTime = back;
		else if (!video.paused) reporter.report(video.currentTime);
	}

	function resume(event: Event & { currentTarget: HTMLVideoElement }) {
		const from = resumeStart(startAt, event.currentTarget.duration);
		if (from <= 0) return;
		event.currentTarget.currentTime = from;
		onResumed?.(from);
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
		onloadedmetadata={resume}
		ontimeupdate={check}
		onseeking={check}
		onpause={(event) => {
			reporter.report(event.currentTarget.currentTime);
			reporter.flush();
		}}
		onended={() => {
			progress.markWatched();
			reporter.flush();
		}}
	></video>
</div>
