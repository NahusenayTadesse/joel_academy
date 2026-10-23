<script lang="ts">
	import CloudUpload from '@lucide/svelte/icons/cloud-upload';
	import FileIcon from '@lucide/svelte/icons/file';
	import X from '@lucide/svelte/icons/x';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { formatFileSize } from '$lib/receipt';
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * The original drag-and-drop `FileUpload`, built on a real file input so the file posts with
	 * the form. Dropping a file puts it into that input.
	 */
	let {
		name,
		accept,
		maxSizeBytes,
		file = $bindable(null),
		disabled = false,
		invalid = false,
		class: className = ''
	}: {
		name: string;
		accept?: string;
		maxSizeBytes?: number;
		file?: File | null;
		disabled?: boolean;
		invalid?: boolean;
		class?: string;
	} = $props();

	let input = $state<HTMLInputElement>();
	let dragActive = $state(false);

	function sync() {
		file = input?.files?.[0] ?? null;
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const dropped = event.dataTransfer?.files;
		if (!input || !dropped?.length || disabled) return;
		const transfer = new DataTransfer();
		transfer.items.add(dropped[0]);
		input.files = transfer.files;
		sync();
	}

	function remove() {
		if (input) input.value = '';
		sync();
	}
</script>

<div class={cn('space-y-3', className)}>
	<label
		class={cn(
			'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors focus-within:border-brand hover:border-brand/50 hover:bg-muted/40',
			dragActive && 'border-brand bg-brand/5',
			invalid && 'border-destructive/60',
			disabled && 'pointer-events-none opacity-50'
		)}
		ondragover={(event) => {
			event.preventDefault();
			dragActive = true;
		}}
		ondragleave={() => (dragActive = false)}
		ondrop={drop}
	>
		<input bind:this={input} type="file" {name} {accept} {disabled} class="sr-only" onchange={sync} />
		<CloudUpload class="size-8 text-muted-foreground" aria-hidden="true" />
		<p class="text-sm font-medium text-foreground">
			{dragActive ? m.account_drop_file_here() : m.account_drag_drop()}
		</p>
		{#if maxSizeBytes}
			<p class="text-xs text-muted-foreground">{m.account_max_size({ size: formatFileSize(maxSizeBytes) })}</p>
		{/if}
	</label>
	{#if file}
		<ul class="space-y-2">
			<li
				class="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
			>
				<span class="flex min-w-0 items-center gap-2">
					<FileIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span class="truncate">{file.name}</span>
					<span class="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="size-6 shrink-0"
					onclick={remove}
					aria-label={m.account_remove_file({ name: file.name })}
				>
					<X class="size-3.5" />
				</Button>
			</li>
		</ul>
	{/if}
</div>
