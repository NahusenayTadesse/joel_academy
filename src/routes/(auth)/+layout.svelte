<script lang="ts">
	import { ROUTES, siteConfig } from '$lib/site';

	let { children } = $props();
</script>

<!-- `public-site` so headings take their sizes from utilities, as on the public pages. -->
<main
	class="public-site flex min-h-screen items-center justify-center bg-linear-to-br from-auth-gradient-from via-auth-gradient-via to-auth-gradient-to px-4 py-16"
>
	<div class="relative w-full max-w-md">
		<a
			href={ROUTES.home}
			aria-label={siteConfig.name}
			class="absolute top-0 left-1/2 z-10 size-14 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-lg ring-4 ring-background"
		>
			<img src="/logo-mark.png" alt="" width="56" height="56" class="size-full" />
		</a>
		<div class="rounded-3xl border border-border bg-card p-8 pt-12 shadow-xl sm:p-10 sm:pt-14">
			{@render children()}
		</div>
	</div>
</main>
