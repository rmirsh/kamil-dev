import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import { transformerRenderWhitespace } from '@shikijs/transformers';

export default defineConfig({
  site: 'https://kamil.dev',
  markdown: {
    shikiConfig: {
      theme: 'dark-plus',
      transformers: [
        transformerRenderWhitespace({ position: 'leading' }),
      ],
    },
  },
  integrations: [mdx()],
  output: 'static',
  adapter: vercel(),
});
