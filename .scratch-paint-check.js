const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    // Find likely narrow/wide column containers
    const all = Array.from(document.querySelectorAll('body *'));
    const results = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.offsetWidth > 300 && el.offsetHeight > 300) {
        const r = el.getBoundingClientRect();
        results.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,60), bg: cs.backgroundColor, x: r.x, y: r.y, w: r.width, h: r.height });
      }
    }
    return results.slice(0, 20);
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
