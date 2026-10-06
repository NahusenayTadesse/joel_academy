import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { adminKit } from '@nahu/admin-kit/vite';
export default defineConfig({
 plugins: [tailwindcss(), sveltekit({ adapter: adapter(), serviceWorker: { register: false } }), adminKit()],
 test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
