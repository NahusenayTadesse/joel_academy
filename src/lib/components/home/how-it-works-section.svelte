<script lang="ts">
	import { DEFAULT_LANDING, type LandingStep } from '$lib/content/landing';

	let { items = DEFAULT_LANDING.howItWorks }: { items?: LandingStep[] } = $props();

	const stepNumber = (index: number) => String(index + 1).padStart(2, '0');
</script>

<section class="bg-surface-dark text-surface-dark-foreground">
	<div class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
		<div class="mb-10 text-center">
			<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">The Learning Framework</h2>
			<p class="mt-2 text-sm text-slate-400">Four simple steps to start learning.</p>
		</div>
		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
			{#each items as step, index (index)}
				<div class="flex flex-col gap-3 border-t-2 border-lime-400 pt-4">
					<span class="text-3xl font-bold text-lime-400">{stepNumber(index)}</span>
					<h3 class="text-sm font-semibold text-white">{step.title}</h3>
					<p class="text-sm text-slate-400">{step.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
