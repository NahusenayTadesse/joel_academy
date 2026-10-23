<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import House from '@lucide/svelte/icons/house';
	import Menu from '@lucide/svelte/icons/menu';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { page } from '$app/state';
	import { mobileMenu } from '$lib/components/layout/menu.svelte';
	import { delocalizePath } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { signedIn }: { signedIn: boolean } = $props();

	/*
	 * The installed app's bottom navigation, as on a native phone app. It exists only when the site
	 * runs installed (display-mode: standalone) on a phone-sized screen, so the website itself keeps
	 * its original layout. Lesson and checkout pages have their own bottom bars and go without it.
	 */
	const tabs = $derived([
		{ label: m.shell_tab_home(), href: ROUTES.home, icon: House, match: (path: string) => path === '/' },
		{ label: m.shell_nav_courses(), href: ROUTES.courses.list, icon: BookOpen, match: (path: string) => /^\/(courses|categories|instructors)/.test(path) },
		// The student home, and the pages it leads to (My courses stays one tap away from there).
		{ label: m.shell_tab_learning(), href: ROUTES.student.home, icon: GraduationCap, match: (path: string) => /^\/my(-(courses|wishlist|payments|notifications))?(\/|$)/.test(path) },
		signedIn
			? { label: m.shell_student_certificates(), href: ROUTES.student.certificates, icon: Award, match: (path: string) => path.startsWith('/my-certificates') }
			: { label: m.shell_tab_verify(), href: ROUTES.certificates.verifyLookup, icon: ShieldCheck, match: (path: string) => path.startsWith('/certificates') }
	]);

	// Tabs match the path without its language prefix ("/am/courses" is "/courses").
	const currentPath = $derived(delocalizePath(page.url.pathname));

	const hidden = $derived(
		/\/my-courses\/\[slug\]|\/checkout\//.test(page.route.id ?? '')
	);
</script>

{#if !hidden}
	<nav
		aria-label={m.shell_tab_bar_label()}
		class="app-tab-bar fixed inset-x-0 bottom-0 z-40 hidden border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 standalone:max-md:block"
	>
		<div class="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 [padding-bottom:max(0.375rem,env(safe-area-inset-bottom))]">
			{#each tabs as tab (tab.label)}
				{@const active = tab.match(currentPath)}
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors',
						active ? 'text-brand-ink' : 'text-muted-foreground'
					)}
				>
					<tab.icon class={cn('size-5', active && 'stroke-[2.25]')} />
					{tab.label}
				</a>
			{/each}
			<button
				type="button"
				onclick={() => (mobileMenu.open = true)}
				class="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium text-muted-foreground"
			>
				<Menu class="size-5" />
				{m.shell_tab_menu()}
			</button>
		</div>
	</nav>
{/if}
