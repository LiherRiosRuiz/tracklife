// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  site: 'http://www.tracklife.test',
  integrations: [sitemap(), react(), vue()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['www.tracklife.test', 'web1.test']
    }
  }
});
