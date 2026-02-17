import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCached, setCache } from './cache';
import fs from 'fs';
import path from 'path';

const TEST_CACHE_FILE = path.join(process.cwd(), 'data', 'test-cache.json');

describe('Cache Functions', () => {
  beforeEach(() => {
    // Clean up test cache before each test
    if (fs.existsSync(TEST_CACHE_FILE)) {
      fs.unlinkSync(TEST_CACHE_FILE);
    }
  });

  afterEach(() => {
    // Clean up test cache after each test
    if (fs.existsSync(TEST_CACHE_FILE)) {
      fs.unlinkSync(TEST_CACHE_FILE);
    }
  });

  it('should return null for non-existent cache entry', () => {
    const result = getCached('nm0000000');
    expect(result).toBeNull();
  });

  it('should store and retrieve cache entries', () => {
    const testData = {
      name: 'Test Actor',
      imageUrl: 'https://example.com/image.jpg',
      movies: [
        {
          title: 'Test Movie',
          year: 2020,
          rating: 8.5,
          imdbUrl: 'https://imdb.com/title/tt0000000',
          posterUrl: null,
        },
      ],
    };

    setCache('nm0000001', testData);
    const result = getCached('nm0000001');

    expect(result).toBeTruthy();
    expect(result?.name).toBe('Test Actor');
    expect(result?.movies).toHaveLength(1);
    expect(result?.movies[0].title).toBe('Test Movie');
  });

  it('should return null for expired cache entries', () => {
    const testData = {
      name: 'Test Actor',
      imageUrl: null,
      movies: [],
    };

    // Manually create an expired cache entry (91 days ago)
    const cacheData = {
      nm0000002: {
        ...testData,
        scrapedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    const cacheFile = path.join(process.cwd(), 'data', 'cache.json');
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData));

    const result = getCached('nm0000002');
    expect(result).toBeNull(); // Should be expired

    // Clean up
    fs.unlinkSync(cacheFile);
  });

  it('should return valid cache entries within 90 days', () => {
    const testData = {
      name: 'Test Actor',
      imageUrl: null,
      movies: [],
    };

    // Create a cache entry from 30 days ago
    const cacheData = {
      nm0000003: {
        ...testData,
        scrapedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    const cacheFile = path.join(process.cwd(), 'data', 'cache.json');
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData));

    const result = getCached('nm0000003');
    expect(result).toBeTruthy();
    expect(result?.name).toBe('Test Actor');

    // Clean up
    fs.unlinkSync(cacheFile);
  });
});
