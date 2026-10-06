<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import { addSchema, editSchema } from './schema';

	let { data } = $props();
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Categories"
		description="How the catalog is grouped on the site. Inactive categories are hidden from visitors."
	/>
	<LookupPage
		{data}
		tabTitle={false}
		schemas={{ add: addSchema, edit: editSchema }}
		config={{
			entity: 'Category',
			plural: 'Categories',
			fields: [
				{ name: 'name', label: 'Name', type: 'text' },
				{
					name: 'slug',
					label: 'URL slug',
					type: 'text',
					required: false,
					placeholder: 'Leave blank to build it from the name'
				},
				{ name: 'description', label: 'Description', type: 'textarea', rows: 4, required: false },
				{ name: 'sortOrder', label: 'Order', type: 'number' },
				{ name: 'status', label: 'Status', type: 'boolean' }
			],
			extraColumns: [
				{
					id: 'courses',
					header: 'Courses',
					accessorKey: 'courses',
					meta: { align: 'right' }
				}
			]
		}}
	/>
</div>
