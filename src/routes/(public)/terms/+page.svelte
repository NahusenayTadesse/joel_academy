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
	<title>{m.info_terms_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_terms_meta_description({ name: siteConfig.name })} />
</svelte:head>

<LegalPage
	title={m.info_terms_title()}
	{updatedAt}
	intro="These Terms of Service govern your use of {siteConfig.name}. By creating an account or using the platform, you agree to these terms."
	sections={[
		{
			heading: 'Using the platform',
			body: [
				'You must provide accurate information when creating an account and are responsible for keeping your login credentials secure.',
				'You agree to use the platform only for lawful purposes and not to interfere with its operation or other users.'
			]
		},
		{
			heading: 'Courses and content',
			body: [
				'Course content is provided by instructors and is intended for your personal, non-commercial learning use. You may not redistribute or resell course content.',
				'Free and paid courses are clearly labeled. Paid courses grant lifetime access once enrolled, subject to these terms.'
			]
		},
		{
			heading: 'Certificates',
			body: [
				'Certificates of completion, where offered, indicate that you completed the mandatory lessons of a course. They do not constitute a formal academic credential unless explicitly stated.'
			]
		},
		{
			heading: 'Account termination',
			body: [
				'We may suspend or terminate accounts that violate these terms. You may close your account at any time by contacting us.'
			]
		},
		{
			heading: 'Changes to these terms',
			body: [
				'We may update these terms from time to time. Continued use of the platform means you accept the updated terms.'
			]
		},
		{
			heading: 'Contact us',
			body: ['Questions about these terms can be sent through our Contact page.']
		}
	]}
/>
