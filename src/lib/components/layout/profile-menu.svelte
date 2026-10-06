<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import BookOpen from '@lucide/svelte/icons/book-open';
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
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={cn(buttonVariants({ variant: 'ghost' }), 'h-9 gap-2 px-2')}
		aria-label="Account menu"
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
		<DropdownMenu.Item>
			{#snippet child({ props })}
				<a href={user.isStaff ? ROUTES.dashboard : ROUTES.student.courses} {...props}>
					<LayoutDashboard class="size-4" />
					Dashboard
				</a>
			{/snippet}
		</DropdownMenu.Item>
		{#if !user.isStaff}
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={ROUTES.student.courses} {...props}>
						<BookOpen class="size-4" />
						My courses
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={ROUTES.student.certificates} {...props}>
						<Award class="size-4" />
						My certificates
					</a>
				{/snippet}
			</DropdownMenu.Item>
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
