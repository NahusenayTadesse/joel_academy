<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Camera from '@lucide/svelte/icons/camera';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Search from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { inView } from '$lib/attachments';
</script>

<section class="relative isolate overflow-hidden py-24">
	<div
		class="glow pointer-events-none absolute top-1/2 right-0 -z-10 size-[48rem] -translate-y-1/2 opacity-15"
		aria-hidden="true"
	></div>
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
			<!-- Left column: information & actions -->
			<div class="reveal space-y-6 text-left lg:col-span-7" {@attach inView()}>
				<div
					class="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-brand-ink"
				>
					<ShieldCheck class="size-4" />
					<span>{m.home_verify_badge()}</span>
				</div>

				<div class="space-y-3">
					<h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
						{m.home_verify_heading()} <br class="hidden sm:inline" />
						<span class="text-gradient">{m.home_verify_heading_accent()}</span>
					</h2>
					<p class="max-w-2xl text-base text-muted-foreground">
						{m.home_verify_description()}
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="glass-card lift flex items-start gap-3 rounded-2xl p-4">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink"
						>
							<Camera class="size-5" />
						</div>
						<div>
							<h3 class="text-sm font-semibold text-foreground">{m.home_verify_scan_title()}</h3>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{m.home_verify_scan_description()}
							</p>
						</div>
					</div>

					<div class="glass-card lift flex items-start gap-3 rounded-2xl p-4">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink"
						>
							<Search class="size-5" />
						</div>
						<div>
							<h3 class="text-sm font-semibold text-foreground">{m.home_verify_id_title()}</h3>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{m.home_verify_id_description()}
							</p>
						</div>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3 pt-2">
					<Button
						href={ROUTES.certificates.verifyLookup}
						size="lg"
						class="gap-2 font-medium shadow-sm"
					>
						<ShieldCheck class="size-4" />
						{m.home_verify_button()}
					</Button>
					<Button href={ROUTES.courses.list} variant="outline" size="lg" class="gap-2">
						<Award class="size-4" />
						{m.home_verify_browse()}
					</Button>
				</div>
			</div>

			<!-- Right column: credential preview graphic -->
			<div class="reveal lg:col-span-5" style:--delay="0.15s" style:--reveal-scale="0.94" {@attach inView()}>
				<div
					class="glass-card gradient-border relative mx-auto max-w-sm animate-float rounded-3xl p-6 [animation-duration:8s]"
				>
					<div class="flex items-center justify-between border-b border-border/60 pb-4">
						<div class="flex items-center gap-2.5">
							<img src="/logo-mark.png" alt="" width="32" height="32" class="size-8 rounded-lg ring-1 ring-border" />
							<div>
								<p class="text-xs font-bold tracking-wider text-foreground uppercase">
									Ethio AI School
								</p>
								<p class="text-[11px] text-muted-foreground">{m.home_verify_system()}</p>
							</div>
						</div>
						<span
							class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
						>
							<CircleCheck class="size-3" />
							{m.home_verify_verified()}
						</span>
					</div>

					<div
						class="my-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center"
					>
						<div
							class="relative flex size-24 items-center justify-center rounded-xl bg-card p-2 shadow-sm"
						>
							<QrCode class="size-20 text-foreground/80" />
							<div class="absolute inset-0 flex items-center justify-center">
								<div
									class="flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground shadow"
								>
									<ShieldCheck class="size-3" />
								</div>
							</div>
						</div>
						<p class="mt-3 font-mono text-xs font-bold text-foreground">EAS-2026-000123</p>
						<p class="mt-1 text-[11px] text-muted-foreground">
							{m.home_verify_token()}
						</p>
					</div>

					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>{m.home_verify_free_access()}</span>
						<span>{m.home_verify_no_login()}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
