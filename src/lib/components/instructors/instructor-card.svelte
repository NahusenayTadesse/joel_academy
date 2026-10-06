<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import type { Instructor } from '$lib/content/instructor.types';
	import { ROUTES } from '$lib/site';

	let { instructor }: { instructor: Pick<Instructor, 'name' | 'title' | 'photoUrl' | 'avatarUrl' | 'courseCount'> } =
		$props();

	// Falls back to the initials avatar when the photo fails to load.
	let imgError = $state(false);
	const photo = $derived(instructor.photoUrl || instructor.avatarUrl);

	function getInitials(name: string): string {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		return (name.trim().slice(0, 2) || 'IN').toUpperCase();
	}
</script>

<Card class="group overflow-hidden transition-all hover:border-brand/30 hover:shadow-md">
	<a
		href={ROUTES.instructors.detail(encodeURIComponent(instructor.name))}
		class="flex flex-col items-center gap-3 p-6 text-center"
	>
		{#if photo && !imgError}
			<div
				class="relative size-18 overflow-hidden rounded-full border-2 border-brand/30 shadow-xs transition-transform group-hover:scale-105"
			>
				<img
					src={photo}
					alt={instructor.name}
					class="size-full object-cover"
					onerror={() => (imgError = true)}
				/>
			</div>
		{:else}
			<span
				class="flex size-18 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-brand text-base font-bold text-white shadow-xs transition-transform group-hover:scale-105"
			>
				{getInitials(instructor.name)}
			</span>
		{/if}
		<div>
			<h3 class="text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
				{instructor.name}
			</h3>
			{#if instructor.title}
				<p class="mt-0.5 text-[11px] font-medium text-brand">{instructor.title}</p>
			{/if}
			<p class="mt-1 text-xs text-muted-foreground">
				{instructor.courseCount}
				{instructor.courseCount === 1 ? 'course' : 'courses'}
			</p>
		</div>
	</a>
</Card>
