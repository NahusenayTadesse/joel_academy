<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Ban from '@lucide/svelte/icons/ban';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import Download from '@lucide/svelte/icons/download';
	import Printer from '@lucide/svelte/icons/printer';
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
	import { m } from '$lib/paraglide/messages';
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
			toast.error(m.learn_cert_copy_failed());
		}
	}

	async function share() {
		const shareData = {
			title: m.learn_cert_share_title({ title: certificate.courseTitle }),
			text: m.learn_cert_share_text({ title: certificate.courseTitle }),
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
			toast.success(m.learn_cert_link_copied());
		} catch {
			toast.error(m.learn_cert_link_copy_failed());
		}
	}
</script>

<svelte:head>
	<title>{certificate.courseTitle} · {m.learn_certificate()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader title={certificate.courseTitle} description={m.learn_cert_official({ code: certificate.code })}>
		{#snippet actions()}
			{#if revoked}<Badge variant="outline">{m.learn_revoked()}</Badge>{:else}<Badge variant="success">{m.learn_issued()}</Badge>{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
		{#if revoked}
			<div
				class="flex aspect-[297/210] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center"
			>
				<Ban class="size-8 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">{m.learn_cert_revoked_notice()}</p>
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
					qr={data.qr}
				/>
			</div>
		{/if}

		<div class="space-y-4">
			<Card>
				<CardContent class="space-y-4 p-5">
					<div class="flex items-center gap-3">
						<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
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
							<dt class="text-xs font-medium text-muted-foreground">{m.learn_cert_id()}</dt>
							<dd
								class="rounded-lg border border-border bg-muted/40 p-2 font-mono text-xs leading-relaxed font-semibold break-all text-foreground"
							>
								{certificate.code}
							</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">{m.learn_cert_completion_date()}</dt>
							<dd class="font-medium text-foreground">{formatCertificateDate(certificate.issuedAt)}</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">{m.learn_cert_issue_date()}</dt>
							<dd class="font-medium text-foreground">{formatCertificateDate(certificate.issuedAt)}</dd>
						</div>
						<div class="space-y-1.5 pt-1">
							<dt class="text-xs font-medium text-muted-foreground">{m.learn_cert_verification_link()}</dt>
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
									title={m.learn_cert_copy_link()}
									aria-label={m.learn_cert_copy_link()}
								>
									{#if copied === 'link'}<Check class="size-3.5 text-emerald-700" />{:else}<Copy class="size-3.5" />{/if}
								</button>
							</dd>
						</div>
						<div class="space-y-1.5">
							<dt class="text-xs font-medium text-muted-foreground">{m.learn_cert_verification_code()}</dt>
							<dd
								class="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs text-foreground"
							>
								<span class="truncate">{certificate.token}</span>
								<button
									type="button"
									onclick={() => copy(certificate.token, 'code')}
									class="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
									title={m.learn_cert_copy_code()}
									aria-label={m.learn_cert_copy_code()}
								>
									{#if copied === 'code'}<Check class="size-3.5 text-emerald-700" />{:else}<Copy class="size-3.5" />{/if}
								</button>
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardContent class="space-y-2 p-5">
					{#if data.pdfHref}
						<!-- A file, not a page: `download` keeps SvelteKit's router out of it. -->
						<Button class="w-full gap-2 font-medium" href={data.pdfHref} download data-sveltekit-reload>
							<Download class="size-4" />
							{m.learn_cert_download_pdf()}
						</Button>
					{:else}
						<Button class="w-full gap-2 font-medium" disabled>
							<Download class="size-4" />
							{m.learn_cert_download_pdf()}
						</Button>
					{/if}
					<Button variant="outline" class="w-full gap-2" onclick={() => window.print()} disabled={revoked}>
						<Printer class="size-4" />
						{m.learn_cert_print()}
					</Button>
					<Button variant="outline" class="w-full gap-2" href={data.verificationUrl} target="_blank" rel="noopener">
						<ExternalLink class="size-4" />
						{m.learn_cert_open_verification()}
					</Button>
					<Button variant="outline" class="w-full gap-2" onclick={share} disabled={revoked}>
						<Share2 class="size-4" />
						{m.learn_cert_share()}
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
