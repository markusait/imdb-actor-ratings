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
