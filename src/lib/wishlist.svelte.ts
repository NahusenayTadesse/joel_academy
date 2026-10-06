const STORAGE_KEY = 'joel-academy-wishlist';

function read(): string[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

/**
 * The visitor's wishlisted course ids, kept in this browser only. It starts empty, as the server
 * render does, and `load()` (called once the public layout mounts) fills the hearts in afterwards.
 */
class Wishlist {
	ids = $state<string[]>([]);

	load() {
		this.ids = read();
	}

	has(courseId: string) {
		return this.ids.includes(courseId);
	}

	toggle(courseId: string) {
		this.ids = this.has(courseId)
			? this.ids.filter((id) => id !== courseId)
			: [...this.ids, courseId];
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids));
		} catch {
			// Storage can be blocked; the toggle still applies for this visit.
		}
	}
}

export const wishlist = new Wishlist();
