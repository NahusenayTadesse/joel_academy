<script lang="ts">
	import Clock from '@lucide/svelte/icons/clock';
	import Signal from '@lucide/svelte/icons/signal';
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import Badge from '$lib/components/ui/badge.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { DIFFICULTY_LABELS } from '$lib/content/catalog.constants';
	import type { CourseSummary } from '$lib/content/catalog.types';
	import { m } from '$lib/paraglide/messages';
	import { formatCompactNumber, formatDurationMinutes } from '$lib/format';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import CourseThumbnail from './course-thumbnail.svelte';
	import PriceTag from './price-tag.svelte';
	import WishlistButton from './wishlist-button.svelte';

	let {
		course,
		class: className = '',
		view = 'grid',
		href: hrefOverride,
		priority = 'lazy'
	}: {
		course: CourseSummary;
		class?: string;
		view?: 'grid' | 'list';
		/** Overrides the default public `/courses/[slug]` link target. */
		href?: string;
		/** Image loading for this card's thumbnail (see CourseThumbnail). */
		priority?: 'high' | 'eager' | 'lazy';
	} = $props();

	const href = $derived(hrefOverride ?? ROUTES.courses.detail(course.slug));
</script>

{#snippet rating()}
	{#if course.rating !== undefined}
		<span class="flex items-center gap-1 text-xs font-medium text-foreground">
			<Star class="size-3.5 fill-warning text-warning" aria-hidden="true" />
			<span aria-hidden="true">{course.rating.toFixed(1)}</span>
			{#if course.reviewCount !== undefined}
				<span class="font-normal text-muted-foreground" aria-hidden="true">
					({formatCompactNumber(course.reviewCount)})
				</span>
			{/if}
			<span class="sr-only">
				{course.reviewCount !== undefined
					? m.catalog_card_rated_reviews({ rating: course.rating.toFixed(1), count: course.reviewCount })
					: m.catalog_card_rated({ rating: course.rating.toFixed(1) })}
			</span>
		</span>
	{/if}
{/snippet}

{#snippet price()}
	<PriceTag
		accessType={course.accessType}
		price={course.price}
		discountPrice={course.discountPrice}
		currency={course.currency}
	/>
{/snippet}

{#if view === 'list'}
	<Card class={cn('lift overflow-hidden', className)}>
		<a {href} class="flex flex-col gap-4 sm:flex-row">
			<CourseThumbnail
				{priority}
				title={course.title}
				categoryName={course.categoryName}
				categorySlug={course.categorySlug}
				thumbnailUrl={course.thumbnailUrl}
				class="w-full rounded-t-xl sm:w-56 sm:rounded-l-xl sm:rounded-tr-none"
			/>
			<div class="flex flex-1 flex-col gap-2 p-4 pt-0 sm:pt-4">
				<div class="flex items-start justify-between gap-2">
					<h3 class="line-clamp-2 text-sm font-semibold text-foreground">{course.title}</h3>
					<WishlistButton courseId={course.id} courseTitle={course.title} />
				</div>
				<p class="line-clamp-2 text-sm text-muted-foreground">{course.shortDescription}</p>
				<p class="text-xs text-muted-foreground">{m.catalog_card_by({ name: course.presenterName })}</p>
				<div class="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
					{@render rating()}
					<span class="flex items-center gap-1">
						<Signal class="size-3.5" />
						{DIFFICULTY_LABELS[course.difficulty]}
					</span>
					{#if course.estimatedDurationMinutes}
						<span class="flex items-center gap-1">
							<Clock class="size-3.5" />
							{formatDurationMinutes(course.estimatedDurationMinutes)}
						</span>
					{/if}
					<span class="ml-auto">{@render price()}</span>
				</div>
			</div>
		</a>
	</Card>
{:else}
	<Card class={cn('lift group h-full overflow-hidden', className)}>
		<a {href}>
			<div class="relative">
				<CourseThumbnail
				{priority}
					title={course.title}
					categoryName={course.categoryName}
					categorySlug={course.categorySlug}
					thumbnailUrl={course.thumbnailUrl}
				/>
				<WishlistButton
					courseId={course.id}
					courseTitle={course.title}
					class="absolute top-2 right-2"
				/>
				{#if course.featured}
					<Badge class="absolute top-2 left-2 rounded-full border-0 bg-linear-to-r from-brand-gradient-from to-brand-gradient-to px-2.5 text-primary-foreground shadow-glow">{m.catalog_card_featured()}</Badge>
				{/if}
			</div>
			<div class="flex flex-col gap-2 p-4">
				<h3 class="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-brand-ink">
					{course.title}
				</h3>
				<p class="line-clamp-2 text-sm text-muted-foreground">{course.shortDescription}</p>
				<p class="text-xs text-muted-foreground">{m.catalog_card_by({ name: course.presenterName })}</p>
				<div class="flex items-center gap-3 pt-1">
					{@render rating()}
					{#if course.studentsCount !== undefined}
						<span class="flex items-center gap-1 text-xs text-muted-foreground">
							<Users class="size-3.5" aria-hidden="true" />
							{formatCompactNumber(course.studentsCount)}
							<span class="sr-only">{m.catalog_card_students_sr()}</span>
						</span>
					{/if}
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="flex items-center gap-1 text-xs text-muted-foreground">
						<Signal class="size-3.5" />
						{DIFFICULTY_LABELS[course.difficulty]}
					</span>
					{@render price()}
				</div>
			</div>
		</a>
	</Card>
{/if}
