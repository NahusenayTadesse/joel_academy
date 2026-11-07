<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileDown from '@lucide/svelte/icons/file-down';
	import Save from '@lucide/svelte/icons/save';
	import Trash from '@lucide/svelte/icons/trash';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import RichEditor from '@nahu/admin-kit/formComponents/RichEditor.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Card, CardContent } from '@nahu/admin-kit/components/ui/card/index.js';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { DOWNLOADS } from '$lib/downloads';
	import HandoutFields from '../HandoutFields.svelte';
	import { handoutEditSchema } from '../schema';

	let { data } = $props();

	// Seeded once from the load; after a save superforms keeps what the server returned.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed, allErrors, tainted } = createForm(data.form, handoutEditSchema, {
		resetForm: false
	});

	const STYLE_TIPS: Record<string, string> = {
		DOCUMENT: 'Headings, paragraphs, lists, quotes and code all print as they look here.',
		CHECKLIST: 'Every bulleted or numbered list prints with a tick box per item, ready to print and tick off.',
		WORKSHEET:
			'Name and date fields go at the top, and each item of a top-level list gets three answer lines: write the questions as a numbered list.'
	};
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title={data.handout.title}
		eyebrow="Handout · {data.course.name}"
		tabTitle="{data.handout.title} · Handouts"
		description="Students always download the latest saved version; the PDF is drawn fresh each time."
	>
		{#snippet badges()}
			<Statuses status={data.handout.published ? 'active' : 'draft'} label={data.handout.published ? 'Published' : 'Draft'} />
		{/snippet}
		{#snippet actions()}
			<Button href="/dashboard/courses/{data.course.id}/handouts" variant="outline" size="sm">
				<ArrowLeft class="size-4" /> Handouts
			</Button>
			<Button
				href="{DOWNLOADS.handout(data.handout.id)}?view"
				target="_blank"
				variant="outline"
				size="sm"
				data-sveltekit-reload
				title={$tainted ? 'Shows the last saved version: save first to see your changes' : undefined}
			>
				<FileDown class="size-4" /> Preview PDF
			</Button>
			<ConfirmAction
				action="?/delete"
				label="Delete handout"
				variant="destructive"
				icon={Trash}
				title="Delete “{data.handout.title}”?"
				description="Students can no longer download it. This cannot be undone."
			/>
		{/snippet}
	</PageHeader>

	<Card>
		<CardContent class="p-4">
			<form method="post" action="?/save" use:enhance class="flex flex-col gap-4">
				<Errors allErrors={$allErrors} />
				<HiddenField name="id" value={$form.id} />
				<div class="grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
					<div class="flex flex-col gap-2">
						<HandoutFields {form} {errors} sections={data.sections} />
						<InputComp
							{form}
							{errors}
							name="published"
							label="Published"
							type="checkboxSingle"
							placeholder="Students can download it"
						/>
						<p class="px-1 text-xs text-muted-foreground">{STYLE_TIPS[$form.style ?? 'DOCUMENT']}</p>
					</div>
					<div class="flex flex-col gap-2 p-1">
						<RichEditor
							name="content"
							bind:value={$form.content}
							label="Body"
							description="Printed under the cover with the academy's branding. Amharic prints too; a YouTube link on a line of its own prints as a video link."
							error={$errors.content?.[0] ?? ''}
							placeholder="Write the handout…"
							minHeight="26rem"
						/>
					</div>
				</div>
				<Button type="submit" class="self-start">
					{#if $delayed}
						<LoadingBtn name="Saving" />
					{:else}
						<Save class="size-4" /> Save handout
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
