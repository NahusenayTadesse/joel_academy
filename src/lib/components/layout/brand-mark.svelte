<script lang="ts">
	import { ROUTES, siteConfig } from '$lib/site';
</script>

<a href={ROUTES.home} class="group flex items-center gap-2.5">
	<img
		src="/logo-mark.png"
		alt=""
		width="36"
		height="36"
		class="size-9 rounded-xl shadow-glow ring-1 ring-border transition-transform duration-500 group-hover:-rotate-8 group-hover:scale-105"
	/>
	<span class="text-sm font-bold tracking-tight" style="font-family: var(--font-heading)">
		{siteConfig.name}
	</span>
</a>
