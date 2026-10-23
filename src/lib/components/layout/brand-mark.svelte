<script lang="ts">
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import { ROUTES, siteConfig } from '$lib/site';
</script>

<a href={ROUTES.home} class="group flex items-center gap-2.5">
	<span
		class="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-primary-foreground shadow-glow transition-transform duration-500 group-hover:-rotate-8 group-hover:scale-105"
	>
		<GraduationCap class="size-4.5" />
	</span>
	<span class="text-sm font-bold tracking-tight" style="font-family: var(--font-heading)">
		{siteConfig.name}
	</span>
</a>
