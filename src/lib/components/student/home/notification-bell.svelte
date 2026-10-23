<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import { DropdownMenu } from 'bits-ui';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import { buttonVariants } from '$lib/components/ui/variants';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import NotificationCard from './notification-card.svelte';

	/*
	 * The header bell (the original `NotificationBell`): the unread count from the layout's data, and
	 * the newest few fetched each time the menu opens, so it never shows a stale list.
	 */
	let { unreadCount }: { unreadCount: number } = $props();

	type Item = {
		id: number;
		kind: string;
		title: string;
		body: string | null;
		link: string | null;
		read: boolean;
		createdAt: string;
	};

	let items = $state<Item[] | null>(null);
	let failed = $state(false);
	let marking = $state(false);

	async function loadLatest() {
		failed = false;
		try {
			const response = await fetch(`${ROUTES.student.notifications}/latest`, {
				headers: { accept: 'application/json' }
			});
			if (!response.ok) throw new Error(String(response.status));
			items = ((await response.json()) as { items: Item[] }).items;
		} catch {
			failed = true;
		}
	}

	const markAllRead: SubmitFunction = () => {
		marking = true;
		return async ({ result }) => {
			marking = false;
			if (result.type !== 'success') {
				toast.error(m.learn_notifications_mark_failed(), { description: m.learn_try_again() });
				return;
			}
			items = items?.map((item) => ({ ...item, read: true })) ?? null;
			await invalidate('app:notifications');
		};
	};

	const badge = $derived(unreadCount > 9 ? '9+' : String(unreadCount));
</script>

<DropdownMenu.Root onOpenChange={(open) => open && loadLatest()}>
	<DropdownMenu.Trigger
		class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
		aria-label={unreadCount > 0 ? m.learn_bell_unread_label({ count: unreadCount }) : m.learn_notifications()}
	>
		<Bell class="size-4" />
		{#if unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-semibold text-destructive-foreground"
				aria-hidden="true"
			>
				{badge}
			</span>
		{/if}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="end"
			sideOffset={4}
			class="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
		>
			<div class="flex items-center justify-between gap-2 px-2 py-1.5">
				<p class="text-sm font-semibold">{m.learn_notifications()}</p>
				{#if unreadCount > 0}
					<ActionForm action="{ROUTES.student.notifications}?/readAll" submit={markAllRead}>
						<DropdownMenu.Item closeOnSelect={false}>
							{#snippet child({ props })}
								<button
									{...props}
									type="submit"
									disabled={marking}
									class="rounded-sm px-1 text-xs font-medium text-brand-ink outline-none hover:underline focus-visible:underline disabled:opacity-50 data-highlighted:underline"
								>
									{m.learn_mark_all_read()}
								</button>
							{/snippet}
						</DropdownMenu.Item>
					</ActionForm>
				{/if}
			</div>
			<DropdownMenu.Separator class="-mx-1 my-1 h-px bg-border" />
			{#if failed}
				<p class="px-3 py-6 text-center text-sm text-muted-foreground">{m.learn_notifications_load_failed()}</p>
			{:else if items === null}
				<div class="space-y-2 p-1" aria-label={m.learn_notifications_loading()}>
					{#each { length: 3 }, index (index)}
						<Skeleton class="h-14 w-full rounded-lg" />
					{/each}
				</div>
			{:else if items.length === 0}
				<EmptyState
					icon={Bell}
					title={m.learn_caught_up_title()}
					description={m.learn_caught_up_desc()}
					class="border-none bg-transparent p-6"
				/>
			{:else}
				<DropdownMenu.Group class="max-h-80 space-y-1 overflow-y-auto p-1" aria-label={m.learn_notifications_latest()}>
					{#each items as notification (notification.id)}
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<NotificationCard {notification} buttonProps={props} />
							{/snippet}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			{/if}
			<DropdownMenu.Separator class="-mx-1 my-1 h-px bg-border" />
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a
						{...props}
						href={ROUTES.student.notifications}
						class="flex items-center justify-center rounded-sm px-2 py-2 text-sm font-medium text-brand-ink outline-none hover:bg-accent data-highlighted:bg-accent"
					>
						{m.learn_view_all_notifications()}
					</a>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
