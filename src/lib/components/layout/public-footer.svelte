<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import BrandMark from './brand-mark.svelte';
	import LanguageSwitcher from './language-switcher.svelte';
	import NewsletterForm from './newsletter-form.svelte';
	import { inView } from '$lib/attachments';

	const FOOTER_SECTIONS = [
		{
			title: m.shell_footer_platform(),
			links: [
				{ label: m.shell_nav_courses(), href: ROUTES.courses.list },
				{ label: m.shell_nav_categories(), href: ROUTES.categories.list },
				{ label: m.shell_nav_instructors(), href: ROUTES.instructors.list },
				{ label: m.shell_nav_pricing(), href: ROUTES.pricing },
				{ label: m.shell_footer_verify_certificate(), href: ROUTES.certificates.verifyLookup }
			]
		},
		{
			title: m.shell_footer_company(),
			links: [
				{ label: m.shell_nav_about(), href: ROUTES.about },
				{ label: m.shell_nav_contact(), href: ROUTES.contact },
				{ label: m.shell_footer_faq(), href: ROUTES.faq },
				{ label: m.shell_footer_help_center(), href: ROUTES.helpCenter }
			]
		},
		{
			title: m.shell_footer_legal(),
			links: [
				{ label: m.shell_footer_privacy(), href: ROUTES.privacyPolicy },
				{ label: m.shell_footer_terms(), href: ROUTES.terms },
				{ label: m.shell_footer_cookies(), href: ROUTES.cookiePolicy }
			]
		}
	];
</script>

<footer class="relative isolate overflow-hidden border-t border-border bg-site-deep">
	<div
		class="glow pointer-events-none absolute -bottom-1/2 left-1/2 -z-10 size-[56rem] -translate-x-1/2 opacity-10"
		aria-hidden="true"
	></div>
	<div
		class="reveal-stagger mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
		{@attach inView()}
	>
		<div class="flex flex-col gap-3">
			<BrandMark />
			<p class="max-w-xs text-sm text-muted-foreground">{m.shell_site_description()}</p>
			<div class="mt-2">
				<p class="mb-2 text-sm font-medium text-foreground">{m.shell_footer_newsletter_heading()}</p>
				<NewsletterForm class="max-w-sm" />
			</div>
		</div>

		{#each FOOTER_SECTIONS as section (section.title)}
			<div class="flex flex-col gap-3">
				<h2 class="text-xs font-bold tracking-[0.18em] text-foreground uppercase">{section.title}</h2>
				<ul class="flex flex-col gap-2">
					{#each section.links as link (link.href)}
						<li>
							<a
								href={link.href}
								class="text-sm text-muted-foreground transition-colors hover:text-brand-ink"
							>
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
			<p>{m.shell_footer_copyright({ year: new Date().getFullYear(), name: siteConfig.name })}</p>
			<div class="flex items-center gap-3">
				<p class="text-xs">{m.shell_site_description()}</p>
				<LanguageSwitcher
					class="h-8 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:text-brand-ink"
				/>
			</div>
		</div>
	</div>
</footer>
