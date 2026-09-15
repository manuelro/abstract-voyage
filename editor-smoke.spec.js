const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const baseUrl = process.env.EDITOR_BASE_URL || 'http://localhost:3000';

test('local editor loads its collections', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/admin/`);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Journal', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Site content', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '/tmp/abstract-admin-authenticated.png', fullPage: true });

  await page.getByText('The DOM, from nodes to events', { exact: false }).click();
  await expect(page.locator('input[value="The DOM, from nodes to events"]')).toBeVisible();
  await expect(page.getByText('Body', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '/tmp/abstract-admin-article.png', fullPage: true });

  await page.getByRole('link', { name: /Writing in Journal collection/ }).click();
  await page.getByText('Site content', { exact: true }).first().click();
  await page.getByText('Footer', { exact: true }).last().click();
  await expect(page.locator('input[value="Footer navigation"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/abstract-admin-footer.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/admin/#/collections/posts`);
  await expect(page.getByText('Journal', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '/tmp/abstract-admin-mobile.png', fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('creates a Markdown article in the local repository', async ({ page }) => {
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(process.cwd(), 'posts', `${date}_editor-smoke-test.md`);

  if (fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }

  try {
    await page.goto(`${baseUrl}/admin/`);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('link', { name: 'Create entry of type Article' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('Editor smoke test');
    await page.getByRole('textbox', { name: 'Publication date (optional)' }).fill(date);
    await page.getByRole('textbox', { name: 'Excerpt (optional)' }).fill('A disposable local-save verification entry.');
    await page.locator('[contenteditable="true"]').last().fill('## Local save\n\nThis file was created through Decap CMS.');
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('menuitem', { name: 'Publish now' }).click();

    await expect.poll(() => fs.existsSync(filePath), { timeout: 15000 }).toBe(true);
    const parsed = matter(fs.readFileSync(filePath, 'utf8'));
    expect(parsed.data.title).toBe('Editor smoke test');
    expect(parsed.content).toContain('This file was created through Decap CMS.');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
