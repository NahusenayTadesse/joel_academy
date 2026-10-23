<script lang="ts">
	import CameraOff from '@lucide/svelte/icons/camera-off';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';

	/*
	 * The original decoded camera frames with `jsqr`, which this app does not ship. Rather than open a
	 * camera that cannot read anything, the scanner keeps its viewport and shows the original's
	 * "Camera Unavailable" panel, pointing people at manual entry instead.
	 */
	let { onSwitchToManual }: { onSwitchToManual?: () => void } = $props();
</script>

<div class="flex w-full flex-col items-center gap-4">
	<div
		class="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black shadow-inner sm:max-w-md"
	>
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/95 p-6 text-center text-foreground"
		>
			<div
				class="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning"
			>
				<CameraOff class="size-7" />
			</div>
			<div class="space-y-1.5">
				<h3 class="text-base font-semibold">{m.info_verify_camera_unavailable()}</h3>
				<p class="max-w-xs text-xs text-muted-foreground">
					{m.info_verify_camera_unavailable_body()}
				</p>
			</div>
			{#if onSwitchToManual}
				<div class="flex w-full max-w-xs flex-col gap-2">
					<Button size="sm" onclick={onSwitchToManual} class="w-full gap-2">
						<KeyRound class="size-3.5" />
						{m.info_verify_enter_manually()}
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
