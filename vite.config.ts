import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { adminKit } from '@nahu/admin-kit/vite';
export default defineConfig({
 plugins: [tailwindcss(), sveltekit({
  adapter: adapter({ precompress: true }),
  serviceWorker: { register: false },
  // Stylesheets this small are inlined into the page: one less render-blocking request on mobile.
  inlineStyleThreshold: 30_000
 }), adminKit()],
 test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
