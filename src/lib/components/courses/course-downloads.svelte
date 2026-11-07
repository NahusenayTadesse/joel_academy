<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import FileDown from '@lucide/svelte/icons/file-down';
	import { DOWNLOADS, type HandoutStyle } from '$lib/downloads';
	import { m } from '$lib/paraglide/messages';

	/** The course's branded PDFs a visitor may take away: its outline, and the handouts open to them. */
	let {
		slug,
		handouts
	}: {
		slug: string;
		handouts: { id: number; title: string; style: HandoutStyle; href: string }[];
	} = $props();

	const STYLE_NAMES = {
		DOCUMENT: m.learn_pdf_style_document,
		CHECKLIST: m.learn_pdf_style_checklist,
		WORKSHEET: m.learn_pdf_style_worksheet
	};

	const items = $derived([
		{ key: 'outline', title: m.learn_pdf_course_outline(), detail: m.catalog_downloads_outline_desc(), href: DOWNLOADS.outline(slug) },
		...handouts.map((handout) => ({
			key: `handout-${handout.id}`,
			title: handout.title,
			detail: STYLE_NAMES[handout.style](),
			href: handout.href
		}))
	]);
</script>

<div>
	<h2 class="mb-3 text-lg font-semibold text-foreground">{m.catalog_downloads_title()}</h2>
	<div class="grid gap-3 sm:grid-cols-2">
		{#each items as item (item.key)}
			<!-- Drawn by the server on request: a download, never a SvelteKit page. -->
			<a
				href={item.href}
				download
				data-sveltekit-reload
				class="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/60 hover:bg-accent/40"
				aria-label={m.learn_pdf_download({ title: item.title })}
			>
				<span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
					<FileDown class="size-5" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-foreground">{item.title}</span>
					<span class="block truncate text-xs text-muted-foreground">{item.detail} · PDF</span>
				</span>
				<Download class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
			</a>
		{/each}
	</div>
</div>
