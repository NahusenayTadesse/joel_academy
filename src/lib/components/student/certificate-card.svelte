<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Badge from '$lib/components/ui/badge.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { formatCertificateDate } from './certificate-format';

	let {
		certificate,
		href,
		class: className = ''
	}: {
		certificate: {
			code: string;
			courseTitle: string;
			recipientName: string;
			issuedAt: string;
			status: 'ISSUED' | 'REVOKED';
		};
		href: string;
		class?: string;
	} = $props();
</script>

<Card class={cn('overflow-hidden transition-shadow hover:shadow-md', className)}>
	<a {href} class="flex h-full flex-col gap-4 p-5">
		<div class="flex items-start justify-between gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
				<Award class="size-5" aria-hidden="true" />
			</span>
			{#if certificate.status === 'ISSUED'}
				<Badge variant="success">Issued</Badge>
			{:else}
				<Badge variant="outline">Revoked</Badge>
			{/if}
		</div>
		<div>
			<h3 class="line-clamp-2 text-sm font-semibold text-foreground">{certificate.courseTitle}</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">{certificate.recipientName}</p>
			<p class="mt-1 truncate font-mono text-[11px] text-muted-foreground">{certificate.code}</p>
		</div>
		<p class="mt-auto text-xs text-muted-foreground">Issued {formatCertificateDate(certificate.issuedAt)}</p>
	</a>
</Card>
