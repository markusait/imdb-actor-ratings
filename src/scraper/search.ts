import { getBrowser } from './browser';

export interface ActorSearchResult {
  id: string;       // IMDb ID like "nm0000138"
  name: string;
  knownFor: string;  // e.g. "Inception, Titanic"
  imageUrl: string | null;
}

export async function searchActors(query: string): Promise<ActorSearchResult[]> {
  console.log(`[Search] Starting search for: ${query}`);
  const browser = await getBrowser();
  console.log('[Search] Browser acquired');

  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  console.log('[Search] New page created');

  try {
    // Navigate to IMDb search
    const searchUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(query)}&s=nm`;
    console.log(`[Search] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Search] Page loaded');

    // Wait a bit for dynamic content
    await page.waitForTimeout(1000);
    console.log('[Search] Waited for content');

    // Handle cookie consent if present
    console.log('[Search] Checking for cookie consent...');
    try {
      const consentButton = page.locator('button:has-text("Accept")').first();
      if (await consentButton.isVisible({ timeout: 2000 })) {
        console.log('[Search] Clicking cookie consent');
        await consentButton.click();
        await page.waitForTimeout(500);
      }
    } catch {
      console.log('[Search] No cookie consent found');
    }

    // Extract search results
    const results: ActorSearchResult[] = [];

    // Find all list items (each represents one result)
    console.log('[Search] Looking for list items...');
    const listItems = page.locator('[data-testid="find-results-section-name"] li.ipc-metadata-list-summary-item');
    const itemCount = await listItems.count();
    console.log(`[Search] Found ${itemCount} list items, extracting...`);

    for (let i = 0; i < Math.min(itemCount, 10); i++) {
      console.log(`[Search] Processing item ${i + 1}/${Math.min(itemCount, 10)}...`);
      try {
        const item = listItems.nth(i);
        console.log(`  [Search] Got item ${i}`);

        // Find the name link within this item (not the image link)
        const nameLink = item.locator('a[href*="/name/nm"]').filter({ hasText: /.+/ }).first();
        console.log(`  [Search] Got name link`);

        // Extract IMDb ID from href
        const href = await nameLink.getAttribute('href', { timeout: 5000 }) || '';
        console.log(`  [Search] Got href: ${href.substring(0, 30)}`);
        const idMatch = href.match(/\/name\/(nm\d+)/);
        if (!idMatch) continue;
        const id = idMatch[1];

        // Extract name
        const name = (await nameLink.textContent({ timeout: 5000 }) || '').trim();
        console.log(`  [Search] Got name: ${name}`);
        if (!name) continue;

        // Extract "known for" info
        let knownFor = '';
        try {
          // Look for the "known for" section within this item
          const knownForText = await item.locator('.ipc-html-content-inner-div').textContent({ timeout: 2000 });
          knownFor = (knownForText || '').trim();
        } catch {
          // No known for info
        }

        // Extract image URL
        let imageUrl: string | null = null;
        try {
          const imgElement = item.locator('img.ipc-image').first();
          imageUrl = await imgElement.getAttribute('src', { timeout: 2000 });
        } catch {
          // No image available
        }

        results.push({
          id,
          name,
          knownFor,
          imageUrl,
        });
        console.log(`  [Search] Added result: ${name}`);
      } catch (err) {
        // Skip this result if extraction fails
        console.error(`  [Search] Failed to extract result ${i}:`, err);
      }
    }

    console.log(`[Search] Returning ${results.length} results`);
    return results;
  } finally {
    await page.close();
    console.log('[Search] Page closed');
  }
}
