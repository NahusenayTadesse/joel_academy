<script lang="ts">
	import { onMount } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import {
		DEFAULT_LANDING,
		announcementVersion,
		type LandingAnnouncement
	} from '$lib/content/landing';
	import { localizePath } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	let { announcement = DEFAULT_LANDING.announcement }: { announcement?: LandingAnnouncement } =
		$props();

	const STORAGE_PREFIX = 'joel-academy-announcement-dismissed-';
	// Before the CMS, a dismissal stored '1' under the fixed id; that still hides the shipped text.
	const LEGACY_VERSION = announcementVersion(DEFAULT_LANDING.announcement);

	const storageKey = $derived(STORAGE_PREFIX + announcement.id);
	// Stored as the dismissed announcement's version, so changing the wording shows it again.
	const version = $derived(announcementVersion(announcement));
	// Site paths follow the page's language; outside links are left alone.
	const linkHref = $derived(
		announcement.linkUrl?.startsWith('/') && !announcement.linkUrl.startsWith('//')
			? localizePath(announcement.linkUrl)
			: announcement.linkUrl
	);

	let dismissed = $state(false);

	onMount(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored === version || (stored === '1' && version === LEGACY_VERSION)) dismissed = true;
		} catch {
			// Storage blocked: show the bar.
		}
	});

	function dismiss() {
		try {
			localStorage.setItem(storageKey, version);
		} catch {
			// Storage blocked: dismiss for this page view only.
		}
		dismissed = true;
	}
</script>

{#if announcement.enabled && !dismissed}
	<div
		class="flex items-center justify-center gap-2 bg-linear-to-r from-[#012a51] via-[#0a5299] to-[#127a0a] bg-[length:200%_100%] px-4 py-2 text-center text-xs font-medium text-white animate-shimmer [animation-duration:12s] sm:text-sm"
	>
		<span>
			{announcement.text}
			{#if announcement.linkText && announcement.linkUrl}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an editor-set path or https link -->
				<a href={linkHref} class="underline underline-offset-2 hover:no-underline">
					{announcement.linkText}
				</a>
			{/if}
		</span>
		<button
			type="button"
			aria-label={m.shell_announcement_dismiss()}
			class="ml-2 shrink-0 rounded-full p-0.5 hover:bg-white/15"
			onclick={dismiss}
		>
			<X class="size-3.5" />
		</button>
	</div>
{/if}
