<script lang="ts">
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CertificateLookupForm from '$lib/components/info/certificate-lookup-form.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { siteConfig } from '$lib/site';

	let { data } = $props();
</script>

<svelte:head>
	<title>Verify Certificate · {siteConfig.name}</title>
	<meta
		name="description"
		content="Verify the authenticity of Joel Talargie Academy certificates. Scan the QR code or enter the unique certificate ID to validate credentials instantly."
	/>
</svelte:head>

<div class="relative min-h-[calc(100vh-4rem)] overflow-hidden py-12 sm:py-16">
	<!-- Subtle background glow accent -->
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
			<h1 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
				Verify a Certificate
			</h1>
			<p class="mx-auto max-w-md text-sm text-muted-foreground">
				Confirm that a Joel Talargie Academy certificate of completion is genuine, verified, and
				active.
			</p>
		</div>

		<Card class="w-full border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
			<CardContent class="p-6 sm:p-8">
				<CertificateLookupForm initialIdentifier={data.identifier} result={data.result} />
			</CardContent>
		</Card>

		<!-- Security assurance notice -->
		<div class="max-w-sm text-center text-xs text-muted-foreground">
			All certificates issued by Joel Talargie Academy are protected by tamper-evident verification
			tokens and cryptographically validated against our central registry.
		</div>
	</div>
</div>
