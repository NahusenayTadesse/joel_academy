<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Share from '@lucide/svelte/icons/share';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import X from '@lucide/svelte/icons/x';

	let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<!-- iOS has no install prompt: the app can only be added by hand, from Safari's Share menu. -->
<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
		<Dialog.Content
			class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t bg-background p-6 shadow-xl [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
		>
			<Dialog.Title class="text-lg font-semibold text-foreground">Install the app</Dialog.Title>
			<Dialog.Description class="mt-1 text-sm text-muted-foreground">
				Add Joel Talargie Academy to your Home Screen to open it like any other app.
			</Dialog.Description>
			<ol class="mt-5 flex flex-col gap-4 text-sm text-foreground">
				<li class="flex items-center gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
						<Share class="size-4" />
					</span>
					<span>Tap <strong>Share</strong> in Safari's toolbar.</span>
				</li>
				<li class="flex items-center gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
						<SquarePlus class="size-4" />
					</span>
					<span>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span>
				</li>
			</ol>
			<Dialog.Close
				class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-none"
			>
				<X class="size-4" />
				<span class="sr-only">Close</span>
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
