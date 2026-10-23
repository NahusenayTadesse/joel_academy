<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import StarPicker from './star-picker.svelte';
	import StarRating from './star-rating.svelte';
	import { REVIEW_COMMENT_MAX } from './rules';

	/** The viewer's review, written or edited in place; the server checks everything again. */
	let {
		own,
		canEdit = true,
		error = undefined
	}: {
		own: { rating: number; comment: string | null; status: 'PUBLISHED' | 'HIDDEN' } | null;
		/** False once the enrollment is no longer active: the review can still be deleted. */
		canEdit?: boolean;
		/** A refusal from a submission made without JavaScript. */
		error?: string;
	} = $props();

	let editing = $state(false);
	let confirmingDelete = $state(false);
	let busy = $state(false);
	let rating = $state<number>();
	let comment = $state('');
	let localError = $state<string>();

	const shownError = $derived(localError ?? error);
	const showForm = $derived(!own || editing);
	const length = $derived(Array.from(comment).length);

	function startEdit() {
		rating = own?.rating;
		comment = own?.comment ?? '';
		localError = undefined;
		editing = true;
	}

	const submit = (successMessage: string): SubmitFunction => {
		return () => {
			busy = true;
			localError = undefined;
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					localError =
						typeof result.data?.reviewError === 'string' ? result.data.reviewError : 'Could not save your review.';
				} else if (result.type === 'error') {
					localError = 'Something went wrong. Please try again.';
				} else {
					await update({ reset: false });
					editing = false;
					confirmingDelete = false;
					rating = undefined;
					comment = '';
					toast.success(successMessage);
				}
				busy = false;
			};
		};
	};
</script>

<div class="rounded-xl border border-border bg-card p-5">
	{#if showForm}
		<ActionForm action="?/review" class="flex flex-col gap-4" submit={submit(own ? 'Review updated.' : 'Thanks for your review!')}>
			<h3 class="text-base font-semibold text-foreground">{own ? 'Edit your review' : 'Rate this course'}</h3>
			<StarPicker bind:value={rating} legend="Your rating" />
			<div class="flex flex-col gap-1.5">
				<Label for="review-comment">Your review <span class="font-normal text-muted-foreground">(optional)</span></Label>
				<Textarea
					id="review-comment"
					name="comment"
					rows={4}
					maxlength={REVIEW_COMMENT_MAX}
					bind:value={comment}
					placeholder="What did you like? What could be better?"
					aria-describedby="review-comment-count"
				/>
				<p id="review-comment-count" class="text-right text-xs text-muted-foreground tabular-nums">
					{length}/{REVIEW_COMMENT_MAX}
				</p>
			</div>
			{#if shownError}
				<p class="text-sm text-destructive" role="alert">{shownError}</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<Button type="submit" disabled={busy}>
					{#if busy}<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />{/if}
					{own ? 'Save changes' : 'Submit review'}
				</Button>
				{#if own}
					<Button variant="outline" onclick={() => (editing = false)} disabled={busy}>Cancel</Button>
				{/if}
			</div>
		</ActionForm>
	{:else if own}
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="text-base font-semibold text-foreground">Your review</h3>
				<StarRating value={own.rating} />
			</div>
			{#if own.status === 'HIDDEN'}
				<p class="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
					<EyeOff class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					Our team has hidden this review, so other visitors don't see it.
				</p>
			{/if}
			{#if own.comment}
				<p class="text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">{own.comment}</p>
			{/if}
			{#if shownError}
				<p class="text-sm text-destructive" role="alert">{shownError}</p>
			{/if}
			{#if confirmingDelete}
				<ActionForm action="?/deleteReview" class="flex flex-wrap items-center gap-2" submit={submit('Review deleted.')}>
					<p class="w-full text-sm text-foreground sm:w-auto">Delete your review?</p>
					<Button type="submit" size="sm" variant="destructive" disabled={busy}>
						{#if busy}<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />{/if}
						Delete
					</Button>
					<Button size="sm" variant="outline" onclick={() => (confirmingDelete = false)} disabled={busy}>
						Keep it
					</Button>
				</ActionForm>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#if canEdit}
						<Button size="sm" variant="outline" onclick={startEdit}>
							<Pencil aria-hidden="true" /> Edit
						</Button>
					{/if}
					<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (confirmingDelete = true)}>
						<Trash2 aria-hidden="true" /> Delete
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>
