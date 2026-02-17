#!/usr/bin/env python3
"""
Search for an actor by name and return their IMDb ID.
Returns JSON: { "imdbId": "nm1234567", "name": "Actor Name" }
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
        print(json.dumps({"error": "Usage: search_actor.py 'Actor Name'"}), file=sys.stderr)
        return 1

    query = sys.argv[1]
    ia = Cinemagoer()

    try:
        people = ia.search_person(query)
        person = pick_person(people, query)

        if person is None:
            print(json.dumps({"error": f"No person found for: {query}"}), file=sys.stderr)
            return 1

        person_id = person.personID
        result = {
            "imdbId": f"nm{person_id}",
            "name": person.get("name", query)
        }

        print(json.dumps(result))
        return 0

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
