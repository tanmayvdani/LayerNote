import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.join(__dirname, 'dist');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.join(__dirname, '.playwright-profile');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const VIDEO_URL = 'https://www.youtube.com/watch?v=zxKPjD8urG4';

async function run() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: EDGE_PATH,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });

  const page = await context.newPage();

  console.log('Navigating to YouTube...');
  await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Try to find the layer panel; if not present, wait longer
  let panelHandle = await page.$('#layer-panel');
  if (!panelHandle) {
    console.log('Layer panel not found, waiting longer...');
    await page.waitForTimeout(5000);
    panelHandle = await page.$('#layer-panel');
  }

  if (!panelHandle) {
    console.error('Layer panel still not present. Capturing diagnostic screenshot...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-no-panel.png'), fullPage: false });
  } else {
    console.log('Layer panel present. Capturing screenshots...');

    // 1. Sidebar with the panel
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-sidebar.png'), fullPage: false });

    // 2. My Notes tab — click it
    const myNotesTab = await page.$('text=My Notes');
    if (myNotesTab) {
      await myNotesTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-my-notes.png'), fullPage: false });
    }

    // 3. Shared tab
    const sharedTab = await page.$('text=Shared');
    if (sharedTab) {
      await sharedTab.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-shared.png'), fullPage: false });
    }

    // 4. Browse tab
    const browseTab = await page.$('text=Browse');
    if (browseTab) {
      await browseTab.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-browse.png'), fullPage: false });
    }

    // 5. Settings
    const gear = await page.$('.layer-gear-btn');
    if (gear) {
      await gear.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-settings.png'), fullPage: false });
    }
  }

  await context.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
