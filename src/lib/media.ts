import { publicFileUrl } from '@nahu/admin-kit/files';

/**
 * The URL of a course thumbnail or instructor photo. Seeded rows hold a path under /static
 * ("/images/…"); uploads from the dashboard hold a stored file name, served by /media.
 */
export function mediaUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	return value.startsWith('/') ? value : publicFileUrl(value);
}

const SHIPPED = /^(\/images\/.+)\.(jpe?g|png)$/i;

/**
 * Smaller WebP copies of a shipped picture (made by scripts/optimize-images.sh) as a `srcset`, so a
 * phone downloads a 480–640 px image rather than the full-size JPEG. Uploads have no copies, so
 * they get none (undefined: the plain `src` is used).
 */
export function responsiveSrcset(url: string | null | undefined): string | undefined {
	const match = url ? SHIPPED.exec(url) : null;
	if (!match) return undefined;
	return [480, 640, 800].map((width) => `${match[1]}-${width}.webp ${width}w`).join(', ');
}
