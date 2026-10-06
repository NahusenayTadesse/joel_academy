export interface ProgressLesson {
	id: number;
	isMandatory: boolean;
}

export interface CourseProgress {
	/** 0-100, over the lessons that count toward completion. */
	percent: number;
	required: number;
	requiredDone: number;
	completed: boolean;
}

/**
 * How far through a course a student is. Mandatory lessons decide completion; a course whose
 * lessons are all optional counts every lesson instead, so it can still be finished — but a course
 * with no lessons at all never is, or enrolling would hand out a certificate.
 */
export function courseProgress(lessons: readonly ProgressLesson[], done: ReadonlySet<number>): CourseProgress {
	const mandatory = lessons.filter((lesson) => lesson.isMandatory);
	const counted = mandatory.length > 0 ? mandatory : lessons;
	const required = counted.length;
	const requiredDone = counted.filter((lesson) => done.has(lesson.id)).length;
	return {
		percent: required === 0 ? 0 : Math.floor((requiredDone / required) * 100),
		required,
		requiredDone,
		completed: required > 0 && requiredDone === required
	};
}

/** The price a student pays: the discount when it is a real one, else the list price. */
export function effectivePrice(price: string, discountPrice: string | null): string {
	return discountPrice !== null && Number(discountPrice) < Number(price) ? discountPrice : price;
}
