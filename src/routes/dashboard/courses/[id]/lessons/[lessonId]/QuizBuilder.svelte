<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Save from '@lucide/svelte/icons/save';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Trash from '@lucide/svelte/icons/trash';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Card, CardContent } from '@nahu/admin-kit/components/ui/card/index.js';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { cn } from '@nahu/admin-kit/utils.js';
	import MoveButtons from '../../MoveButtons.svelte';
	import { passingScoreSchema, questionEditSchema, questionSchema } from '../../schema';
	import QuestionFields from './QuestionFields.svelte';
	import type { PageData } from './$types';

	type Question = PageData['quiz']['questions'][number];

	/** The quiz part of the lesson editor: the pass mark and the questions, each saved on its own. */
	let {
		questions,
		questionAddForm,
		questionEditForm,
		passingForm,
		savedAsQuiz
	}: PageData['quiz'] & {
		/** The stored lesson type is QUIZ (the editor may show QUIZ before it is saved). */
		savedAsQuiz: boolean;
	} = $props();

	// Seeded once from the load; after a save superforms keeps what the server returned.
	// svelte-ignore state_referenced_locally
	const passing = createForm(passingForm, passingScoreSchema, { resetForm: false });
	const { form: passingValues, errors: passingErrors, delayed: passingDelayed } = passing;

	let editOpen = $state(false);
	let editSeed = $state<Record<string, unknown>>();

	function edit(question: Question) {
		editSeed = {
			id: question.id,
			prompt: question.prompt,
			explanation: question.explanation ?? '',
			options: question.options.map((option) => option.text),
			correct: question.options.flatMap((option, index) => (option.isCorrect ? [index] : []))
		};
		editOpen = true;
	}
</script>

<PageSection
	title="Quiz"
	hint="Students pass by scoring at least the pass mark; passing is the only way to complete this lesson."
>
	{#snippet actions()}
		<FormDialog
			title="Add a question"
			triggerLabel="Add question"
			submitLabel="Add question"
			action="?/addQuestion"
			data={questionAddForm}
			schema={questionSchema}
			resetOnSuccess
		>
			{#snippet fields({ form, errors, values })}
				<QuestionFields {form} {errors} {values} />
			{/snippet}
		</FormDialog>
	{/snippet}

	<div class="flex flex-col gap-4">
		{#if !savedAsQuiz}
			<Notice tone="warning">Save the lesson with the type “Quiz” for students to get these questions.</Notice>
		{/if}
		{#if !questions.length}
			<Notice tone="warning" title="No questions yet. ">
				Students cannot pass, or complete, a quiz until it has at least one question.
			</Notice>
		{/if}

		<form method="post" action="?/savePassingScore" use:passing.enhance class="flex flex-wrap items-end gap-3">
			<div class="w-48">
				<InputComp
					form={passingValues}
					errors={passingErrors}
					name="passingScore"
					label="Pass mark (%)"
					type="number"
					placeholder="70"
					description="Blank means 70%."
				/>
			</div>
			<Button type="submit" variant="outline" class="mb-1">
				{#if $passingDelayed}
					<LoadingBtn name="Saving" />
				{:else}
					<Save class="size-4" /> Save pass mark
				{/if}
			</Button>
		</form>

		{#each questions as question, index (question.id)}
			<Card>
				<CardContent class="flex flex-col gap-3 p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<p class="text-xs font-semibold text-muted-foreground uppercase">
								Question {index + 1}
								{#if question.allowMultiple}<Badge variant="secondary" class="ml-1 normal-case">Several correct</Badge>{/if}
							</p>
							<p class="mt-1 font-medium whitespace-pre-line">{question.prompt}</p>
						</div>
						<div class="flex items-center gap-1">
							<MoveButtons
								action="?/moveQuestion"
								id={question.id}
								first={index === 0}
								last={index === questions.length - 1}
								label="question"
							/>
							<Button variant="ghost" size="sm" onclick={() => edit(question)}>
								<SquarePen class="size-4" /> Edit
							</Button>
							<ConfirmAction
								action="?/deleteQuestion"
								label="Delete"
								variant="ghost"
								icon={Trash}
								title="Delete question {index + 1}?"
								description="Past attempts keep their scores. This cannot be undone."
								fields={{ id: question.id }}
								disabled={savedAsQuiz && questions.length === 1}
							/>
						</div>
					</div>
					<ul class="grid gap-1.5 sm:grid-cols-2">
						{#each question.options as option (option.id)}
							<li
								class={cn(
									'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
									option.isCorrect ? 'border-success/50 bg-success/10' : 'text-muted-foreground'
								)}
							>
								{#if option.isCorrect}
									<Check class="mt-0.5 size-4 shrink-0 text-success-ink" aria-label="Correct" />
								{:else}
									<span class="mt-0.5 size-4 shrink-0" aria-hidden="true"></span>
								{/if}
								<span>{option.text}</span>
							</li>
						{/each}
					</ul>
					{#if question.explanation}
						<p class="text-sm text-muted-foreground">
							<span class="font-medium text-foreground">Explanation:</span>
							{question.explanation}
						</p>
					{/if}
				</CardContent>
			</Card>
		{/each}
	</div>
</PageSection>

<FormDialog
	title="Edit question"
	action="?/editQuestion"
	data={questionEditForm}
	schema={questionEditSchema}
	bind:open={editOpen}
	seed={editSeed}
	hideTrigger
>
	{#snippet fields({ form, errors, values })}
		<input type="hidden" name="id" value={values.id} />
		<QuestionFields {form} {errors} {values} />
	{/snippet}
</FormDialog>
