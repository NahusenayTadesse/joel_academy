<script lang="ts" module>
	export interface TimelineEntry {
		year: string;
		title: string;
		description: string;
	}
</script>

<script lang="ts">
	let { entries }: { entries: TimelineEntry[] } = $props();
</script>

<ol class="relative flex flex-col gap-8 border-l border-border pl-6 sm:pl-8">
	{#each entries as entry (entry.year)}
		<li class="relative">
			<span
				class="absolute top-1 -left-[calc(1.5rem+5px)] size-2.5 rounded-full bg-brand sm:-left-[calc(2rem+5px)]"
			></span>
			<p class="text-sm font-semibold text-brand-ink">{entry.year}</p>
			<h3 class="mt-1 text-base font-semibold text-foreground">{entry.title}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{entry.description}</p>
		</li>
	{/each}
</ol>
