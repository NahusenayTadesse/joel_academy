<script lang="ts" module>
	type LatLng = [number, number];

	/** Where the academy is from, and where its learners' skills travel. */
	const HOME: LatLng = [9.03, 38.74];
	const CITIES: { id: string; location: LatLng }[] = [
		{ id: 'nairobi', location: [-1.29, 36.82] },
		{ id: 'lagos', location: [6.52, 3.38] },
		{ id: 'cairo', location: [30.04, 31.24] },
		{ id: 'dubai', location: [25.2, 55.27] },
		{ id: 'london', location: [51.51, -0.13] },
		{ id: 'berlin', location: [52.52, 13.4] },
		{ id: 'washington', location: [38.9, -77.04] },
		{ id: 'toronto', location: [43.65, -79.38] },
		{ id: 'mumbai', location: [19.08, 72.88] },
		{ id: 'johannesburg', location: [-26.2, 28.05] },
		{ id: 'singapore', location: [1.35, 103.82] }
	];

	/** The globe's rotation that puts a longitude in front of the viewer. */
	const facing = (longitude: number) => Math.PI - ((longitude * Math.PI) / 180 - Math.PI / 2);

	type Rgb = [number, number, number];
	const PALETTE: Record<'light' | 'dark', { dark: number; base: Rgb; marker: Rgb; glow: Rgb; arc: Rgb; brightness: number }> = {
		light: {
			dark: 0,
			base: [1, 1, 1],
			marker: [0.11, 0.44, 0.88],
			glow: [0.82, 0.9, 1],
			arc: [0.04, 0.62, 0.76],
			brightness: 5
		},
		dark: {
			dark: 1,
			base: [0.32, 0.46, 0.72],
			marker: [0.49, 0.77, 1],
			glow: [0.18, 0.3, 0.55],
			arc: [0.6, 0.9, 1],
			brightness: 7
		}
	};
</script>

<script lang="ts">
	import { mode } from 'mode-watcher';
	import { m } from '$lib/paraglide/messages';
	import type { Attachment } from 'svelte/attachments';

	let { caption = '' }: { caption?: string } = $props();

	let ready = $state(false);
	let globe: { update: (state: Record<string, unknown>) => void; destroy: () => void } | null =
		null;

	const theme = $derived(mode.current === 'dark' ? PALETTE.dark : PALETTE.light);

	$effect(() => {
		const colors = theme;
		globe?.update({
			dark: colors.dark,
			baseColor: colors.base,
			markerColor: colors.marker,
			glowColor: colors.glow,
			arcColor: colors.arc,
			mapBrightness: colors.brightness
		});
	});

	/**
	 * The globe itself: loaded after the page (it is decoration, never the LCP), drawn only while
	 * on screen, turning on its own and by drag. Visitors who prefer less motion get a still globe
	 * they can still turn by hand.
	 */
	const spin: Attachment<HTMLCanvasElement> = (canvas) => {
		let disposed = false;
		let frame = 0;
		let visible = false;
		let phi = facing(HOME[1]) + 0.9;
		let velocity = 0;
		let dragX: number | null = null;
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const speed = calm ? 0 : 0.0032;
		const box = canvas.parentElement!;
		let size = box.offsetWidth;

		const tick = () => {
			if (!globe || !visible) return;
			if (dragX === null) {
				phi += speed + velocity;
				velocity *= 0.95;
			}
			globe.update({ phi });
			frame = requestAnimationFrame(tick);
		};
		const start = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(tick);
		};

		const onVisible = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) start();
		});
		const onResize = new ResizeObserver(() => {
			size = box.offsetWidth;
			globe?.update({ width: size, height: size });
		});

		const down = (event: PointerEvent) => {
			dragX = event.clientX;
			canvas.setPointerCapture(event.pointerId);
		};
		const move = (event: PointerEvent) => {
			if (dragX === null) return;
			const delta = (event.clientX - dragX) / 180;
			dragX = event.clientX;
			phi += delta;
			velocity = delta * 0.25;
			if (!visible || speed === 0) globe?.update({ phi });
		};
		const up = () => {
			dragX = null;
			if (speed === 0) start();
		};
		canvas.addEventListener('pointerdown', down);
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerup', up);
		canvas.addEventListener('pointercancel', up);

		// Building the globe (shaders, an 18,000-point map) is one long task. It is decoration, so it
		// waits until the page has loaded and the browser is idle, instead of competing with hydration
		// and the visitor's first taps.
		const whenIdle = () =>
			new Promise<void>((resolve) => {
				const idle = () =>
					'requestIdleCallback' in window
						? requestIdleCallback(() => resolve(), { timeout: 3000 })
						: setTimeout(resolve, 1200);
				if (document.readyState === 'complete') idle();
				else addEventListener('load', idle, { once: true });
			});

		whenIdle().then(() => import('cobe')).then(({ default: createGlobe }) => {
			if (disposed) return;
			const colors = theme;
			globe = createGlobe(canvas, {
				devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
				width: size,
				height: size,
				phi,
				theta: 0.22,
				dark: colors.dark,
				diffuse: 1.25,
				mapSamples: 18000,
				mapBrightness: colors.brightness,
				baseColor: colors.base,
				markerColor: colors.marker,
				glowColor: colors.glow,
				arcColor: colors.arc,
				arcWidth: 0.6,
				arcHeight: 0.28,
				markerElevation: 0.015,
				markers: [
					{ location: HOME, size: 0.09, id: 'addis' },
					...CITIES.map((city) => ({ location: city.location, size: 0.035 }))
				],
				arcs: CITIES.map((city) => ({ from: HOME, to: city.location }))
			});
			onVisible.observe(canvas);
			onResize.observe(box);
			// The map texture arrives a moment later; a still globe redraws once it has.
			if (speed === 0) setTimeout(() => globe?.update({ phi }), 600);
			ready = true;
		});

		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			onVisible.disconnect();
			onResize.disconnect();
			canvas.removeEventListener('pointerdown', down);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerup', up);
			canvas.removeEventListener('pointercancel', up);
			globe?.destroy();
			globe = null;
		};
	};
