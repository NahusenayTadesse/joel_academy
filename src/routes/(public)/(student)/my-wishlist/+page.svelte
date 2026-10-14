<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	type Item = (typeof data.items)[number];

	/** Where the button under each card leads, given any place the student already has. */
	function nextStep({ course, enrollmentStatus }: Item) {
		if (enrollmentStatus === 'ACTIVE') return { label: 'Go to Course', href: ROUTES.student.learn(course.slug) };
		if (enrollmentStatus === 'PENDING') return { label: 'Payment Under Review', href: ROUTES.student.payments };
		if (enrollmentStatus === 'REJECTED') return { label: 'Resubmit Payment', href: ROUTES.student.checkout(course.slug) };
		return course.accessType === 'FREE'
			? { label: 'Enroll Free', href: ROUTES.courses.detail(course.slug) }
			: { label: 'Move to Checkout', href: ROUTES.student.checkout(course.slug) };
	}

	let removing = $state<string | null>(null);
</script>

<svelte:head>
	<title>Wishlist · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader
		title="Wishlist"
		description="Courses you've saved for later - kept on your account, on every device you sign in to."
	/>

	{#if data.items.length === 0}
		<EmptyState icon={Heart} title="Your wishlist is empty" description="Courses you save for later will show up here.">
			{#snippet action()}
				<Button href={ROUTES.courses.list}>Browse courses</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.items as item (item.course.id)}
				{@const step = nextStep(item)}
				<div class="flex flex-col gap-3">
					<CourseCard course={item.course} class="flex-1" />
					<div class="flex gap-2">
						<Button variant="outline" href={step.href} class="flex-1">
							<ShoppingCart class="size-4" />
							{step.label}
						</Button>
						<form
							method="post"
							action="?/remove"
							use:enhance={() => {
								removing = item.course.id;
								return async ({ result, update }) => {
									removing = null;
									if (result.type === 'success') toast.info('Removed from wishlist', { description: item.course.title });
									else toast.error('Could not update your wishlist', { description: 'Please try again.' });
									await update();
								};
							}}
						>
							<input type="hidden" name="courseId" value={item.course.id} />
							<Button
								type="submit"
								variant="outline"
								size="icon"
								class="h-11 w-11"
								disabled={removing === item.course.id}
								aria-label="Remove {item.course.title} from wishlist"
								title="Remove from wishlist"
							>
								<Trash2 class="size-4" />
							</Button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
