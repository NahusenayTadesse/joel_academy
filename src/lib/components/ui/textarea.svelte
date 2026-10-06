<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { textareaClass } from './variants';

	let { class: className, value = $bindable(), ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea bind:value class={cn(textareaClass, className)} {...rest}></textarea>
