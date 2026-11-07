<script lang="ts">
	import type { Writable } from 'svelte/store';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { handoutAudienceChoices, handoutStyleChoices } from './schema';

	/** Loose for the reason the kit's `InputComp` gives: fields are indexed by name. */
	type FormStore = Writable<Record<string, any>>;

	/** A handout's own fields, shared by the new-handout dialog and the editor so they cannot drift. */
	let {
		form,
		errors,
		sections
	}: {
		form: FormStore;
		errors: FormStore;
		sections: { value: number; name: string }[];
	} = $props();
</script>

<InputComp {form} {errors} name="title" label="Title" required placeholder="Week 1 setup checklist" />
<InputComp
	{form}
	{errors}
	name="summary"
	label="Summary (optional)"
	type="textarea"
	rows={2}
	description="Printed under the title on the cover."
/>
<InputComp
	{form}
	{errors}
	name="sectionId"
	label="Belongs to"
	type="select"
	items={[{ value: '', name: 'The whole course' }, ...sections]}
	description="A section's handouts are also printed at the end of that section's workbook."
/>
<InputComp {form} {errors} name="style" label="Style" type="select" items={handoutStyleChoices} required />
<InputComp {form} {errors} name="audience" label="Who can download it" type="select" items={handoutAudienceChoices} required />
