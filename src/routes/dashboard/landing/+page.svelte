<script lang="ts">
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ImageUp from '@lucide/svelte/icons/image-up';
	import Layers from '@lucide/svelte/icons/layers';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';
	import { toast } from 'svelte-sonner';
	import { deserialize } from '$app/forms';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Select from '@nahu/admin-kit/components/ui/select/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Switch } from '@nahu/admin-kit/components/ui/switch/index.js';
	import { Textarea } from '@nahu/admin-kit/components/ui/textarea/index.js';
	import { confirmLeave, createForm } from '@nahu/admin-kit/forms/createForm';
	import { fileUrl } from '@nahu/admin-kit/files';
	import {
		DEFAULT_HERO_IMAGE,
		defaultSection,
		landingSchema,
		type LandingSettings,
		type SectionKey
	} from '$lib/content/landing';
	import { landingIcon } from '$lib/components/home/landing-icons';
	import Field from './Field.svelte';
	import IconPicker from './IconPicker.svelte';
	import ItemControls from './ItemControls.svelte';

	let { data } = $props();

	// Seeded once from the load; after a save superforms keeps what the server returned.
	// svelte-ignore state_referenced_locally
	const { form, errors, allErrors, enhance, submitting, tainted, isTainted } = createForm(
		data.form,
		landingSchema,
		{ dataType: 'json', resetForm: false, taintedMessage: confirmLeave }
	);

	type Tab = keyof LandingSettings;

	const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
		{ id: 'sections', label: 'Section control', icon: LayoutDashboard },
		{ id: 'hero', label: 'Hero', icon: Sparkles },
		{ id: 'valuePills', label: 'Value pills', icon: Layers },
		{ id: 'whyChooseUs', label: 'Why choose us', icon: ShieldCheck },
		{ id: 'howItWorks', label: 'How it works', icon: ListOrdered },
		{ id: 'mentor', label: 'Mentor spotlight', icon: Users },
		{ id: 'finalCta', label: 'Final CTA', icon: Zap },
		{ id: 'announcement', label: 'Announcement bar', icon: Megaphone },
		{ id: 'faqs', label: 'FAQ', icon: CircleHelp }
	];

	const SECTIONS: { key: SectionKey; label: string; desc: string; href?: string }[] = [
		{ key: 'hero', label: 'Hero header & search', desc: 'Main headline, CTAs and search' },
		{ key: 'valuePills', label: 'Value propositions', desc: 'Highlight pills under the hero' },
		{ key: 'whyChooseUs', label: 'Why choose us', desc: 'Core strengths cards' },
		{ key: 'howItWorks', label: 'The learning framework', desc: 'Step-by-step roadmap' },
		{
			key: 'featuredCourses',
			label: 'Featured courses',
			desc: 'Published courses marked featured',
			href: '/dashboard/courses'
		},
		{
			key: 'categories',
			label: 'Browse categories',
			desc: 'Active categories',
			href: '/dashboard/categories'
		},
		{ key: 'mentor', label: 'Mentor spotlight', desc: 'Featured instructor profile' },
		{ key: 'stats', label: 'Platform statistics', desc: 'Live courses, instructors, students' },
		{ key: 'pricing', label: 'Pricing preview', desc: 'Free and paid course tiers' },
		{
			key: 'testimonials',
			label: 'Learner testimonials',
			desc: 'Student reviews carousel',
			href: '/dashboard/testimonials'
		},
		{ key: 'certificateVerify', label: 'Verify certificate', desc: 'Public verification lookup' },
		{ key: 'faq', label: 'FAQ preview', desc: 'First four questions of the FAQ' },
		{ key: 'finalCta', label: 'Final call to action', desc: 'Bottom sign-up banner' }
	];

	let activeTab = $state<Tab>('sections');

	/** Whether a part of the form holds a validation error anywhere inside it. */
	function hasError(value: unknown): boolean {
		if (Array.isArray(value)) return value.some((entry) => typeof entry === 'string' || hasError(entry));
		if (value && typeof value === 'object') return Object.values(value).some(hasError);
		return false;
	}

	function resetSection(key: Tab) {
		$form[key] = defaultSection(key) as never;
		toast.info('Defaults restored for this section. Save to publish.');
	}

	function moved<T>(list: T[], from: number, to: number): T[] {
		const next = [...list];
		const [entry] = next.splice(from, 1);
		next.splice(to, 0, entry);
		return next;
	}

	function without<T>(list: T[], index: number): T[] {
		return list.filter((_, i) => i !== index);
	}

	// --- Hero image ---
	let uploading = $state(false);
	const heroPreview = $derived(
		$form.hero.image.startsWith('/') ? $form.hero.image : fileUrl($form.hero.image)
	);

	async function uploadHero(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		try {
			const body = new FormData();
			body.append('image', file);
			const response = await fetch('?/uploadHero', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (result.type === 'success' && typeof result.data?.image === 'string') {
				$form.hero.image = result.data.image;
				toast.success('Image uploaded. Save the page to publish it.');
			} else if (result.type === 'failure') {
				toast.error(String(result.data?.message ?? 'The upload failed.'));
			} else {
				toast.error('The upload failed.');
			}
		} catch {
			toast.error('The upload failed.');
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	// --- Mentor ---
	const FIRST = '__first';
	const mentorName = $derived(
		$form.mentor.instructorSlug
			? (data.instructors.find((entry) => entry.slug === $form.mentor.instructorSlug)?.name ??
					`${$form.mentor.instructorSlug} (not listed, falls back to the first)`)
			: `First on the instructors list (${data.instructors[0]?.name ?? 'none yet'})`
	);
</script>

{#snippet resetButton(key: Tab)}
	<Button type="button" variant="ghost" size="sm" onclick={() => resetSection(key)}>
		<RotateCcw class="size-4" /> Reset section to default
	</Button>
{/snippet}

{#snippet saveButton()}
	<Button type="submit" form="landing-form" disabled={$submitting}>
		{#if $submitting}<LoaderCircle class="size-4 animate-spin" />{/if}
		Save changes
	</Button>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Landing page"
		description="Edit the public home page, its announcement bar and the FAQ. Changes go live when you save."
	>
		{#snippet actions()}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the public site, in a new tab -->
			<Button href="/" target="_blank" rel="noopener" variant="outline">
				<ExternalLink class="size-4" /> View site
			</Button>
			{@render saveButton()}
		{/snippet}
	</PageHeader>

	{#if $allErrors.length}
		<Notice tone="danger" title="{$allErrors.length} field(s) need attention. ">
			Tabs marked with a dot hold the errors.
		</Notice>
	{/if}

	<nav class="flex flex-wrap items-center gap-2 border-b border-border pb-4" aria-label="Sections">
		{#each TABS as tab (tab.id)}
			<Button
				type="button"
				variant={activeTab === tab.id ? 'default' : 'outline'}
				size="sm"
				class="gap-1.5"
				aria-current={activeTab === tab.id ? 'true' : undefined}
				onclick={() => (activeTab = tab.id)}
			>
				<tab.icon class="size-3.5" />
				{tab.label}
				{#if hasError($errors[tab.id])}
					<span class="size-2 rounded-full bg-destructive" aria-label="has errors"></span>
				{/if}
			</Button>
		{/each}
	</nav>

	<form id="landing-form" method="POST" action="?/save" use:enhance class="flex flex-col gap-6">
		{#if activeTab === 'sections'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Section visibility</Card.Title>
					<Card.Description>
						Turn parts of the home page on or off. A section with nothing to show (no featured
						courses, no testimonials) stays hidden either way.
					</Card.Description>
					<Card.Action>{@render resetButton('sections')}</Card.Action>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each SECTIONS as item (item.key)}
							<div
								class="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-xs"
							>
								<div class="space-y-0.5 pr-2">
									<label for="section-{item.key}" class="text-sm font-semibold text-foreground">
										{item.label}
									</label>
									<p class="text-xs text-muted-foreground">
										{item.desc}
										{#if item.href}
											·
											<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- dashboard path -->
											<a href={item.href} class="text-primary-ink hover:underline">manage</a>
										{/if}
									</p>
								</div>
								<Switch id="section-{item.key}" bind:checked={$form.sections[item.key]} />
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'hero'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Hero</Card.Title>
					<Card.Description>The top of the home page: headline, buttons and picture.</Card.Description>
					<Card.Action>{@render resetButton('hero')}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<Field id="hero-badge" label="Badge" errors={$errors.hero?.badge}>
						<Input id="hero-badge" bind:value={$form.hero.badge} />
					</Field>
					<Field id="hero-heading" label="Main headline" errors={$errors.hero?.heading}>
						<Input id="hero-heading" bind:value={$form.hero.heading} />
					</Field>
					<Field id="hero-description" label="Description" errors={$errors.hero?.description}>
						<Textarea id="hero-description" rows={4} bind:value={$form.hero.description} />
					</Field>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field
							id="hero-primary-text"
							label="Primary button label"
							errors={$errors.hero?.primaryCtaText}
						>
							<Input id="hero-primary-text" bind:value={$form.hero.primaryCtaText} />
						</Field>
						<Field
							id="hero-primary-url"
							label="Primary button link"
							hint="A path such as /courses, or an https:// link"
							errors={$errors.hero?.primaryCtaUrl}
						>
							<Input id="hero-primary-url" bind:value={$form.hero.primaryCtaUrl} />
						</Field>
						<Field
							id="hero-secondary-text"
							label="Secondary button label"
							errors={$errors.hero?.secondaryCtaText}
						>
							<Input id="hero-secondary-text" bind:value={$form.hero.secondaryCtaText} />
						</Field>
						<Field
							id="hero-secondary-url"
							label="Secondary button link"
							hint="A path such as /register, or an https:// link"
							errors={$errors.hero?.secondaryCtaUrl}
						>
							<Input id="hero-secondary-url" bind:value={$form.hero.secondaryCtaUrl} />
						</Field>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,18rem)_1fr]">
						<div
							class="relative aspect-4/3 w-full overflow-hidden rounded-xl border bg-muted"
						>
							{#if heroPreview}
								<img src={heroPreview} alt={$form.hero.imageAlt} class="size-full object-cover" />
							{/if}
							{#if uploading}
								<div class="absolute inset-0 flex items-center justify-center bg-background/60">
									<LoaderCircle class="size-6 animate-spin" />
								</div>
							{/if}
						</div>
						<div class="flex flex-col gap-3">
							<Field
								id="hero-image"
								label="Hero image"
								hint="PNG, JPG or WebP up to 10 MB. Square or 4:3 crops best."
								errors={$errors.hero?.image}
							>
								<div class="flex flex-wrap items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={uploading}
										onclick={() => document.getElementById('hero-image')?.click()}
									>
										<ImageUp class="size-4" /> Upload new image
									</Button>
									{#if $form.hero.image !== DEFAULT_HERO_IMAGE}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => ($form.hero.image = DEFAULT_HERO_IMAGE)}
										>
											<X class="size-4" /> Use the original image
										</Button>
									{/if}
									<input
										id="hero-image"
										type="file"
										accept="image/png,image/jpeg,image/webp,image/gif"
										class="sr-only"
										onchange={uploadHero}
									/>
								</div>
							</Field>
							<Field
								id="hero-alt"
								label="Image description (for screen readers)"
								errors={$errors.hero?.imageAlt}
							>
								<Input id="hero-alt" bind:value={$form.hero.imageAlt} />
							</Field>
							<Field
								id="hero-caption"
								label="Caption over the image"
								hint="Leave empty for no caption."
								errors={$errors.hero?.imageCaption}
							>
								<Textarea id="hero-caption" rows={2} bind:value={$form.hero.imageCaption} />
							</Field>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'valuePills' || activeTab === 'whyChooseUs'}
			{@const key = activeTab}
			{@const noun = key === 'valuePills' ? 'pill' : 'card'}
			{@const max = key === 'valuePills' ? 6 : 8}
			<Card.Root>
				<Card.Header>
					<Card.Title>{key === 'valuePills' ? 'Value pills' : 'Why choose us'}</Card.Title>
					<Card.Description>
						{key === 'valuePills'
							? 'The short highlights right under the hero (three fit one row).'
							: 'The strengths cards under "Why Choose the Academy" (four fit one row).'}
					</Card.Description>
					<Card.Action>{@render resetButton(key)}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each $form[key] as item, i (i)}
						{@const Icon = landingIcon(item.icon)}
						<div class="flex flex-col gap-3 rounded-xl border p-4">
							<div class="flex items-center justify-between gap-2">
								<span class="flex items-center gap-2 text-sm font-semibold">
									<span
										class="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand-ink"
									>
										<Icon class="size-4" />
									</span>
									{noun[0].toUpperCase() + noun.slice(1)}
									{i + 1}
								</span>
								<ItemControls
									index={i}
									count={$form[key].length}
									label="{noun} {i + 1}"
									onmove={(from, to) => ($form[key] = moved($form[key], from, to))}
									onremove={(index) => ($form[key] = without($form[key], index))}
								/>
							</div>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr]">
								<Field id="{key}-{i}-icon" label="Icon">
									<IconPicker id="{key}-{i}-icon" bind:value={$form[key][i].icon} />
								</Field>
								<Field id="{key}-{i}-title" label="Title" errors={$errors[key]?.[i]?.title}>
									<Input id="{key}-{i}-title" bind:value={$form[key][i].title} />
								</Field>
							</div>
							<Field
								id="{key}-{i}-description"
								label="Description"
								errors={$errors[key]?.[i]?.description}
							>
								<Textarea
									id="{key}-{i}-description"
									rows={2}
									bind:value={$form[key][i].description}
								/>
							</Field>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No {noun}s: the section is hidden.</p>
					{/each}
					{#if $errors[key]?._errors?.length}
						<p class="text-xs text-destructive">{$errors[key]?._errors?.[0]}</p>
					{/if}
					<Button
						type="button"
						variant="outline"
						class="w-fit"
						disabled={$form[key].length >= max}
						onclick={() =>
							($form[key] = [...$form[key], { icon: 'Sparkles', title: '', description: '' }])}
					>
						<Plus class="size-4" /> Add {noun}
					</Button>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'howItWorks'}
			<Card.Root>
				<Card.Header>
					<Card.Title>The learning framework</Card.Title>
					<Card.Description>Steps numbered 01, 02, … in the order below.</Card.Description>
					<Card.Action>{@render resetButton('howItWorks')}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each $form.howItWorks as step, i (i)}
						<div class="flex flex-col gap-3 rounded-xl border p-4">
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-semibold">
									<span class="mr-1 text-lime-600">{String(i + 1).padStart(2, '0')}</span>
									{step.title || 'New step'}
								</span>
								<ItemControls
									index={i}
									count={$form.howItWorks.length}
									label="step {i + 1}"
									onmove={(from, to) => ($form.howItWorks = moved($form.howItWorks, from, to))}
									onremove={(index) => ($form.howItWorks = without($form.howItWorks, index))}
								/>
							</div>
							<Field id="step-{i}-title" label="Title" errors={$errors.howItWorks?.[i]?.title}>
								<Input id="step-{i}-title" bind:value={$form.howItWorks[i].title} />
							</Field>
							<Field
								id="step-{i}-description"
								label="Description"
								errors={$errors.howItWorks?.[i]?.description}
							>
								<Textarea
									id="step-{i}-description"
									rows={2}
									bind:value={$form.howItWorks[i].description}
								/>
							</Field>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No steps: the section is hidden.</p>
					{/each}
					<Button
						type="button"
						variant="outline"
						class="w-fit"
						disabled={$form.howItWorks.length >= 8}
						onclick={() =>
							($form.howItWorks = [...$form.howItWorks, { title: '', description: '' }])}
					>
						<Plus class="size-4" /> Add step
					</Button>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'mentor'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Mentor spotlight</Card.Title>
					<Card.Description>
						Which instructor the home page features. Their name, photo, bio and achievements come
						from
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- dashboard path -->
						<a href="/dashboard/instructors" class="text-primary-ink hover:underline">their profile</a>.
					</Card.Description>
					<Card.Action>{@render resetButton('mentor')}</Card.Action>
				</Card.Header>
				<Card.Content>
					<Field
						id="mentor-instructor"
						label="Featured instructor"
						hint="A hidden instructor is replaced by the first one on the list."
						class="max-w-md"
					>
						<Select.Root
							type="single"
							bind:value={
								() => $form.mentor.instructorSlug || FIRST,
								(next) => ($form.mentor.instructorSlug = next === FIRST ? '' : (next ?? ''))
							}
						>
							<Select.Trigger id="mentor-instructor" class="w-full">{mentorName}</Select.Trigger>
							<Select.Content>
								<Select.Item value={FIRST} label="First on the instructors list">
									First on the instructors list
								</Select.Item>
								{#each data.instructors as person (person.slug)}
									<Select.Item value={person.slug} label={person.name}>{person.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'finalCta'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Final call to action</Card.Title>
					<Card.Description>The dark banner at the bottom of the home page.</Card.Description>
					<Card.Action>{@render resetButton('finalCta')}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<Field id="cta-heading" label="Heading" errors={$errors.finalCta?.heading}>
						<Input id="cta-heading" bind:value={$form.finalCta.heading} />
					</Field>
					<Field id="cta-description" label="Description" errors={$errors.finalCta?.description}>
						<Textarea id="cta-description" rows={3} bind:value={$form.finalCta.description} />
					</Field>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field id="cta-text" label="Button label" errors={$errors.finalCta?.ctaText}>
							<Input id="cta-text" bind:value={$form.finalCta.ctaText} />
						</Field>
						<Field
							id="cta-url"
							label="Button link"
							hint="A path such as /register, or an https:// link"
							errors={$errors.finalCta?.ctaUrl}
						>
							<Input id="cta-url" bind:value={$form.finalCta.ctaUrl} />
						</Field>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'announcement'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Announcement bar</Card.Title>
					<Card.Description>
						The strip above every public page. Visitors can close it; it comes back for everyone
						when you change its text, link or name.
					</Card.Description>
					<Card.Action>{@render resetButton('announcement')}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<Switch id="announcement-enabled" bind:checked={$form.announcement.enabled} />
						<label for="announcement-enabled" class="text-sm font-medium">Show the bar</label>
					</div>
					<Field id="announcement-text" label="Text" errors={$errors.announcement?.text}>
						<Input id="announcement-text" bind:value={$form.announcement.text} />
					</Field>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field
							id="announcement-link-text"
							label="Link label"
							hint="Leave empty for no link."
							errors={$errors.announcement?.linkText}
						>
							<Input id="announcement-link-text" bind:value={$form.announcement.linkText} />
						</Field>
						<Field
							id="announcement-link-url"
							label="Link"
							hint="A path such as /courses, or an https:// link"
							errors={$errors.announcement?.linkUrl}
						>
							<Input id="announcement-link-url" bind:value={$form.announcement.linkUrl} />
						</Field>
					</div>
					<Field
						id="announcement-id"
						label="Name"
						hint="Internal. A new name shows the bar again even to visitors who closed the same text."
						errors={$errors.announcement?.id}
						class="max-w-sm"
					>
						<Input id="announcement-id" bind:value={$form.announcement.id} />
					</Field>
					<div class="flex flex-col gap-1.5">
						<span class="text-sm font-medium">Preview</span>
						<div
							class="flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-center text-xs font-medium text-brand-foreground sm:text-sm {$form
								.announcement.enabled
								? ''
								: 'opacity-40'}"
						>
							<span>
								{$form.announcement.text}
								{#if $form.announcement.linkText && $form.announcement.linkUrl}
									<span class="underline underline-offset-2">{$form.announcement.linkText}</span>
								{/if}
							</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'faqs'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Frequently asked questions</Card.Title>
					<Card.Description>
						Shown in full on the
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- public page -->
						<a href="/faq" target="_blank" rel="noopener" class="text-primary-ink hover:underline">FAQ page</a>;
						the first four also appear on the home page.
					</Card.Description>
					<Card.Action>{@render resetButton('faqs')}</Card.Action>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each $form.faqs as faq, i (i)}
						<div class="flex flex-col gap-3 rounded-xl border p-4">
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-semibold">
									Question {i + 1}
									{#if i < 4}<span class="ml-1 text-xs font-normal text-muted-foreground"
											>· on the home page</span
										>{/if}
								</span>
								<ItemControls
									index={i}
									count={$form.faqs.length}
									label="question {i + 1}"
									onmove={(from, to) => ($form.faqs = moved($form.faqs, from, to))}
									onremove={(index) => ($form.faqs = without($form.faqs, index))}
								/>
							</div>
							<Field id="faq-{i}-question" label="Question" errors={$errors.faqs?.[i]?.question}>
								<Input id="faq-{i}-question" bind:value={$form.faqs[i].question} />
							</Field>
							<Field id="faq-{i}-answer" label="Answer" errors={$errors.faqs?.[i]?.answer}>
								<Textarea id="faq-{i}-answer" rows={3} bind:value={$form.faqs[i].answer} />
							</Field>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No questions yet.</p>
					{/each}
					<Button
						type="button"
						variant="outline"
						class="w-fit"
						disabled={$form.faqs.length >= 60}
						onclick={() => ($form.faqs = [...$form.faqs, { question: '', answer: '' }])}
					>
						<Plus class="size-4" /> Add question
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</form>

	<div
		class="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur"
	>
		<span class="text-sm text-muted-foreground">
			{isTainted($tainted) ? 'You have unsaved changes.' : 'No unsaved changes.'}
		</span>
		{@render saveButton()}
	</div>
</div>

