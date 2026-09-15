// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vue from '@astrojs/vue';

// `site` drives the canonical URLs and the generated sitemap, so hardcoding the
// local domain shipped a production build advertising www.tracklife.test to
// search engines. Env-driven, with the dev domain as fallback.
// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://www.tracklife.test',
  integrations: [sitemap(), react(), vue()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['www.tracklife.test', 'web1.test']
    }
  }
});
