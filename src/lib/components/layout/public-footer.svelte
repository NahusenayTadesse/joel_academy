<script lang="ts">
	import { ROUTES, siteConfig } from '$lib/site';
	import BrandMark from './brand-mark.svelte';
	import NewsletterForm from './newsletter-form.svelte';

	const FOOTER_SECTIONS = [
		{
			title: 'Platform',
			links: [
				{ label: 'Courses', href: ROUTES.courses.list },
				{ label: 'Categories', href: ROUTES.categories.list },
				{ label: 'Instructors', href: ROUTES.instructors.list },
				{ label: 'Pricing', href: ROUTES.pricing },
				{ label: 'Verify certificate', href: ROUTES.certificates.verifyLookup }
			]
		},
		{
			title: 'Company',
			links: [
				{ label: 'About', href: ROUTES.about },
				{ label: 'Contact', href: ROUTES.contact },
				{ label: 'FAQ', href: ROUTES.faq },
				{ label: 'Help center', href: ROUTES.helpCenter }
			]
		},
		{
			title: 'Legal',
			links: [
				{ label: 'Privacy policy', href: ROUTES.privacyPolicy },
				{ label: 'Terms of service', href: ROUTES.terms },
				{ label: 'Cookie policy', href: ROUTES.cookiePolicy }
			]
		}
	];
</script>

<footer class="border-t border-border bg-muted/20">
	<div
		class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
	>
		<div class="flex flex-col gap-3">
			<BrandMark />
			<p class="max-w-xs text-sm text-muted-foreground">{siteConfig.description}</p>
			<div class="mt-2">
				<p class="mb-2 text-sm font-medium text-foreground">Get course updates</p>
				<NewsletterForm class="max-w-sm" />
			</div>
		</div>

		{#each FOOTER_SECTIONS as section (section.title)}
			<div class="flex flex-col gap-3">
				<h3 class="text-sm font-semibold text-foreground">{section.title}</h3>
				<ul class="flex flex-col gap-2">
					{#each section.links as link (link.href)}
						<li>
							<a href={link.href} class="text-sm text-muted-foreground hover:text-foreground">
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div class="border-t border-border">
		<div
			class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
		</div>
	</div>
</footer>
