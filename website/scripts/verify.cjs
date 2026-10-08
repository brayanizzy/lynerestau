const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const base = process.argv[2] || 'http://127.0.0.1:4180/';
  const output = path.resolve(__dirname, '../../.tmp/vitrine-qa');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const pageErrors = [];
    const failures = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
    assert.equal(response.status(), 200);
    const resources = await page.evaluate(() => [...new Set([
      ...Array.from(document.images, img => img.src),
      getComputedStyle(document.querySelector('.hero')).backgroundImage.match(/url\("?([^")]+)/)[1],
    ])]);
    assert.equal(resources.length, 8, '7 supplied visuals + existing logo');
    for (const url of resources) {
      const result = await context.request.get(url, { timeout: 60000 });
      assert.equal(result.status(), 200, `Asset missing: ${url}`);
      assert.match(result.headers()['content-type'], /^image\//);
    }
    for (const selector of ['#apropos', '#specialites', '#galerie', '#contact']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    await page.waitForFunction(() => Array.from(document.images).every(img => img.complete && img.naturalWidth > 0));
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.screenshot({ path: path.join(output, 'hero-desktop.png') });
    assert.equal(await page.locator('h1').count(), 1);
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const menu = page.locator('.menu-toggle');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await page.locator('.nav-links').getByRole('link', { name: 'Galerie', exact: true }).click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await menu.click();
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`);
      if (width === 390) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
        await page.screenshot({ path: path.join(output, 'hero-mobile.png') });
      }
    }
    assert.equal(await page.locator('a[href="tel:+243823539440"]').count(), 1);
    assert.equal(await page.locator('a[href="https://wa.me/243823539440"]').count(), 5);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failures, []);
    console.log(JSON.stringify({ status: 'VITRINE_QA_OK', base, images: resources.length, viewports: [1440, 390, 320, 768], pageErrors, httpErrors: failures }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
