'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';

interface Movie {
  title: string;
  year: number;
  rating: number;
  imdbUrl: string;
  posterUrl: string | null;
}

interface RatingsChartProps {
  movies: Movie[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as Movie;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-zinc-50 mb-1">{data.title}</p>
        <p className="text-sm text-zinc-400">
          {data.year} • Rating: {data.rating}/10
        </p>
      </div>
    );
  }
  return null;
}

export function RatingsChart({ movies, isLoading }: RatingsChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-96 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-zinc-600 border-t-[#F5C518] rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading ratings...</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="w-full h-96 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-400">No movie data available</p>
      </div>
    );
  }

  const chartData = movies.map(movie => ({
    ...movie,
    x: movie.year,
    y: movie.rating,
  }));

  const minYear = Math.min(...movies.map(m => m.year)) - 1;
  const maxYear = Math.max(...movies.map(m => m.year)) + 1;
  const minRating = Math.max(0, Math.floor(Math.min(...movies.map(m => m.rating))) - 1);
  const maxRating = Math.min(10, Math.ceil(Math.max(...movies.map(m => m.rating))) + 1);

  return (
    <div className="w-full h-96 bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[minYear, maxYear]}
            tickCount={10}
            stroke="#71717a"
            tick={{ fill: '#a1a1aa' }}
            label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[minRating, maxRating]}
            stroke="#71717a"
            tick={{ fill: '#a1a1aa' }}
            label={{ value: 'IMDb Rating', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={chartData}
            fill="#F5C518"
            onClick={(data: Movie) => {
              window.open(data.imdbUrl, '_blank', 'noopener,noreferrer');
            }}
            style={{ cursor: 'pointer' }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
