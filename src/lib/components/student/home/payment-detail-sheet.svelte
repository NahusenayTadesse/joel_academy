<script lang="ts">
	import { Dialog } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { formatCurrency } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { formatDateTime } from './format';
	import { PAYMENT_STATUS, type PaymentRecord } from './payment-status';

	/* The original payments page's detail sheet, without the receipt download (staff only here). */
	let { payment, onClose }: { payment: PaymentRecord | null; onClose: () => void } = $props();

	const warningText = 'text-[color-mix(in_srgb,var(--warning)_45%,black)] dark:text-warning';
</script>

<Dialog.Root open={payment !== null} onOpenChange={(open) => !open && onClose()}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-4 overflow-y-auto border-l bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:slide-in-from-right sm:max-w-md"
		>
			<div class="flex flex-col space-y-2 pr-8">
				<Dialog.Title class="text-lg font-semibold text-foreground">{m.account_payment_details()}</Dialog.Title>
				<Dialog.Description class="text-sm text-muted-foreground">
					{m.account_payment_details_description()}
				</Dialog.Description>
			</div>

			{#if payment}
				{@const status = PAYMENT_STATUS[payment.status]}
				<div class="mt-2 space-y-5">
					<div class="flex items-start justify-between gap-3">
						<span class="min-w-0 text-sm font-semibold break-words text-foreground">{payment.courseTitle}</span>
						<Badge variant={status.variant} class="shrink-0">{status.label}</Badge>
					</div>

					<hr class="border-border" />

					<dl class="space-y-3 text-sm">
						<div class="flex items-center justify-between gap-4">
							<dt class="text-muted-foreground">{m.account_amount()}</dt>
							<dd class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</dd>
						</div>
						<div class="flex items-center justify-between gap-4">
							<dt class="text-muted-foreground">{m.account_payment_method()}</dt>
							<dd class="text-right font-medium text-foreground">{payment.method}</dd>
						</div>
						{#if payment.reference}
							<div class="flex items-center justify-between gap-4">
								<dt class="shrink-0 text-muted-foreground">{m.account_transaction_id()}</dt>
								<dd class="min-w-0 text-right font-medium break-all text-foreground">{payment.reference}</dd>
							</div>
						{/if}
						<div class="flex items-center justify-between gap-4">
							<dt class="text-muted-foreground">{m.account_submitted()}</dt>
							<dd class="text-right font-medium text-foreground">{formatDateTime(payment.submittedAt)}</dd>
						</div>
						{#if payment.reviewedAt}
							<div class="flex items-center justify-between gap-4">
								<dt class="text-muted-foreground">{m.account_reviewed()}</dt>
								<dd class="text-right font-medium text-foreground">{formatDateTime(payment.reviewedAt)}</dd>
							</div>
						{/if}
					</dl>

					{#if payment.status === 'PENDING'}
						<p class="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm {warningText}">
							{m.account_payment_pending_note()}
						</p>
					{:else if payment.status === 'DECLINED' && payment.reason}
						<p class="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm break-words text-destructive">
							{payment.reason}
						</p>
					{/if}

					{#if payment.status === 'APPROVED'}
						<Button href={ROUTES.student.learn(payment.courseSlug)} class="w-full">{m.account_go_to_course()}</Button>
					{:else if payment.status === 'DECLINED'}
						<Button href={ROUTES.student.checkout(payment.courseSlug)} class="w-full">{m.account_resubmit_payment()}</Button>
					{/if}
				</div>
			{/if}

			<Dialog.Close
				class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			>
				<X class="h-4 w-4" />
				<span class="sr-only">{m.account_close()}</span>
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
