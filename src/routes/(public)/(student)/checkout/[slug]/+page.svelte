<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Award from '@lucide/svelte/icons/award';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import FileText from '@lucide/svelte/icons/file-text';
	import Gift from '@lucide/svelte/icons/gift';
	import Landmark from '@lucide/svelte/icons/landmark';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Signal from '@lucide/svelte/icons/signal';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { toast } from 'svelte-sonner';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageBreadcrumb from '$lib/components/common/page-breadcrumb.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import CheckoutStepper from '$lib/components/student/checkout-stepper.svelte';
	import FileDrop from '$lib/components/student/file-drop.svelte';
	import OrderSummaryCard from '$lib/components/student/order-summary-card.svelte';
	import PromoCodeStep from '$lib/components/student/promo-code-step.svelte';
	import SmsUpdatesPrompt from '$lib/components/student/sms-updates-prompt.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import { DIFFICULTY_LABELS } from '$lib/content/catalog.constants';
	import { formatCurrency, formatDurationMinutes } from '$lib/format';
	import { RECEIPT_ACCEPT, receiptProblem } from '$lib/receipt';
	import { getLocale, INTL_LOCALES } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { data, form } = $props();

	const course = $derived(data.course);
	const submission = $derived(data.submission);
	const pending = $derived(submission?.status === 'PENDING');
	const rejected = $derived(submission?.status === 'REJECTED');

	const errors = $derived((form?.errors ?? {}) as Partial<Record<string, string>>);
	const hasErrors = $derived(Object.keys(errors).length > 0);

	/*
	 * The step the student moved to. Until then: a refused payment or a rejected receipt opens on the
	 * payment step, and applying a promo code (a page load with `?step=2`) stays on the promo step.
	 */
	let chosenStep = $state<1 | 2 | 3 | null>(null);
	const requestedStep = $derived(
		data.requestedStep === 2 || data.requestedStep === 3 ? data.requestedStep : null
	);
	const step = $derived(
		pending ? 4 : (chosenStep ?? (hasErrors || rejected ? 3 : (requestedStep ?? 1)))
	);

	/** What is left to pay, as the server quoted it. */
	const amountDue = $derived(data.promo ? data.promo.amountDue : course.total);
	const coveredByPromo = $derived(data.promo !== null && Number(amountDue) <= 0);
	const promoCode = $derived(data.promo?.code ?? '');

	/* A bank method's id; the first one leads. */
	let chosenMethod = $state<number | null>(null);
	const postedMethodId = $derived(Number(form?.values?.paymentMethodId) || null);
	const selected = $derived(chosenMethod ?? postedMethodId ?? data.methods[0]?.id ?? null);
	const selectedMethod = $derived(data.methods.find((method) => method.id === selected));

	let receipt = $state<File | null>(null);
	let receiptError = $state<string | null>(null);
	let submitting = $state(false);

	const shownReceiptError = $derived(receiptError ?? errors.receipt);

	const breadcrumbs = $derived([
		{ label: m.account_breadcrumb_home(), href: ROUTES.home },
		{ label: m.account_breadcrumb_courses(), href: ROUTES.courses.list },
		{ label: course.title, href: ROUTES.courses.detail(course.slug) },
		{ label: m.account_checkout() }
	]);

	const dateFormat = new Intl.DateTimeFormat(INTL_LOCALES[getLocale()], { dateStyle: 'medium' });

	/** A failed action shows a toast and keeps what was typed. */
	function afterAction(title: string) {
		return async ({
			result,
			update
		}: {
			result: import('@sveltejs/kit').ActionResult;
			update: (options?: { reset?: boolean }) => Promise<void>;
		}) => {
			submitting = false;
			if (result.type === 'failure') {
				toast.error(title, { description: m.account_check_details() });
			}
			// Keep the chosen file and typed values after a refusal.
			await update({ reset: false });
		};
	}
</script>

