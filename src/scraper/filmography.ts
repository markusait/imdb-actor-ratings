import { getBrowser } from './browser';

export interface Movie {
  title: string;
  year: number;
  rating: number;      // 1-10
  imdbUrl: string;
  posterUrl: string | null;
}

export interface ActorFilmography {
  name: string;
  imageUrl: string | null;
  movies: Movie[];
}

export async function scrapeFilmography(imdbId: string): Promise<ActorFilmography> {
  const browser = await getBrowser();
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  try {
    // Navigate to actor's page
    const actorUrl = `https://www.imdb.com/name/${imdbId}/`;
    await page.goto(actorUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Handle cookie consent if present
    try {
      const consentButton = page.locator('button:has-text("Accept")').first();
      if (await consentButton.isVisible({ timeout: 2000 })) {
        await consentButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // No consent banner or already dismissed
    }

    // Extract actor name
    let actorName = '';
    try {
      const nameElement = page.locator('[data-testid="hero__primary-text"]').first();
      actorName = (await nameElement.textContent()) || '';
      actorName = actorName.trim();
    } catch {
      actorName = 'Unknown Actor';
    }

    // Extract actor image - try multiple selectors
    let imageUrl: string | null = null;
    try {
      // Try hero image first
      const imgElement = page.locator('[data-testid="hero-media__poster"] img, [data-testid="hero__photo"] img, img[class*="ipc-image"]').first();
      imageUrl = await imgElement.getAttribute('src');
    } catch {
      // No image available
    }

    // Navigate to bio page which has better movie coverage
    const bioUrl = `https://www.imdb.com/name/${imdbId}/bio`;
    await page.goto(bioUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Extract movies from the bio page
    const movies: Movie[] = [];
    const seenTitles = new Set<string>();

    // Find all title links on the bio page
    const titleLinks = page.locator('a[href*="/title/tt"]');
    const linkCount = await titleLinks.count();

    console.log(`Found ${linkCount} potential title links on bio page`);

    for (let i = 0; i < linkCount && movies.length < 50; i++) {
      try {
        const link = titleLinks.nth(i);
        const href = await link.getAttribute('href');
        const text = await link.textContent();

        if (!href || !text) continue;

        // Skip IMDb Pro links
        if (href.includes('pro.imdb.com')) continue;

        const linkText = text.trim();
        if (!linkText) continue;

        // Extract year from link text (format: "Title (Year)")
        const yearMatch = linkText.match(/\((\d{4})\)/);
        if (!yearMatch) continue; // Skip if no year found
        const year = parseInt(yearMatch[1], 10);

        // Extract title (remove year)
        const title = linkText.replace(/\s*\(\d{4}\).*$/, '').trim();
        if (!title) continue;

        // Skip if we've seen this title+year combo
        const key = `${title}-${year}`;
        if (seenTitles.has(key)) continue;
        seenTitles.add(key);

        // Build full IMDb URL
        const imdbUrl = href.startsWith('http')
          ? href
          : `https://www.imdb.com${href.split('?')[0]}`;

        movies.push({
          title,
          year,
          rating: 0, // Will fetch ratings in next pass
          imdbUrl,
          posterUrl: null,
        });
      } catch (err) {
        // Skip this entry
      }
    }

    console.log(`Extracted ${movies.length} movies, now fetching ratings...`);

    // Now fetch ratings for each movie
    const moviesWithRatings: Movie[] = [];

    for (let i = 0; i < Math.min(movies.length, 30); i++) {
      const movie = movies[i];

      try {
        // Navigate to movie page
        await page.goto(movie.imdbUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1000);

        // Extract rating
        let rating = 0;
        try {
          // Try new layout
          const ratingElement = page.locator('[data-testid="hero-rating-bar__aggregate-rating__score"] span').first();
          const ratingText = (await ratingElement.textContent()) || '0';
          rating = parseFloat(ratingText) || 0;
        } catch {
          try {
            // Fallback: look for any element with rating-like content
            const ratingAlt = page.locator('span[class*="rating"]').first();
            const ratingText = (await ratingAlt.textContent()) || '0';
            rating = parseFloat(ratingText) || 0;
          } catch {
            // No rating found
          }
        }

        // Extract poster URL
        let posterUrl: string | null = null;
        try {
          const posterElement = page.locator('[data-testid="hero-media__poster"] img, img[class*="ipc-image"]').first();
          posterUrl = await posterElement.getAttribute('src');
        } catch {
          // No poster available
        }

        moviesWithRatings.push({
          ...movie,
          rating,
          posterUrl,
        });

        console.log(`  ${i + 1}/${movies.length}: ${movie.title} (${movie.year}) - ${rating}/10`);

        // Add delay to avoid rate limiting
        if (i < movies.length - 1) {
          await page.waitForTimeout(1200 + Math.random() * 800);
        }
      } catch (err) {
        console.error(`Failed to fetch rating for ${movie.title}:`, err);
        // Include movie anyway with 0 rating
        moviesWithRatings.push(movie);
      }
    }

    // Sort by year ascending
    moviesWithRatings.sort((a, b) => a.year - b.year);

    return {
      name: actorName,
      imageUrl,
      movies: moviesWithRatings,
    };
  } finally {
    await page.close();
  }
}
