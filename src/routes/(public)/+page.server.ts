import { m } from '$lib/paraglide/messages';
import { getLandingSettings } from '$lib/server/landing';
import {
	featuredCourses,
	listCategories,
	listInstructors,
	listTestimonials,
	platformStats
} from '$lib/server/public-catalog';
import { env } from '$env/dynamic/private';
import { ROUTES, siteConfig } from '$lib/site';
import type { PageServerLoad } from './$types';

/** Who runs the site, and how to search it: lets search engines show the name, logo and a search box. */
function structuredData(origin: string) {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'EducationalOrganization',
			name: siteConfig.name,
			url: `${origin}/`,
			logo: `${origin}/icons/icon-512.png`,
			description: m.shell_site_description()
		},
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: siteConfig.name,
			url: `${origin}/`,
			potentialAction: {
				'@type': 'SearchAction',
				target: { '@type': 'EntryPoint', urlTemplate: `${origin}${ROUTES.courses.list}?search={search_term_string}` },
				'query-input': 'required name=search_term_string'
			}
		}
	];
}

export const load: PageServerLoad = async ({ url }) => {
	const [landing, featured, categories, instructors, testimonials, stats] = await Promise.all([
		getLandingSettings(),
		featuredCourses(8),
		listCategories(),
		listInstructors(),
		listTestimonials(),
		platformStats()
	]);
	// The spotlight is the instructor the landing CMS names, else whoever staff put first on the
	// instructors list (also when the named one has since been hidden).
	const chosen = landing.mentor.instructorSlug;
	const mentor = (chosen && instructors.find((entry) => entry.slug === chosen)) || instructors[0];
	return {
		jsonLd: structuredData((env.ORIGIN || url.origin).replace(/\/$/, '')),
		landing: {
			sections: landing.sections,
			hero: landing.hero,
			valuePills: landing.valuePills,
			whyChooseUs: landing.whyChooseUs,
			howItWorks: landing.howItWorks,
			finalCta: landing.finalCta,
			faqs: landing.faqs.slice(0, 4)
		},
		featured: featured.items,
		categories: categories.slice(0, 8),
		topMentor: mentor
			? {
					name: mentor.name,
					title: mentor.title,
					bio: mentor.bio ?? '',
					photoUrl: mentor.photoUrl,
					slug: mentor.slug,
					achievements: mentor.achievements
				}
			: null,
		testimonials,
		platformStats: stats
	};
};
