import { publicFileUrl } from '@nahu/admin-kit/files';

/**
 * The URL of a course thumbnail or instructor photo. Seeded rows hold a path under /static
 * ("/images/…"); uploads from the dashboard hold a stored file name, served by /media.
 */
export function mediaUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	return value.startsWith('/') ? value : publicFileUrl(value);
}
