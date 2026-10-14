<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';

	/* One labelled input of the original `AuthForm`: leading icon, show-password toggle, error. */
	let {
		name,
		label,
		type = 'text',
		value = $bindable(''),
		icon: Icon,
		placeholder,
		autocomplete,
		errors,
		disabled = false,
		inputmode,
		maxlength,
		hint,
		labelExtra
	}: {
		name: string;
		label: string;
		type?: 'text' | 'email' | 'password' | 'tel';
		value?: string;
		icon?: Component;
		placeholder?: string;
		autocomplete?: HTMLInputElement['autocomplete'];
		errors?: string[];
		disabled?: boolean;
		inputmode?: HTMLInputAttributes['inputmode'];
		maxlength?: number;
		/** A line under the input, replaced by the error when there is one. */
		hint?: string;
		labelExtra?: Snippet;
	} = $props();

	let visible = $state(false);
	const isPassword = $derived(type === 'password');
	const error = $derived(errors?.[0]);
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<Label for={name}>{label}</Label>
		{@render labelExtra?.()}
	</div>
	<div class="relative">
		{#if Icon}
			<Icon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
		{/if}
		<Input
			id={name}
			{name}
			type={isPassword && visible ? 'text' : type}
			{placeholder}
			{autocomplete}
			{disabled}
			{inputmode}
			{maxlength}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
			class={Icon ? (isPassword ? 'pr-9 pl-9' : 'pl-9') : undefined}
		/>
		{#if isPassword}
			<button
				type="button"
				{disabled}
				onclick={() => (visible = !visible)}
				class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50"
				aria-label={visible ? 'Hide password' : 'Show password'}
			>
				{#if visible}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
			</button>
		{/if}
	</div>
	{#if error}
		<p id="{name}-error" class="text-xs text-destructive">{error}</p>
	{:else if hint}
		<p id="{name}-hint" class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
