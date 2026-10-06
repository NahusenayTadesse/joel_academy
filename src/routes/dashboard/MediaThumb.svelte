<script lang="ts">
	/**
	 * A course thumbnail or instructor photo in a table cell. Through `mediaUrl`, not the kit's file
	 * cell, because seeded rows hold '/images/…' paths the kit's /dashboard/files route cannot serve.
	 */
	let {
		url,
		alt = '',
		round = false
	}: { url: string | null; alt?: string; round?: boolean } = $props();
</script>

{#if url}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a stored image, not a page -->
	<a
		href={url}
		target="_blank"
		rel="noopener"
		class="inline-flex items-center justify-center overflow-hidden border bg-muted hover:ring-2 hover:ring-ring/50 {round
			? 'size-10 rounded-full'
			: 'h-12 w-20 rounded-md'}"
	>
		<img src={url} {alt} loading="lazy" class="h-full w-full object-cover" />
	</a>
{:else}
	<span class="text-xs text-muted-foreground">None</span>
{/if}
