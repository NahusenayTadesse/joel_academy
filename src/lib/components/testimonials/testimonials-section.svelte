<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/button.svelte';
	import type { Testimonial } from '$lib/content/testimonial.types';
	import TestimonialCard from './testimonial-card.svelte';

	let { testimonials: items }: { testimonials: Testimonial[] } = $props();

	/*
	 * A small stand-in for the old Embla carousel (align: start, loop): slides one card at a time,
	 * wraps around at either end, and follows horizontal swipes. Slide widths come from the same
	 * responsive basis classes, so the track only needs to be measured, not sized.
	 */
	let index = $state(0);
	let trackWidth = $state(0);
	let slideWidth = $state(0);
	const visible = $derived(slideWidth ? Math.max(1, Math.round(trackWidth / slideWidth)) : 1);
	const maxIndex = $derived(Math.max(0, items.length - visible));
	const current = $derived(Math.min(index, maxIndex));
	const canScroll = $derived(maxIndex > 0);

	function scrollPrev() {
		index = current <= 0 ? maxIndex : current - 1;
	}

	function scrollNext() {
		index = current >= maxIndex ? 0 : current + 1;
	}

	const measure: Attachment<HTMLElement> = (node) => {
		const observer = new ResizeObserver(() => {
			trackWidth = node.clientWidth;
			slideWidth = (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
		});
		observer.observe(node);
		return () => observer.disconnect();
	};

	const swipe: Attachment<HTMLElement> = (node) => {
		let startX: number | null = null;
		const down = (event: PointerEvent) => (startX = event.clientX);
		const up = (event: PointerEvent) => {
			if (startX === null) return;
			const delta = event.clientX - startX;
			startX = null;
			if (!canScroll || Math.abs(delta) < 40) return;
			if (delta < 0) scrollNext();
			else scrollPrev();
		};
		const cancel = () => (startX = null);
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', cancel);
		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
		};
	};
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
	<div class="mb-8 flex items-end justify-between gap-4">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-foreground">Engineered Success</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Real feedback from learners who completed our courses.
			</p>
		</div>
	</div>
	<div class="relative" role="region" aria-roledescription="carousel">
		<div class="touch-pan-y overflow-hidden" {@attach swipe}>
			<div
				class="-ml-4 flex transition-transform duration-500 ease-out"
				style:transform="translate3d({-current * slideWidth}px, 0, 0)"
				{@attach measure}
			>
				{#each items as testimonial (testimonial.id)}
					<div
						role="group"
						aria-roledescription="slide"
						class="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
					>
						<TestimonialCard {testimonial} />
					</div>
				{/each}
			</div>
		</div>
		<div class="mt-6 flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="icon"
				class="static size-9 translate-y-0 rounded-full"
				disabled={!canScroll}
				onclick={scrollPrev}
				aria-label="Previous slide"
			>
				<ArrowLeft class="size-4" />
			</Button>
			<Button
				variant="outline"
				size="icon"
				class="static size-9 translate-y-0 rounded-full"
				disabled={!canScroll}
				onclick={scrollNext}
				aria-label="Next slide"
			>
				<ArrowRight class="size-4" />
			</Button>
		</div>
	</div>
</section>
