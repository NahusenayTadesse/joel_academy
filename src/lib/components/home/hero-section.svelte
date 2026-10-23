<script lang="ts">
	import { goto } from '$app/navigation';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Award from '@lucide/svelte/icons/award';
	import Globe from '@lucide/svelte/icons/globe';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Button from '$lib/components/ui/button.svelte';
	import { DEFAULT_LANDING, type LandingHero } from '$lib/content/landing';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import BrandGlobe from './brand-globe.svelte';
	import { cmsHref } from './cms-link';

	let { hero = DEFAULT_LANDING.hero }: { hero?: LandingHero } = $props();

	/** The heading's last two words carry the gradient. */
	const heading = $derived.by(() => {
		const words = hero.heading.trim().split(/\s+/);
		const split = Math.max(0, words.length - 2);
		return { lead: words.slice(0, split).join(' '), accent: words.slice(split).join(' ') };
	});

	const HIGHLIGHTS = [
		{ icon: Sparkles, label: m.home_hero_highlight_ai() },
		{ icon: Award, label: m.home_hero_highlight_certificates() },
		{ icon: Globe, label: m.home_hero_highlight_anywhere() }
	];

	let query = $state('');
	let isPending = $state(false);

	// The form is a plain GET to the catalog without JS; with JS it navigates client-side and shows
	// the pending state until the catalog has loaded.
	async function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;
		isPending = true;
		try {
			await goto(`${ROUTES.courses.list}?search=${encodeURIComponent(trimmed)}`);
		} finally {
			isPending = false;
		}
	}
</script>

<section class="relative isolate overflow-hidden">
	<!--
		Backdrop: a faint grid and two colour clouds. The clouds hang from fixed offsets at the top, not
		from a share of the section's height, so they stay put when the web font swaps in and the
		text above re-wraps (a moving cloud counts as a layout shift).
	-->
	<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
		<div class="bg-grid absolute inset-0 opacity-70"></div>
		<div
			class="glow absolute -top-[18rem] -left-1/4 size-[70rem] opacity-20"
			style:--glow-color="var(--primary)"
		></div>
		<div
			class="glow absolute top-[16rem] -right-1/4 size-[60rem] opacity-15"
			style:--glow-color="var(--tertiary)"
		></div>
	</div>

	<div
		class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-24 lg:pb-28"
	>
		<div class="flex min-w-0 flex-col gap-7">
			<span
				class="glass enter-up inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-ink uppercase"
			>
				<span class="relative flex size-2">
					<span class="absolute inset-0 animate-pulse-ring rounded-full bg-primary"></span>
					<span class="relative size-2 rounded-full bg-primary"></span>
				</span>
				{hero.badge}
			</span>

			<h1
				class="enter-up text-[2.75rem] leading-[1.02] font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl"
				style:--delay="0.08s"
			>
				{#if heading.lead}{heading.lead}{' '}{/if}<span class="text-gradient">{heading.accent}</span>
			</h1>

			<p
				class="enter-up max-w-xl text-lg leading-relaxed text-muted-foreground"
				style:--delay="0.16s"
			>
				{hero.description}
			</p>

			<form
				method="GET"
				action={ROUTES.courses.list}
				onsubmit={handleSearch}
				class="glass-card enter-up flex w-full max-w-lg items-center gap-2 rounded-2xl p-1.5"
				style:--delay="0.24s"
			>
				<div class="relative min-w-0 flex-1">
					<Search
						class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<input
						name="search"
						bind:value={query}
						placeholder={m.home_hero_search_placeholder()}
						aria-label={m.home_hero_search_label()}
						disabled={isPending}
						class="h-11 w-full min-w-0 rounded-xl bg-transparent pr-3 pl-10 text-base text-foreground placeholder:text-placeholder focus-visible:outline-none md:text-sm"
					/>
				</div>
				<Button type="submit" disabled={isPending} class="h-11 shrink-0 rounded-xl">
					{#if isPending}
						<LoaderCircle class="size-4 animate-spin" />
						{m.home_hero_searching()}
					{:else}
						{m.home_hero_search_button()}
					{/if}
				</Button>
			</form>

			<div class="enter-up flex flex-wrap items-center gap-3" style:--delay="0.32s">
				<Button href={cmsHref(hero.primaryCtaUrl)} size="lg" class="group">
					{hero.primaryCtaText}
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
				</Button>
				<Button href={cmsHref(hero.secondaryCtaUrl)} variant="glass" size="lg">
					{hero.secondaryCtaText}
				</Button>
			</div>

			<ul class="flex flex-wrap gap-2.5">
				{#each HIGHLIGHTS as item, index (item.label)}
					<li
						class="glass enter-up flex items-center gap-2 rounded-xl px-3 py-2"
						style:--delay="{0.45 + index * 0.08}s"
					>
						<item.icon class="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
						<span class="text-xs font-semibold whitespace-nowrap text-foreground/85">{item.label}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="relative min-w-0">
			<BrandGlobe caption={hero.imageCaption} />
		</div>
	</div>
</section>
