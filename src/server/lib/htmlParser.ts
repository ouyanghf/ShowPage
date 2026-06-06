import * as cheerio from 'cheerio';
import type { ParsedModule } from './types.js';

export interface ParseResult {
  html: string;
  modules: ParsedModule[];
  documentTitle?: string;
}

export function parseHtmlModules(html: string): ParseResult {
  const $ = cheerio.load(html);
  let modules: ParsedModule[] = [];
  const documentTitle = normalizeTitle($('title').first().text());

  $('[data-title]').each((_index, el) => {
    const title = normalizeTitle($(el).attr('data-title'));
    if (!title) return;

    const id = ensureElementId($, el, modules.length + 1);
    $(el).attr('id', id);

    modules.push({
      id,
      title,
      selector: `#${id}`,
      order: modules.length + 1,
      visible: true,
    });
  });

  if (modules.length === 0) {
    $('section').each((_index, el) => {
      const heading = normalizeTitle($(el).find('h1,h2,h3').first().text());
      const title = heading || `模块 ${modules.length + 1}`;

      const id = ensureElementId($, el, modules.length + 1);
      $(el).attr('id', id);

      modules.push({
        id,
        title,
        selector: `#${id}`,
        order: modules.length + 1,
        visible: true,
      });
    });
  }

  if (modules.length === 0) {
    $('h1,h2,h3').each((_index, el) => {
      const title = normalizeTitle($(el).text());
      if (!title) return;

      const id = ensureElementId($, el, modules.length + 1);
      $(el).attr('id', id);

      modules.push({
        id,
        title,
        selector: `#${id}`,
        order: modules.length + 1,
        visible: true,
      });
    });
  }

  if (modules.length === 0) {
    modules.push({
      id: 'full-page',
      title: '完整页面',
      selector: 'body',
      order: 1,
      visible: true,
    });
  }

  injectPresenterBridge($);

  return {
    html: $.html(),
    modules,
    documentTitle,
  };
}

function injectPresenterBridge($: cheerio.CheerioAPI): void {
  const style = `<style>
[id^="module-"], [data-title] { scroll-margin-top: 18px; }
.showpage-active-module { outline: 3px solid rgba(59, 130, 246, 0.45); outline-offset: 4px; transition: outline-color 0.2s ease; }
</style>`;
  const script = `<script>
window.addEventListener("message", function(event) {
  var data = event.data || {};
  if (data.type !== "SCROLL_TO_MODULE") return;
  var el = document.querySelector(data.selector);
  if (!el) return;
  document.querySelectorAll(".showpage-active-module").forEach(function(item) {
    item.classList.remove("showpage-active-module");
  });
  el.classList.add("showpage-active-module");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
});
</script>`;

  if ($('head').length === 0) $('html').prepend('<head></head>');
  if ($('body').length === 0) $('html').append('<body></body>');
  $('head').append(style);
  $('body').append(script);
}

function ensureElementId(
  $: cheerio.CheerioAPI,
  el: Parameters<cheerio.CheerioAPI>[0],
  fallbackIndex: number
): string {
  const currentId = $(el).attr('id')?.trim();
  if (currentId) return currentId;

  let candidate = `module-${fallbackIndex}`;
  let suffix = 2;
  while ($(`#${escapeCssId(candidate)}`).length > 0) {
    candidate = `module-${fallbackIndex}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function normalizeTitle(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function escapeCssId(id: string): string {
  return id.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
