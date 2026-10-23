<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	/*
	 * Reports each page shown to the site's own analytics (src/routes/api/v): the path, the route it
	 * matched, where the visitor came from and any utm_* tags. No cookies, nothing stored here.
	 */
	afterNavigate(({ to, type }) => {
		if (!to?.url || to.url.origin !== location.origin) return;
		const tags = new URLSearchParams();
		for (const [key, value] of to.url.searchParams) if (key.startsWith('utm_')) tags.set(key, value);
		const payload = JSON.stringify({
			p: to.url.pathname,
			// On a visit's first page `to.route` is not filled in; the page state already knows it.
			r: to.route.id ?? page.route.id,
			// Only the first page of a visit has an outside referrer; later ones are this site.
			ref: type === 'enter' ? document.referrer : null,
			q: tags.toString()
		});
		const blob = new Blob([payload], { type: 'application/json' });
		if (!navigator.sendBeacon?.('/api/v', blob)) {
			void fetch('/api/v', { method: 'POST', body: blob, keepalive: true }).catch(() => {});
		}
	});
</script>
