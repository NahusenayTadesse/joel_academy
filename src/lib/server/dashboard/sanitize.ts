import sanitizeHtml from 'sanitize-html';

/**
 * Lesson bodies come from the RichEditor as HTML and are rendered on the student pages as-is, so
 * only the tags that editor produces survive, links are http(s)/mailto/site paths, and every
 * external link opens safely in a new tab.
 */
export function sanitizeLessonHtml(html: string | null | undefined): string | null {
	const clean = sanitizeHtml(html ?? '', {
		allowedTags: [
			'p',
			'br',
			'hr',
			'h2',
			'h3',
			'h4',
			'strong',
			'b',
			'em',
			'i',
			'u',
			's',
			'code',
			'pre',
			'blockquote',
			'ul',
			'ol',
			'li',
			'a',
			'img'
		],
		allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesByTag: { img: ['http', 'https'] },
		allowProtocolRelative: false,
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer'
			})
		}
	}).trim();
	// The editor's empty state is a lone paragraph; store nothing instead.
	return clean === '' || clean === '<p></p>' ? null : clean;
}
