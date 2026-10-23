<script lang="ts">
	import { jsonLdScript } from '$lib/json-ld';
	import CategoriesSection from '$lib/components/home/categories-section.svelte';
	import CtaBannerSection from '$lib/components/home/cta-banner-section.svelte';
	import FaqPreviewSection from '$lib/components/home/faq-preview-section.svelte';
	import FeaturedCoursesSection from '$lib/components/home/featured-courses-section.svelte';
	import HeroSection from '$lib/components/home/hero-section.svelte';
	import HowItWorksSection from '$lib/components/home/how-it-works-section.svelte';
	import MentorSpotlightSection from '$lib/components/home/mentor-spotlight-section.svelte';
	import PricingPreviewSection from '$lib/components/home/pricing-preview-section.svelte';
	import StatsBandSection from '$lib/components/home/stats-band-section.svelte';
	import ValuePillsSection from '$lib/components/home/value-pills-section.svelte';
	import VerifyCertificateSection from '$lib/components/home/verify-certificate-section.svelte';
	import WhyChooseUsSection from '$lib/components/home/why-choose-us-section.svelte';
	import TestimonialsSection from '$lib/components/testimonials/testimonials-section.svelte';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	const show = $derived(data.landing.sections);
</script>

<svelte:head>
	<title>{m.home_meta_title()}</title>
	<meta name="description" content={m.home_meta_description()} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- built on the server, `<` escaped -->
	{@html jsonLdScript(data.jsonLd)}
</svelte:head>

<div>
	{#if show.hero}
		<HeroSection hero={data.landing.hero} />
	{/if}
	{#if show.valuePills && data.landing.valuePills.length > 0}
		<ValuePillsSection items={data.landing.valuePills} />
	{/if}
	{#if show.whyChooseUs && data.landing.whyChooseUs.length > 0}
		<WhyChooseUsSection items={data.landing.whyChooseUs} />
	{/if}
	{#if show.howItWorks && data.landing.howItWorks.length > 0}
		<HowItWorksSection items={data.landing.howItWorks} />
	{/if}
	{#if show.featuredCourses && data.featured.length > 0}
		<FeaturedCoursesSection courses={data.featured} />
	{/if}
	{#if show.categories && data.categories.length > 0}
		<CategoriesSection categories={data.categories} />
	{/if}
	{#if show.mentor && data.topMentor}
		<MentorSpotlightSection instructor={data.topMentor} />
	{/if}
	{#if show.stats}
		<StatsBandSection
			items={[
				{ value: data.platformStats.totalCourses, label: m.home_stats_courses(), kind: 'number' },
				{ value: data.platformStats.instructorCount, label: m.home_stats_instructors(), kind: 'number' },
				{ value: data.platformStats.studentsEnrolled, label: m.home_stats_students(), kind: 'number' }
			]}
		/>
	{/if}
	{#if show.pricing}
		<PricingPreviewSection />
	{/if}
	{#if show.testimonials && data.testimonials.length > 0}
		<TestimonialsSection testimonials={data.testimonials} />
	{/if}
	{#if show.certificateVerify}
		<VerifyCertificateSection />
	{/if}
	{#if show.faq && data.landing.faqs.length > 0}
		<FaqPreviewSection items={data.landing.faqs} />
	{/if}
	{#if show.finalCta}
		<CtaBannerSection cta={data.landing.finalCta} />
	{/if}
</div>
