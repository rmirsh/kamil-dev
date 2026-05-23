import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://kamil.dev',
  integrations: [mdx()],
  output: 'static',
  adapter: vercel(),
});
