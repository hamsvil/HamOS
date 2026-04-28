import puppeteer from 'puppeteer';
(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath: process.env.CHROME_PATH || undefined,
      headless: true
    });
    console.log('Browser launched!');
    const page = await browser.newPage();
    console.log('Page created!');
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Navigated!');
    const content = await page.content();
    console.log('Content length:', content.length);
    await browser.close();
  } catch (e) {
    console.error('FAILED:', e);
  }
})();
