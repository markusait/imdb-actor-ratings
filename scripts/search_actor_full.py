#!/usr/bin/env python3
"""
Search for an actor and return their filmography with ratings.
Uses cinemagoer 2025.12.31
"""
from __future__ import annotations

import json
import sys

from imdb import Cinemagoer


def pick_person(people, query: str):
    """Pick the best match from search results."""
    q = query.strip().lower()
    for person in people:
        if str(person.get("name", "")).strip().lower() == q:
            return person
    return people[0] if people else None


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: search_actor_full.py 'Actor Name'"}), file=sys.stderr)
        return 1

    query = sys.argv[1]
    ia = Cinemagoer()

    try:
        # Step 1: Search for actor
        people = ia.search_person(query)
        person = pick_person(people, query)

        if person is None:
            print(json.dumps({"error": f"No person found for: {query}"}), file=sys.stderr)
            return 1

        person_id = person.personID
        person_name = person.get("name", query)

        # Step 2: Get filmography
        details = ia.get_person(person_id, info=["filmography"])
        filmography = details.get("filmography", {})

        # Collect movies from actor/actress/self sections
        candidate_titles = []
        for section in ("actor", "actress", "self"):
            candidate_titles.extend(filmography.get(section, []))

        # Deduplicate
        seen = set()
        sampled = []
        for movie in candidate_titles:
            movie_id = movie.movieID
            if movie_id in seen:
                continue
            seen.add(movie_id)
            sampled.append(movie)
            if len(sampled) >= 50:  # Fetch up to 50 movies
                break

        # Step 3: Fetch ratings for each movie
        movies = []
        for movie in sampled:
            try:
                data = ia.get_movie(movie.movieID)
                rating = data.get("rating")
                votes = data.get("votes")
                year = data.get("year")
                title = data.get("title") or movie.get("title")

                # Only include movies with ratings
                if rating is not None and year is not None:
                    movies.append({
                        "title": title,
                        "year": int(year),
                        "rating": float(rating),
                        "votes": int(votes) if votes else 0,
                        "imdbUrl": f"https://www.imdb.com/title/tt{movie.movieID}/",
                    })
            except Exception:
                # Skip movies that fail to fetch
                continue

        # Sort by votes (popularity) descending
        movies.sort(key=lambda m: m["votes"], reverse=True)

        # Return result
        result = {
            "imdbId": f"nm{person_id}",
            "name": person_name,
            "movies": movies
        }

        print(json.dumps(result))
        return 0

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
