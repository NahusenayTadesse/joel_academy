import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { adminKit } from '@nahu/admin-kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
export default defineConfig({
 plugins: [tailwindcss(), sveltekit({
  adapter: adapter({ precompress: true }),
  serviceWorker: { register: false },
  // Stylesheets this small are inlined into the page: one less render-blocking request on mobile.
  inlineStyleThreshold: 30_000
 }), adminKit(), paraglideVitePlugin({
  project: './project.inlang',
  outdir: './src/lib/paraglide',
  // English at "/", Amharic under "/am". Requests without a page URL of their own (the auth API,
  // uploads) fall back to the language the visitor last browsed in, kept in a cookie.
  strategy: ['url', 'cookie', 'baseLocale'],
  routeStrategies: [
   { match: '/api/:path(.*)?', strategy: ['cookie', 'baseLocale'] },
   { match: '/newsletter', strategy: ['cookie', 'baseLocale'] },
   { match: '/dashboard/:path(.*)?', strategy: ['baseLocale'] }
  ]
 })],
 test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
