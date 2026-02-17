#!/usr/bin/env python3
"""
Get an actor's filmography with ratings and votes.
Returns JSON: { "movies": [{"title": "...", "year": 2020, "rating": 8.5, "votes": 100000}] }
"""
from __future__ import annotations

import json
import sys

from imdb import Cinemagoer


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: get_filmography.py nm1234567"}), file=sys.stderr)
        return 1

    imdb_id = sys.argv[1]

    # Extract numeric ID from nm1234567 format
    if not imdb_id.startswith("nm"):
        print(json.dumps({"error": f"Invalid IMDb ID format: {imdb_id}"}), file=sys.stderr)
        return 1

    person_id = imdb_id[2:]  # Remove 'nm' prefix

    ia = Cinemagoer()

    try:
        # Get person details with filmography
        details = ia.get_person(person_id, info=["filmography"])
        filmography = details.get("filmography", {})

        # Collect candidate titles from actor/actress/self sections
        candidate_titles = []
        for section in ("actor", "actress", "self"):
            candidate_titles.extend(filmography.get(section, []))

        # Deduplicate and sample up to 50 movies for performance
        seen = set()
        sampled = []
        for movie in candidate_titles:
            movie_id = movie.movieID
            if movie_id in seen:
                continue
            seen.add(movie_id)
            sampled.append(movie)
            if len(sampled) >= 50:
                break

        # Fetch detailed info for each movie
        movies = []
        for movie in sampled:
            try:
                data = ia.get_movie(movie.movieID)
                rating = data.get("rating")
                votes = data.get("votes")
                year = data.get("year")

                # Only include movies with ratings
                if rating is not None:
                    movies.append({
                        "title": data.get("title") or movie.get("title"),
                        "year": year,
                        "rating": float(rating),
                        "votes": int(votes) if votes else 0
                    })
            except Exception:
                # Skip movies that fail to fetch
                continue

        # Sort by votes (popularity) descending
        movies.sort(key=lambda m: m["votes"], reverse=True)

        result = {"movies": movies}
        print(json.dumps(result))
        return 0

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
