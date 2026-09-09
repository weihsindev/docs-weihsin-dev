import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.weihsin.dev',
  integrations: [
    starlight({
      title: 'weihsin.dev / docs',
      description: '架構、API 與決策紀錄。',
      defaultLocale: 'root',
      locales: {
        root: { label: '正體中文', lang: 'zh-TW' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/weihsindev' },
      ],
      customCss: ['./src/styles/theme.css'],
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
          },
        },
      ],
      editLink: { baseUrl: 'https://github.com/weihsindev/docs-weihsin-dev/edit/main/' },
      lastUpdated: true,
      sidebar: [
        { label: '總覽', link: '/' },
        {
          label: '進件 API',
          items: [
            { label: '架構總覽', link: '/api/architecture/' },
          ],
        },
        {
          label: '決策紀錄 (ADR)',
          items: [{ autogenerate: { directory: 'adr' } }],
        },
      ],
    }),
  ],
});
