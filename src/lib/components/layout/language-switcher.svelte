<script lang="ts">
	import { page } from '$app/state';
	import { getLocale, LOCALE_LABELS, localizePath, locales } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { class: className = '' }: { class?: string } = $props();

	/* With two languages the switcher is one link: the same page in the other language. */
	const other = $derived(locales.find((locale) => locale !== getLocale()) ?? 'en');
	const href = $derived(localizePath(page.url.pathname + page.url.search, other));
</script>

<!-- A full load, so the server renders the page (and its <html lang>) in the new language. -->
<a
	{href}
	hreflang={other}
	lang={other}
	data-sveltekit-reload
	aria-label="{m.language_switch_label()}: {LOCALE_LABELS[other]}"
	class={cn(
		'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
		className
	)}
>
	{LOCALE_LABELS[other]}
</a>
