<script lang="ts">
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * The original shadcn `Tabs` list, as links: the selected tab lives in the URL so the server
	 * filters, and the browser's back button steps between tabs.
	 */
	let {
		tabs,
		current,
		label
	}: { tabs: { value: string; label: string; href: string }[]; current: string; label: string } =
		$props();
</script>

<div
	role="tablist"
	aria-label={label}
	class="inline-flex h-10 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground"
>
	{#each tabs as tab (tab.value)}
		<a
			role="tab"
			href={tab.href}
			aria-selected={tab.value === current}
			data-state={tab.value === current ? 'active' : 'inactive'}
			data-sveltekit-noscroll
			class={cn(
				'inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm'
			)}
		>
			{tab.label}
		</a>
	{/each}
</div>
