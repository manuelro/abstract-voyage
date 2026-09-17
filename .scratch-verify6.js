const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const w of [480, 550, 600, 650, 700, 767]) {
    const page = await browser.newPage({ viewport: { width: w, height: 1300 } });
    await page.goto('http://localhost:3000/abstract', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('body *'));
      const titleEl = all.find(e => e.children.length === 0 && /think out loud/i.test(e.textContent || ''));
      const activeEl = all.find(e => e.children.length === 0 && /biomimetic framework/i.test(e.textContent || ''));
      const g = (el) => el ? { color: getComputedStyle(el).color, top: el.getBoundingClientRect().top } : null;
      return { heroTitle: g(titleEl), timelineActive: g(activeEl) };
    });
    console.log(w, JSON.stringify(r));
    await page.close();
  }
  await browser.close();
})();
