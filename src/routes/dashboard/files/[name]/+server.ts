import { createFileHandler } from '@nahu/admin-kit/server/serveFile';

/**
 * Uploads for staff (payment receipts above all). Students also sign in, so being signed in is not
 * enough: only an account the hook gave dashboard access may read these.
 */
export const GET = createFileHandler<App.Locals>({
	canRead: (locals) => locals.isSuperAdmin || locals.permList.includes('dashboard.view')
});
