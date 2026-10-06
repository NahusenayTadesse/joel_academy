<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button.svelte';
	import type { Category } from '$lib/content/catalog.types';
	import { ROUTES, siteConfig } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import InstallButton from '$lib/components/pwa/install-button.svelte';
	import BrandMark from './brand-mark.svelte';
	import { mobileMenu } from './menu.svelte';
	import CoursesMegaMenu from './courses-mega-menu.svelte';
	import ProfileMenu from './profile-menu.svelte';
	import ThemeToggle from './theme-toggle.svelte';

	let {
		user,
		categories
	}: {
		user: { name: string; email: string; image?: string | null; isStaff?: boolean } | null;
		categories: Pick<Category, 'id' | 'name' | 'slug'>[];
	} = $props();

	const NAV_LINKS = [
		{ label: 'Categories', href: ROUTES.categories.list },
		{ label: 'Instructors', href: ROUTES.instructors.list },
		{ label: 'Pricing', href: ROUTES.pricing },
		{ label: 'About', href: ROUTES.about },
		{ label: 'Verify Certificate', href: ROUTES.certificates.verifyLookup },
		{ label: 'Contact', href: ROUTES.contact }
	];

	// Staff work in the dashboard; students' home is their own courses.
	const homeHref = $derived(user?.isStaff ? ROUTES.dashboard : ROUTES.student.courses);
	const mobileLink = 'rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent';
</script>

<header
	class="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
>
	<div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
		<BrandMark />

		<nav class="hidden items-center gap-1 lg:flex">
			<CoursesMegaMenu {categories} />
			{#each NAV_LINKS as link (link.href)}
				<a
					href={link.href}
					class={cn(
						'rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
						page.url.pathname === link.href && 'text-foreground'
					)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			<InstallButton />
			<ThemeToggle />
			{#if user}
				<div class="flex items-center gap-2">
					<Button variant="ghost" href={homeHref} class="hidden sm:inline-flex">
						Dashboard
					</Button>
					<ProfileMenu {user} />
				</div>
			{:else}
				<div class="hidden items-center gap-2 sm:flex">
					<Button variant="ghost" href={ROUTES.auth.login}>Sign in</Button>
					<Button href={ROUTES.auth.register}>Get started</Button>
				</div>
			{/if}

			<Dialog.Root bind:open={mobileMenu.open}>
				<Dialog.Trigger
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground lg:hidden [&_svg]:size-4"
					aria-label="Open navigation menu"
				>
					<Menu class="size-5!" />
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay
						class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0"
					/>
					<Dialog.Content
						class="fixed inset-y-0 left-0 z-50 flex h-full w-3/4 flex-col gap-1 border-r bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:slide-in-from-left sm:max-w-sm lg:hidden"
					>
						<div class="flex flex-col space-y-2 text-center sm:text-left">
							<Dialog.Title class="text-lg font-semibold text-foreground">
								{siteConfig.name}
							</Dialog.Title>
						</div>
						<a href={ROUTES.courses.list} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
							Courses
						</a>
						{#each NAV_LINKS as link (link.href)}
							<a href={link.href} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
								{link.label}
							</a>
						{/each}
						<InstallButton variant="menu" onDone={() => (mobileMenu.open = false)} />
						{#if user}
							<div class="mt-4 flex flex-col gap-1 border-t border-border pt-4">
								<a href={homeHref} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
									Dashboard
								</a>
								<a href={ROUTES.student.account} class={mobileLink} onclick={() => (mobileMenu.open = false)}>
									Account
								</a>
								<form method="post" action="/logout" class="contents">
									<button
										type="submit"
										class="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
									>
										<span>Logout</span>
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
									Sign in
								</Button>
								<Button href={ROUTES.auth.register} onclick={() => (mobileMenu.open = false)}>
									Get started
								</Button>
							</div>
						{/if}
						<Dialog.Close
							class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
						>
							<X class="h-4 w-4" />
							<span class="sr-only">Close</span>
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	</div>
</header>
