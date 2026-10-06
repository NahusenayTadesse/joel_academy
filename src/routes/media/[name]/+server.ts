import { eq } from 'drizzle-orm';
import { servePublicFile } from '@nahu/admin-kit/server/servePublicFile';
import { db } from '$lib/server/db';
import { course, instructor } from '$lib/server/db/schema';
import { getLandingSettings } from '$lib/server/landing';

/**
 * Course thumbnails, instructor photos and the landing page's hero image, for visitors who are not
 * signed in. A name is served only while one of those uses it; receipts and every other upload
 * stay private.
 */
export const GET = servePublicFile({
	isPublic: async (name) => {
		if ((await getLandingSettings()).hero.image === name) return true;
		const [inCourse, inProfile] = await Promise.all([
			db.select({ id: course.id }).from(course).where(eq(course.thumbnail, name)).limit(1),
			db.select({ id: instructor.id }).from(instructor).where(eq(instructor.photo, name)).limit(1)
		]);
		return inCourse.length > 0 || inProfile.length > 0;
	}
});
