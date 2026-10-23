<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import HelpCenterContent from '$lib/components/info/help-center-content.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
</script>

<svelte:head>
	<title>{m.info_help_meta_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_help_meta_description()} />
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
	<PageHeader title={m.info_help_title()} description={m.info_help_description()} />

	<HelpCenterContent />

	<div
		class="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-6 py-10 text-center"
	>
		<h2 class="text-lg font-semibold text-foreground">{m.info_help_still_title()}</h2>
		<p class="max-w-md text-sm text-muted-foreground">
			{m.info_help_still_body()}
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href={ROUTES.faq}
				class="flex items-center gap-1 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
			>
				{m.info_help_view_faq()}
				<ArrowRight class="size-3.5" />
			</a>
			<a
				href={ROUTES.contact}
				class="flex items-center gap-1 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
			>
				{m.info_help_contact()}
				<ArrowRight class="size-3.5" />
			</a>
		</div>
	</div>
</div>
