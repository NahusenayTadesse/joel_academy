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
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data, form } = $props();

	const DEPARTMENTS = [
		{
			icon: MessageCircle,
			title: m.info_contact_dept_general_title(),
			description: m.info_contact_dept_general_body()
		},
		{
			icon: GraduationCap,
			title: m.info_contact_dept_admissions_title(),
			description: m.info_contact_dept_admissions_body()
		},
		{
			icon: Wrench,
			title: m.info_contact_dept_support_title(),
			description: m.info_contact_dept_support_body()
		},
		{
			icon: Briefcase,
			title: m.info_contact_dept_partnerships_title(),
			description: m.info_contact_dept_partnerships_body()
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
	<title>{m.info_contact_meta_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_contact_meta_description()} />
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
	<PageHeader
		title={m.info_contact_title()}
		description={m.info_contact_description()}
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
			<h2 class="mb-4 text-lg font-semibold text-foreground">{m.info_contact_send_title()}</h2>
			<ContactForm {form} token={data.formToken} />
		</Card>

		<div class="flex flex-col gap-4">
			<Card class="flex items-start gap-3 p-5">
				<Clock class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">{m.info_contact_response_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_contact_response_body()}
					</p>
				</div>
			</Card>
			<Card class="flex items-start gap-3 p-5">
				<CircleQuestionMark class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">{m.info_contact_common_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_contact_common_before()}
						<a href={ROUTES.faq} class="text-brand-ink underline underline-offset-4 hover:no-underline"
							>{m.info_contact_common_link()}</a
						>
						{m.info_contact_common_after()}
					</p>
				</div>
			</Card>
			<Card class="flex items-start gap-3 p-5">
				<LifeBuoy class="mt-0.5 size-5 shrink-0 text-brand-ink" />
				<div>
					<h3 class="text-sm font-semibold text-foreground">{m.info_contact_more_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.info_contact_more_before()}
						<a href={ROUTES.helpCenter} class="text-brand-ink underline underline-offset-4 hover:no-underline"
							>{m.info_contact_more_link()}</a
						>
						{m.info_contact_more_after()}
					</p>
				</div>
			</Card>
			<Card class="flex flex-col gap-3 p-5">
				<h3 class="text-sm font-semibold text-foreground">{m.info_contact_follow_title()}</h3>
				<p class="text-sm text-muted-foreground">
					{m.info_contact_follow_body()}
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
