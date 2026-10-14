<script lang="ts">
	/*
	 * The bot traps for a form (see $lib/server/spam). The honeypot sits off screen, out of the tab
	 * order and hidden from screen readers, so only something filling every input fills it.
	 */
	let { token }: { token?: string } = $props();
</script>

<div aria-hidden="true" class="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
	<label>
		Website
		<input type="text" name="website" tabindex="-1" autocomplete="off" value="" />
	</label>
</div>
{#if token}<input type="hidden" name="formToken" value={token} />{/if}
