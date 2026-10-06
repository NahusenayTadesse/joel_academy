<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import { wishlist } from '$lib/wishlist.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		courseId,
		courseTitle,
		class: className = ''
	}: { courseId: string; courseTitle: string; class?: string } = $props();

	const isWishlisted = $derived(wishlist.has(courseId));

	function toggle(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const removing = isWishlisted;
		wishlist.toggle(courseId);
		if (removing) toast.info('Removed from wishlist', { description: courseTitle });
		else toast.success('Added to wishlist', { description: courseTitle });
	}
</script>

<Button
	variant="secondary"
	size="icon"
	class={cn('size-8 shrink-0 rounded-full', className)}
	aria-label={isWishlisted ? `Remove ${courseTitle} from wishlist` : `Add ${courseTitle} to wishlist`}
	aria-pressed={isWishlisted}
	onclick={toggle}
>
	<Heart class={cn('size-4', isWishlisted && 'fill-destructive text-destructive')} />
</Button>
