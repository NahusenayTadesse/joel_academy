<script lang="ts">
	import type { Writable } from 'svelte/store';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import YouTubeEmbed from '@nahu/admin-kit/components/YouTubeEmbed.svelte';
	import { parseLessonVideo } from '$lib/video';
	import { lessonTypeChoices } from './schema';

	/** Loose for the reason the kit's `InputComp` gives: fields are indexed by name. */
	type FormStore = Writable<Record<string, any>>;

	/**
	 * A lesson's own fields, shared by the add dialog on the curriculum page and the full lesson
	 * editor, so the two cannot drift. The body and resources live only on the editor page.
	 */
	let {
		form,
		errors,
		values,
		sections = []
	}: {
		form: FormStore;
		errors: FormStore;
		values: Record<string, unknown>;
		/** Offered as a picker to move the lesson; omitted where the section is already chosen. */
		sections?: { value: number; name: string }[];
	} = $props();

	const type = $derived(String(values.lessonType ?? 'VIDEO'));
	const video = $derived(String(values.videoUrl ?? ''));
	const parsed = $derived(parseLessonVideo(video));
	const HOSTS = { youtube: 'YouTube', vimeo: 'Vimeo', bunny: 'Bunny Stream', file: 'Direct video file' };
</script>

<InputComp {form} {errors} name="title" label="Lesson title" required />
{#if sections.length}
	<InputComp
		{form}
		{errors}
		name="sectionId"
		label="Section"
		type="select"
		items={sections}
		required
	/>
{:else}
	<input type="hidden" name="sectionId" value={values.sectionId ?? ''} />
{/if}
<InputComp
	{form}
	{errors}
	name="lessonType"
	label="Type"
	type="select"
	items={lessonTypeChoices}
	required
/>
<InputComp
	{form}
	{errors}
	name="duration"
	label="Duration"
	placeholder="12:30"
	description="Minutes:seconds (or h:mm:ss). Leave blank if it has no running time."
/>
<InputComp
	{form}
	{errors}
	name="videoUrl"
	label="Video link"
	type="url"
	placeholder="https://youtu.be/… · https://vimeo.com/… · https://iframe.mediadelivery.net/…"
	description={type === 'VIDEO'
		? 'YouTube, Vimeo or Bunny Stream: the link from the browser bar or Share button, not the embed code. For paid lessons, Vimeo (restricted to this domain) or Bunny Stream (token authentication on) keep the video from playing anywhere else.'
		: 'Optional for this lesson type.'}
/>
{#if parsed?.kind === 'youtube'}
	<div class="max-w-sm px-1">
		<YouTubeEmbed url={video} title={String(values.title || 'Lesson video')} />
	</div>
{:else if parsed}
	<p class="px-1 text-xs text-muted-foreground">{HOSTS[parsed.kind]} video recognised.</p>
{/if}
<InputComp
	{form}
	{errors}
	name="externalUrl"
	label="External link"
	type="url"
	placeholder="https://…"
	description={type === 'EXTERNAL_LINK'
		? 'Required: where the lesson sends students.'
		: 'Optional: a page, file or tool the lesson points to.'}
/>
<InputComp
	{form}
	{errors}
	name="isPreview"
	label="Free preview"
	type="checkboxSingle"
	placeholder="Anyone can open this lesson without enrolling"
/>
<InputComp
	{form}
	{errors}
	name="isMandatory"
	label="Required"
	type="checkboxSingle"
	placeholder="Counts toward completion and the certificate"
/>
