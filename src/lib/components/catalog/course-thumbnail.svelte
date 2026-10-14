<script lang="ts" module>
	import type { Component } from 'svelte';
	import BarChart3 from '@lucide/svelte/icons/chart-column';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Code2 from '@lucide/svelte/icons/code-xml';
	import Database from '@lucide/svelte/icons/database';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Palette from '@lucide/svelte/icons/palette';
	import Server from '@lucide/svelte/icons/server';
	import Shield from '@lucide/svelte/icons/shield';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import TestTube2 from '@lucide/svelte/icons/test-tube-diagonal';

	const CATEGORY_ICONS: Record<string, Component> = {
		'web-development': Code2,
		'mobile-development': Smartphone,
		'data-science': BarChart3,
		'artificial-intelligence': Server,
		'cloud-computing': Cloud,
		devops: Server,
		cybersecurity: Shield,
		'ui-ux-design': Palette,
		'programming-languages': Code2,
		'database-systems': Database,
		'business-management': Briefcase,
		'digital-marketing': Megaphone,
		'graphic-design': Palette,
		'project-management': Briefcase,
		'software-testing': TestTube2
	};

	/** Categories with a licensed photo under /static/images/categories/. */
	const CATEGORY_PHOTOS = new Set(Object.keys(CATEGORY_ICONS));

	const glow = (token: string) => `color-mix(in srgb, var(${token}) 35%, transparent)`;
	const TINTS = [
		{ icon: 'text-chart-1', ring: 'ring-chart-1/30', glow: glow('--chart-1') },
		{ icon: 'text-chart-2', ring: 'ring-chart-2/30', glow: glow('--chart-2') },
		{ icon: 'text-chart-4', ring: 'ring-chart-4/30', glow: glow('--chart-4') },
		{ icon: 'text-chart-3', ring: 'ring-chart-3/30', glow: glow('--chart-3') },
		{ icon: 'text-chart-5', ring: 'ring-chart-5/30', glow: glow('--chart-5') }
	];

	function pickTint(seed: string) {
		let hash = 0;
		for (let index = 0; index < seed.length; index += 1) {
			hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
		}
		return TINTS[hash % TINTS.length] ?? TINTS[0]!;
	}
</script>

<script lang="ts">
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		title,
		categoryName,
		categorySlug,
		thumbnailUrl,
		showBadge = true,
		priority = 'lazy',
		class: className = ''
	}: {
		title: string;
		categoryName?: string;
		categorySlug?: string;
		thumbnailUrl?: string | null;
		showBadge?: boolean;
		/**
		 * How urgently to fetch the image: `high` for a page's main image (the first card of a list),
		 * `eager` for others visible on load, `lazy` (default) for the rest.
		 */
		priority?: 'high' | 'eager' | 'lazy';
		class?: string;
	} = $props();

	let imageError = $state(false);

	/* An uploaded thumbnail, then the category's photo, then a tinted category-icon placeholder. */
	const photo = $derived(
		thumbnailUrl && !imageError
			? thumbnailUrl
			: categorySlug && CATEGORY_PHOTOS.has(categorySlug)
				? `/images/categories/${categorySlug}.jpg`
				: null
	);
	const tint = $derived(pickTint(title));
	const Icon = $derived((categorySlug && CATEGORY_ICONS[categorySlug]) || BookOpen);
</script>

{#if photo}
	<div class={cn('relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted', className)}>
		<img
			src={photo}
			alt={categoryName ?? title}
			loading={priority === 'lazy' ? 'lazy' : 'eager'}
			fetchpriority={priority === 'high' ? 'high' : 'auto'}
			decoding="async"
			class="absolute inset-0 size-full object-cover"
			onerror={() => (imageError = true)}
		/>
		{#if showBadge}
			<div
				class="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"
				aria-hidden="true"
			></div>
		{/if}
		{#if showBadge && categoryName}
			<span
				class="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur"
			>
				{categoryName}
			</span>
		{/if}
	</div>
{:else}
	<div
		class={cn(
			'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-t-xl bg-surface-dark',
			className
		)}
	>
		<div
			class="absolute inset-0"
			style:background-image="radial-gradient(circle at 30% 30%, {tint.glow}, transparent 60%)"
			aria-hidden="true"
		></div>
		<div
			class="absolute inset-0 opacity-30"
			style="background-image: linear-gradient(color-mix(in srgb, var(--surface-dark-foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--surface-dark-foreground) 8%, transparent) 1px, transparent 1px); background-size: 24px 24px"
			aria-hidden="true"
		></div>
		<span
			class={cn(
				'relative flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 backdrop-blur-sm',
				tint.ring
			)}
		>
			<Icon class={cn('size-6', tint.icon)} aria-hidden="true" />
		</span>
		{#if showBadge && categoryName}
			<span
				class="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur"
			>
				{categoryName}
			</span>
		{/if}
	</div>
{/if}
