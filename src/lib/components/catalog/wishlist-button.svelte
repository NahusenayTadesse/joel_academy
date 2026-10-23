<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import { wishlist } from '$lib/wishlist.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		courseId,
		courseTitle,
		class: className = ''
	}: { courseId: string; courseTitle: string; class?: string } = $props();

	const isWishlisted = $derived(wishlist.has(courseId));
	let busy = $state(false);

	async function toggle(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (busy) return;
		const removing = isWishlisted;
		busy = true;
		const saved = await wishlist.toggle(courseId);
		busy = false;
		if (!saved) toast.error(m.catalog_wishlist_error(), { description: m.catalog_try_again() });
		else if (removing) toast.info(m.catalog_wishlist_removed(), { description: courseTitle });
		else toast.success(m.catalog_wishlist_added(), { description: courseTitle });
	}
</script>

<Button
	variant="secondary"
	size="icon"
	class={cn('size-8 shrink-0 rounded-full', className)}
	aria-label={isWishlisted
		? m.catalog_wishlist_remove_label({ title: courseTitle })
		: m.catalog_wishlist_add_label({ title: courseTitle })}
	aria-pressed={isWishlisted}
	aria-busy={busy}
	onclick={toggle}
>
	<Heart class={cn('size-4', isWishlisted && 'fill-destructive text-destructive')} />
</Button>
