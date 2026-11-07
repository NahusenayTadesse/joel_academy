/*
 * Where the branded PDFs are served (`src/routes/downloads`). Never localized: the PDFs are
 * files, not pages, and the access checks match on the address as typed.
 */
export const DOWNLOADS = {
	outline: (slug: string) => `/downloads/courses/${encodeURIComponent(slug)}/outline.pdf`,
	section: (slug: string, sectionId: number) =>
		`/downloads/courses/${encodeURIComponent(slug)}/sections/${sectionId}.pdf`,
	handout: (handoutId: number) => `/downloads/handouts/${handoutId}.pdf`
};

export const HANDOUT_STYLE_NAMES = {
	DOCUMENT: 'Handout',
	CHECKLIST: 'Checklist',
	WORKSHEET: 'Worksheet'
} as const;

export type HandoutStyle = keyof typeof HANDOUT_STYLE_NAMES;
