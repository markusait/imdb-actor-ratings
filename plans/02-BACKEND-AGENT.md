# Backend Agent Plan

## Role

You own the backend: tRPC API, Playwright scraping logic, and JSON file cache.
You own these directories exclusively:
- `src/server/` - tRPC routers, cache logic, and configuration
- `src/scraper/` - Playwright scraping logic
- `src/lib/types.ts` - Shared types (coordinate with frontend-agent)
- `data/` - Cache directory

## Phase 1: Project Scaffolding (DO FIRST)

### 1.1 Initialize the project

```bash
# Install bun if needed
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart shell

# Create Next.js project
cd /Users/markus/Code/imdb-actor-ratings
bunx create-next-app@latest . --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*" --use-bun --yes
```

### 1.2 Install backend dependencies

```bash
bun add @trpc/server @trpc/client @trpc/react-query @trpc/next \
  @tanstack/react-query \
  playwright zod superjson
```

Note: We install full `playwright` (not `playwright-core`) because we deploy
as a Docker container on Render, not serverless. No need for `@sparticuz/chromium`.

```bash
# Install Chromium browser for Playwright
bunx playwright install chromium
```

### 1.3 Create data directory and .gitignore entry

```bash
mkdir -p data
touch data/.gitkeep
echo "data/cache.json" >> .gitignore
```

### 1.4 Set up tRPC

Create `src/server/trpc.ts`:
```typescript
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

Create `src/server/routers/actor.ts`:
```typescript
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

// Define output types clearly so frontend-agent can use them
export const actorRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      // TODO: implement with Playwright
      return [] as {
        id: string;       // IMDb ID like "nm0000138"
        name: string;
        knownFor: string;  // e.g. "Inception, Titanic"
        imageUrl: string | null;
      }[];
    }),

  ratings: publicProcedure
    .input(z.object({ imdbId: z.string().regex(/^nm\d+$/) }))
    .query(async ({ input }) => {
      // TODO: implement with Playwright + cache check
      return {
        name: '',
        imageUrl: null as string | null,
        movies: [] as {
          title: string;
          year: number;
          rating: number;      // 1-10
          imdbUrl: string;
          posterUrl: string | null;
        }[],
      };
    }),
});
```

Create `src/server/router.ts`:
```typescript
import { router } from './trpc';
import { actorRouter } from './routers/actor';

export const appRouter = router({
  actor: actorRouter,
});

export type AppRouter = typeof appRouter;
```

Create `src/app/api/trpc/[trpc]/route.ts`:
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/router';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
  });

export { handler as GET, handler as POST };
```

### 1.5 Notify the team

After committing the tRPC setup, message the lead:
> "tRPC types are defined and committed. Frontend can start consuming
> `actor.search` and `actor.ratings`. Types are in `src/server/router.ts`."

---

## Phase 2: JSON File Cache (`src/server/cache.ts`)

Simple file-based cache. No database, no Redis.

```typescript
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache.json');
const MAX_AGE_DAYS = 90;

interface CachedActor {
  scrapedAt: string; // ISO date string
  name: string;
  imageUrl: string | null;
  movies: {
    title: string;
    year: number;
    rating: number;
    imdbUrl: string;
    posterUrl: string | null;
  }[];
}

interface CacheData {
  [imdbId: string]: CachedActor;
}

function readCache(): CacheData {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeCache(data: CacheData): void {
  // Ensure directory exists
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

export function getCached(imdbId: string): CachedActor | null {
  const cache = readCache();
  const entry = cache[imdbId];
  if (!entry) return null;

  const ageMs = Date.now() - new Date(entry.scrapedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > MAX_AGE_DAYS) return null; // expired

  return entry;
}

export function setCache(imdbId: string, actor: Omit<CachedActor, 'scrapedAt'>): void {
  const cache = readCache();
  cache[imdbId] = {
    ...actor,
    scrapedAt: new Date().toISOString(),
  };
  writeCache(cache);
}
```

Key points:
- Read/write the whole file each time (fine for hundreds of actors)
- 90-day expiry check on read
- File lives at `data/cache.json`, gitignored
- On Render: persists while container is running, resets on redeploy (rebuilds naturally)
- Locally: persists across dev server restarts

---

## Phase 3: Playwright Scraper

### 3.1 Browser launcher (`src/scraper/browser.ts`)

```typescript
import { chromium, type Browser } from 'playwright';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  browserInstance = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance?.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}
```

No serverless hacks needed — we run in a real Docker container on Render.

### 3.2 Actor search (`src/scraper/search.ts`)

Navigate to `https://www.imdb.com/find/?q={query}&s=nm&exact=true`

Scraping targets:
- Result list: `.ipc-metadata-list-summary-item`
- Name: `.ipc-metadata-list-summary-item__t`
- Known for: `.ipc-metadata-list-summary-item__tl`
- Image: `.ipc-image` inside the list item
- IMDb ID: extract from the href (e.g., `/name/nm0000138/`)

Handle edge cases:
- No results found
- Rate limiting (add random delay 1-3s between requests)
- Consent/cookie popup (dismiss it)

### 3.3 Filmography scraper (`src/scraper/filmography.ts`)

Navigate to `https://www.imdb.com/name/{id}/`

Scraping targets:
- Actor name: from page header
- Filmography section: look for "Actor" or "Actress" credits
- For each movie:
  - Title
  - Year
  - Rating (if available on the page)
  - IMDb URL
- Filter: Only include movies (not TV episodes, shorts, etc.)
- Sort: by year ascending

**Important**: IMDb filmography pages may load ratings dynamically.
If ratings aren't on the filmography page, we may need to visit each
movie's page. This is slow, so:
1. First try to get ratings from the filmography page
2. If not available, batch-visit movie pages (max 20 concurrent)
3. Cache aggressively — once scraped, it's in the JSON file for 90 days

### 3.4 Integrate scraper into tRPC routes

Replace the TODO stubs in `src/server/routers/actor.ts`:

For `actor.ratings`:
1. Check JSON cache first → return if fresh
2. If cache miss → scrape with Playwright
3. Write result to cache
4. Return data

For `actor.search`:
- Always scrape live (search results change, no point caching)
- But add a 1s delay to avoid hammering IMDb

Add error handling:
- Return clear error messages if scraping fails
- Set appropriate timeouts (30s for search, 60s for filmography)
- Log scraping errors for debugging

---

## File Ownership Rules

- **You own**: `src/server/**`, `src/scraper/**`, `src/lib/types.ts`, `data/`
- **You do NOT touch**: `src/app/page.tsx`, `src/components/**`, `src/hooks/**`
- **Shared**: `package.json` (coordinate with other agents before changing)

## Testing Your Work

```bash
# Start dev server
bun dev

# Test search endpoint
curl "http://localhost:3000/api/trpc/actor.search?input=%7B%22query%22%3A%22leonardo%20dicaprio%22%7D"

# Test ratings endpoint (use a real IMDb ID)
curl "http://localhost:3000/api/trpc/actor.ratings?input=%7B%22imdbId%22%3A%22nm0000138%22%7D"

# Verify cache file was created
cat data/cache.json
```

## When to Ask for Human Input

- If IMDb's page structure doesn't match what's described here
- If you get CAPTCHAs or rate limiting that blocks scraping
- If you need to change the API shape after frontend has started using it
- If scraping is too slow and you need to change the approach
