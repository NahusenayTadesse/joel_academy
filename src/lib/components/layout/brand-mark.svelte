<script lang="ts">
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import { ROUTES, siteConfig } from '$lib/site';
</script>

<a href={ROUTES.home} class="flex items-center gap-2">
	<span class="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
		<GraduationCap class="size-4" />
	</span>
	<span class="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
</a>
