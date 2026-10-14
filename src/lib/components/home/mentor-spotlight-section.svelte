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
	<section class="border-t border-border bg-background">
		<div
			class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16"
		>
			{#if photo}
				<div class="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted">
					<img
						src={photo}
						alt={instructor.name}
						loading="lazy"
						decoding="async"
						class="absolute inset-0 size-full object-cover"
					/>
				</div>
			{:else}
				<div
					class={cn(
						'flex aspect-square w-full items-center justify-center rounded-3xl bg-linear-to-br from-emerald-600 to-emerald-900 text-8xl font-bold text-white/90 shadow-xl',
						instructor.avatarColor
					)}
				>
					{initials}
				</div>
			{/if}
			<div class="flex flex-col gap-4">
				<span
					class="w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-ink uppercase"
				>
					Meet your mentor
				</span>
				<h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{instructor.name}
				</h2>
				<p class="text-sm font-medium text-muted-foreground">{subtitle}</p>
				<p class="text-sm leading-relaxed text-muted-foreground">{instructor.bio}</p>
				<ul class="flex flex-col gap-2">
					{#each achievements.slice(0, 3) as achievement (achievement)}
						<li class="flex items-start gap-2 text-sm text-foreground">
							<CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-ink" />
							{achievement}
						</li>
					{/each}
				</ul>
				<Button href={ROUTES.instructors.detail(slug)} class="w-fit" variant="outline">
					View full profile
					<ArrowRight class="size-4" />
				</Button>
			</div>
		</div>
	</section>
{/if}
