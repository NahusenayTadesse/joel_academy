<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Camera from '@lucide/svelte/icons/camera';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Search from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES } from '$lib/site';
</script>

<section class="relative overflow-hidden border-y border-border/60 bg-muted/30 py-16 sm:py-20">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
			<!-- Left column: information & actions -->
			<div class="space-y-6 text-left lg:col-span-7">
				<div
					class="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1 text-xs font-semibold text-brand"
				>
					<ShieldCheck class="size-4" />
					<span>Public Credential Verification</span>
				</div>

				<div class="space-y-3">
					<h2 class="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
						Already have a certificate? <br class="hidden sm:inline" />
						<span class="text-brand">Verify its authenticity</span>
					</h2>
					<p class="max-w-2xl text-base text-muted-foreground">
						Employers, recruiters, and academic partners can instantly authenticate any Joel Talargie
						Academy credential without logging in. Validate via live camera QR scanning or by typing
						the certificate ID.
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
						>
							<Camera class="size-5" />
						</div>
						<div>
							<h3 class="text-sm font-semibold text-foreground">Scan QR Code</h3>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Point your camera at the QR code printed on the certificate for instant validation.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
						>
							<Search class="size-5" />
						</div>
						<div>
							<h3 class="text-sm font-semibold text-foreground">Enter Certificate ID</h3>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Type the unique certificate ID (e.g. JTA-2026-...) to view the official verified
								record.
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
						Verify Certificate
					</Button>
					<Button href={ROUTES.courses.list} variant="outline" size="lg" class="gap-2">
						<Award class="size-4" />
						Browse Certificate Courses
					</Button>
				</div>
			</div>

			<!-- Right column: credential preview graphic -->
			<div class="lg:col-span-5">
				<div
					class="relative mx-auto max-w-sm rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-6 shadow-xl backdrop-blur-sm"
				>
					<div class="flex items-center justify-between border-b border-border/60 pb-4">
						<div class="flex items-center gap-2.5">
							<div
								class="flex size-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground"
							>
								JTA
							</div>
							<div>
								<p class="text-xs font-bold tracking-wider text-foreground uppercase">
									Joel Talargie Academy
								</p>
								<p class="text-[11px] text-muted-foreground">Credential Verification System</p>
							</div>
						</div>
						<span
							class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
						>
							<CircleCheck class="size-3" />
							Verified
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
						<p class="mt-3 font-mono text-xs font-bold text-foreground">JTA-2026-000123</p>
						<p class="mt-1 text-[11px] text-muted-foreground">
							Tamper-evident 256-bit cryptographic verification token
						</p>
					</div>

					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Free Public Access</span>
						<span>No Login Required</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
