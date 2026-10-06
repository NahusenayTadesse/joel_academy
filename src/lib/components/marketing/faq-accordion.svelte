<script lang="ts">
	import { Accordion } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { FaqEntry } from '$lib/content/faq.data';

	let { items, class: className = '' }: { items: FaqEntry[]; class?: string } = $props();
</script>

<Accordion.Root type="single" class={className}>
	{#each items as item, index (index)}
		<Accordion.Item value="faq-{index}" class="border-b">
			<Accordion.Header class="flex">
				<Accordion.Trigger
					class="flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
				>
					{item.question}
					<ChevronDown
						class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
					/>
				</Accordion.Trigger>
			</Accordion.Header>
			<Accordion.Content
				class="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
			>
				<div class="pt-0 pb-4 text-muted-foreground">{item.answer}</div>
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
