import { spawn } from 'child_process';
import path from 'path';
import { ActorSearchResult } from './search';
import { ActorFilmography, Movie } from './filmography';

/**
 * Path to Python executable
 * Uses 'python3' in production (Docker), falls back to local venv in development
 */
const PYTHON_PATH = process.env.NODE_ENV === 'production'
  ? 'python3'
  : '/Users/markus/Documents/New project/.venv311/bin/python';

interface CinemagoerResult {
  imdbId: string;
  name: string;
  movies: Array<{
    title: string;
    year: number;
    rating: number;
    votes: number;
    imdbUrl: string;
  }>;
  error?: string;
}

/**
 * FAST actor search using cinemagoer (search-only, no filmography).
 * Returns up to 10 results in ~1 second.
 */
export async function searchActorWithCinemagoer(query: string): Promise<ActorSearchResult[]> {
  console.log(`[Cinemagoer] Fast search for: ${query}`);

  try {
    const result = await callFastSearchScript(query);

    if (result.error) {
      console.error(`[Cinemagoer] Error: ${result.error}`);
      return [];
    }

    const results = result.results || [];
    console.log(`[Cinemagoer] Found ${results.length} results in ~1s`);

    return results.map(r => ({
      id: r.imdbId,
      name: r.name,
      knownFor: '', // We don't have movies yet (will fetch on demand)
      imageUrl: r.imageUrl || null,
    }));
  } catch (error) {
    console.error('[Cinemagoer] Search failed:', error);
    return [];
  }
}

/**
 * Get actor filmography with ratings using cinemagoer.
 * Takes ~10-15s to fetch all movies with ratings.
 *
 * Note: Requires actor name (not just ID) because cinemagoer search is name-based.
 * We store the name in cache alongside the IMDb ID.
 */
export async function getFilmographyWithCinemagoer(actorName: string): Promise<ActorFilmography> {
  console.log(`[Cinemagoer] Getting filmography for: ${actorName}`);

  const result = await callCinemagoerScript(actorName);

  if (result.error) {
    throw new Error(`Cinemagoer error: ${result.error}`);
  }

  // Convert to our format
  const movies: Movie[] = result.movies.map(m => ({
    title: m.title,
    year: m.year,
    rating: m.rating,
    imdbUrl: m.imdbUrl,
    posterUrl: null,
  }));

  return {
    name: result.name,
    imageUrl: null,
    movies: movies,
  };
}

/**
 * Get BOTH search result AND filmography in one call using cinemagoer.
 * This is the main entry point - it's fast and returns everything we need.
 */
export async function searchAndGetFilmography(actorName: string): Promise<{
  searchResult: ActorSearchResult;
  filmography: ActorFilmography;
}> {
  console.log(`[Cinemagoer] Full search+filmography for: ${actorName}`);

  const result = await callCinemagoerScript(actorName);

  if (result.error) {
    throw new Error(`Cinemagoer error: ${result.error}`);
  }

  // Convert to our format
  const movies: Movie[] = result.movies.map(m => ({
    title: m.title,
    year: m.year,
    rating: m.rating,
    imdbUrl: m.imdbUrl,
    posterUrl: null, // Cinemagoer doesn't provide poster URLs
  }));

  const searchResult: ActorSearchResult = {
    id: result.imdbId,
    name: result.name,
    knownFor: movies.slice(0, 3).map(m => m.title).join(', '),
    imageUrl: null,
  };

  const filmography: ActorFilmography = {
    name: result.name,
    imageUrl: null,
    movies: movies,
  };

  console.log(`[Cinemagoer] Success: ${result.name} with ${movies.length} movies`);

  return { searchResult, filmography };
}

/**
 * Call the FAST search script (search-only, no filmography)
 */
function callFastSearchScript(actorName: string): Promise<{
  results?: Array<{ imdbId: string; name: string; imageUrl?: string | null }>;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    // Use absolute path for Docker compatibility
    const scriptPath = path.join(process.cwd(), 'scripts', 'search_actor_only.py');
    const python = spawn(PYTHON_PATH, [scriptPath, actorName]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        try {
          const errorData = JSON.parse(stderr);
          resolve(errorData);
        } catch {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Call the FULL script (search + filmography with ratings)
 */
function callCinemagoerScript(actorName: string): Promise<CinemagoerResult> {
  return new Promise((resolve, reject) => {
    // Use absolute path for Docker compatibility
    const scriptPath = path.join(process.cwd(), 'scripts', 'search_actor_full.py');
    const python = spawn(PYTHON_PATH, [scriptPath, actorName]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        // Try to parse error JSON from stderr
        try {
          const errorData = JSON.parse(stderr);
          resolve(errorData as CinemagoerResult);
        } catch {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
}
