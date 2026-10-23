<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Compass from '@lucide/svelte/icons/compass';
	import Handshake from '@lucide/svelte/icons/handshake';
	import Heart from '@lucide/svelte/icons/heart';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Target from '@lucide/svelte/icons/target';
	import Users from '@lucide/svelte/icons/users';
	import Reveal from '$lib/components/common/reveal.svelte';
	import CtaBannerSection from '$lib/components/home/cta-banner-section.svelte';
	import StatsSection from '$lib/components/info/stats-section.svelte';
	import FeatureCard from '$lib/components/marketing/feature-card.svelte';
	import Timeline, { type TimelineEntry } from '$lib/components/marketing/timeline.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	const CORE_VALUES = [
		{
			icon: Target,
			title: m.info_about_value_outcomes_title(),
			description: m.info_about_value_outcomes_body()
		},
		{
			icon: Heart,
			title: m.info_about_value_students_title(),
			description: m.info_about_value_students_body()
		},
		{
			icon: Lightbulb,
			title: m.info_about_value_practical_title(),
			description: m.info_about_value_practical_body()
		},
		{
			icon: Handshake,
			title: m.info_about_value_instructors_title(),
			description: m.info_about_value_instructors_body()
		}
	];

	const TIMELINE: TimelineEntry[] = [
		{
			year: m.info_about_timeline_year1(),
			title: m.info_about_timeline_year1_title(),
			description: m.info_about_timeline_year1_body()
		},
		{
			year: m.info_about_timeline_year2(),
			title: m.info_about_timeline_year2_title(),
			description: m.info_about_timeline_year2_body()
		},
		{
			year: m.info_about_timeline_year3(),
			title: m.info_about_timeline_year3_title(),
			description: m.info_about_timeline_year3_body()
		},
		{
			year: m.info_about_timeline_today(),
			title: m.info_about_timeline_today_title(),
			description: m.info_about_timeline_today_body()
		}
	];
</script>

<svelte:head>
	<title>{m.info_about_meta_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_about_meta_description({ name: siteConfig.name })} />
</svelte:head>

<div>
	<section class="border-b border-border bg-linear-to-b from-brand/5 via-background to-background">
		<div
			class="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6"
		>
			<h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
				{m.info_about_heading({ name: siteConfig.name })}
			</h1>
			<p class="text-lg text-muted-foreground">
				{m.shell_site_description()}
				{m.info_about_intro()}
			</p>
		</div>
	</section>

	<Reveal>
		<StatsSection stats={data.stats} />
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
			<h2 class="text-2xl font-semibold tracking-tight text-foreground">{m.info_about_story_title()}</h2>
			<div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
				<p>
					{m.info_about_story_p1({ name: siteConfig.name })}
				</p>
				<p>
					{m.info_about_story_p2()}
				</p>
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="border-t border-border bg-muted/20">
			<div
				class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6"
			>
				<Card class="flex flex-col gap-3 p-6">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
						<Compass class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">{m.info_about_mission_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_about_mission_body()}
					</p>
				</Card>
				<Card class="flex flex-col gap-3 p-6">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
						<Award class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">{m.info_about_vision_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_about_vision_body()}
					</p>
				</Card>
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
			<div class="mb-8 text-center">
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">{m.info_about_values_title()}</h2>
			</div>
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{#each CORE_VALUES as value (value.title)}
					<FeatureCard {...value} />
				{/each}
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="border-t border-border bg-muted/20">
			<div
				class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6"
			>
				<div class="flex flex-col gap-3">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
						<BookOpen class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">{m.info_about_philosophy_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_about_philosophy_body()}
					</p>
				</div>
				<div class="flex flex-col gap-3">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
						<Users class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">{m.info_about_methodology_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_about_methodology_body()}
					</p>
				</div>
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
			<h2 class="mb-8 text-2xl font-semibold tracking-tight text-foreground">{m.info_about_journey_title()}</h2>
			<Timeline entries={TIMELINE} />
		</section>
	</Reveal>

	<Reveal>
		<CtaBannerSection />
	</Reveal>
</div>
