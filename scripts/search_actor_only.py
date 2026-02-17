#!/usr/bin/env python3
"""
FAST actor search - only returns IMDb ID and name.
Does NOT fetch filmography or ratings (that happens in a separate call).
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
        print(json.dumps({"error": "Usage: search_actor_only.py 'Actor Name'"}), file=sys.stderr)
        return 1

    query = sys.argv[1]

    # Debug logging
    print(json.dumps({
        "debug": "Starting search",
        "query": query,
        "argv": sys.argv,
    }), file=sys.stderr)

    ia = Cinemagoer()

    try:
        # Search for actors - return up to 10 results
        print(json.dumps({"debug": "Calling ia.search_person()"}), file=sys.stderr)
        people = ia.search_person(query)
        print(json.dumps({"debug": f"search_person returned {len(people) if people else 0} results"}), file=sys.stderr)

        if not people or len(people) == 0:
            print(json.dumps({"error": f"No person found for: {query}"}), file=sys.stderr)
            return 1

        # Return up to 10 results with images
        results = []
        for person in people[:10]:
            person_id = person.personID
            person_name = person.get("name", "Unknown")

            # Get headshot/image URL if available
            image_url = None
            try:
                # The search result may already have a headshot
                if hasattr(person, 'data') and 'headshot' in person.data:
                    image_url = person.get('headshot')
                # Fallback: try to get from full canonical URL
                elif hasattr(person, 'data') and 'full-size headshot' in person.data:
                    image_url = person.get('full-size headshot')
            except Exception:
                pass  # No image available

            results.append({
                "imdbId": f"nm{person_id}",
                "name": person_name,
                "imageUrl": image_url,
            })

        # Return array of results (FAST!)
        print(json.dumps({"results": results}))
        return 0

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
