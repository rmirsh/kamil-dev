import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://kamil.dev',
  integrations: [mdx()],
  output: 'hybrid',
  adapter: vercel(),
});
