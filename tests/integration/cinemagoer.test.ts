import { describe, it, expect } from 'vitest';
import { searchAndGetFilmography } from '../../src/scraper/cinemagoer';

describe('Cinemagoer Integration', () => {
  it('should search for Tom Hanks and get filmography', async () => {
    const result = await searchAndGetFilmography('Tom Hanks');

    expect(result.searchResult.id).toMatch(/^nm\d+$/);
    expect(result.searchResult.name).toContain('Hanks');
    expect(result.filmography.movies.length).toBeGreaterThan(0);

    // Check that movies have ratings
    const firstMovie = result.filmography.movies[0];
    expect(firstMovie).toHaveProperty('title');
    expect(firstMovie).toHaveProperty('year');
    expect(firstMovie).toHaveProperty('rating');
    expect(firstMovie.rating).toBeGreaterThan(0);

    console.log(`✅ Found ${result.searchResult.name} (${result.searchResult.id})`);
    console.log(`   ${result.filmography.movies.length} movies with ratings`);
  }, 120000); // 2 minute timeout

  it('should search for Leonardo DiCaprio and get filmography', async () => {
    const result = await searchAndGetFilmography('Leonardo DiCaprio');

    expect(result.searchResult.id).toBe('nm0000138');
    expect(result.searchResult.name).toBe('Leonardo DiCaprio');
    expect(result.filmography.movies.length).toBeGreaterThan(10);

    console.log(`✅ Found ${result.filmography.movies.length} movies for ${result.searchResult.name}`);
  }, 120000);
});
