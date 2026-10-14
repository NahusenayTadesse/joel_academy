<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import HelpCenterContent from '$lib/components/info/help-center-content.svelte';
	import { ROUTES, siteConfig } from '$lib/site';
</script>

<svelte:head>
	<title>Help Center · {siteConfig.name}</title>
	<meta
		name="description"
		content="Guides and answers to help you get the most out of the platform."
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
	<PageHeader title="Help center" description="Search our guides, or browse by topic below." />

	<HelpCenterContent />

	<div
		class="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-6 py-10 text-center"
	>
		<h2 class="text-lg font-semibold text-foreground">Still need help?</h2>
		<p class="max-w-md text-sm text-muted-foreground">
			Check our full FAQ list or reach out to our team directly.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href={ROUTES.faq}
				class="flex items-center gap-1 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
			>
				View FAQ
				<ArrowRight class="size-3.5" />
			</a>
			<a
				href={ROUTES.contact}
				class="flex items-center gap-1 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
			>
				Contact us
				<ArrowRight class="size-3.5" />
			</a>
		</div>
	</div>
</div>
