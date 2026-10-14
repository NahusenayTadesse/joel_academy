<script lang="ts">
	import type { Writable } from 'svelte/store';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { QUIZ_MAX_OPTIONS } from '../../schema';

	/** Loose for the reason the kit's `InputComp` gives: fields are indexed by name. */
	type FormStore = Writable<Record<string, any>>;

	/**
	 * A question's fields for the add and edit dialogs: the prompt, its options (each with a
	 * "correct" tick) and an explanation. Options post as repeated `options` inputs and the ticks
	 * as `correct` checkboxes valued with the option's position.
	 */
	let {
		form,
		errors,
		values
	}: {
		form: FormStore;
		errors: FormStore;
		values: Record<string, unknown>;
	} = $props();

	const options = $derived((values.options as string[] | undefined) ?? []);
	const correct = $derived((values.correct as number[] | undefined) ?? []);
	const multiple = $derived(correct.filter((index) => (options[index] ?? '').trim()).length > 1);

	function setOption(index: number, text: string) {
		form.update((current) => {
			const next = [...(current.options as string[])];
			next[index] = text;
			return { ...current, options: next };
		});
	}

	function toggleCorrect(index: number, checked: boolean) {
		form.update((current) => {
			const rest = (current.correct as number[]).filter((value) => value !== index);
			return { ...current, correct: checked ? [...rest, index].sort((a, b) => a - b) : rest };
		});
	}

	function addOption() {
		form.update((current) => ({ ...current, options: [...(current.options as string[]), ''] }));
	}

	/* Removing an option shifts the ones after it, so the correct ticks follow their options. */
	function removeOption(index: number) {
		form.update((current) => ({
			...current,
			options: (current.options as string[]).filter((_, position) => position !== index),
			correct: (current.correct as number[])
				.filter((value) => value !== index)
				.map((value) => (value > index ? value - 1 : value))
		}));
	}
</script>

<InputComp {form} {errors} name="prompt" label="Question" type="textarea" rows={3} required />

<fieldset class="flex flex-col gap-2 px-1">
	<legend class="mb-1 text-sm font-medium">Answer options</legend>
	<p class="text-xs text-muted-foreground">
		Tick every correct option. {multiple
			? 'More than one is ticked, so students must pick exactly those (checkboxes).'
			: 'With one ticked, students pick a single answer.'} Blank options are left out.
	</p>
	{#each options as option, index (index)}
		<div class="flex items-center gap-2">
			<input
				type="checkbox"
				name="correct"
				value={index}
				checked={correct.includes(index)}
				onchange={(event) => toggleCorrect(index, event.currentTarget.checked)}
				class="size-4 shrink-0 accent-primary"
				aria-label="Option {index + 1} is correct"
			/>
			<Input
				name="options"
				value={option}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) => setOption(index, event.currentTarget.value)}
				placeholder="Option {index + 1}"
				maxlength={500}
				aria-label="Option {index + 1}"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-8 shrink-0"
				disabled={options.length <= 2}
				onclick={() => removeOption(index)}
				aria-label="Remove option {index + 1}"
			>
				<X class="size-4" />
			</Button>
		</div>
	{/each}
	{#if ($errors.options as { _errors?: string[] } | undefined)?._errors?.length}
		<p class="text-xs text-destructive">{($errors.options as { _errors: string[] })._errors[0]}</p>
	{/if}
	{#if ($errors.correct as { _errors?: string[] } | undefined)?._errors?.length}
		<p class="text-xs text-destructive">{($errors.correct as { _errors: string[] })._errors[0]}</p>
	{/if}
	<Button
		type="button"
		variant="outline"
		size="sm"
		class="self-start"
		disabled={options.length >= QUIZ_MAX_OPTIONS}
		onclick={addOption}
	>
		<Plus class="size-4" /> Add option
	</Button>
</fieldset>

<InputComp
	{form}
	{errors}
	name="explanation"
	label="Explanation (optional)"
	type="textarea"
	rows={3}
	description="Shown after an attempt, to teach why the answer is right."
/>
