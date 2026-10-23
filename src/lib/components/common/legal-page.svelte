<script lang="ts" module>
	export interface LegalSection {
		heading: string;
		body: string[];
	}
</script>

<script lang="ts">
	import { getLocale } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	let {
		title,
		updatedAt,
		intro,
		sections
	}: { title: string; updatedAt: string; intro: string; sections: LegalSection[] } = $props();

	// Legal text is not machine translated: on other languages it is shown in English, with a notice.
	const englishBody = getLocale() !== 'en';
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
		<p class="text-sm text-muted-foreground">{m.info_legal_last_updated({ date: updatedAt })}</p>
	</div>
	{#if englishBody}
		<p class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
			{m.info_legal_english_notice()}
		</p>
	{/if}
	<p class="text-sm text-muted-foreground" lang={englishBody ? 'en' : undefined}>{intro}</p>
	<div class="flex flex-col gap-6" lang={englishBody ? 'en' : undefined}>
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
