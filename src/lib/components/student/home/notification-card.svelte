<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { formatRelativeTime } from './format';
	import { notificationIcon } from './notification-icon';

	/*
	 * One notification row (the original `NotificationCard`), used by the header bell and the
	 * notifications page. Opening it posts to the page's `open` action, which marks it read and
	 * follows its link. `buttonProps` lets a menu make the button its item.
	 */
	let {
		notification,
		buttonProps = {},
		class: className = ''
	}: {
		notification: {
			id: number;
			kind: string;
			title: string;
			body: string | null;
			link: string | null;
			read: boolean;
			createdAt: string;
		};
		buttonProps?: Record<string, unknown>;
		class?: string;
	} = $props();

	const Icon = $derived(notificationIcon(notification.kind));
</script>

<ActionForm action="{ROUTES.student.notifications}?/open" class="contents">
	<HiddenField name="id" value={notification.id} />
	<button
		{...buttonProps}
		type="submit"
		class={cn(
			'group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:bg-accent data-highlighted:bg-accent',
			!notification.read && 'bg-brand/5',
			className
		)}
	>
		<span
			class={cn(
				'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
				notification.read ? 'bg-muted text-muted-foreground' : 'bg-brand/10 text-brand-ink'
			)}
		>
			<Icon class="size-4" aria-hidden="true" />
		</span>
		<span class="block min-w-0 flex-1">
			<span
				class={cn(
					'block text-sm break-words',
					notification.read ? 'text-muted-foreground' : 'font-medium text-foreground'
				)}
			>
				{notification.title}
			</span>
			{#if notification.body}
				<span class="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span>
			{/if}
			<span class="mt-1 block text-[11px] text-muted-foreground">
				<time datetime={notification.createdAt}>{formatRelativeTime(notification.createdAt)}</time>
			</span>
		</span>
		{#if !notification.read}
			<span class="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true"></span>
			<span class="sr-only">Unread</span>
		{/if}
	</button>
</ActionForm>
