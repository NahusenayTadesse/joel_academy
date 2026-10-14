<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import { pwa } from '$lib/pwa.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';
	import IosInstallDialog from './ios-install-dialog.svelte';

	let {
		variant = 'icon',
		class: className = '',
		onDone
	}: {
		/** `icon` for the header; `menu` for a full-width row in the phone menu. */
		variant?: 'icon' | 'menu';
		class?: string;
		onDone?: () => void;
	} = $props();

	let iosOpen = $state(false);
	const visible = $derived(pwa.canInstall || pwa.needsManualInstall);

	async function install() {
		if (pwa.needsManualInstall) {
			iosOpen = true;
			return;
		}
		if (await pwa.install()) toast.success('Installing Joel Talargie Academy', { description: 'Find it with your other apps.' });
		onDone?.();
	}
</script>

{#if visible}
	{#if variant === 'icon'}
		<Button
			variant="ghost"
			size="icon"
			onclick={install}
			aria-label="Install the app"
			title="Install the app"
			class={cn('size-9 rounded-lg text-foreground', className)}
		>
			<Download class="size-4" />
		</Button>
	{:else}
		<button
			type="button"
			onclick={install}
			class={cn(
				'flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-brand-ink hover:bg-accent',
				className
			)}
		>
			<Download class="size-4" />
			Install the app
		</button>
	{/if}
{/if}

<IosInstallDialog bind:open={iosOpen} />
