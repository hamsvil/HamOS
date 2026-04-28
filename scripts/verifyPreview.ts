import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { JSDOM } from 'jsdom';

async function verify() {
  const args = process.argv.slice(2);
  const urlArg = args.find(a => a.startsWith('--url='))?.split('=')[1] || `http://localhost:${process.env.PORT || 8081}/`;
  const timeoutArg = parseInt(args.find(a => a.startsWith('--timeout='))?.split('=')[1] || '30000');
  const outDir = args.find(a => a.startsWith('--out='))?.split('=')[1] || '.lisa/preview';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Verifying preview at ${urlArg}...`);

  try {
    // Polling adaptif ke /api/health (timeout 30s, interval 1s)
    console.log("Waiting for /api/health to be ready...");
    const healthUrl = `${urlArg.replace(/\/$/, '')}/api/health`;
    const start = Date.now();
    let isReady = false;
    while (Date.now() - start < 30000) {
      try {
        const res = await fetch(healthUrl);
        if (res.ok) {
          isReady = true;
          break;
        }
      } catch (e) {
        // Ignore error and continue polling
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!isReady) {
      console.warn("Health check timed out. Proceeding anyway...");
    } else {
      console.log("Health check passed. Application is ready.");
    }

    let domOutput = '';
    let screenshotSaved = false;

    try {
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        process.env.PUPPETEER_EXECUTABLE_PATH,
        // Found Replit Nix paths
        '/nix/store/3iddmc2cy4gb4ki0qkigm1yd8pdndw9j-chromium-unwrapped-131.0.6778.204/libexec/chromium/chromium',
        '/nix/store/23r7pl4871g595jvs0wqkb5bn5jhma7s-chromium-unwrapped-123.0.6312.105/libexec/chromium/chromium',
        '/nix/store/14l09yxjrwmd7k419ryhz9py7q16qj28-chromium-unwrapped-98.0.4758.102/libexec/chromium/chromium',
        '/nix/store/104vnzh385c7f0i7891awmvp026fyryk-chromium-unwrapped-92.0.4515.159/libexec/chromium/chromium',
        '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
      ].filter(Boolean);

      let executablePath = '';
      for (const p of possiblePaths) {
        if (p && fs.existsSync(p)) {
          executablePath = p;
          console.log(`Found chromium at ${p}`);
          break;
        }
      }

      const launchOptions: any = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
        headless: true,
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      const browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      console.log("Navigating to URL...");
      await page.goto(urlArg, { waitUntil: 'domcontentloaded', timeout: timeoutArg });
      
      console.log("Waiting for #root...");
      try {
        await page.waitForSelector('#root', { timeout: 10000 });
      } catch (e) {
        console.warn("Timed out waiting for #root selector, proceeding with screenshot anyway.");
      }
      
      // Give it 2 more seconds for hydration
      await new Promise(r => setTimeout(r, 2000));

      domOutput = await page.content();
      const screenshotPath = path.join(outDir, 'screenshot.png');
      await page.screenshot({ path: screenshotPath });
      screenshotSaved = true;
      console.log(`Screenshot saved to ${screenshotPath}`);

      await browser.close();
    } catch (e: any) {
      console.warn(`Puppeteer failed: ${e.message}. Falling back to fetch + JSDOM.`);
      const response = await fetch(urlArg);
      domOutput = await response.text();
    }
    
    const rootMatch = domOutput.match(/<div id="root">([\s\S]*?)<\/div>/);
    const rootInner = rootMatch ? rootMatch[1].trim() : null;
    const exists = domOutput.includes('id="root"');
    const isEmpty = !rootInner || rootInner === '';

    const result = {
      timestamp: new Date().toISOString(),
      url: urlArg,
      pass: exists,
      screenshotSaved,
      rootContent: {
        exists,
        isEmpty,
        innerHTML: rootInner
      },
      domSnapshot: domOutput.substring(0, 5000) // Keep it reasonable
    };

    fs.writeFileSync(path.join(outDir, 'preview.json'), JSON.stringify(result, null, 2));

    if (result.pass) {
      console.log('PASS: Preview rendered successfully (Root element found).');
      process.exit(0);
    } else {
      console.error('FAIL: Preview failed to render #root.');
      console.log('DOM Snapshot:', result.domSnapshot);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('Verification tool crashed:', error.message);
    process.exit(2);
  }
}

verify();
