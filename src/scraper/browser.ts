import { chromium, type Browser } from 'playwright';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance?.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}
