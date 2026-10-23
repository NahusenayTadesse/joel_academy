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
	<title>{m.info_privacy_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_privacy_meta_description({ name: siteConfig.name })} />
</svelte:head>

<LegalPage
	title={m.info_privacy_title()}
	{updatedAt}
	intro="This Privacy Policy explains how {siteConfig.name} collects, uses, and protects your information when you use our platform."
	sections={[
		{
			heading: 'Information we collect',
			body: [
				'When you create an account, we collect information such as your name, email address, and password. When you sign in with Google, we receive your name, email address, and profile picture from your Google account.',
				'We also collect information about your activity on the platform, such as course enrollments and progress, to provide our services to you.'
			]
		},
		{
			heading: 'How we use your information',
			body: [
				'We use your information to provide and improve the platform, communicate with you about your account and courses, and maintain the security of our services.'
			]
		},
		{
			heading: 'Cookies',
			body: [
				'We use cookies to keep you signed in and remember your preferences. See our Cookie Policy for details.'
			]
		},
		{
			heading: 'Data sharing',
			body: [
				'We do not sell your personal information. We only share information with service providers as needed to operate the platform, or as required by law.'
			]
		},
		{
			heading: 'Your rights',
			body: [
				'You can access, update, or delete your account information at any time from your account settings. Contact us if you need further assistance.'
			]
		},
		{
			heading: 'Contact us',
			body: [
				'If you have questions about this Privacy Policy, please reach out through our Contact page.'
			]
		}
	]}
/>
