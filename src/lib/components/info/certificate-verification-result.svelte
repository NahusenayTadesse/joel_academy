<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Printer from '@lucide/svelte/icons/printer';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES } from '$lib/site';
	import type { CertificateVerification } from './certificate-verification';

	let {
		result,
		onVerifyAnother
	}: { result: CertificateVerification; onVerifyAnother?: () => void } = $props();

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	/** "Jan 4, 2026", or an em dash for an unparseable date - as the original's formatDate. */
	function formatDate(value: string) {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
	}
</script>

{#snippet field(label: string, value: string, ddClass: string, wide = false)}
	<div class={wide ? 'sm:col-span-2' : undefined}>
		<dt class="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
		<dd class={ddClass}>{value}</dd>
	</div>
{/snippet}

<div class="flex w-full flex-col items-center gap-6 p-6 text-center sm:p-8">
	{#if result.state === 'VALID'}
		<div class="flex flex-col items-center gap-3">
			<div class="relative">
				<span
					class="flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5"
				>
					<CircleCheck class="size-10 stroke-[2.5]" />
				</span>
				<span
					class="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm"
				>
					<ShieldCheck class="size-4" />
				</span>
			</div>
			<div>
				<div
					class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400"
				>
					Official Credential Verified
				</div>
				<h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
					Certificate Verified
				</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					This credential is valid and authentically issued by Joel Talargie Academy.
				</p>
			</div>
		</div>
	{:else if result.state === 'REVOKED'}
		<div class="flex flex-col items-center gap-3">
			<span
				class="flex size-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5"
			>
				<TriangleAlert class="size-10 stroke-[2.5]" />
			</span>
			<div>
				<div
					class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400"
				>
					Credential Status
				</div>
				<h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
					Certificate Revoked
				</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					This certificate was officially issued but has since been revoked by the academy.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-3">
			<span
				class="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5"
			>
				<CircleX class="size-10 stroke-[2.5]" />
			</span>
			<div>
				<div
					class="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold tracking-wider text-destructive uppercase"
				>
					Lookup Failed
				</div>
				<h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
					Certificate Not Found
				</h1>
				<p class="mt-1.5 max-w-sm text-sm text-muted-foreground">
					The certificate code you entered could not be verified. Please check the ID or QR code
					link and try again.
				</p>
			</div>
		</div>
	{/if}

	{#if result.state !== 'INVALID'}
		<div
			class="w-full rounded-xl border border-border/80 bg-card/60 p-5 text-left backdrop-blur-sm sm:p-6"
		>
			<div class="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<span class="flex size-7 items-center justify-center rounded-md bg-brand/10 text-brand-ink">
						<GraduationCap class="size-4" />
					</span>
					<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
						Certificate of Completion
					</span>
				</div>
				{#if result.state === 'VALID'}
					<Badge
						variant="default"
						class="gap-1 bg-emerald-700 px-2.5 py-0.5 text-white hover:bg-emerald-700"
					>
						<CircleCheck class="size-3" />
						VALID
					</Badge>
				{:else}
					<Badge variant="destructive" class="gap-1 px-2.5 py-0.5">
						<TriangleAlert class="size-3" />
						REVOKED
					</Badge>
				{/if}
			</div>

			<dl class="grid grid-cols-1 gap-x-4 gap-y-3.5 text-sm sm:grid-cols-2">
				{#if result.studentName}
					{@render field(
						'Awarded to Student',
						result.studentName,
						'mt-0.5 text-lg font-bold tracking-tight text-foreground',
						true
					)}
				{/if}
				{#if result.courseTitle}
					{@render field('Course', result.courseTitle, 'mt-0.5 font-semibold text-foreground', true)}
				{/if}
				{@render field('Issued By', 'Joel Talargie Academy', 'mt-0.5 font-medium text-foreground')}
				{#if result.certificateNumber}
					{@render field(
						'Certificate ID',
						result.certificateNumber,
						'mt-0.5 font-mono text-xs font-bold tracking-wide break-all text-foreground'
					)}
				{/if}
				{#if result.completionDate}
					{@render field(
						'Completion Date',
						formatDate(result.completionDate),
						'mt-0.5 font-medium text-foreground'
					)}
				{/if}
				{#if result.issuedAt}
					{@render field('Issue Date', formatDate(result.issuedAt), 'mt-0.5 font-medium text-foreground')}
				{/if}
			</dl>

			<div
				class="mt-5 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
			>
				<ShieldCheck class="size-4 shrink-0 text-emerald-500" />
				<span>
					Cryptographically registered credential • Tamper-evident record verified against Joel
					Talargie Academy public ledger.
				</span>
			</div>
		</div>
	{/if}

	<div class="flex w-full flex-wrap items-center justify-center gap-3 pt-2">
		{#if onVerifyAnother}
			<Button variant="outline" onclick={onVerifyAnother} class="gap-2">
				<RotateCcw class="size-4" />
				Verify Another Certificate
			</Button>
		{:else}
			<Button variant="outline" href={ROUTES.certificates.verifyLookup} class="gap-2">
				<RotateCcw class="size-4" />
				Verify Another Certificate
			</Button>
		{/if}

		{#if result.state === 'VALID'}
			<Button variant="secondary" onclick={() => window.print()} class="gap-2">
				<Printer class="size-4" />
				Print Record
			</Button>
		{/if}

		<Button variant="ghost" href={ROUTES.courses.list} class="gap-1.5 text-xs text-muted-foreground">
			<span>Browse Courses</span>
			<ExternalLink class="size-3.5" />
		</Button>
	</div>
</div>
