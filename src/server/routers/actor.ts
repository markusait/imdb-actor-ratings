import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { searchActors } from '@/scraper/search';
import { scrapeFilmography } from '@/scraper/filmography';
import { searchActorWithCinemagoer, getFilmographyWithCinemagoer } from '@/scraper/cinemagoer';
import { searchActorsHttp } from '@/scraper/search-http';
import { getTomHanksFilmographyFromTmdbSupabase, searchTomHanksOnly } from '@/server/providers/tom-hanks-supabase';
import { getCached, setCache } from '../cache';

// In-memory map to store actor name by IMDb ID (needed for cinemagoer filmography fetch)
const actorNameCache = new Map<string, string>();
const SUPABASE_TMDB_TOM_HANKS_MODE = process.env.BACKEND_MODE === 'tmdb-supabase-tomhanks';
const TOM_HANKS_IMDB_ID = 'nm0000158';

// Define output types clearly so frontend-agent can use them
export const actorRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().min(2).max(100) }))
    .query(async ({ input }) => {
      const query = input.query.trim();

      if (query.length < 2) {
        return [];
      }

      if (SUPABASE_TMDB_TOM_HANKS_MODE) {
        return searchTomHanksOnly(query);
      }

      try {
        console.log(`[API] Fast search for: ${query}`);

        const httpResults = await searchActorsHttp(query);
        if (httpResults.length > 0) {
          httpResults.forEach(result => {
            actorNameCache.set(result.id, result.name);
          });
          console.log(`[API] HTTP search returned ${httpResults.length} results`);
          return httpResults;
        }

        // Use cinemagoer FAST search (returns up to 10 results, ~1 second)
        const results = await searchActorWithCinemagoer(query);

        // If cinemagoer returns empty, throw error to trigger Playwright fallback
        // This happens when IMDb blocks Render's datacenter IPs
        if (results.length === 0) {
          throw new Error('Cinemagoer returned no results (likely blocked by IMDb)');
        }

        // Store actor name for each result (for later filmography fetch)
        results.forEach(result => {
          actorNameCache.set(result.id, result.name);
        });

        console.log(`[API] Found ${results.length} results in ~1s`);
        return results;
      } catch (error) {
        console.error('[API] Cinemagoer search failed, falling back to Playwright:', error);

        // Fallback to Playwright if cinemagoer fails
        try {
          const results = await searchActors(query);
          return results;
        } catch (fallbackError) {
          console.error('[API] Playwright fallback also failed:', fallbackError);
          throw new Error('Failed to search IMDb. Please try again.');
        }
      }
    }),

  ratings: publicProcedure
    .input(z.object({ imdbId: z.string().regex(/^nm\d+$/) }))
    .query(async ({ input }) => {
      if (SUPABASE_TMDB_TOM_HANKS_MODE) {
        if (input.imdbId !== TOM_HANKS_IMDB_ID) {
          throw new Error('Demo backend currently supports only Tom Hanks (nm0000158).');
        }

        const cached = getCached(input.imdbId);
        if (cached) {
          console.log(`[API] Cache hit for ${input.imdbId} (TMDB+Supabase mode)`);
          return cached;
        }

        const filmography = await getTomHanksFilmographyFromTmdbSupabase();
        setCache(input.imdbId, filmography);
        return filmography;
      }

      try {
        // Check cache first
        const cached = getCached(input.imdbId);
        if (cached) {
          console.log(`[API] Cache hit for ${input.imdbId}`);
          return cached;
        }

        // Cache miss - fetch filmography
        console.log(`[API] Cache miss for ${input.imdbId}, fetching filmography...`);

        // Get actor name from our in-memory cache
        const actorName = actorNameCache.get(input.imdbId);

        let filmography;
        if (actorName) {
          // Use cinemagoer with actor name (~10-15s)
          console.log(`[API] Using cinemagoer for ${actorName}`);
          filmography = await getFilmographyWithCinemagoer(actorName);
        } else {
          // Fallback to Playwright if we don't have the name
          console.log(`[API] Actor name not found, falling back to Playwright`);
          filmography = await scrapeFilmography(input.imdbId);
        }

        // Save to cache
        setCache(input.imdbId, filmography);

        return filmography;
      } catch (error) {
        console.error('[API] Failed to get actor ratings:', error);
        throw new Error('Failed to fetch actor data from IMDb. Please try again.');
      }
    }),
});
