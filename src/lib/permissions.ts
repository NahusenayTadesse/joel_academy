export function roleGrant(role?: string) {
 return { isSuperAdmin: role === 'admin', permList: role === 'editor' ? ['dashboard.view', 'courses.manage'] : [] };
}
