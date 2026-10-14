<script lang="ts">
	import { Accordion } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Search from '@lucide/svelte/icons/search';
	import SearchX from '@lucide/svelte/icons/search-x';
	import X from '@lucide/svelte/icons/x';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { HELP_CATEGORIES } from '$lib/content/help-articles.data';

	const DEBOUNCE_MS = 300;

	// `value` is what is typed; `query` is what filters, applied after a pause (or at once on Enter).
	let value = $state('');
	let query = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => () => clearTimeout(timer));

	function setQuery(next: string) {
		clearTimeout(timer);
		query = next;
	}

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(() => (query = value), DEBOUNCE_MS);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			setQuery(value.trim());
		}
	}

	function clear() {
		value = '';
		setQuery('');
	}

	const filteredCategories = $derived.by(() => {
		if (!query.trim()) return HELP_CATEGORIES;
		const needle = query.toLowerCase();
		return HELP_CATEGORIES.map((category) => ({
			...category,
			articles: category.articles.filter(
				(article) =>
					article.question.toLowerCase().includes(needle) ||
					article.answer.toLowerCase().includes(needle)
			)
		})).filter((category) => category.articles.length > 0);
	});
</script>

<div class="flex flex-col gap-8">
	<div class="relative mx-auto w-full max-w-lg">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			aria-hidden="true"
		/>
		<Input
			type="search"
			bind:value
			{oninput}
			{onkeydown}
			placeholder="Search help articles…"
			aria-label="Search help articles"
			class="pr-9 pl-9"
		/>
		{#if value}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="absolute top-1/2 right-1 size-7 -translate-y-1/2"
				onclick={clear}
				aria-label="Clear search"
			>
				<X class="size-3.5" />
			</Button>
		{/if}
	</div>

	{#if filteredCategories.length === 0}
		<EmptyState
			icon={SearchX}
			title="No help articles found"
			description="Try a different search term."
		/>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each filteredCategories as category (category.title)}
				<div class="rounded-xl border border-border p-5">
					<div class="mb-2 flex items-center gap-2">
						<span
							class="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand-ink"
						>
							<category.icon class="size-4" />
						</span>
						<h2 class="text-base font-semibold text-foreground">{category.title}</h2>
					</div>
					<Accordion.Root type="single">
						{#each category.articles as article, index (article.question)}
							<Accordion.Item value="{category.title}-{index}" class="border-b">
								<Accordion.Header class="flex">
									<Accordion.Trigger
										class="flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
									>
										{article.question}
										<ChevronDown
											class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
										/>
									</Accordion.Trigger>
								</Accordion.Header>
								<Accordion.Content
									class="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
								>
									<div class="pt-0 pb-4 text-sm text-muted-foreground">{article.answer}</div>
								</Accordion.Content>
							</Accordion.Item>
						{/each}
					</Accordion.Root>
				</div>
			{/each}
		</div>
	{/if}
</div>
