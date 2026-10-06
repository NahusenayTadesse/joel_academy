<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import { addSchema, editSchema } from './schema';

	let { data } = $props();
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Payment methods"
		description="The bank accounts and wallets students pay course fees into. Active ones are offered at checkout."
	/>
	<LookupPage
		{data}
		tabTitle={false}
		schemas={{ add: addSchema, edit: editSchema }}
		config={{
			entity: 'Payment method',
			plural: 'Payment methods',
			fields: [
				{
					name: 'name',
					label: 'Bank or wallet',
					type: 'text',
					placeholder: 'Commercial Bank of Ethiopia'
				},
				{ name: 'accountName', label: 'Account name', type: 'text' },
				{ name: 'accountNumber', label: 'Account number', type: 'text' },
				{
					name: 'instructions',
					label: 'Instructions for the student',
					type: 'textarea',
					rows: 4,
					required: false
				},
				{ name: 'sortOrder', label: 'Order', type: 'number' },
				{ name: 'status', label: 'Status', type: 'boolean' }
			]
		}}
	/>
</div>
