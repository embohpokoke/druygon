const { chromium, webkit } = require('playwright');

const baseUrl = process.env.DRUYGON_URL || 'https://druygon.my.id';
const browsers = { chromium, webkit };
const requestedBrowsers = (process.env.DRUYGON_BROWSERS || 'chromium,webkit')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);

async function inspect(browserName, browserType) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const failed = [];

  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => {
    if (request.url().startsWith(baseUrl)) {
      failed.push(`${request.url()} ${request.failure()?.errorText || 'failed'}`);
    }
  });

  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const deviceCount = await page.locator('.device').count();
  const fallbackCount = await page.locator('.boot-fallback').count();

  if (!response || response.status() !== 200) errors.push(`root HTTP ${response?.status() || 'none'}`);
  if (deviceCount !== 1) errors.push(`expected one .device, found ${deviceCount}`);
  if (fallbackCount !== 0) errors.push('bootstrap fallback remained visible');

  for (const label of ['Peta', 'Koleksi', 'Toko', 'Profil', 'Home']) {
    const button = page.getByRole('button', { name: label, exact: true });
    if (await button.count() !== 1) {
      errors.push(`navigation button missing: ${label}`);
      continue;
    }
    await button.click();
    await page.waitForTimeout(100);
    if (await page.locator('.device').count() !== 1) {
      errors.push(`navigation broke after: ${label}`);
    }
  }

  await context.close();

  const blockedContext = await browser.newContext({ serviceWorkers: 'block' });
  const blockedPage = await blockedContext.newPage();
  await blockedPage.route('**/redesign/app/bundle.js*', route => route.abort());
  await blockedPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (await blockedPage.locator('.boot-fallback').count() !== 1) {
    errors.push('bundle-load failure did not retain recovery UI');
  }

  await blockedContext.close();
  await browser.close();

  if (errors.length || failed.length) {
    throw new Error(`${browserName}: ${[...errors, ...failed].join('; ')}`);
  }

  console.log(`[browser-smoke] ${browserName}: PASS`);
}

(async () => {
  for (const name of requestedBrowsers) {
    if (!browsers[name]) throw new Error(`unknown browser: ${name}`);
    await inspect(name, browsers[name]);
  }
})().catch(error => {
  console.error(`[browser-smoke] FAIL: ${error.message}`);
  process.exit(1);
});
