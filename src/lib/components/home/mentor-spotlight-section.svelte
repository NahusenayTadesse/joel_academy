<script lang="ts" module>
	export interface MentorSpotlightInstructor {
		name: string;
		title?: string;
		headline?: string;
		bio: string;
		photoUrl?: string | null;
		avatarUrl?: string | null;
		slug?: string;
		achievements?: string[];
		avatarColor?: string;
	}
</script>

<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Button from '$lib/components/ui/button.svelte';
	import { inView } from '$lib/attachments';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { instructor }: { instructor: MentorSpotlightInstructor | null } = $props();

	const DEFAULT_ACHIEVEMENTS = [
		'Over 10+ years of high-scale software engineering leadership',
		'Curriculum designed specifically for career placement & promotion',
		'Trained and certified thousands of engineers across the continent'
	];

	const initials = $derived(
		(instructor?.name ?? '')
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
	);
	const photo = $derived(instructor?.photoUrl || instructor?.avatarUrl);
	const subtitle = $derived(
		instructor?.title || instructor?.headline || 'Founder & Lead Instructor'
	);
	const achievements = $derived(
		instructor?.achievements?.length ? instructor.achievements : DEFAULT_ACHIEVEMENTS
	);
	const slug = $derived(instructor?.slug || 'joel-talargie');
</script>

{#if instructor}
	<section class="relative isolate">
		<div
			class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20"
		>
			<div class="reveal relative" style:--reveal-scale="0.94" {@attach inView()}>
				<div
					class="glow absolute top-1/2 left-1/2 -z-10 size-[120%] -translate-x-1/2 -translate-y-1/2 opacity-25"
					aria-hidden="true"
				></div>
				<div
					class="group relative overflow-hidden rounded-[2.5rem] border border-foreground/10 p-1.5 shadow-xl"
				>
					{#if photo}
						<div class="relative aspect-square w-full overflow-hidden rounded-[2.1rem] bg-muted">
							<img
								src={photo}
								alt={instructor.name}
								loading="lazy"
								decoding="async"
								class="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
							/>
							<div
								class="absolute inset-0 bg-linear-to-t from-surface-dark/60 via-transparent to-transparent"
								aria-hidden="true"
							></div>
						</div>
					{:else}
						<div
							class={cn(
								'flex aspect-square w-full items-center justify-center rounded-[2.1rem] bg-linear-to-br from-[#1d6fe0] to-[#0b2a5c] text-8xl font-bold text-white/90',
								instructor.avatarColor
							)}
						>
							{initials}
						</div>
					{/if}
				</div>
				<div
					class="glass absolute -right-2 -bottom-5 animate-bob-up rounded-2xl px-4 py-3 shadow-glow sm:-right-6"
				>
					<p class="text-sm font-bold text-brand-ink">{instructor.name}</p>
					<p class="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{subtitle}</p>
				</div>
			</div>
			<div class="reveal flex flex-col gap-5" style:--delay="0.15s" {@attach inView()}>
				<span class="text-xs font-bold tracking-[0.2em] text-brand-ink uppercase">
					Meet your mentor
				</span>
				<h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
					Learn from <span class="text-gradient">{instructor.name}</span>
				</h2>
				<p class="text-sm font-medium text-muted-foreground">{subtitle}</p>
				<p class="text-base leading-relaxed text-muted-foreground">{instructor.bio}</p>
				<ul class="flex flex-col gap-3">
					{#each achievements.slice(0, 3) as achievement (achievement)}
						<li class="glass flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-foreground">
							<CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-ink" />
							{achievement}
						</li>
					{/each}
				</ul>
				<Button href={ROUTES.instructors.detail(slug)} class="group mt-2 w-fit" variant="glass" size="lg">
					View full profile
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
				</Button>
			</div>
		</div>
	</section>
{/if}
