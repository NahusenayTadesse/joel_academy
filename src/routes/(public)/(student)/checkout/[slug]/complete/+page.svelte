<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Clock from '@lucide/svelte/icons/clock';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { invalidateAll } from '$app/navigation';
	import PageBreadcrumb from '$lib/components/common/page-breadcrumb.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import CheckoutStepper from '$lib/components/student/checkout-stepper.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { formatCurrency } from '$lib/format';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const course = $derived(data.course);
	const payment = $derived(data.payment);
	let checking = $state(false);

	const breadcrumbs = $derived([
		{ label: 'Home', href: ROUTES.home },
		{ label: 'Courses', href: ROUTES.courses.list },
		{ label: course.title, href: ROUTES.courses.detail(course.slug) },
		{ label: 'Checkout', href: ROUTES.student.checkout(course.slug) },
		{ label: 'Payment' }
	]);

	const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

	/** Asks the server to verify with Chapa again; the link still works without JavaScript. */
	async function checkAgain(event: MouseEvent) {
		event.preventDefault();
		checking = true;
		try {
			await invalidateAll();
		} finally {
			checking = false;
		}
	}
</script>

<svelte:head>
	<title>Payment · {course.title} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
	<div class="mb-4">
		<PageBreadcrumb items={breadcrumbs} />
	</div>

	<PageHeader title="Checkout" description="Enrolling in {course.title}" />

	<div class="mb-2">
		<CheckoutStepper currentStep={data.state === 'paid' ? 4 : 3} />
	</div>

	<Card>
		<CardContent class="flex flex-col items-center gap-4 p-8 text-center">
			{#if data.state === 'paid'}
				<span class="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
					<CircleCheck class="size-9" />
				</span>
				<div>
					<h2 class="text-xl font-bold text-foreground">You're enrolled!</h2>
					<p class="mt-2 max-w-md text-sm text-muted-foreground">
						Your payment through Chapa is confirmed and you now have full access to "{course.title}". Jump in
						whenever you're ready.
					</p>
				</div>
				<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
					<Button size="lg" href={ROUTES.student.learn(course.slug)}>Start learning</Button>
					<Button size="lg" variant="outline" href={ROUTES.student.courses}>Go to My Courses</Button>
				</div>
			{:else if data.state === 'pending'}
				<span class="flex size-16 items-center justify-center rounded-full bg-warning/10 text-warning">
					<Clock class="size-9" />
				</span>
				<div>
					<h2 class="text-xl font-bold text-foreground">Your payment is still processing</h2>
					<p class="mt-2 max-w-md text-sm text-muted-foreground">
						Chapa hasn't confirmed this payment yet. If you completed it, this usually takes a moment - check
						again shortly. You'll be enrolled automatically as soon as it's confirmed.
					</p>
				</div>
				<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
					<Button size="lg" href="?tx_ref={encodeURIComponent(payment.txRef)}" onclick={checkAgain} disabled={checking}>
						{#if checking}<LoaderCircle class="size-4 animate-spin" />{:else}<RefreshCw class="size-4" />{/if}
						Check again
					</Button>
					<Button size="lg" variant="outline" href={ROUTES.student.checkout(course.slug)}>Back to checkout</Button>
				</div>
			{:else}
				<span class="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
					<CircleX class="size-9" />
				</span>
				<div>
					<h2 class="text-xl font-bold text-foreground">Your payment didn't go through</h2>
					<p class="mt-2 max-w-md text-sm text-muted-foreground">
						{data.reason ?? 'Chapa did not confirm this payment.'} You have not been enrolled. If money left your account,
						contact us with the reference below and we'll sort it out.
					</p>
				</div>
				<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
					<Button size="lg" href={ROUTES.student.checkout(course.slug)}>Try again</Button>
					<Button size="lg" variant="outline" href={ROUTES.contact}>Contact us</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardContent class="space-y-4 p-5">
			<div class="flex items-center justify-between">
				<span class="flex items-center gap-2 text-sm font-semibold text-foreground">
					<CreditCard class="size-4 text-muted-foreground" /> Chapa payment
				</span>
				{#if data.state === 'paid'}
					<Badge variant="success">Paid</Badge>
				{:else if data.state === 'pending'}
					<Badge variant="warning">Processing</Badge>
				{:else}
					<Badge variant="destructive">Failed</Badge>
				{/if}
			</div>

			<div class="h-px w-full shrink-0 bg-border"></div>

			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-muted-foreground">Amount</dt>
					<dd class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</dd>
				</div>
				{#if Number(payment.discountAmount) > 0}
					<div>
						<dt class="text-muted-foreground">Promo discount</dt>
						<dd class="font-medium text-foreground">-{formatCurrency(payment.discountAmount, payment.currency)}</dd>
					</div>
				{/if}
				<div>
					<dt class="text-muted-foreground">Payment reference</dt>
					<dd class="font-medium break-all text-foreground">{payment.txRef}</dd>
				</div>
				{#if payment.reference}
					<div>
						<dt class="text-muted-foreground">Chapa reference</dt>
						<dd class="font-medium break-all text-foreground">{payment.reference}</dd>
					</div>
				{/if}
				<div>
					<dt class="text-muted-foreground">Started</dt>
					<dd class="font-medium text-foreground">{dateTimeFormat.format(new Date(payment.createdAt))}</dd>
				</div>
				{#if payment.verifiedAt}
					<div>
						<dt class="text-muted-foreground">{data.state === 'paid' ? 'Confirmed' : 'Checked'}</dt>
						<dd class="font-medium text-foreground">{dateTimeFormat.format(new Date(payment.verifiedAt))}</dd>
					</div>
				{/if}
			</dl>
		</CardContent>
	</Card>
</div>
