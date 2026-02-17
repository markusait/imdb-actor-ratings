import { spawn } from 'child_process';
import { ActorSearchResult } from './search';

interface CinemagoerSearchResult {
  imdbId: string;
  name: string;
  error?: string;
}

/**
 * Search for actors using cinemagoer Python library
 * Falls back to Playwright if cinemagoer fails
 */
export async function searchActorsCinemagoer(query: string): Promise<ActorSearchResult[]> {
  console.log(`[Cinemagoer] Searching for: ${query}`);

  try {
    const result = await callPythonScript('scripts/search_actor.py', [query]);

    if (result.error) {
      console.error(`[Cinemagoer] Error: ${result.error}`);
      return [];
    }

    console.log(`[Cinemagoer] Found: ${result.imdbId} - ${result.name}`);

    // Return single result in array format matching our interface
    return [{
      id: result.imdbId,
      name: result.name,
      knownFor: '', // Cinemagoer doesn't provide this
      imageUrl: null, // Will need to fetch separately if needed
    }];
  } catch (error) {
    console.error('[Cinemagoer] Search failed:', error);
    return [];
  }
}

/**
 * Call a Python script and parse JSON output
 * Uses the Python environment with working cinemagoer 2025.12.31
 */
function callPythonScript(scriptPath: string, args: string[]): Promise<CinemagoerSearchResult> {
  return new Promise((resolve, reject) => {
    // Use Python from the working venv with cinemagoer 2025.12.31
    const pythonPath = '/Users/markus/Documents/New project/.venv311/bin/python';
    const python = spawn(pythonPath, [scriptPath, ...args]);

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
          resolve(errorData as CinemagoerSearchResult);
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
