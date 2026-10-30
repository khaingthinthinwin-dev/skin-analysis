const { chromium } = require('./e2e/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.getByPlaceholder('user@example.com').fill('smt@gmail.com');
  await page.getByPlaceholder('Enter your password').fill('Cosmetics@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/merchant/**');
  await page.goto('http://localhost:3000/merchant/advertisements');
  await page.waitForLoadState('networkidle');
  const adCard = page.locator('#merchant-advertisements').locator('.grid > .flex.flex-col.overflow-hidden').first();
  await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();
  await page.waitForTimeout(500);
  const saveBtn = page.getByRole('dialog').getByRole('button', { name: /Save & Continue|သိမ်းဆည်းပြီး ဆက်သွားပါ|保存して続行/i });
  console.log('Save button found count:', await saveBtn.count());
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  const submitRes = await page.evaluate(() => {
    const form = document.querySelector('dialog form, [role="dialog"] form');
    const titleInput = document.querySelector('#ad-title');
    return { hasForm: !!form, titleVal: titleInput?.value };
  });
  console.log('Form query:', submitRes);
  await saveBtn.click();
  await page.waitForTimeout(1000);
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="alert"]')).map(el => el.innerText);
  });
  console.log('Alert elements text:', errors);
  await browser.close();
})();
