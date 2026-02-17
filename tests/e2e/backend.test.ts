import { describe, it, expect } from 'vitest';
import { searchActors } from '@/scraper/search';
import { scrapeFilmography } from '@/scraper/filmography';
import { closeBrowser } from '@/scraper/browser';
import { getCached, setCache } from '@/server/cache';

describe('Backend E2E Tests', () => {
  it('should search for Leonardo DiCaprio and find results', async () => {
    console.log('🔍 Testing actor search...');
    const results = await searchActors('Leonardo DiCaprio');

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const leo = results.find((r) => r.name === 'Leonardo DiCaprio');
    expect(leo).toBeDefined();
    expect(leo?.id).toBe('nm0000138');

    console.log(`✅ Found ${results.length} results, Leonardo DiCaprio: ${leo?.id}`);
  }, 30000); // 30 second timeout

  it('should scrape Leonardo DiCaprio filmography with ratings', async () => {
    console.log('🎬 Testing filmography scraping...');
    const filmography = await scrapeFilmography('nm0000138');

    expect(filmography).toBeDefined();
    expect(filmography.name).toBe('Leonardo DiCaprio');
    expect(filmography.movies).toBeDefined();
    expect(filmography.movies.length).toBeGreaterThan(0);

    console.log(`✅ Scraped ${filmography.movies.length} movies`);

    // Check that movies have required fields
    const firstMovie = filmography.movies[0];
    expect(firstMovie.title).toBeDefined();
    expect(firstMovie.year).toBeGreaterThan(1900);
    expect(firstMovie.rating).toBeGreaterThanOrEqual(0);
    expect(firstMovie.imdbUrl).toContain('imdb.com');

    // Verify we have some movies with ratings
    const moviesWithRatings = filmography.movies.filter((m) => m.rating > 0);
    expect(moviesWithRatings.length).toBeGreaterThan(0);

    const avgRating =
      moviesWithRatings.reduce((sum, m) => sum + m.rating, 0) /
      moviesWithRatings.length;

    console.log(`📊 ${moviesWithRatings.length}/${filmography.movies.length} movies have ratings`);
    console.log(`📊 Average rating: ${avgRating.toFixed(2)}/10`);
    console.log(`🎥 Sample movies:`);
    filmography.movies.slice(0, 5).forEach((movie) => {
      console.log(`   - ${movie.title} (${movie.year}): ${movie.rating}/10`);
    });

    expect(avgRating).toBeGreaterThan(5); // Sanity check - Leo's movies should average > 5
  }, 120000); // 2 minute timeout for full scrape

  it('should cache filmography data correctly', async () => {
    console.log('💾 Testing cache functionality...');

    // First scrape (will be cached)
    const filmography = await scrapeFilmography('nm0000138');
    expect(filmography.movies.length).toBeGreaterThan(0);

    // Manually set cache
    setCache('nm0000138', filmography);

    // Retrieve from cache
    const cached = getCached('nm0000138');
    expect(cached).toBeTruthy();
    expect(cached?.name).toBe('Leonardo DiCaprio');
    expect(cached?.movies.length).toBe(filmography.movies.length);

    console.log('✅ Cache working correctly');
  }, 120000);

  // Clean up after all tests
  it('should close browser after tests', async () => {
    await closeBrowser();
    console.log('✅ Browser closed');
  });
});
