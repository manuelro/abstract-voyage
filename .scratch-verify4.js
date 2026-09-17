const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 908, height: 1300 } });
  await page.goto('http://localhost:3000/abstract', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  const read = async () => page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('body *'));
    const titleEl = all.find(e => e.children.length === 0 && /think out loud/i.test(e.textContent || ''));
    const activeEl = all.find(e => e.children.length === 0 && /biomimetic framework/i.test(e.textContent || ''));
    const g = (el) => el ? { text: el.textContent.slice(0,40), color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity, rect: el.getBoundingClientRect() } : null;
    return { heroTitle: g(titleEl), timelineActive: g(activeEl), scrollY: window.scrollY };
  });

  console.log('AT TOP:', JSON.stringify(await read(), null, 2));
  await page.screenshot({ path: '/Users/manuelc/Documents/www/abstract-voyage/.scratch-fix3.png' });
  await browser.close();
})();
