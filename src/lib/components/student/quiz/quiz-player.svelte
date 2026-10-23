<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Award from '@lucide/svelte/icons/award';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import History from '@lucide/svelte/icons/history';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Send from '@lucide/svelte/icons/send';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button.svelte';
	import { getLocale, INTL_LOCALES } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import QuizQuestion from './quiz-question.svelte';
	import type { QuizResult, QuizView } from './types';

	/*
	 * A quiz lesson on the learn page. Answers are graded on the server, which alone knows the right
	 * options; this shows the graded attempt it sends back. The parent keys this on the lesson.
	 */
	let {
		lessonId,
		quiz,
		canSubmit
	}: {
		lessonId: number;
		quiz: QuizView;
		/** An ACTIVE enrollment: previews can be read but not graded. */
		canSubmit: boolean;
	} = $props();

	type Posted = { quiz?: QuizResult; quizError?: string } | null;
	// Without JavaScript the page comes back rendered with the action's answer; read it once.
	const posted = page.form as Posted;
	// svelte-ignore state_referenced_locally
	let outcome = $state<QuizResult | null>(posted?.quiz?.lessonId === lessonId ? posted.quiz : null);
	let errorText = $state(posted?.quizError ?? '');
	let submitting = $state(false);
	let answered = $state(0);
	let resultEl = $state<HTMLElement>();

	const total = $derived(quiz.questions.length);
	const resultFor = (questionId: number) => outcome?.results.find((item) => item.questionId === questionId);
	const dateFormat = new Intl.DateTimeFormat(INTL_LOCALES[getLocale()], { dateStyle: 'medium', timeStyle: 'short' });

	function countAnswered(form: HTMLFormElement) {
		const values = new FormData(form);
		answered = quiz.questions.filter((question) => values.getAll(`q-${question.id}`).length > 0).length;
	}

	/*
	 * The learn page scrolls inside its own pane; `scrollIntoView` would also scroll the window and
	 * push the page's header and action bar off screen, so only the pane is moved.
	 */
	function revealResult() {
		if (!resultEl) return;
		let pane = resultEl.parentElement;
		while (pane && !/(auto|scroll)/.test(getComputedStyle(pane).overflowY)) pane = pane.parentElement;
		const top = resultEl.getBoundingClientRect().top - (pane?.getBoundingClientRect().top ?? 0) - 16;
		(pane ?? window).scrollBy({ top, behavior: 'smooth' });
		resultEl.focus({ preventScroll: true });
	}

	function retake() {
		outcome = null;
		errorText = '';
		answered = 0;
	}
</script>

