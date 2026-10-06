import { createAccess } from '@nahu/admin-kit/access';
/*
 * Editors run the catalog; everything about students and their money (enrollments, receipts,
 * certificates, messages) needs `academy.manage`, which only administrators hold.
 */
export const access = createAccess({ root: '/dashboard', rules: [
 { prefix: '/dashboard', exact: true, permission: 'dashboard.view' },
 // Signed in is enough to reach the route; the handler itself checks for staff.
 { prefix: '/dashboard/files', permission: null },
 { prefix: '/dashboard/courses', permission: 'courses.manage' },
 { prefix: '/dashboard/categories', permission: 'courses.manage' },
 { prefix: '/dashboard/instructors', permission: 'courses.manage' },
 { prefix: '/dashboard/testimonials', permission: 'courses.manage' },
 { prefix: '/dashboard/landing', permission: 'courses.manage' },
 { prefix: '/dashboard/reports', permission: 'academy.manage' },
 { prefix: '/dashboard/promo-codes', permission: 'academy.manage' },
 { prefix: '/dashboard/emails', permission: 'academy.manage' },
 { prefix: '/dashboard/sms', permission: 'academy.manage' },
 { prefix: '/dashboard/enrollments', permission: 'academy.manage' },
 { prefix: '/dashboard/payment-methods', permission: 'academy.manage' },
 { prefix: '/dashboard/certificates', permission: 'academy.manage' },
 { prefix: '/dashboard/messages', permission: 'academy.manage' },
 { prefix: '/dashboard/subscribers', permission: 'academy.manage' }
] });
