import { browser } from '$app/environment';

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * The installed-app state the UI reacts to: whether the browser offers installation, whether this
 * is iOS (which never does, but can add to the home screen by hand), whether the app is already
 * running installed, whether the device is online, and whether a new version is waiting.
 */
class Pwa {
	/** The browser's install prompt, held until the visitor asks for it. */
	#deferred = $state<BeforeInstallPromptEvent | null>(null);
	#waiting = $state<ServiceWorker | null>(null);

	standalone = $state(false);
	online = $state(true);
	ios = $state(false);
	installed = $state(false);

	get canInstall() {
		return !this.standalone && !this.installed && this.#deferred !== null;
	}

	/** iOS Safari: no install prompt exists, so the UI shows the Share → Add to Home Screen steps. */
	get needsManualInstall() {
		return !this.standalone && !this.installed && this.ios && this.#deferred === null;
	}

	get updateReady() {
		return this.#waiting !== null;
	}

	start() {
		if (!browser) return;
		const standaloneQuery = matchMedia('(display-mode: standalone)');
		const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
		const markStandalone = (standalone: boolean) => {
			this.standalone = standalone;
			document.documentElement.classList.toggle('app-standalone', standalone);
		};
		markStandalone(standaloneQuery.matches || navigatorStandalone);
		standaloneQuery.addEventListener('change', (event) => markStandalone(event.matches || navigatorStandalone));

		const ua = navigator.userAgent;
		// iPadOS reports itself as a Mac; touch support tells them apart.
		this.ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

		this.online = navigator.onLine;
		addEventListener('online', () => (this.online = true));
		addEventListener('offline', () => (this.online = false));

		addEventListener('beforeinstallprompt', (event) => {
			// Keep the browser's mini-infobar quiet; the app offers installation in its own UI.
			event.preventDefault();
			this.#deferred = event as BeforeInstallPromptEvent;
		});
		addEventListener('appinstalled', () => {
			this.installed = true;
			this.#deferred = null;
		});

		void this.#register();
	}

	async install(): Promise<boolean> {
		const prompt = this.#deferred;
		if (!prompt) return false;
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		this.#deferred = null;
		return outcome === 'accepted';
	}

	/** Lets the waiting worker take over; the page reloads once it controls it. */
	applyUpdate() {
		this.#waiting?.postMessage({ type: 'SKIP_WAITING' });
	}

	async #register() {
		if (!('serviceWorker' in navigator)) return;
		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js', {
				type: import.meta.env.DEV ? 'module' : 'classic'
			});
			const track = (worker: ServiceWorker | null) => {
				if (!worker) return;
				const check = () => {
					// A waiting worker with an existing controller is an update, not the first install.
					if (worker.state === 'installed' && navigator.serviceWorker.controller) this.#waiting = worker;
				};
				check();
				worker.addEventListener('statechange', check);
			};
			track(registration.waiting);
			registration.addEventListener('updatefound', () => track(registration.installing));

			let reloading = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (reloading || !this.#waiting) return;
				reloading = true;
				location.reload();
			});

			// Installed apps can stay open for days: look for a new version every hour.
			setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
		} catch (error) {
			console.warn('Service worker registration failed:', error);
		}
	}
}

export const pwa = new Pwa();
