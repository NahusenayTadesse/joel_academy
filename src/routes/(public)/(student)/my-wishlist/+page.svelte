<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Heart from '@lucide/svelte/icons/heart';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	type Item = (typeof data.items)[number];

	/** Where the button under each card leads, given any place the student already has. */
	function nextStep({ course, enrollmentStatus }: Item) {
		if (enrollmentStatus === 'ACTIVE') return { label: m.learn_go_to_course(), href: ROUTES.student.learn(course.slug) };
		if (enrollmentStatus === 'PENDING') return { label: m.learn_payment_under_review_cta(), href: ROUTES.student.payments };
		if (enrollmentStatus === 'REJECTED') return { label: m.learn_resubmit_payment_cta(), href: ROUTES.student.checkout(course.slug) };
		return course.accessType === 'FREE'
			? { label: m.learn_enroll_free(), href: ROUTES.courses.detail(course.slug) }
			: { label: m.learn_move_to_checkout(), href: ROUTES.student.checkout(course.slug) };
	}

	let removing = $state<string | null>(null);
</script>

<svelte:head>
	<title>{m.learn_wishlist()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader
		title={m.learn_wishlist()}
		description={m.learn_wishlist_desc()}
	/>

	{#if data.items.length === 0}
		<EmptyState icon={Heart} title={m.learn_wishlist_empty()} description={m.learn_wishlist_empty_desc()}>
			{#snippet action()}
				<Button href={ROUTES.courses.list}>{m.learn_browse_courses()}</Button>
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
						<ActionForm action="?/remove" submit={() => {
								removing = item.course.id;
								return async ({ result, update }) => {
									removing = null;
									if (result.type === 'success') toast.info(m.learn_wishlist_removed(), { description: item.course.title });
									else toast.error(m.learn_wishlist_update_failed(), { description: m.learn_try_again() });
									await update();
								};
							}}>
							<HiddenField name="courseId" value={item.course.id} />
							<Button
								type="submit"
								variant="outline"
								size="icon"
								class="h-11 w-11"
								disabled={removing === item.course.id}
								aria-label={m.learn_wishlist_remove_label({ title: item.course.title })}
								title={m.learn_wishlist_remove()}
							>
								<Trash2 class="size-4" />
							</Button>
						</ActionForm>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
