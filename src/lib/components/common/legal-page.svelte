<script lang="ts" module>
	export interface LegalSection {
		heading: string;
		body: string[];
	}
</script>

<script lang="ts">
	let {
		title,
		updatedAt,
		intro,
		sections
	}: { title: string; updatedAt: string; intro: string; sections: LegalSection[] } = $props();
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
		<p class="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
	</div>
	<p class="text-sm text-muted-foreground">{intro}</p>
	<div class="flex flex-col gap-6">
		{#each sections as section (section.heading)}
			<div class="flex flex-col gap-2">
				<h2 class="text-lg font-semibold text-foreground">{section.heading}</h2>
				{#each section.body as paragraph, index (index)}
					<p class="text-sm leading-relaxed text-muted-foreground">{paragraph}</p>
				{/each}
			</div>
		{/each}
	</div>
</div>