<section class="mt-6 space-y-5" aria-labelledby="quiz-heading">
	<div class="rounded-2xl border border-sidebar-border bg-white/5 p-5 sm:p-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="flex items-center gap-2 text-xs font-semibold tracking-wider text-sidebar-primary uppercase">
					<ListChecks class="size-4" aria-hidden="true" /> {m.learn_quiz()}
				</p>
				<h2 id="quiz-heading" class="mt-2 text-sm text-sidebar-foreground/80">
					{m.learn_quiz_summary({ count: total, score: quiz.passingScore })}
				</h2>
			</div>
			{#if quiz.passed}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-sidebar-primary/15 px-3 py-1 text-xs font-semibold text-sidebar-primary">
					<CircleCheck class="size-3.5" aria-hidden="true" /> {m.learn_quiz_passed()}
				</span>
			{:else if quiz.attempts.length}
				<span class="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">{m.learn_quiz_not_passed()}</span>
			{:else}
				<span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sidebar-foreground/80">{m.learn_quiz_not_attempted()}</span>
			{/if}
		</div>
		<dl class="mt-5 grid grid-cols-3 gap-3 text-center">
			<div class="rounded-xl bg-white/5 px-2 py-3">
				<dt class="text-[11px] tracking-wide text-sidebar-foreground/60 uppercase">{m.learn_quiz_pass_mark()}</dt>
				<dd class="mt-1 text-lg font-bold text-white">{quiz.passingScore}%</dd>
			</div>
			<div class="rounded-xl bg-white/5 px-2 py-3">
				<dt class="text-[11px] tracking-wide text-sidebar-foreground/60 uppercase">{m.learn_quiz_best_score()}</dt>
				<dd class="mt-1 text-lg font-bold text-white">{quiz.bestScore === null ? '—' : `${quiz.bestScore}%`}</dd>
			</div>
			<div class="rounded-xl bg-white/5 px-2 py-3">
				<dt class="text-[11px] tracking-wide text-sidebar-foreground/60 uppercase">{m.learn_quiz_attempts()}</dt>
				<dd class="mt-1 text-lg font-bold text-white">{quiz.attempts.length}</dd>
			</div>
		</dl>
	</div>

	{#if !canSubmit}
		<p class="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
			{m.learn_quiz_preview()}
		</p>
	{/if}

	{#if errorText && !outcome}
		<p role="alert" class="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
			{errorText}
		</p>
	{/if}

	{#if outcome}
		<div
			bind:this={resultEl}
			tabindex="-1"
			class={cn(
				'scroll-mt-4 rounded-2xl border p-5 focus:outline-none sm:p-6',
				outcome.passed ? 'border-sidebar-primary/50 bg-sidebar-primary/10' : 'border-red-400/40 bg-red-500/10'
			)}
			aria-live="polite"
		>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={cn('text-sm font-semibold', outcome.passed ? 'text-sidebar-primary' : 'text-red-300')}>
						{outcome.passed ? m.learn_quiz_you_passed() : m.learn_quiz_not_quite()}
					</p>
					<p class="mt-1 text-4xl font-bold text-white">{outcome.score}%</p>
					<p class="mt-1 text-sm text-sidebar-foreground/80">
						{m.learn_quiz_correct_summary({ correct: outcome.correctCount, total: outcome.total, passing: outcome.passingScore })}
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					{#if outcome.certificateCode}
						<Button href={ROUTES.student.certificate(outcome.certificateCode)} class="gap-2">
							<Award class="size-4" /> {m.learn_quiz_view_certificate()}
						</Button>
					{/if}
					<Button
						variant="outline"
						onclick={retake}
						class="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
					>
						<RotateCcw class="size-4" />
						{outcome.passed ? m.learn_quiz_take_again() : m.learn_quiz_retake()}
					</Button>
				</div>
			</div>
			<div class="relative mt-5 h-2 rounded-full bg-white/10" aria-hidden="true">
				<div
					class={cn('h-full rounded-full', outcome.passed ? 'bg-sidebar-primary' : 'bg-red-400')}
					style:width="{outcome.score}%"
				></div>
				<div class="absolute -top-1 h-4 w-0.5 bg-white/80" style:left="{outcome.passingScore}%"></div>
			</div>
			<p class="mt-4 text-sm text-sidebar-foreground/80">
				{#if outcome.passed && outcome.courseCompleted}
					{m.learn_quiz_done_course()}
				{:else if outcome.passed}
					{m.learn_quiz_done_lesson()}
				{:else}
					{m.learn_quiz_failed_hint()}
				{/if}
			</p>
		</div>

		<div class="space-y-4">
			{#each quiz.questions as question, index (question.id)}
				<QuizQuestion {question} number={index + 1} result={resultFor(question.id)} />
			{/each}
		</div>
	{:else if total === 0}
		<p class="rounded-xl border border-sidebar-border bg-white/5 px-4 py-6 text-center text-sm text-sidebar-foreground/70">
			{m.learn_quiz_no_questions()}
		</p>
	{:else}
		<ActionForm action="?lesson={lessonId}&/quiz" class="space-y-4" onchange={(event) => countAnswered(event.currentTarget)} submit={({ cancel }) => {
				if (!canSubmit) {
					cancel();
					return;
				}
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success' && result.data?.quiz) {
						const graded = result.data.quiz as QuizResult;
						outcome = graded;
						errorText = '';
						if (graded.passed)
							toast.success(graded.courseCompleted ? m.learn_quiz_passed_course_toast() : m.learn_quiz_passed_toast(), {
								description: graded.certificateCode ? m.learn_quiz_cert_ready() : m.learn_quiz_lesson_complete()
							});
						else
							toast.error(m.learn_quiz_you_scored({ score: graded.score }), {
								description: m.learn_quiz_needed_to_pass({ passing: graded.passingScore })
							});
						await tick();
						revealResult();
						// Progress, the sidebar ticks and the attempt history.
						await invalidateAll();
						return;
					}
					if (result.type === 'failure') {
						errorText = String(result.data?.quizError ?? m.learn_quiz_submit_failed());
						toast.error(m.learn_quiz_not_submitted(), { description: errorText });
						return;
					}
					// A redirect or an error: update() applies it, as applyAction(result) did.
					await update();
				};
			}}>
			<HiddenField name="lessonId" value={lessonId} />
			{#each quiz.questions as question, index (question.id)}
				<QuizQuestion {question} number={index + 1} disabled={!canSubmit} />
			{/each}
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sidebar-border bg-white/5 px-5 py-4">
				<p class="text-sm text-sidebar-foreground/70">
					<span class="font-semibold text-white">{answered}</span>
					{m.learn_quiz_answered_of({ total })}{answered < total ? ` · ${m.learn_quiz_unanswered_wrong()}` : ''}
				</p>
				<Button
					type="submit"
					disabled={!canSubmit || submitting}
					class="gap-2 bg-sidebar-primary bg-none text-sidebar-primary-foreground shadow-none hover:bg-sidebar-primary/90"
				>
					{#if submitting}<LoaderCircle class="size-4 animate-spin" />{:else}<Send class="size-4" />{/if}
					{m.learn_quiz_submit()}
				</Button>
			</div>
		</ActionForm>
	{/if}

	{#if quiz.attempts.length}
		<details class="group rounded-2xl border border-sidebar-border bg-white/5">
			<summary
				class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-white [&::-webkit-details-marker]:hidden"
			>
				<span class="flex items-center gap-2">
					<History class="size-4 text-sidebar-foreground/60" aria-hidden="true" /> {m.learn_quiz_history()}
				</span>
				<span class="text-xs text-sidebar-foreground/60">
					{m.learn_quiz_attempt_summary({ count: quiz.attempts.length, best: quiz.bestScore ?? 0 })}
				</span>
			</summary>
			<ol class="divide-y divide-sidebar-border border-t border-sidebar-border">
				{#each quiz.attempts as attempt, index (attempt.id)}
					<li class="flex items-center justify-between gap-3 px-5 py-3 text-sm">
						<span class="text-sidebar-foreground/70">
							#{quiz.attempts.length - index} · {dateFormat.format(new Date(attempt.createdAt))}
						</span>
						<span class="flex items-center gap-3">
							<span class="font-semibold text-white">{attempt.score}%</span>
							<span
								class={cn(
									'w-16 rounded-full px-2 py-0.5 text-center text-xs font-semibold',
									attempt.passed ? 'bg-sidebar-primary/15 text-sidebar-primary' : 'bg-red-500/15 text-red-300'
								)}
							>
								{attempt.passed ? m.learn_quiz_passed() : m.learn_quiz_failed_badge()}
							</span>
						</span>
					</li>
				{/each}
			</ol>
		</details>
	{/if}
</section>
