/**
 * Mermaid 主题同步脚本
 */
(() => {
  "use strict";

  let cache = [];
  let obs = null;

  const collect = () => {
    const newCache = [];
    const pictures = document.querySelectorAll('picture');

    for (const p of pictures) {
      const img = p.querySelector('img');
      const source = p.querySelector('source');
      if (!img || !source) continue;

      const media = source.getAttribute('media') || '';
      const isMermaid = media.includes('prefers-color-scheme') || p.dataset.mermaidLight;
      if (!isMermaid) continue;

      if (!p.dataset.mermaidLight) {
        p.dataset.mermaidLight = img.getAttribute('src');
      }

      source.setAttribute('media', 'not all');
      newCache.push({
        img,
        light: p.dataset.mermaidLight,
        dark: source.getAttribute('srcset'),
      });
    }
    return newCache;
  };

  const apply = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    for (const entry of cache) {
      const next = isDark ? entry.dark : entry.light;
      if (entry.img.getAttribute('src') !== next) {
        entry.img.setAttribute('src', next);
      }
    }
  };

  const watch = () => {
    obs?.disconnect();
    obs = new MutationObserver((muts) => {
      if (muts.some((m) => m.attributeName === 'data-theme')) {
        apply();
      }
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  };

  const setup = () => {
    cache = collect();
    apply();
    watch();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  document.addEventListener('astro:page-load', setup);
  document.addEventListener('astro:before-swap', () => obs?.disconnect());

})();
