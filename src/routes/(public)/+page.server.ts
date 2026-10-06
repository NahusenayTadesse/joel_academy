import { getLandingSettings } from '$lib/server/landing';
import {
	featuredCourses,
	listCategories,
	listInstructors,
	listTestimonials,
	platformStats
} from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
