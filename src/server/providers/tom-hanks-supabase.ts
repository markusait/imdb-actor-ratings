import { ActorSearchResult } from '@/scraper/search';
import { ActorFilmography, Movie } from '@/scraper/filmography';

const TOM_HANKS_IMDB_ID = 'nm0000158';
const TOM_HANKS_TMDB_ID = 31;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const SUPABASE_TABLE = process.env.SUPABASE_RATINGS_TABLE || 'ratings';
const TMDB_CREDITS_LIMIT = Number(process.env.TMDB_CREDITS_LIMIT || 60);

interface TmdbCredit {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
}

interface SupabaseRatingRow {
  tconst: string;
  rating: number;
  votes?: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseApiKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY ||
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) ${url}: ${body}`);
  }
  return response.json() as Promise<T>;
}

async function getTomHanksCredits(): Promise<TmdbCredit[]> {
  const tmdbApiKey = requireEnv('TMDB_API_KEY');
  const url = new URL(`https://api.themoviedb.org/3/person/${TOM_HANKS_TMDB_ID}/movie_credits`);
  url.searchParams.set('api_key', tmdbApiKey);

  const data = await fetchJson<{ cast?: TmdbCredit[] }>(url.toString());
  const credits = (data.cast || [])
    .filter((c) => c.title && c.release_date)
    .sort((a, b) => String(a.release_date).localeCompare(String(b.release_date)))
    .slice(0, Math.max(1, TMDB_CREDITS_LIMIT));

  return credits;
}

async function getTmdbExternalIds(tmdbMovieId: number): Promise<string | null> {
  const tmdbApiKey = requireEnv('TMDB_API_KEY');
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbMovieId}/external_ids`);
  url.searchParams.set('api_key', tmdbApiKey);

  const data = await fetchJson<{ imdb_id?: string | null }>(url.toString());
  return data.imdb_id || null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

async function getSupabaseRatingsByTconst(tconsts: string[]): Promise<Map<string, SupabaseRatingRow>> {
  if (tconsts.length === 0) {
    return new Map();
  }

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseKey = getSupabaseApiKey();

  const out = new Map<string, SupabaseRatingRow>();
  const chunkSize = 120;

  for (let i = 0; i < tconsts.length; i += chunkSize) {
    const chunk = tconsts.slice(i, i + chunkSize);
    const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${SUPABASE_TABLE}`);
    url.searchParams.set('select', 'tconst,rating,votes');
    url.searchParams.set('tconst', `in.(${chunk.join(',')})`);

    const rows = await fetchJson<SupabaseRatingRow[]>(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    for (const row of rows) {
      out.set(row.tconst, row);
    }
  }

  return out;
}

export function searchTomHanksOnly(query: string): ActorSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }

  if (!'tom hanks'.includes(q) && !q.includes('tom') && !q.includes('hanks')) {
    return [];
  }

  return [
    {
      id: TOM_HANKS_IMDB_ID,
      name: 'Tom Hanks',
      knownFor: 'Forrest Gump, Cast Away, Saving Private Ryan',
      imageUrl: null,
    },
  ];
}

export async function getTomHanksFilmographyFromTmdbSupabase(): Promise<ActorFilmography> {
  const credits = await getTomHanksCredits();

  const withImdb = await mapWithConcurrency(credits, 8, async (credit) => {
    const imdbId = await getTmdbExternalIds(credit.id);
    return { ...credit, imdbId };
  });

  const allTconsts = withImdb
    .map((m) => m.imdbId)
    .filter((id): id is string => !!id && id.startsWith('tt'));

  const ratingsByTconst = await getSupabaseRatingsByTconst(allTconsts);

  const movies: Movie[] = withImdb
    .map((movie) => {
      const year = Number(String(movie.release_date).slice(0, 4));
      const tconst = movie.imdbId || '';
      const ratingRow = tconst ? ratingsByTconst.get(tconst) : null;

      return {
        title: movie.title || 'Unknown',
        year: Number.isFinite(year) ? year : 0,
        rating: ratingRow?.rating || 0,
        imdbUrl: tconst ? `https://www.imdb.com/title/${tconst}/` : '',
        posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
      };
    })
    .filter((m) => m.year > 0)
    .sort((a, b) => a.year - b.year);

  return {
    name: 'Tom Hanks',
    imageUrl: null,
    movies,
  };
}
