<script lang="ts" module>
	import { m } from '$lib/paraglide/messages';

	/* Labels are getters: the language is the page's, known only when they are read. */
	export const CHECKOUT_STEPS = [
		{
			id: 1,
			get label() {
				return m.account_step_summary();
			}
		},
		{
			id: 2,
			get label() {
				return m.account_step_promo();
			}
		},
		{
			id: 3,
			get label() {
				return m.account_step_payment();
			}
		},
		{
			id: 4,
			get label() {
				return m.account_step_confirmation();
			}
		}
	] as const;
	export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]['id'];
</script>

<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { currentStep }: { currentStep: CheckoutStepId } = $props();

	const progressPercent = $derived(((currentStep - 1) / (CHECKOUT_STEPS.length - 1)) * 100);
</script>

<div class="relative pb-2">
	<div class="absolute top-4 right-0 left-0 h-1 rounded-full bg-border" aria-hidden="true"></div>
	<div
		class="absolute top-4 left-0 h-1 rounded-full bg-brand transition-all duration-500 ease-out"
		style:width="{progressPercent}%"
		aria-hidden="true"
	></div>
	<ol class="relative flex items-start justify-between">
		{#each CHECKOUT_STEPS as step (step.id)}
			{@const isComplete = step.id < currentStep}
			{@const isCurrent = step.id === currentStep}
			<li class="flex flex-col items-center gap-2 bg-background px-1.5 text-center">
				<span
					class={cn(
						'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
						isComplete || isCurrent
							? 'bg-brand text-brand-foreground shadow-sm'
							: 'border-2 border-border bg-card text-muted-foreground',
						isCurrent && 'ring-4 ring-brand/15'
					)}
					aria-current={isCurrent ? 'step' : undefined}
				>
					{#if isComplete}<Check class="size-4" />{:else}{step.id}{/if}
				</span>
				<span
					class={cn(
						'hidden max-w-20 text-[10px] font-bold tracking-wider uppercase sm:block',
						isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'
					)}
				>
					{step.label}
				</span>
			</li>
		{/each}
	</ol>
</div>
