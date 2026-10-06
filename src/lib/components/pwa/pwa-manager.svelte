<script lang="ts">
	import { onMount } from 'svelte';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import { toast } from 'svelte-sonner';
	import { onNavigate } from '$app/navigation';
	import { pwa } from '$lib/pwa.svelte';

	onMount(() => pwa.start());

	// A new version is installed and waiting: offer it, never force a reload mid-lesson.
	$effect(() => {
		if (!pwa.updateReady) return;
		toast('A new version is available', {
			description: 'Reload to get the latest improvements.',
			duration: Number.POSITIVE_INFINITY,
			action: { label: 'Reload', onClick: () => pwa.applyUpdate() }
		});
	});

	/*
	 * App-like page changes: a short cross-fade between routes through the View Transitions API.
	 * Changes within one route (catalog filters, the next lesson) update in place, untransitioned,
	 * and browsers without the API (or with reduced motion requested) just swap the page.
	 */
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (navigation.from?.route.id === navigation.to?.route.id) return;
		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{#if !pwa.online}
	<div
		role="status"
		class="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 [bottom:max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] standalone:max-md:[bottom:calc(4.5rem+env(safe-area-inset-bottom))]"
	>
		<span
			class="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg"
		>
			<WifiOff class="size-3.5" />
			You're offline. Saved pages still work.
		</span>
	</div>
{/if}
