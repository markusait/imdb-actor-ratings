#!/usr/bin/env python3
from __future__ import annotations

import json
import sys

from imdb import Cinemagoer


def pick_person(people, query: str):
    q = query.strip().lower()
    for person in people:
        if str(person.get("name", "")).strip().lower() == q:
            return person
    return people[0] if people else None


def main() -> int:
    query = sys.argv[1] if len(sys.argv) > 1 else "Leonardo DiCaprio"
    ia = Cinemagoer()

    people = ia.search_person(query)
    person = pick_person(people, query)
    if person is None:
        print(json.dumps({"library": "cinemagoer", "query": query, "error": "No person found"}, indent=2))
        return 1

    person_id = person.personID
    details = ia.get_person(person_id, info=["filmography"])
    filmography = details.get("filmography", {})

    candidate_titles = []
    for section in ("actor", "actress", "self"):
        candidate_titles.extend(filmography.get(section, []))

    seen = set()
    sampled = []
    for movie in candidate_titles:
        movie_id = movie.movieID
        if movie_id in seen:
            continue
        seen.add(movie_id)
        sampled.append(movie)
        if len(sampled) >= 12:
            break

    movies = []
    for movie in sampled:
        data = ia.get_movie(movie.movieID)
        movies.append(
            {
                "title_id": movie.movieID,
                "title": data.get("title") or movie.get("title"),
                "year": data.get("year"),
                "rating": data.get("rating"),
                "votes": data.get("votes"),
            }
        )

    movies.sort(key=lambda m: (m["votes"] or 0), reverse=True)

    payload = {
        "library": "cinemagoer",
        "query": query,
        "supports_actor_search": True,
        "supports_person_imdb_id": True,
        "person_name": person.get("name"),
        "person_id": f"nm{person_id}",
        "filmography_section_counts": {k: len(v) for k, v in filmography.items() if isinstance(v, list)},
        "sampled_movies_with_rating_votes": movies,
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
