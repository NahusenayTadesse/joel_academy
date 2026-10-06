<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import MediaThumb from '../MediaThumb.svelte';
	import { addSchema, editSchema } from './schema';

	let { data } = $props();

	// Seeded photos are '/images/…' paths the kit's upload preview cannot show; see MediaThumb.
	const rows = $derived(
		data.rows.map((row) => ({ ...row, photo: row.photo?.startsWith('/') ? '' : row.photo }))
	);
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Instructors"
		description="Public profiles shown on course pages and the instructors directory."
	/>
	<LookupPage
		data={{ ...data, rows }}
		tabTitle={false}
		schemas={{ add: addSchema, edit: editSchema }}
		config={{
			entity: 'Instructor',
			plural: 'Instructors',
			fields: [
				{ name: 'name', label: 'Name', type: 'text' },
				{
					name: 'slug',
					label: 'URL slug',
					type: 'text',
					required: false,
					inTable: false,
					placeholder: 'Leave blank to build it from the name'
				},
				{ name: 'title', label: 'Title', type: 'text', placeholder: 'Senior Data Scientist' },
				{ name: 'bio', label: 'Biography', type: 'textarea', rows: 6, required: false },
				{
					name: 'photo',
					label: 'Photo (upload to replace)',
					type: 'image',
					required: false,
					inTable: false
				},
				{
					name: 'skills',
					label: 'Skills (one per line)',
					type: 'textarea',
					rows: 4,
					required: false,
					inTable: false
				},
				{
					name: 'achievements',
					label: 'Achievements (one per line)',
					type: 'textarea',
					rows: 4,
					required: false,
					inTable: false
				},
				{ name: 'sortOrder', label: 'Order', type: 'number' },
				{ name: 'status', label: 'Status', type: 'boolean' }
			],
			extraColumns: [
				{
					id: 'photoPreview',
					header: 'Photo',
					enableSorting: false,
					cell: ({ row }) =>
						renderComponent(MediaThumb, {
							url: row.original.photoUrl as string | null,
							alt: String(row.original.name),
							round: true
						})
				},
				{ id: 'courses', header: 'Courses', accessorKey: 'courses', meta: { align: 'right' } }
			]
		}}
	/>
</div>
