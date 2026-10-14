<script lang="ts">
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import Clock from '@lucide/svelte/icons/clock';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Instagram from '@lucide/svelte/icons/instagram';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import Linkedin from '@lucide/svelte/icons/linkedin';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Twitter from '@lucide/svelte/icons/twitter';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Youtube from '@lucide/svelte/icons/youtube';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import ContactForm from '$lib/components/info/contact-form.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data, form } = $props();

	const DEPARTMENTS = [
		{
			icon: MessageCircle,
			title: 'General Inquiries',
			description:
				'Questions about the platform, your account, or anything else - this is the right place to start.'
		},
		{
			icon: GraduationCap,
			title: 'Admissions & Courses',
			description: 'Questions about a specific course, curriculum, or which course fits your goals.'
		},
		{
			icon: Wrench,
			title: 'Technical Support',
			description:
				'Run into a bug, a broken page, or something not working as expected? Let us know the details.'
		},
		{
			icon: Briefcase,
			title: 'Partnerships & Sales',
			description:
				'Interested in bringing the academy to your team or organization? Tell us about your use case.'
		}
	];

	const SOCIAL_LINKS = [
		{ icon: Linkedin, label: 'LinkedIn' },
		{ icon: Twitter, label: 'X (Twitter)' },
		{ icon: Youtube, label: 'YouTube' },
		{ icon: Instagram, label: 'Instagram' }
	];
</script>

<svelte:head>
	<title>Contact Us · {siteConfig.name}</title>
	<meta name="description" content="Get in touch with our team." />
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
	<PageHeader
		title="Contact us"
		description="Have a question? Send us a message and our team will get back to you."
	/>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
		{#each DEPARTMENTS as department (department.title)}
			<Card class="flex flex-col gap-3 p-5">
				<span class="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
					<department.icon class="size-4.5" />
				</span>
				<h2 class="text-sm font-semibold text-foreground">{department.title}</h2>
				<p class="text-sm text-muted-foreground">{department.description}</p>
			</Card>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<Card class="p-6 lg:col-span-2">
			<h2 class="mb-4 text-lg font-semibold text-foreground">Send us a message</h2>
			<ContactForm {form} token={data.formToken} />
		</Card>

		<div class="flex flex-col gap-4">
			<Card class="flex items-start gap-3 p-5">
				<Clock class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">Response times</h3>
					<p class="text-sm text-muted-foreground">
						Our team typically responds within one business day. Support is available around the
						clock through this form.
					</p>
				</div>
			</Card>
			<Card class="flex items-start gap-3 p-5">
				<CircleQuestionMark class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">Common questions</h3>
					<p class="text-sm text-muted-foreground">
						Check our
						<a href={ROUTES.faq} class="text-brand-ink underline underline-offset-4 hover:no-underline">FAQ</a>
						first - it may already have your answer.
					</p>
				</div>
			</Card>
			<Card class="flex items-start gap-3 p-5">
				<LifeBuoy class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">Need more help?</h3>
					<p class="text-sm text-muted-foreground">
						Visit the
						<a href={ROUTES.helpCenter} class="text-brand-ink underline underline-offset-4 hover:no-underline"
							>Help Center</a
						>
						for guides and troubleshooting.
					</p>
				</div>
			</Card>
			<Card class="flex flex-col gap-3 p-5">
				<h3 class="text-sm font-semibold text-foreground">Follow along</h3>
				<p class="text-sm text-muted-foreground">
					We are a remote-first, globally distributed team - the fastest way to reach us is always
					this form.
				</p>
				<div class="flex items-center gap-2">
					{#each SOCIAL_LINKS as social (social.label)}
						<span
							role="img"
							aria-label={social.label}
							class="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
						>
							<social.icon class="size-4" />
						</span>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</div>
