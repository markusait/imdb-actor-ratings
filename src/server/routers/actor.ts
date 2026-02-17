import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { searchActors } from '@/scraper/search';
import { scrapeFilmography } from '@/scraper/filmography';
import { getCached, setCache } from '../cache';

// Define output types clearly so frontend-agent can use them
export const actorRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      try {
        const results = await searchActors(input.query);
        return results;
      } catch (error) {
        console.error('Failed to search actors:', error);
        throw new Error('Failed to search IMDb. Please try again.');
      }
    }),

  ratings: publicProcedure
    .input(z.object({ imdbId: z.string().regex(/^nm\d+$/) }))
    .query(async ({ input }) => {
      try {
        // Check cache first
        const cached = getCached(input.imdbId);
        if (cached) {
          console.log(`Cache hit for ${input.imdbId}`);
          return cached;
        }

        // Cache miss - scrape from IMDb
        console.log(`Cache miss for ${input.imdbId}, scraping...`);
        const filmography = await scrapeFilmography(input.imdbId);

        // Save to cache
        setCache(input.imdbId, filmography);

        return filmography;
      } catch (error) {
        console.error('Failed to get actor ratings:', error);
        throw new Error('Failed to fetch actor data from IMDb. Please try again.');
      }
    }),
});
