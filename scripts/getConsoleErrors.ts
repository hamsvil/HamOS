import { launch } from 'puppeteer-core';
async function test() {
  try {
    const browser = await launch({
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 20000 });
    const html = await page.content();
    console.log('HTML ROOT:', html.substring(0, 1000));
    await browser.close();
  } catch (e) {
    console.error(e);
  }
}
test();