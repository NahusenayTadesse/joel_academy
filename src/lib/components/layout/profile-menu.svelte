<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Bell from '@lucide/svelte/icons/bell';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Heart from '@lucide/svelte/icons/heart';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import * as DropdownMenu from '@nahu/admin-kit/components/ui/dropdown-menu/index.js';
	import { buttonVariants } from '$lib/components/ui/variants';
	import { initials } from '$lib/format';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { user }: { user: { name: string; email: string; image?: string | null; isStaff?: boolean } } =
		$props();
	let signOutForm = $state<HTMLFormElement>();

	const STUDENT_LINKS = [
		{ label: 'My learning home', href: ROUTES.student.home, icon: GraduationCap },
		{ label: 'My courses', href: ROUTES.student.courses, icon: BookOpen },
		{ label: 'My certificates', href: ROUTES.student.certificates, icon: Award },
		{ label: 'Wishlist', href: ROUTES.student.wishlist, icon: Heart },
		{ label: 'Payments', href: ROUTES.student.payments, icon: CreditCard },
		{ label: 'Notifications', href: ROUTES.student.notifications, icon: Bell }
	];
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={cn(buttonVariants({ variant: 'ghost' }), 'h-9 gap-2 px-2')}
		aria-label="Account menu for {user.name}"
	>
		<span
			class="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs"
		>
			{#if user.image}
				<img src={user.image} alt="" class="aspect-square size-full" />
			{:else}
				{initials(user.name)}
			{/if}
		</span>
		<span class="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-56">
		<DropdownMenu.Label class="truncate">{user.email}</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#if user.isStaff}
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={ROUTES.dashboard} {...props}>
						<LayoutDashboard class="size-4" />
						Dashboard
					</a>
				{/snippet}
			</DropdownMenu.Item>
		{:else}
			{#each STUDENT_LINKS as link (link.href)}
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a href={link.href} {...props}>
							<link.icon class="size-4" />
							{link.label}
						</a>
					{/snippet}
				</DropdownMenu.Item>
			{/each}
		{/if}
		<DropdownMenu.Item>
			{#snippet child({ props })}
				<a href={ROUTES.student.account} {...props}>
					<UserCog class="size-4" />
					Account
				</a>
			{/snippet}
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item
			onSelect={() => signOutForm?.requestSubmit()}
			class="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
		>
			<LogOut class="size-4" />
			<span>Sign out</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<form bind:this={signOutForm} method="post" action="/logout" hidden></form>
