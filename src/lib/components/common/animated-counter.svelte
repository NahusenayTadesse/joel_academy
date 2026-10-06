<script lang="ts">
	let {
		value,
		format,
		durationSeconds = 1.4,
		class: className = ''
	}: { value: number; format?: (value: number) => string; durationSeconds?: number; class?: string } =
		$props();

	let display = $state(0);

	/** Counts up from zero with an ease-out curve the first time the number scrolls into view. */
	function countUp(node: HTMLElement) {
		let frame = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				const start = performance.now();
				const target = value;
				const integer = Number.isInteger(target);
				const step = (now: number) => {
					const progress = Math.min(1, (now - start) / (durationSeconds * 1000));
					const eased = 1 - (1 - progress) ** 3;
					display = integer ? Math.round(target * eased) : target * eased;
					if (progress < 1) frame = requestAnimationFrame(step);
				};
				frame = requestAnimationFrame(step);
			},
			{ rootMargin: '-10% 0px' }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
				cancelAnimationFrame(frame);
			}
		};
	}
</script>

<span use:countUp class={className}>{format ? format(display) : display}</span>
