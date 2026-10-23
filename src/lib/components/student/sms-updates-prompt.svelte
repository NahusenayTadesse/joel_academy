<script lang="ts">
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';

	/* An optional nudge for students without a verified phone: never in the way of paying. */
	let { returnTo }: { returnTo?: string } = $props();

	const href = $derived(
		returnTo ? `${ROUTES.student.account}?redirectTo=${encodeURIComponent(returnTo)}` : ROUTES.student.account
	);
</script>

<div class="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
	<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
		<MessageSquareText class="size-4" aria-hidden="true" />
	</span>
	<div class="text-sm">
		<p class="font-medium text-foreground">{m.account_sms_title()}</p>
		<p class="text-muted-foreground">
			{m.account_sms_body()}
			<a {href} class="font-medium text-brand-ink hover:underline">{m.account_add_phone()}</a>
		</p>
	</div>
</div>
