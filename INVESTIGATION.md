# IMDb Data Source Investigation

## Goal
Replace slow Playwright scraping (9-10s search, 60s filmography) with faster API/library.

## Libraries Tested

### 1. Cinemagoer (Python) - BROKEN ❌
- **Last updated:** May 2023 (3 years ago)
- **Status:** IMDb changed HTML structure, library returns empty results
- **Test results:**
  - `search_person("Leonardo DiCaprio")` → 0 results
  - `get_person(id, info=['filmography'])` → empty filmography
  - `get_movie(id)` → no ratings or votes
- **Conclusion:** Library is dead/abandoned

### 2. Cinemagoerng (Python) - DOESN'T SUPPORT ACTORS ❌
- **Features:** Title lookup only
- **Missing:** Person search, filmography API
- **Conclusion:** Not suitable for our use case

### 3. imdb-core (Node.js) - DOESN'T SUPPORT ACTORS ❌
- **Features:** Title search only
- **Missing:** Person search API
- **Conclusion:** Not suitable for our use case

### 4. OMDB API (via imdb-api npm package) - DOESN'T WORK ❌
- **Status:** Active, maintained API
- **Features:** Movie/series search by title only
- **Missing:**
  - ❌ No actor/person search
  - ❌ No actor filmography
  - ❌ Only movie lookups by title or IMDb ID
- **Conclusion:** Not suitable for our use case (need actor search)

### 5. Current Playwright Scraping - WORKS BUT SLOW ⚠️
- **Performance:**
  - Actor search: 9-10s
  - Filmography: 60s (fetch 50+ movies)
- **Pros:** No external dependencies, no API limits
- **Cons:** Slow, fragile (HTML changes break it)

## New Options to Explore

### Option 1: The Movie Database (TMDB) API ⭐ RECOMMENDED
- **Website:** https://www.themoviedb.org/
- **Status:** Industry standard, actively maintained
- **Features:**
  - ✅ Person search by name
  - ✅ Person movie credits with ratings
  - ✅ Fast API responses
  - ✅ Free tier (thousands of requests/day)
  - ✅ Includes IMDb IDs in responses
- **Setup:** Sign up for free API key
- **Next step:** Test TMDB person search and credits endpoints

### Option 2: Keep Current Playwright Implementation
- **Pros:**
  - Already works
  - No external dependencies
  - No API rate limits
- **Cons:**
  - Slow (9-10s search, 60s filmography)
  - Fragile (breaks when IMDb HTML changes)
- **Status:** Viable fallback if APIs don't work

### Option 3: Hybrid Approach
- Use actor name mapping service for search
- Use OMDB for individual movie lookups
- **Complexity:** High, not recommended for MVP

## Recommended Next Steps

1. **Test TMDB API** (themoviedb.org)
   - Get free API key
   - Test person search endpoint
   - Test person credits endpoint
   - Verify it returns IMDb IDs and ratings

2. **If TMDB works:**
   - Update `src/scraper/search.ts` to use TMDB API
   - Update `src/scraper/filmography.ts` to use TMDB API
   - Add TMDB_API_KEY to environment variables
   - Test with Leonardo DiCaprio
   - Deploy to Render

3. **If TMDB doesn't work:**
   - Accept current Playwright performance
   - Document limitations
   - Consider optimizations (parallel fetching, caching, etc.)

## References

- Previous benchmark work: `/Users/markus/Documents/New project/`
- OMDB API: https://www.omdbapi.com/
- imdb-api npm: https://www.npmjs.com/package/imdb-api