</script>

<div class="relative mx-auto aspect-square w-full max-w-[36rem]">
	<!-- Halo behind the planet. -->
	<div
		class="glow absolute inset-[-12%] opacity-30 dark:opacity-40"
		style:--glow-color="var(--primary)"
		aria-hidden="true"
	></div>
	<div
		class="glow absolute top-[55%] left-[60%] size-[70%] opacity-20"
		style:--glow-color="var(--tertiary)"
		aria-hidden="true"
	></div>

	<!-- The brand, orbiting: a ring of text turning slowly around the globe. -->
	<svg
		viewBox="0 0 400 400"
		class="enter-fade pointer-events-none absolute inset-0 size-full animate-spin-slow"
		style:--delay="0.6s"
		aria-hidden="true"
	>
		<defs>
			<path id="globe-ring" d="M 200,200 m -188,0 a 188,188 0 1,1 376,0 a 188,188 0 1,1 -376,0" />
			<linearGradient id="globe-ring-ink" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="var(--gradient-from)" />
				<stop offset="1" stop-color="var(--gradient-to)" />
			</linearGradient>
		</defs>
		<text
			fill="url(#globe-ring-ink)"
			font-size="12"
			font-weight="700"
			style="font-family: var(--font-heading)"
		>
			<!-- Stretched to the circle's length (2π × 188) so the words meet without overlapping. -->
			<textPath href="#globe-ring" textLength="1178" lengthAdjust="spacing">{m.home_globe_ring()}</textPath>
		</text>
	</svg>
	<!-- A dashed orbit turning the other way. -->
	<svg
		viewBox="0 0 400 400"
		class="enter-fade pointer-events-none absolute inset-[7%] size-[86%] animate-spin-slow-reverse"
		style:--delay="0.8s"
		aria-hidden="true"
	>
		<circle
			cx="200"
			cy="200"
			r="198"
			fill="none"
			stroke="var(--primary)"
			stroke-opacity="0.35"
			stroke-dasharray="2 9"
			stroke-linecap="round"
		/>
		<circle cx="200" cy="2" r="4" fill="var(--primary)" />
	</svg>

	<div
		class="enter-zoom absolute inset-[11%]"
		style:--delay="0.2s"
		role="img"
		aria-label={m.home_globe_label()}
	>
		<div class="globe-stage relative size-full">
			<canvas
				{@attach spin}
				class={[
					'size-full cursor-grab touch-pan-y transition-opacity duration-1000 active:cursor-grabbing',
					ready ? 'opacity-100' : 'opacity-0'
				]}
				aria-hidden="true"
			></canvas>
		</div>
		<!-- Pinned to Addis Ababa on the globe where CSS anchor positioning exists; hidden behind it. -->
		<div class="globe-pin pointer-events-none" aria-hidden="true">
			<span class="glass flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-foreground shadow-glow">
				<span class="relative flex size-2">
					<span class="absolute inset-0 animate-pulse-ring rounded-full bg-primary"></span>
					<span class="relative size-2 rounded-full bg-primary"></span>
				</span>
				{m.home_globe_addis()}
			</span>
		</div>
	</div>

</div>

{#if caption}
	<p
		class="glass enter-up mx-auto mt-6 max-w-sm rounded-2xl px-4 py-3 text-center text-sm leading-snug text-foreground/80"
		style:--delay="1.1s"
	>
		{caption}
	</p>
{/if}

<style>
	.globe-pin {
		display: none;
	}
	@supports (anchor-name: --a) {
		.globe-pin {
			display: block;
			position: absolute;
			position-anchor: --cobe-addis;
			bottom: anchor(top);
			left: anchor(center);
			translate: -50% -10px;
			opacity: var(--cobe-visible-addis, 0);
			filter: blur(calc((1 - var(--cobe-visible-addis, 0)) * 6px));
			transition:
				opacity 0.4s,
				filter 0.4s;
		}
	}
</style>
