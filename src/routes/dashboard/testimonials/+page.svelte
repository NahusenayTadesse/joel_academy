<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import { addSchema, editSchema } from './schema';

	let { data } = $props();

	const ratings = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), name: '★'.repeat(n) }));
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Testimonials"
		description="Student quotes on the home page and course pages. Inactive ones are hidden."
	/>
	<LookupPage
		data={{ ...data, rows: data.rows.map((row) => ({ ...row, rating: String(row.rating) })) }}
		tabTitle={false}
		schemas={{ add: addSchema, edit: editSchema }}
		config={{
			entity: 'Testimonial',
			plural: 'Testimonials',
			fields: [
				{ name: 'studentName', label: 'Student', type: 'text' },
				{
					name: 'role',
					label: 'Role or headline',
					type: 'text',
					required: false,
					placeholder: 'Freelance designer'
				},
				{ name: 'courseTitle', label: 'Course taken', type: 'text', required: false },
				{ name: 'rating', label: 'Rating', type: 'select', choices: ratings },
				{ name: 'quote', label: 'Quote', type: 'textarea', rows: 5 },
				{ name: 'sortOrder', label: 'Order', type: 'number' },
				{ name: 'status', label: 'Status', type: 'boolean' }
			]
		}}
	/>
</div>
