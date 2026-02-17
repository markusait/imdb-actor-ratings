'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useDebounce } from '@/hooks/useDebounce';
import { ActorCard } from './ActorCard';

interface SearchBarProps {
  onActorSelect: (actor: { id: string; name: string; knownFor: string; imageUrl: string | null }) => void;
  centered?: boolean;
}

export function SearchBar({ onActorSelect, centered = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isLoading } = trpc.actor.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when results change
  useEffect(() => {
    if (results.length > 0 && query.length > 0) {
      setIsOpen(true);
    }
  }, [results, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (actor: typeof results[0]) => {
    onActorSelect(actor);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div
      ref={wrapperRef}
      className={`w-full max-w-2xl relative ${centered ? 'mx-auto' : ''}`}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for an actor... e.g. Leonardo DiCaprio"
          className={`w-full px-6 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518] transition-all ${
            centered ? 'text-lg' : 'text-base'
          }`}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-[#F5C518] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          {results.map((actor, index) => (
            <ActorCard
              key={actor.id}
              {...actor}
              onClick={() => handleSelect(actor)}
              className={index === selectedIndex ? 'bg-zinc-800/50' : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
