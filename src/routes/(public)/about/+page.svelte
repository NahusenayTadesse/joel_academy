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
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	const CORE_VALUES = [
		{
			icon: Target,
			title: 'Outcomes over hours',
			description:
				'We measure success by what students can actually do, not just how many hours of video they watched.'
		},
		{
			icon: Heart,
			title: 'Students first',
			description:
				'Every product and content decision starts with what genuinely helps students learn and finish.'
		},
		{
			icon: Lightbulb,
			title: 'Practical over theoretical',
			description:
				'Courses are built around real projects and real problems, not abstract theory disconnected from practice.'
		},
		{
			icon: Handshake,
			title: 'Instructor quality',
			description:
				'Every instructor is vetted for real-world experience, not just presentation skills.'
		}
	];

	const TIMELINE: TimelineEntry[] = [
		{
			year: 'Year 1',
			title: 'The academy is founded',
			description:
				'Started with a small catalog and a simple goal: make high-quality, practical education accessible online.'
		},
		{
			year: 'Year 2',
			title: 'Instructor network grows',
			description:
				'Expanded to a global network of industry instructors across engineering, design, data, and business.'
		},
		{
			year: 'Year 3',
			title: 'Certificates launched',
			description:
				'Introduced certificates of completion so students could show what they learned to employers.'
		},
		{
			year: 'Today',
			title: 'A growing course catalog',
			description:
				'Courses spanning web development, cloud, security, data, design, and business, taught by real practitioners.'
		}
	];
</script>

<svelte:head>
	<title>About Us · {siteConfig.name}</title>
	<meta name="description" content="Learn about {siteConfig.name} and our mission." />
</svelte:head>

<div>
	<section class="border-b border-border bg-linear-to-b from-brand/5 via-background to-background">
		<div
			class="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6"
		>
			<h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
				About {siteConfig.name}
			</h1>
			<p class="text-lg text-muted-foreground">
				{siteConfig.description} We build a straightforward, self-paced learning platform where
				instructors publish real courses and learners make steady progress at their own speed.
			</p>
		</div>
	</section>

	<Reveal>
		<StatsSection stats={data.stats} />
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
			<h2 class="text-2xl font-semibold tracking-tight text-foreground">Our story</h2>
			<div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
				<p>
					{siteConfig.name} started from a simple frustration: most online courses either move too
					slowly to be worth the time, or move so fast that they leave real understanding behind. We
					wanted to build something different - courses taught by people who actually do the work
					they teach, organized around outcomes instead of just video runtime.
				</p>
				<p>
					Every course on the platform is built around a clear set of skills a student should walk
					away with, backed by real projects rather than passive watching. That philosophy shapes
					everything from how we vet instructors to how we structure a single lesson.
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
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
						<Compass class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">Our mission</h3>
					<p class="text-sm text-muted-foreground">
						Make practical, high-quality education accessible to anyone with the motivation to
						learn, regardless of where they are starting from.
					</p>
				</Card>
				<Card class="flex flex-col gap-3 p-6">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
						<Award class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">Our vision</h3>
					<p class="text-sm text-muted-foreground">
						A world where a learner's skills - not their credentials or connections - determine the
						opportunities available to them.
					</p>
				</Card>
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
			<div class="mb-8 text-center">
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">Core values</h2>
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
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
						<BookOpen class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">Teaching philosophy</h3>
					<p class="text-sm text-muted-foreground">
						We believe people learn by doing, not by watching. Every course is built around projects
						and exercises that mirror real work, so what you practice is what you will actually use.
					</p>
				</div>
				<div class="flex flex-col gap-3">
					<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
						<Users class="size-5" />
					</span>
					<h3 class="text-lg font-semibold text-foreground">Learning methodology</h3>
					<p class="text-sm text-muted-foreground">
						Courses are self-paced with structured sections and lessons, so you can move quickly
						through what you already know and slow down where you need it.
					</p>
				</div>
			</div>
		</section>
	</Reveal>

	<Reveal>
		<section class="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
			<h2 class="mb-8 text-2xl font-semibold tracking-tight text-foreground">Our journey</h2>
			<Timeline entries={TIMELINE} />
		</section>
	</Reveal>

	<Reveal>
		<CtaBannerSection />
	</Reveal>
</div>
