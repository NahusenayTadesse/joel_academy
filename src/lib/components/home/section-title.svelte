<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { inView } from '$lib/attachments';

	/** A landing section's eyebrow, title (the `accent` part in gradient), line under it and link. */
	let {
		eyebrow = '',
		title,
		accent = '',
		subtitle = '',
		link = null,
		align = 'left',
		tone = 'page'
	}: {
		eyebrow?: string;
		title: string;
		accent?: string;
		subtitle?: string;
		link?: { href: string; label: string } | null;
		align?: 'left' | 'center';
		/** `dark` on the fixed navy bands. */
		tone?: 'page' | 'dark';
	} = $props();
</script>

<div
	class={[
		'reveal mb-12 flex flex-col gap-4',
		align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
	]}
	{@attach inView()}
>
	<div class="max-w-2xl">
		{#if eyebrow}
			<p
				class={[
					'mb-3 text-xs font-bold tracking-[0.2em] uppercase',
					tone === 'dark' ? 'text-sky-300' : 'text-brand-ink'
				]}
			>
				{eyebrow}
			</p>
		{/if}
		<h2
			class={[
				'text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl md:text-5xl',
				tone === 'dark' ? 'text-white' : 'text-foreground'
			]}
		>
			{title}
			{#if accent}<span class={tone === 'dark' ? 'text-gradient-ice' : 'text-gradient'}>{accent}</span>{/if}
		</h2>
		{#if subtitle}
			<p class={['mt-4 text-lg', tone === 'dark' ? 'text-slate-400' : 'text-muted-foreground']}>
				{subtitle}
			</p>
		{/if}
	</div>
	{#if link}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an app route -->
		<a
			href={link.href}
			class="group inline-flex min-h-10 shrink-0 items-center gap-2 font-semibold text-brand-ink"
		>
			{link.label}
			<ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
		</a>
	{/if}
</div>
