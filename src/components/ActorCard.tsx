'use client';

interface ActorCardProps {
  id: string;
  name: string;
  knownFor: string;
  imageUrl: string | null;
  onClick?: () => void;
  className?: string;
}

export function ActorCard({ name, knownFor, imageUrl, onClick, className = '' }: ActorCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer ${className}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xl font-semibold">
          {name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-zinc-50 truncate">{name}</div>
        <div className="text-sm text-zinc-400 truncate">{knownFor}</div>
      </div>
    </div>
  );
}
