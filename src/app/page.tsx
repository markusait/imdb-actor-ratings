'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SearchBar } from '@/components/SearchBar';
import { ActorCard } from '@/components/ActorCard';
import { RatingsChart } from '@/components/RatingsChart';
import { MovieList } from '@/components/MovieList';

export default function Home() {
  const [selectedActor, setSelectedActor] = useState<{
    id: string;
    name: string;
    knownFor: string;
    imageUrl: string | null;
  } | null>(null);

  const { data: ratingsData, isLoading } = trpc.actor.ratings.useQuery(
    { imdbId: selectedActor?.id || '' },
    {
      enabled: !!selectedActor,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-zinc-50">
            IMDb <span className="text-[#F5C518]">Actor Ratings</span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className={`transition-all duration-500 ${selectedActor ? 'mb-8' : 'min-h-[60vh] flex items-center justify-center'}`}>
          <div className="w-full">
            {selectedActor && (
              <div className="mb-4">
                <button
                  onClick={() => setSelectedActor(null)}
                  className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors mb-4"
                >
                  ← Back to search
                </button>
              </div>
            )}
            <SearchBar
              onActorSelect={setSelectedActor}
              centered={!selectedActor}
            />
          </div>
        </div>

        {/* Results Section */}
        {selectedActor && (
          <div className="space-y-8 animate-fadeIn">
            {/* Selected Actor Header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <ActorCard
                {...selectedActor}
                className="hover:bg-transparent cursor-default"
              />
            </div>

            {/* Ratings Chart */}
            <div>
              <h2 className="text-2xl font-bold text-zinc-50 mb-4">
                Movie Ratings Over Time
              </h2>
              <RatingsChart
                movies={ratingsData?.movies || []}
                isLoading={isLoading}
              />
            </div>

            {/* Movie List */}
            {ratingsData && ratingsData.movies.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-zinc-50 mb-4">
                  All Movies ({ratingsData.movies.length})
                </h2>
                <MovieList movies={ratingsData.movies} />
              </div>
            )}

            {/* Empty State */}
            {ratingsData && ratingsData.movies.length === 0 && !isLoading && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <p className="text-zinc-400 text-lg">
                  No movies found for {selectedActor.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!selectedActor && (
          <div className="text-center mt-8">
            <p className="text-zinc-500 text-sm">
              Search for an actor to see their IMDb movie ratings visualized over time
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>Data scraped from IMDb. Built with Next.js, tRPC, and Playwright.</p>
        </div>
      </footer>
    </div>
  );
}
