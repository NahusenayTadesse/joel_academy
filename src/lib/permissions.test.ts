import { describe, it, expect } from 'vitest';
import { roleGrant } from './permissions';
describe('staff permissions', () => {
 it('does not grant staff access to students or unknown roles', () => { for (const role of [undefined, 'student', 'owner']) expect(roleGrant(role)).toEqual({ isSuperAdmin: false, permList: [] }); });
 it('only promotes explicit administrators', () => { expect(roleGrant('admin').isSuperAdmin).toBe(true); expect(roleGrant('editor')).toEqual({ isSuperAdmin: false, permList: ['dashboard.view', 'courses.manage'] }); });
});
