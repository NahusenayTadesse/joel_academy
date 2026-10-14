<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Tag from '@lucide/svelte/icons/tag';
	import { navigating, page } from '$app/state';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import { formatCurrency } from '$lib/format';

	/*
	 * The original promo-code step. Applying a code is a GET to this page with `?promo=`, so the
	 * server checks it and prices the course, and a reload keeps it applied. The code is checked
	 * again, and locked, when the student pays.
	 */
	let {
		promo,
		promoInput,
		promoError,
		currency,
		onBack,
		onNext
	}: {
		promo: { code: string; description: string | null; discountAmount: string; amountDue: string } | null;
		promoInput: string;
		promoError: string | null;
		currency: string;
		onBack: () => void;
		onNext: () => void;
	} = $props();

	const checking = $derived(navigating.to?.url.pathname === page.url.pathname);
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-bold text-foreground">Have a promo code?</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Apply a coupon for a discount, or skip this step to continue at full price.
		</p>
	</div>

	{#if promo}
		<Card class="border-success/40 bg-success/5">
			<CardContent class="flex flex-wrap items-center justify-between gap-3 p-5">
				<div class="flex items-center gap-3">
					<CircleCheck class="size-5 shrink-0 text-success-ink" />
					<div>
						<p class="text-sm font-semibold text-foreground">{promo.code} applied</p>
						<p class="text-xs text-muted-foreground">
							You save {formatCurrency(promo.discountAmount, currency)}{Number(promo.amountDue) <= 0
								? ' - this course is free with your code'
								: ''}
						</p>
						{#if promo.description}<p class="mt-0.5 text-xs text-muted-foreground">{promo.description}</p>{/if}
					</div>
				</div>
				<Button variant="ghost" size="sm" href="?step=2" data-sveltekit-noscroll>Remove</Button>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="p-5">
				<form method="GET" class="space-y-4" data-sveltekit-keepfocus data-sveltekit-noscroll>
					<input type="hidden" name="step" value="2" />
					<div class="space-y-2">
						<Label for="promo-code">Promo code</Label>
						<div class="flex gap-2">
							<div class="relative flex-1">
								<Tag
									class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									id="promo-code"
									name="promo"
									value={promoInput}
									placeholder="e.g. WELCOME15"
									autocomplete="off"
									maxlength={40}
									class="pl-9 uppercase placeholder:normal-case"
									aria-invalid={promoError ? 'true' : undefined}
									aria-describedby={promoError ? 'promo-code-error' : undefined}
								/>
							</div>
							<Button type="submit" variant="outline" disabled={checking}>
								{#if checking}<LoaderCircle class="size-4 animate-spin" />{:else}Apply{/if}
							</Button>
						</div>
					</div>

					{#if promoError}
						<div
							id="promo-code-error"
							class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							role="alert"
						>
							<CircleX class="size-4 shrink-0" />
							<span>{promoError}</span>
						</div>
					{/if}
				</form>
			</CardContent>
		</Card>
	{/if}

	<div class="flex items-center justify-between gap-3">
		<Button variant="outline" onclick={onBack}>Back</Button>
		<Button onclick={onNext}>{promo ? 'Continue' : 'Skip & continue'}</Button>
	</div>
</div>
