<script lang="ts">
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CertificateVerificationResult from '$lib/components/info/certificate-verification-result.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { siteConfig } from '$lib/site';

	let { data } = $props();
</script>

<svelte:head>
	<title>Verify Certificate · {siteConfig.name}</title>
	<meta
		name="description"
		content="Official digital credential verification result for Joel Talargie Academy certificate of completion."
	/>
</svelte:head>

<div class="relative min-h-[calc(100vh-4rem)] overflow-hidden py-12 sm:py-16">
	<!-- Background glow accent -->
	<div
		class="pointer-events-none absolute top-0 left-1/2 -z-10 h-[450px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/5 blur-3xl"
		aria-hidden="true"
	></div>

	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 sm:px-6">
		<div class="space-y-2 text-center">
			<div
				class="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold text-brand-ink"
			>
				<ShieldCheck class="size-3.5" />
				Official Credential Verification
			</div>
		</div>

		<Card class="w-full border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
			<CardContent class="p-2 sm:p-4">
				<CertificateVerificationResult result={data.result} />
			</CardContent>
		</Card>

		<div class="max-w-sm text-center text-xs text-muted-foreground/80">
			Official tamper-evident credential registry record • Joel Talargie Academy
		</div>
	</div>
</div>
