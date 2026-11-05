// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import starlightImageZoom from 'starlight-image-zoom';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import remarkMath from 'remark-math';

// https://astro.build/config
export default defineConfig({
	site: 'https://albusphos.github.io',
	base: '/AlbusPhos/',
	markdown: {
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['mermaid'],
		},
		processor: unified({
			remarkPlugins: [remarkMath],
			rehypePlugins: [
				rehypeKatex,
				[
					rehypeMermaid,
					{
						strategy: 'img-svg',
						mermaidConfig: {
							theme: 'base',
							themeVariables: {
								darkMode: false,
								background: '#faf4ed',       // 对齐 Rosé Pine Dawn 背景
								primaryColor: '#f2e9e1',     // surface
								primaryTextColor: '#575279', // text
								primaryBorderColor: '#d7827e',// rose
								lineColor: '#6e6a86',        // muted
								secondaryColor: '#f5e3e1',   // accent-low
								tertiaryColor: '#fffaf3',    // surface-alt
								edgeLabelBackground: '#F0D3D0', // 连线文本背景与画布底色融合
								clusterBkg: '#fffaf3',          // 分组容器背景
								clusterBorder: '#dfdad9',       // 分组容器边框
								titleColor: '#575279',
								fontFamily: 'arial,sans-serif',
							},
						},
						dark: {
							theme: 'base',
							themeVariables: {
								darkMode: true,
								background: '#1f1d2b',       // 对齐 Rosé Pine Moon 背景
								primaryColor: '#2a273f',     // surface
								primaryTextColor: '#e0def4', // text
								primaryBorderColor: '#c4a7e7',// iris
								lineColor: '#908caa',        // subtle
								secondaryColor: '#393552',   // overlay
								tertiaryColor: '#242230',    // surface-dark
								edgeLabelBackground: '#1f1d2b', // 连线文本背景改为画布底色
								clusterBkg: '#242230',          // 分组容器底色
								clusterBorder: '#44415a',       // 对齐 Starlight 的 hairline 边框色
								titleColor: '#e0def4',
								fontFamily: 'arial,sans-serif',
							},

						},
						errorFallback: (element, diagram, error) => {
							console.warn('[rehype-mermaid] failed to render diagram:', error);
						},
					},
				],
			],
		}),
	},
	integrations: [
		starlight({
			title: 'AlbusPhos',
			description: 'Security-minded systems programmer · Rust tool builder',
			components: {
				MarkdownContent: './src/components/MarkdownContent.astro',
			},
			plugins: [
				starlightBlog({
					title: 'Blog',
					authors: {
						AlbusPhos: {
							name: 'AlbusPhos',
							url: 'https://github.com/AlbusPhos',
						},
					},
				}),
				starlightImageZoom({ showCaptions: false }),
			],
			customCss: ['katex/dist/katex.min.css', './src/styles/custom.css'],
			head: [
				{ tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
				{ tag: 'meta', attrs: { property: 'og:site_name', content: 'AlbusPhos' } },
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://albusphos.github.io/AlbusPhos/og.png' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: 'https://albusphos.github.io/AlbusPhos/og.png' } },
				{ tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#faf4ed' } },
				{ tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#1f1d2b' } },
				{ tag: 'script', attrs: { src: '/AlbusPhos/mermaid-theme-swap.js', defer: true } },
			],
			expressiveCode: {
				themes: ['rose-pine-moon', 'rose-pine-dawn'],
			},
			lastUpdated: true,
			editLink: {
				baseUrl: 'https://github.com/AlbusPhos/AlbusPhos/edit/main/',
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/AlbusPhos' }],
			sidebar: [
				{
					label: 'About',
					items: [{ label: 'About Me', slug: 'about' }],
				},
				{
					label: 'Writeups',
					items: [{ autogenerate: { directory: 'writeups' } }],
				},
				{
					label: 'Knowledge',
					items: [{ autogenerate: { directory: 'knowledge' } }],
				},
				{
					label: 'Blog',
					items: [{ label: 'All posts', link: '/blog/' }],
				},
			],
		}),
	],
});
