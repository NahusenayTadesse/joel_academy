<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import X from '@lucide/svelte/icons/x';
	import { cn } from '@nahu/admin-kit/utils.js';
	import type { QuizResult, QuizView } from './types';

	/*
	 * One question: answerable inputs (named `q-<id>`, valued with option ids) until the attempt is
	 * graded, then a read-only review. Right options are marked only where the server revealed them.
	 */
	let {
		question,
		number,
		result,
		disabled = false
	}: {
		question: QuizView['questions'][number];
		number: number;
		/** The graded answer to this question; absent while answering. */
		result?: QuizResult['results'][number];
		disabled?: boolean;
	} = $props();

	const revealed = $derived(Boolean(result && result.correctOptionIds.length > 0));
	const promptId = $derived(`quiz-q-${question.id}`);
</script>

<fieldset
	class={cn(
		'rounded-2xl border bg-white/[0.03] p-5 sm:p-6',
		!result && 'border-sidebar-border',
		result?.correct && 'border-sidebar-primary/50',
		result && !result.correct && 'border-red-400/40'
	)}
	aria-describedby={promptId}
>
	<legend class="sr-only">Question {number}</legend>
	<div class="flex items-center justify-between gap-3">
		<span class="text-xs font-semibold tracking-wider text-sidebar-foreground/60 uppercase" aria-hidden="true">
			Question {number}
		</span>
		{#if result}
			<span
				class={cn(
					'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
					result.correct ? 'bg-sidebar-primary/15 text-sidebar-primary' : 'bg-red-500/15 text-red-300'
				)}
			>
				{#if result.correct}<Check class="size-3.5" aria-hidden="true" /> Correct{:else}<X
						class="size-3.5"
						aria-hidden="true"
					/> Incorrect{/if}
			</span>
		{:else if question.allowMultiple}
			<span class="text-xs text-sidebar-foreground/60">Select all that apply</span>
		{/if}
	</div>
	<p id={promptId} class="mt-2 text-base leading-relaxed font-medium whitespace-pre-line text-white">
		{question.prompt}
	</p>

	<div class="mt-4 grid gap-2">
		{#each question.options as option (option.id)}
			{#if result}
				{@const picked = result.selected.includes(option.id)}
				{@const right = result.correctOptionIds.includes(option.id)}
				<div
					class={cn(
						'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
						revealed && right && 'border-sidebar-primary/60 bg-sidebar-primary/10 text-white',
						revealed && picked && !right && 'border-red-400/50 bg-red-500/10 text-white',
						!revealed && picked && 'border-white/30 bg-white/10 text-white',
						!picked && !(revealed && right) && 'border-sidebar-border text-sidebar-foreground/60'
					)}
				>
					<span
						class={cn(
							'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
							question.allowMultiple ? 'rounded' : 'rounded-full',
							picked ? 'border-white/70 bg-white/80' : 'border-white/30'
						)}
						aria-hidden="true"
					>
						{#if picked}<span class={cn('size-2 bg-sidebar', question.allowMultiple ? 'rounded-[2px]' : 'rounded-full')}></span>{/if}
					</span>
					<span class="flex-1">{option.text}</span>
					{#if revealed && right}
						<span class="shrink-0 text-xs font-semibold text-sidebar-primary">
							{picked ? 'Your answer · correct' : 'Correct answer'}
						</span>
					{:else if picked}
						<span class={cn('shrink-0 text-xs font-semibold', revealed ? 'text-red-300' : 'text-sidebar-foreground/70')}>
							Your answer
						</span>
					{/if}
				</div>
			{:else}
				<label
					class={cn(
						'flex items-start gap-3 rounded-xl border border-sidebar-border px-4 py-3 text-sm text-sidebar-foreground/90 transition-colors',
						'has-[:checked]:border-sidebar-primary has-[:checked]:bg-sidebar-primary/10 has-[:checked]:text-white',
						'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sidebar-ring',
						disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-white/30 hover:bg-white/5'
					)}
				>
					<input
						type={question.allowMultiple ? 'checkbox' : 'radio'}
						name="q-{question.id}"
						value={option.id}
						{disabled}
						class="mt-0.5 size-4 shrink-0 accent-sidebar-primary focus-visible:outline-none"
					/>
					<span class="flex-1">{option.text}</span>
				</label>
			{/if}
		{/each}
	</div>

	{#if result?.explanation}
		<div class="mt-4 flex gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm text-sidebar-foreground/80">
			<Lightbulb class="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
			<div>
				<p class="font-semibold text-white">Explanation</p>
				<p class="mt-1 whitespace-pre-line">{result.explanation}</p>
			</div>
		</div>
	{/if}
</fieldset>
