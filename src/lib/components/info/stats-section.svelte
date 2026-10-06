<script lang="ts" module>
	export interface CatalogStats {
		totalCourses: number;
		totalCategories: number;
		instructorCount: number;
	}
</script>

<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Layers from '@lucide/svelte/icons/layers';
	import Users from '@lucide/svelte/icons/users';
	import AnimatedCounter from '$lib/components/common/animated-counter.svelte';
	import { formatCompactNumber } from '$lib/format';
	import StatCard from './stat-card.svelte';

	// The about page only ever passed catalog counts, so the original's three-column variant is all
	// that is ported here (the six-column platform variant lives with the home page).
	let { stats }: { stats: CatalogStats } = $props();

	const cards = $derived([
		{ icon: BookOpen, label: 'Courses available', value: stats.totalCourses },
		{ icon: Layers, label: 'Categories', value: stats.totalCategories },
		{ icon: Users, label: 'Instructors', value: stats.instructorCount }
	]);
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
		{#each cards as card (card.label)}
			<StatCard icon={card.icon} label={card.label}>
				{#snippet value()}
					<AnimatedCounter value={card.value} format={formatCompactNumber} />
				{/snippet}
			</StatCard>
		{/each}
	</div>
</section>
