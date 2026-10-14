<script lang="ts">
	import { goto } from '$app/navigation';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { DEFAULT_HERO_IMAGE, DEFAULT_LANDING, type LandingHero } from '$lib/content/landing';
	import { mediaUrl } from '$lib/media';
	import { ROUTES } from '$lib/site';

	let { hero = DEFAULT_LANDING.hero }: { hero?: LandingHero } = $props();

	const heroImage = $derived(mediaUrl(hero.image) ?? DEFAULT_HERO_IMAGE);

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

<section class="border-b border-border bg-background">
	<div
		class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16"
	>
		<div class="flex flex-col gap-6">
			<span
				class="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-ink uppercase"
			>
				<Sparkles class="size-3.5" />
				{hero.badge}
			</span>
			<h1 class="text-4xl leading-[1.05] font-bold tracking-tight text-foreground sm:text-5xl">
				{hero.heading}
			</h1>
			<p class="max-w-lg text-lg text-muted-foreground">{hero.description}</p>

			<form
				method="GET"
				action={ROUTES.courses.list}
				onsubmit={handleSearch}
				class="flex w-full max-w-md items-center gap-2"
			>
				<div class="relative flex-1">
					<Search
						class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						name="search"
						bind:value={query}
						placeholder="What do you want to learn?"
						aria-label="Search courses"
						disabled={isPending}
						class="h-12 pl-10"
					/>
				</div>
				<Button type="submit" size="lg" disabled={isPending} class="h-12 shrink-0">
					{#if isPending}
						<LoaderCircle class="size-4 animate-spin" />
						Searching...
					{:else}
						Search
					{/if}
				</Button>
			</form>

			<div class="flex flex-wrap items-center gap-3">
				<Button href={hero.primaryCtaUrl} size="lg">
					{hero.primaryCtaText}
					<ArrowRight class="size-4" />
				</Button>
				<Button href={hero.secondaryCtaUrl} variant="outline" size="lg">{hero.secondaryCtaText}</Button>
			</div>
		</div>

		<div
			class="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-surface-dark lg:aspect-square"
		>
			<!-- The page's largest image: fetched first rather than discovered late. -->
			<img
				src={heroImage}
				alt={hero.imageAlt}
				class="size-full object-cover"
				width="1200"
				height="637"
				fetchpriority="high"
				decoding="async"
			/>
			<div
				class="absolute inset-0 opacity-60 mix-blend-multiply"
				style:background-image="radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--chart-1) 50%, transparent), transparent 45%), radial-gradient(circle at 80% 30%, color-mix(in srgb, var(--surface-dark) 60%, transparent), transparent 50%)"
				aria-hidden="true"
			></div>
			<div
				class="absolute inset-0 bg-linear-to-t from-surface-dark via-surface-dark/10 to-transparent"
				aria-hidden="true"
			></div>
			{#if hero.imageCaption}
				<div class="absolute inset-x-0 bottom-0 p-8">
					<p class="max-w-xs text-sm text-slate-300">{hero.imageCaption}</p>
				</div>
			{/if}
		</div>
	</div>
</section>
