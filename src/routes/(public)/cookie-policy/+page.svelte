<script lang="ts">
	import LegalPage from '$lib/components/common/legal-page.svelte';
	import { getLocale, INTL_LOCALES } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';

	// The policy body below stays in English on purpose (see LegalPage); only the page chrome is translated.
	const updatedAt = new Intl.DateTimeFormat(INTL_LOCALES[getLocale()], { dateStyle: 'long' }).format(
		new Date(2026, 7, 5)
	);
</script>

<svelte:head>
	<title>{m.info_cookies_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_cookies_meta_description({ name: siteConfig.name })} />
</svelte:head>

<LegalPage
	title={m.info_cookies_title()}
	{updatedAt}
	intro="This Cookie Policy explains how {siteConfig.name} uses cookies and similar technologies."
	sections={[
		{
			heading: 'What are cookies',
			body: [
				'Cookies are small text files stored on your device that help websites remember information about your visit.'
			]
		},
		{
			heading: 'How we use cookies',
			body: [
				'We use essential cookies to keep you signed in and maintain your session securely. We also use cookies to remember your theme preference (light or dark mode).',
				'We do not use cookies for third-party advertising.'
			]
		},
		{
			heading: 'Managing cookies',
			body: [
				'Most browsers let you control cookies through their settings. Note that disabling essential cookies may prevent you from signing in or using parts of the platform.'
			]
		},
		{
			heading: 'Contact us',
			body: ['Questions about this Cookie Policy can be sent through our Contact page.']
		}
	]}
/>
