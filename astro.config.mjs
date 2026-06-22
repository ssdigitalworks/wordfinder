import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://scrabblewordfinder.com',
  output: 'server',
  adapter: vercel(),
  // NOTE: Do NOT also enable `security: { csp: true }` here.
  // Astro's built-in CSP injects a second, conflicting <meta http-equiv="Content-Security-Policy">
  // tag per page with its own auto-computed script hashes and NO host allow-list. Browsers enforce
  // the INTERSECTION of all CSP policies on a page, so having both this and the CSP header in
  // vercel.json active at once silently blocks Google Analytics / AdSense / any host-based allowance
  // that only exists in the vercel.json header. CSP is owned exclusively by vercel.json — see that
  // file for the single source of truth.
  redirects: {
    '/scrabble-word-finder': '/',
    '/word-list': '/word-lists',
    '/unscramble': '/unscramble-words',
    '/words-ending-in-[pattern]': '/words-ending-in/[pattern]',
    '/words-starting-with-[pattern]': '/words-starting-with/[pattern]',
    '/words-that-end-in/[pattern]': '/words-ending-in/[pattern]',
    '/[n]-letter-words-starting-with-[letter]': '/[n]-letter-words-starting-with/[letter]',
    '/[n]-letter-words-ending-in-[letter]': '/[n]-letter-words-ending-in/[letter]',
  },
  integrations: [
    // This site uses TWO sitemap systems by design: @astrojs/sitemap covers statically-prerendered pages only.
    // Because /word/[word].astro uses prerender = false (SSR), those pages are NOT captured by @astrojs/sitemap —
    // the custom sitemaps/words-*.xml files exist specifically to cover them. Do not remove either system without
    // updating robots.txt and verifying word-page sitemap coverage.
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/.vercel/**', '**/dist/**', '**/.astro/**'],
      },
      allowedHosts: true,
    },
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    syntaxHighlight: 'prism',
  },
});
