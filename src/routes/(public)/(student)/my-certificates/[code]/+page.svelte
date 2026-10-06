<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Ban from '@lucide/svelte/icons/ban';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Share2 from '@lucide/svelte/icons/share-2';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import CertificateSheet from '$lib/components/student/certificate-sheet.svelte';
	import { formatCertificateDate } from '$lib/components/student/certificate-format';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	const certificate = $derived(data.certificate);
	const revoked = $derived(certificate.status === 'REVOKED');
	let copied = $state<'code' | 'link' | null>(null);

	async function copy(text: string, which: 'code' | 'link') {
		try {
			await navigator.clipboard.writeText(text);
			copied = which;
			setTimeout(() => (copied = null), 2000);
		} catch {
			toast.error('Could not copy to the clipboard');
		}
	}

	async function share() {
		const shareData = {
			title: `Certificate - ${certificate.courseTitle}`,
			text: `View my certificate for ${certificate.courseTitle}`,
			url: data.verificationUrl
		};
		if (typeof navigator.share === 'function') {
			try {
				await navigator.share(shareData);
			} catch {
				// The share sheet was dismissed: not an error.
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(data.verificationUrl);
			toast.success('Verification link copied');
		} catch {
			toast.error('Could not copy the link');
		}
	}
</script>

<svelte:head>
	<title>{certificate.courseTitle} · Certificate · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader title={certificate.courseTitle} description="Official Credential • {certificate.code}">
		{#snippet actions()}
			{#if revoked}<Badge variant="outline">Revoked</Badge>{:else}<Badge variant="success">Issued</Badge>{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
		{#if revoked}
			<div
				class="flex aspect-[297/210] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center"
			>
				<Ban class="size-8 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">This certificate has been revoked.</p>
				{#if certificate.revokedReason}<p class="text-xs text-muted-foreground">{certificate.revokedReason}</p>{/if}
			</div>
		{:else}
			<div class="certificate-sheet overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
				<CertificateSheet
					recipientName={certificate.recipientName}
					courseTitle={certificate.courseTitle}
					code={certificate.code}
					issuedAt={certificate.issuedAt}
					verificationUrl={data.verificationUrl}
				/>
			</div>
		{/if}

		<div class="space-y-4">
			<Card>
				<CardContent class="space-y-4 p-5">
					<div class="flex items-center gap-3">
						<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
							<Award class="size-5" />
						</span>
						<div class="min-w-0">
							<p class="truncate text-sm font-semibold text-foreground">{certificate.recipientName}</p>
							<p class="truncate text-xs text-muted-foreground">{certificate.instructorName ?? siteConfig.name}</p>
						</div>
					</div>

					<div class="h-px w-full shrink-0 bg-border"></div>

					<dl class="space-y-3.5 text-xs sm:text-sm">
						<div class="space-y-1">
							<dt class="text-xs font-medium text-muted-foreground">Certificate ID</dt>
							<dd
								class="rounded-lg border border-border bg-muted/40 p-2 font-mono text-xs leading-relaxed font-semibold break-all text-foreground"
							>
								{certificate.code}
							</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Completion Date</dt>
							<dd class="font-medium text-foreground">{formatCertificateDate(certificate.issuedAt)}</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Issue Date</dt>
							<dd class="font-medium text-foreground">{formatCertificateDate(certificate.issuedAt)}</dd>
						</div>
						<div class="space-y-1.5 pt-1">
							<dt class="text-xs font-medium text-muted-foreground">Verification Link</dt>
							<dd
								class="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs text-foreground"
							>
								<a href={data.verificationUrl} target="_blank" rel="noopener" class="truncate hover:underline">
									{data.verificationUrl}
								</a>
								<button
									type="button"
									onclick={() => copy(data.verificationUrl, 'link')}
									class="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
									title="Copy verification link"
									aria-label="Copy verification link"
								>
									{#if copied === 'link'}<Check class="size-3.5 text-emerald-600" />{:else}<Copy class="size-3.5" />{/if}
								</button>
							</dd>
						</div>
						<div class="space-y-1.5">
							<dt class="text-xs font-medium text-muted-foreground">Verification Code</dt>
							<dd
								class="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs text-foreground"
							>
								<span class="truncate">{certificate.token}</span>
								<button
									type="button"
									onclick={() => copy(certificate.token, 'code')}
									class="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
									title="Copy verification code"
									aria-label="Copy verification code"
								>
									{#if copied === 'code'}<Check class="size-3.5 text-emerald-600" />{:else}<Copy class="size-3.5" />{/if}
								</button>
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardContent class="space-y-2 p-5">
					<Button class="w-full gap-2 font-medium" onclick={() => window.print()} disabled={revoked}>
						<Download class="size-4" />
						Download / Print Certificate
					</Button>
					<Button variant="outline" class="w-full gap-2" href={data.verificationUrl} target="_blank" rel="noopener">
						<ExternalLink class="size-4" />
						Open Verification Page
					</Button>
					<Button variant="outline" class="w-full gap-2" onclick={share} disabled={revoked}>
						<Share2 class="size-4" />
						Share Credential
					</Button>
				</CardContent>
			</Card>
		</div>
	</div>
</div>

<style>
	/*
	 * Printing (or "Save as PDF") gives the certificate alone on one A4 landscape page: everything
	 * else is hidden, and the sheet is pinned to the page box.
	 */
	@media print {
		@page {
			size: A4 landscape;
			margin: 0;
		}
		:global(body *) {
			visibility: hidden;
		}
		/* Collapsed so the hidden page behind the sheet does not spill onto a second sheet. */
		:global(.public-site) {
			height: 0;
			min-height: 0;
			overflow: hidden;
		}
		.certificate-sheet,
		.certificate-sheet :global(*) {
			visibility: visible;
		}
		.certificate-sheet {
			position: fixed;
			inset: 0;
			z-index: 2147483647;
			background: white;
			border: 0;
			border-radius: 0;
			box-shadow: none;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}
	}
</style>