<svelte:head>
	<title>{m.account_checkout()} · {course.title} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<div class="mb-4">
		<PageBreadcrumb items={breadcrumbs} />
	</div>

	<PageHeader title={m.account_checkout()} description={m.account_checkout_description({ title: course.title })} />

	<div class="mb-2">
		<CheckoutStepper currentStep={step} />
	</div>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
		<div>
			{#if step === 1}
				<div class="space-y-6">
					<div>
						<h2 class="text-lg font-bold text-foreground">{m.account_enrolling_in()}</h2>
						<p class="mt-1 text-2xl font-bold text-foreground">{course.title}</p>
						{#if course.subtitle}<p class="mt-1 text-sm text-muted-foreground">{course.subtitle}</p>{/if}
					</div>

					<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
						<span class="flex items-center gap-2">
							<Signal class="size-4" />
							{m.account_difficulty_level({ level: DIFFICULTY_LABELS[course.difficulty] })}
						</span>
						{#if course.estimatedDurationMinutes}
							<span class="flex items-center gap-2">
								<Clock class="size-4" />
								{m.account_duration_total({ duration: formatDurationMinutes(course.estimatedDurationMinutes) })}
							</span>
						{/if}
						{#if course.certificateEnabled}
							<span class="flex items-center gap-2">
								<Award class="size-4" /> {m.account_certificate_of_completion()}
							</span>
						{/if}
					</div>

					{#if course.outcomes.length > 0}
						<Card>
							<CardContent class="p-5">
								<h3 class="mb-3 text-sm font-bold text-foreground">{m.account_what_youll_get()}</h3>
								<ul class="grid gap-2.5 sm:grid-cols-2">
									{#each course.outcomes.slice(0, 8) as outcome (outcome)}
										<li class="flex items-start gap-2 text-sm text-muted-foreground">
											<CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-ink" />
											<span>{outcome}</span>
										</li>
									{/each}
								</ul>
							</CardContent>
						</Card>
					{/if}

					<Button size="lg" class="w-full sm:w-auto" onclick={() => (chosenStep = 2)}>{m.account_continue()}</Button>
				</div>
			{:else if step === 2}
				<PromoCodeStep
					promo={data.promo}
					promoInput={data.promoInput}
					promoError={data.promoError}
					currency={course.currency}
					onBack={() => (chosenStep = 1)}
					onNext={() => (chosenStep = 3)}
				/>
			{:else if step === 3 && coveredByPromo}
				<ActionForm action="?/redeem" class="space-y-6" submit={() => {
						submitting = true;
						return afterAction(m.account_could_not_enroll());
					}}>
					<HiddenField name="promoCode" value={promoCode} />
					<Card class="border-success/40 bg-success/5">
						<CardContent class="flex flex-col items-center gap-4 p-8 text-center">
							<span class="flex size-16 items-center justify-center rounded-full bg-success/10 text-success-ink">
								<Gift class="size-9" />
							</span>
							<div>
								<h2 class="text-xl font-bold text-foreground">{m.account_nothing_to_pay()}</h2>
								<p class="mt-2 max-w-md text-sm text-muted-foreground">
									{m.account_nothing_to_pay_body({ code: promoCode, title: course.title })}
								</p>
							</div>
							{#if errors.redeem}
								<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{errors.redeem}</p>
							{/if}
						</CardContent>
					</Card>
					<div class="flex items-center justify-between gap-3">
						<Button type="button" variant="outline" onclick={() => (chosenStep = 2)} disabled={submitting}>
							{m.account_back()}
						</Button>
						<Button type="submit" disabled={submitting}>
							{#if submitting}<LoaderCircle class="mr-2 size-4 animate-spin" />{/if}
							{m.account_enroll_for_free()}
						</Button>
					</div>
				</ActionForm>
			{:else if step === 3 && data.methods.length === 0}
				<div class="space-y-6">
					<EmptyState
						icon={Wallet}
						title={m.account_no_methods_title()}
						description={m.account_no_methods_description()}
					>
						{#snippet action()}
							<Button variant="outline" href={ROUTES.contact}>{m.account_contact_us()}</Button>
						{/snippet}
					</EmptyState>
					<Button type="button" variant="outline" onclick={() => (chosenStep = 2)}>{m.account_back()}</Button>
				</div>
			{:else if step === 3}
				<div class="space-y-6">
					<div>
						<h2 class="text-lg font-bold text-foreground">{m.account_choose_payment_method_heading()}</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							{m.account_pay_by_transfer({ amount: formatCurrency(amountDue, course.currency) })}
						</p>
					</div>

					{#if rejected}
						<div
							class="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							role="alert"
						>
							<TriangleAlert class="mt-0.5 size-4 shrink-0" />
							<div>
								<p class="font-medium">{m.account_previous_rejected()}</p>
								{#if submission?.rejectionReason}<p class="mt-0.5">{submission.rejectionReason}</p>{/if}
								<p class="mt-0.5">{m.account_submit_new_receipt()}</p>
							</div>
						</div>
					{/if}

					<div class="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={m.account_payment_method()}>
						{#each data.methods as method (method.id)}
							{@render methodCard(method.id, method.name, method.accountName, Landmark)}
						{/each}
					</div>
					{#if errors.paymentMethodId}<p class="text-sm text-destructive">{errors.paymentMethodId}</p>{/if}

					{#if selectedMethod}
						<ActionForm action="?/submit" enctype="multipart/form-data" class="space-y-6" submit={({ cancel }) => {
								receiptError = receiptProblem(receipt, data.maxReceiptBytes);
								if (receiptError) {
									cancel();
									return;
								}
								submitting = true;
								return afterAction(m.account_payment_not_submitted());
							}}>
							<HiddenField name="paymentMethodId" value={selectedMethod.id} />
							<HiddenField name="promoCode" value={promoCode} />

							<Card>
								<CardContent class="space-y-4 p-5">
									<div>
										<h3 class="text-sm font-bold text-foreground">{m.account_method_instructions({ method: selectedMethod.name })}</h3>
										<p class="mt-1 text-sm text-muted-foreground">
											{m.account_send_exactly({ amount: formatCurrency(amountDue, course.currency) })}
										</p>
									</div>

									<dl class="grid gap-2 text-sm sm:grid-cols-2">
										<div>
											<dt class="text-muted-foreground">{m.account_account_name()}</dt>
											<dd class="font-medium text-foreground">{selectedMethod.accountName}</dd>
										</div>
										<div>
											<dt class="text-muted-foreground">{m.account_account_number()}</dt>
											<dd class="font-medium break-all text-foreground">{selectedMethod.accountNumber}</dd>
										</div>
										<div>
											<dt class="text-muted-foreground">{m.account_amount_to_pay()}</dt>
											<dd class="font-medium text-foreground">{formatCurrency(amountDue, course.currency)}</dd>
										</div>
									</dl>

									{#if selectedMethod.instructions}
										<p class="text-sm whitespace-pre-line text-muted-foreground">{selectedMethod.instructions}</p>
									{/if}

									<p
										class="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm text-info"
									>
										<TriangleAlert class="mt-0.5 size-4 shrink-0" />
										{m.account_only_pay_here()}
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardContent class="space-y-4 p-5">
									<h3 class="text-sm font-bold text-foreground">{m.account_confirm_your_payment()}</h3>

									{#if errors.form}
										<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{errors.form}</p>
									{/if}

									<div class="grid gap-4 sm:grid-cols-2">
										<div class="space-y-2">
											<Label for="transactionReference">{m.account_transaction_id()}</Label>
											<Input
												id="transactionReference"
												name="transactionReference"
												placeholder={m.account_transaction_id_placeholder()}
												maxlength={120}
												value={form?.values?.transactionReference ?? ''}
												aria-invalid={errors.transactionReference ? 'true' : undefined}
											/>
											{#if errors.transactionReference}
												<p class="text-sm text-destructive">{errors.transactionReference}</p>
											{/if}
										</div>
										<div class="space-y-2">
											<Label for="amount">{m.account_amount_to_pay_currency({ currency: course.currency })}</Label>
											<Input id="amount" value={amountDue} readonly disabled />
										</div>
									</div>

									<div class="space-y-2">
										<Label>{m.account_payment_receipt()}</Label>
										<FileDrop
											name="receipt"
											accept={RECEIPT_ACCEPT}
											maxSizeBytes={data.maxReceiptBytes}
											bind:file={() => receipt, (file) => ((receipt = file), (receiptError = null))}
											invalid={Boolean(shownReceiptError)}
											disabled={submitting}
										/>
										{#if shownReceiptError}<p class="text-sm text-destructive">{shownReceiptError}</p>{/if}
									</div>
								</CardContent>
							</Card>

							<div class="flex items-center justify-between gap-3">
								<Button type="button" variant="outline" onclick={() => (chosenStep = 2)} disabled={submitting}>
									{m.account_back()}
								</Button>
								<Button type="submit" disabled={submitting}>
									{#if submitting}<LoaderCircle class="mr-2 size-4 animate-spin" />{/if}
									{m.account_submit_payment()}
								</Button>
							</div>
						</ActionForm>
					{/if}
				</div>
			{:else if submission}
				<div class="space-y-6">
					<Card>
						<CardContent class="flex flex-col items-center gap-4 p-8 text-center">
							<span class="flex size-16 items-center justify-center rounded-full bg-success/10 text-success-ink">
								<Clock class="size-9" />
							</span>
							<div>
								<h2 class="text-xl font-bold text-foreground">{m.account_submitted_for_review()}</h2>
								<p class="mt-2 max-w-md text-sm text-muted-foreground">
									{submission.methodName
										? m.account_received_with_method({ method: submission.methodName, title: course.title })
										: m.account_received_payment({ title: course.title })}
								</p>
							</div>
							<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
								<Button size="lg" href={ROUTES.student.courses}>{m.account_go_to_my_courses()}</Button>
								<Button size="lg" variant="outline" href={ROUTES.courses.detail(course.slug)}>{m.account_back_to_course()}</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="space-y-4 p-5">
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-2 text-sm font-semibold text-foreground">
									<Clock class="size-4 text-warning" /> {m.account_awaiting_review()}
								</span>
								<Badge variant="warning">{m.account_pending()}</Badge>
							</div>

							<div class="h-px w-full shrink-0 bg-border"></div>

							<dl class="grid gap-3 text-sm sm:grid-cols-2">
								{#if submission.methodName}
									<div>
										<dt class="text-muted-foreground">{m.account_payment_method()}</dt>
										<dd class="font-medium text-foreground">{submission.methodName}</dd>
									</div>
								{/if}
								<div>
									<dt class="text-muted-foreground">{m.account_transaction_id()}</dt>
									<dd class="font-medium break-all text-foreground">{submission.transactionReference ?? '—'}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">{m.account_amount()}</dt>
									<dd class="font-medium text-foreground">{formatCurrency(submission.amount, submission.currency)}</dd>
								</div>
								{#if submission.promoCode}
									<div>
										<dt class="text-muted-foreground">{m.account_promo_code()}</dt>
										<dd class="font-medium text-foreground">
											{submission.promoCode} (-{formatCurrency(submission.discountAmount, submission.currency)})
										</dd>
									</div>
								{/if}
								<div>
									<dt class="text-muted-foreground">{m.account_submitted()}</dt>
									<dd class="font-medium text-foreground">{dateFormat.format(new Date(submission.submittedAt))}</dd>
								</div>
							</dl>

							<div class="h-px w-full shrink-0 bg-border"></div>

							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<FileText class="size-4 shrink-0" />
								<span class="truncate">{m.account_receipt_uploaded()}</span>
							</div>
						</CardContent>
					</Card>

					{#if !data.hasVerifiedPhone}<SmsUpdatesPrompt returnTo={ROUTES.student.checkout(course.slug)} />{/if}
				</div>
			{/if}
		</div>

		{#if step < 4}
			<div class="space-y-4">
				<OrderSummaryCard {course} promo={data.promo} />
				{#if !data.hasVerifiedPhone}<SmsUpdatesPrompt returnTo={ROUTES.student.checkout(course.slug)} />{/if}
			</div>
		{/if}
	</div>
</div>

{#snippet methodCard(id: number, name: string, detail: string, Icon: typeof Landmark)}
	{@const isSelected = selected === id}
	<button
		type="button"
		role="radio"
		aria-checked={isSelected}
		onclick={() => (chosenMethod = id)}
		disabled={submitting}
		class={cn(
			'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors',
			isSelected ? 'border-brand bg-brand/5' : 'border-border bg-card hover:border-brand/40'
		)}
	>
		<span
			class={cn(
				'flex size-10 shrink-0 items-center justify-center rounded-full',
				isSelected ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'
			)}
		>
			<Icon class="size-5" />
		</span>
		<span class="min-w-0">
			<span class="block text-sm font-semibold text-foreground">{name}</span>
			<span class="block truncate text-xs text-muted-foreground">{detail}</span>
		</span>
	</button>
{/snippet}
