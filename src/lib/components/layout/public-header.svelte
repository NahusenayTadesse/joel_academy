<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button.svelte';
	import type { Category } from '$lib/content/catalog.types';
	import { localizePath } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import InstallButton from '$lib/components/pwa/install-button.svelte';
	import NotificationBell from '$lib/components/student/home/notification-bell.svelte';
	import BrandMark from './brand-mark.svelte';
	import { mobileMenu } from './menu.svelte';
	import CoursesMegaMenu from './courses-mega-menu.svelte';
	import ProfileMenu from './profile-menu.svelte';
	import LanguageSwitcher from './language-switcher.svelte';
	import ThemeToggle from './theme-toggle.svelte';

	let {
		user,
		categories,
		unreadNotifications = 0
	}: {
		user: { name: string; email: string; image?: string | null; isStaff?: boolean } | null;
		categories: Pick<Category, 'id' | 'name' | 'slug'>[];
		unreadNotifications?: number;
	} = $props();

	const NAV_LINKS = [
		{ label: m.shell_nav_categories(), href: ROUTES.categories.list },
		{ label: m.shell_nav_instructors(), href: ROUTES.instructors.list },
		{ label: m.shell_nav_pricing(), href: ROUTES.pricing },
		{ label: m.shell_nav_about(), href: ROUTES.about },
		{ label: m.shell_nav_verify_certificate(), href: ROUTES.certificates.verifyLookup },
		{ label: m.shell_nav_contact(), href: ROUTES.contact }
	];

	// Staff work in the dashboard; students' home is their learning area.
	const homeHref = $derived(user?.isStaff ? ROUTES.dashboard : ROUTES.student.home);
	const STUDENT_LINKS = [
		{ label: m.shell_student_my_courses(), href: ROUTES.student.courses },
		{ label: m.shell_student_wishlist(), href: ROUTES.student.wishlist },
		{ label: m.shell_student_payments(), href: ROUTES.student.payments },
		{ label: m.shell_student_notifications(), href: ROUTES.student.notifications },
		{ label: m.shell_student_certificates(), href: ROUTES.student.certificates }
	];
	const mobileLink = 'rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent';
</script>

<header
	class="sticky top-0 z-30 border-b border-(--glass-border) bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/55"
>
	<div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
		<BrandMark />

		<nav class="hidden items-center gap-1 lg:flex">
			<CoursesMegaMenu {categories} />
			{#each NAV_LINKS as link (link.href)}
				<a
					href={link.href}
					class={cn(
						'relative rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-foreground',
						"after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-linear-to-r after:from-brand-gradient-from after:to-brand-gradient-to after:transition-transform after:duration-300 hover:after:scale-x-100",
						page.url.pathname === link.href && 'text-foreground after:scale-x-100'
					)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			<!-- On phones the install action lives in the menu, leaving room for the language link. -->
			<InstallButton class="hidden sm:inline-flex" />
			<LanguageSwitcher />
			<ThemeToggle />
			{#if user}
				<div class="flex items-center gap-2">
					<Button variant="ghost" href={homeHref} class="hidden sm:inline-flex">
						{m.shell_header_dashboard()}
					</Button>
					<NotificationBell unreadCount={unreadNotifications} />
					<ProfileMenu {user} />
				</div>
			{:else}
				<div class="hidden items-center gap-2 sm:flex">
					<Button variant="ghost" href={ROUTES.auth.login}>{m.shell_header_sign_in()}</Button>
					<Button href={ROUTES.auth.register}>{m.shell_header_get_started()}</Button>
				</div>
			{/if}

			<Dialog.Root bind:open={mobileMenu.open}>
				<Dialog.Trigger
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground lg:hidden [&_svg]:size-4"
					aria-label={m.shell_header_open_menu()}
				>
					<Menu class="size-5!" />
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay
						class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0"
					/>
					<Dialog.Content
						class="fixed inset-y-0 left-0 z-50 flex h-full w-3/4 flex-col gap-1 overflow-y-auto border-r bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:slide-in-from-left sm:max-w-sm lg:hidden"
					>
						<div class="flex flex-col space-y-2 text-center sm:text-left">
							<Dialog.Title class="text-lg font-semibold text-foreground">
								{siteConfig.name}
							</Dialog.Title>
						</div>
						<a href={ROUTES.courses.list} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
							{m.shell_nav_courses()}
						</a>
						{#each NAV_LINKS as link (link.href)}
							<a href={link.href} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
								{link.label}
							</a>
						{/each}
						<InstallButton variant="menu" onDone={() => (mobileMenu.open = false)} />
						<LanguageSwitcher class="h-auto justify-start rounded-md px-3 py-2.5 font-medium" />
						{#if user}
							<div class="mt-4 flex flex-col gap-1 border-t border-border pt-4">
								<a href={homeHref} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
									{user.isStaff ? m.shell_header_dashboard() : m.shell_header_my_learning()}
								</a>
								{#if !user.isStaff}
									{#each STUDENT_LINKS as link (link.href)}
										<a href={link.href} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
											{link.label}
											{#if link.href === ROUTES.student.notifications && unreadNotifications > 0}
												<span class="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
													{unreadNotifications > 9 ? '9+' : unreadNotifications}
													<span class="sr-only">{m.shell_header_unread()}</span>
												</span>
											{/if}
										</a>
									{/each}
								{/if}
								<a href={ROUTES.student.account} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
									{m.shell_header_account()}
								</a>
								<form method="post" action={localizePath('/logout')} class="contents">
									<button
										type="submit"
										class="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
									>
										<span>{m.shell_header_logout()}</span>
									</button>
								</form>
							</div>
						{:else}
							<div class="mt-4 flex flex-col gap-2 border-t border-border pt-4">
								<Button
									variant="outline"
									href={ROUTES.auth.login}
									onclick={() => (mobileMenu.open = false)}
								>
									{m.shell_header_sign_in()}
								</Button>
								<Button href={ROUTES.auth.register} onclick={() => (mobileMenu.open = false)}>
									{m.shell_header_get_started()}
								</Button>
							</div>
						{/if}
						<Dialog.Close
							class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
						>
							<X class="h-4 w-4" />
							<span class="sr-only">{m.shell_close()}</span>
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	</div>
</header>
