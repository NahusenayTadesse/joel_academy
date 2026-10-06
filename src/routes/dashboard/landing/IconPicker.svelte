<script lang="ts">
	import * as Select from '@nahu/admin-kit/components/ui/select/index.js';
	import { LANDING_ICONS, type LandingIcon } from '$lib/content/landing';
	import { landingIcon } from '$lib/components/home/landing-icons';

	let { value = $bindable(), id }: { value: LandingIcon; id: string } = $props();

	const Current = $derived(landingIcon(value));
</script>

<Select.Root type="single" bind:value={() => value, (next) => (value = next as LandingIcon)}>
	<Select.Trigger {id} class="w-full" aria-label="Icon">
		<span class="flex items-center gap-2">
			<Current class="size-4" />
			{value}
		</span>
	</Select.Trigger>
	<Select.Content>
		{#each LANDING_ICONS as name (name)}
			{@const Icon = landingIcon(name)}
			<Select.Item value={name} label={name}>
				<Icon class="size-4" />
				{name}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
