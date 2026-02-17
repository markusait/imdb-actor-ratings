'use client';

import { useState } from 'react';

interface Movie {
  title: string;
  year: number;
  rating: number;
  imdbUrl: string;
  posterUrl: string | null;
}

interface MovieListProps {
  movies: Movie[];
}

type SortField = 'year' | 'rating' | 'title';
type SortDirection = 'asc' | 'desc';

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating / 2);
  const hasHalfStar = rating % 2 >= 1;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-[#F5C518]">★</span>
      ))}
      {hasHalfStar && <span className="text-[#F5C518]">☆</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-zinc-600">★</span>
      ))}
      <span className="ml-2 text-sm text-zinc-400">{rating.toFixed(1)}</span>
    </div>
  );
}

export function MovieList({ movies }: MovieListProps) {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedMovies = [...movies].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'year':
        comparison = a.year - b.year;
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-zinc-600">↕</span>;
    }
    return <span className="text-[#F5C518]">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (movies.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-700">
            <tr>
              <th
                onClick={() => handleSort('year')}
                className="px-6 py-3 text-left text-sm font-semibold text-zinc-300 cursor-pointer hover:text-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Year <SortIcon field="year" />
                </div>
              </th>
              <th
                onClick={() => handleSort('title')}
                className="px-6 py-3 text-left text-sm font-semibold text-zinc-300 cursor-pointer hover:text-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Title <SortIcon field="title" />
                </div>
              </th>
              <th
                onClick={() => handleSort('rating')}
                className="px-6 py-3 text-left text-sm font-semibold text-zinc-300 cursor-pointer hover:text-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Rating <SortIcon field="rating" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-300">
                Link
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedMovies.map((movie, index) => (
              <tr
                key={index}
                className="hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                  {movie.year}
                </td>
                <td className="px-6 py-4 text-zinc-50">
                  {movie.title}
                </td>
                <td className="px-6 py-4">
                  <StarRating rating={movie.rating} />
                </td>
                <td className="px-6 py-4">
                  <a
                    href={movie.imdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5C518] hover:text-[#F5C518]/80 transition-colors text-sm font-medium"
                  >
                    View on IMDb →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
