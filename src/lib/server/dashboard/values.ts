import { setFlash } from 'sveltekit-flash-message/server';
import { fail, type Cookies } from '@sveltejs/kit';

/** Optional text saved as NULL rather than '' — "no subtitle" is not an empty one. */
export function blankToNull(values: Record<string, unknown>, keys: readonly string[]) {
	for (const key of keys) {
		if (!(key in values)) continue;
		const value = values[key];
		values[key] = typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
	}
	return values;
}

/** Optional text for a NOT NULL column with a '' default. */
export function nullToBlank(values: Record<string, unknown>, keys: readonly string[]) {
	for (const key of keys) {
		if (key in values && (values[key] === null || values[key] === undefined)) values[key] = '';
	}
	return values;
}

/**
 * A plain (non-superforms) action's answer, shown as a toast by the dashboard layout's flash
 * handler — the same channel the kit's lookup delete uses.
 */
export function flashOk(cookies: Cookies, message: string) {
	setFlash({ type: 'success', message }, cookies);
	return { ok: true };
}

export function flashFail(cookies: Cookies, message: string, status = 400) {
	setFlash({ type: 'error', message }, cookies);
	return fail(status, { message });
}

/** An id posted by a row button, or 0 when missing or malformed. */
export function postedId(data: FormData, key = 'id'): number {
	const id = Number(data.get(key));
	return Number.isInteger(id) && id > 0 ? id : 0;
}
