import { invalidate } from '$app/navigation';
import { ROUTES } from '$lib/site';

const STORAGE_KEY = 'joel-academy-wishlist';
const ENDPOINT = `${ROUTES.student.wishlist}/items`;

function readLocal(): string[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

function writeLocal(ids: string[]) {
	try {
		if (ids.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage can be blocked; the change still applies for this visit.
	}
}

/** Sends a change to the account's wishlist; resolves to the saved ids, or null on failure. */
async function send(change: { add?: string[]; remove?: string[] }): Promise<string[] | null> {
	try {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify(change)
		});
		if (!response.ok) return null;
		const body = (await response.json()) as { ids?: unknown };
		return Array.isArray(body.ids) ? body.ids.map(String) : null;
	} catch {
		return null;
	}
}

/**
 * The visitor's wishlisted course ids. Signed out, they live in this browser only. Signed in, the
 * account holds them: the browser's list is merged in once, then cleared, and every heart writes
 * to the server. It starts empty, as the server render does; the public layout calls `sync` once
 * it mounts and whenever its data changes (sign-in, sign-out, an invalidation).
 */
class Wishlist {
	ids = $state<string[]>([]);
	#signedIn = false;

	/** `serverIds` is the account's list, or null when signed out. */
	async sync(serverIds: string[] | null) {
		if (serverIds === null) {
			this.#signedIn = false;
			this.ids = readLocal();
			return;
		}
		this.#signedIn = true;
		const local = readLocal();
		const missing = local.filter((id) => !serverIds.includes(id));
		this.ids = [...missing, ...serverIds];
		if (local.length === 0) return;
		if (missing.length === 0) {
			writeLocal([]);
			return;
		}
		const saved = await send({ add: missing });
		if (!saved) return; // Kept locally; the next page load tries again.
		writeLocal([]);
		this.ids = saved;
		await invalidate('app:wishlist');
	}

	has(courseId: string) {
		return this.ids.includes(courseId);
	}

	/** Flips one course; resolves false when the account could not be updated (and nothing changed). */
	async toggle(courseId: string): Promise<boolean> {
		const removing = this.has(courseId);
		const before = this.ids;
		this.ids = removing ? before.filter((id) => id !== courseId) : [courseId, ...before];
		if (!this.#signedIn) {
			writeLocal(this.ids);
			return true;
		}
		const saved = await send(removing ? { remove: [courseId] } : { add: [courseId] });
		if (!saved) {
			this.ids = before;
			return false;
		}
		this.ids = saved;
		await invalidate('app:wishlist');
		return true;
	}
}

export const wishlist = new Wishlist();
