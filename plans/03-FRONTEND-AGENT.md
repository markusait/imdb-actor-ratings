# Frontend Agent Plan

## Role

You own the frontend: React components, pages, styling, and user experience.
You own these directories exclusively:
- `src/app/` (except `src/app/api/` which backend owns)
- `src/components/`
- `src/hooks/`
- `src/lib/trpc.ts` (tRPC client setup)

## Wait Condition

**Do not start writing components until backend-agent has committed the tRPC
types.** You will be notified by the lead when types are ready. You can read
`src/server/router.ts` to understand the API shape but do not modify it.

While waiting, you can:
- Plan component structure
- Set up the tRPC client
- Create the layout and global styles

---

## Phase 1: tRPC Client Setup

### 1.1 Create tRPC client (`src/lib/trpc.ts`)

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/router';

export const trpc = createTRPCReact<AppRouter>();
```

### 1.2 Set up providers (`src/app/providers.tsx`)

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import superjson from 'superjson';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 1.3 Update layout (`src/app/layout.tsx`)

Wrap children in `<Providers>`.

---

## Phase 2: Components

### Design Direction

- **Clean, modern, minimal** - think Linear or Raycast's design language
- Dark mode by default with light mode support
- Generous whitespace, clear typography
- Smooth transitions and loading states
- Mobile-responsive

### 2.1 SearchBar (`src/components/SearchBar.tsx`)

- Large, centered search input (hero-style on initial view)
- Debounced input (300ms) using `useDebounce` hook
- Shows loading spinner while searching
- Dropdown with search results (actor cards)
- Keyboard navigation: arrow keys to select, Enter to confirm
- Placeholder: "Search for an actor... e.g. Leonardo DiCaprio"

### 2.2 ActorCard (`src/components/ActorCard.tsx`)

- Displayed in search dropdown and as selected actor header
- Shows: actor photo (or placeholder), name, known-for text
- Clickable to select the actor and load ratings
- Subtle hover effect

### 2.3 RatingsChart (`src/components/RatingsChart.tsx`)

- **Recharts** `LineChart` or `ScatterChart` (scatter might be better since
  movies aren't continuous)
- X-axis: Year (from earliest to latest movie)
- Y-axis: IMDb Rating (0-10, but zoom to data range e.g. 4-10)
- Each point: a movie
  - Hover tooltip: movie title, year, rating
  - Click: opens IMDb page in new tab
- Optional: trend line showing average rating over time
- Responsive: works on mobile (simplified view)
- Color scheme: IMDb gold (#F5C518) on dark background

### 2.4 MovieList (`src/components/MovieList.tsx`)

- Table or card grid below the chart
- Columns: Year, Title, Rating (star visualization), Link
- Sortable by year or rating
- Searchable/filterable
- Compact rows, easy to scan

### 2.5 Loading & Error States

- Skeleton loaders while data loads
- Friendly error messages if scraping fails
- Empty state: "No movies found for this actor"
- Rate limit message: "Please wait a moment and try again"

---

## Phase 3: Page Assembly (`src/app/page.tsx`)

### User Flow

1. User lands on page → sees big search bar centered vertically
2. User types actor name → search results appear in dropdown
3. User selects actor → search bar moves to top, chart appears below
4. Chart loads with movie ratings over time
5. Movie list appears below chart
6. User can search for another actor (search bar stays at top)

### Layout

```
┌─────────────────────────────────────┐
│            IMDB Ratings             │  ← Header (minimal)
│                                     │
│     🔍 Search for an actor...       │  ← SearchBar (centered initially)
│     ┌─────────────────────┐         │
│     │ Leonardo DiCaprio   │         │  ← Dropdown results
│     │ Leonardo Nam        │         │
│     └─────────────────────┘         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Ratings Chart        │    │  ← RatingsChart
│  │    ·    ·  ·                │    │
│  │  ·   ·      · ·    ·       │    │
│  │            ·                │    │
│  └─────────────────────────────┘    │
│                                     │
│  Year  Title           Rating       │  ← MovieList
│  2023  Killers of...   7.1  ★★★★   │
│  2021  Don't Look Up   7.2  ★★★★   │
│  2019  Once Upon...    7.6  ★★★★   │
│  ...                                │
│                                     │
│          Built with ♡               │  ← Footer
└─────────────────────────────────────┘
```

---

## Phase 4: Polish

- Add page metadata (title, description, Open Graph)
- Add favicon (use IMDb gold theme)
- Ensure Lighthouse score > 90 for performance
- Test on mobile viewport
- Add subtle animations (framer-motion optional, CSS transitions preferred)
- Handle edge cases: very long actor names, actors with 100+ movies

---

## Styling Guidelines

```css
/* Color palette */
--imdb-gold: #F5C518;
--bg-dark: #0A0A0A;
--bg-card: #141414;
--text-primary: #FAFAFA;
--text-secondary: #A1A1AA;
--border: #27272A;

/* Typography */
font-family: system-ui, -apple-system, sans-serif;
```

Use Tailwind utility classes. No custom CSS files beyond `globals.css`.

---

## File Ownership Rules

- **You own**: `src/app/**` (except `src/app/api/`), `src/components/**`,
  `src/hooks/**`, `src/lib/trpc.ts`
- **You do NOT touch**: `src/server/**`, `src/scraper/**`, `src/app/api/**`
- **You read but don't modify**: `src/server/router.ts` (for types),
  `src/lib/types.ts`
- **Shared**: `package.json` (coordinate before adding deps)

## Browser Preview with Chrome DevTools MCP

You have access to **Chrome DevTools MCP** — a tool that lets you control a real
browser from within Claude Code. Use it to visually verify your work instead of
guessing what the UI looks like.

### Available Tools

| Tool | What it does |
|------|-------------|
| `navigate_page` | Go to a URL (e.g., `http://localhost:3000`) |
| `take_screenshot` | Capture the current page as an image |
| `list_console_messages` | Read browser console errors/warnings |
| `evaluate_script` | Run JavaScript in the browser context |
| `click` | Click an element on the page |
| `fill` | Type text into an input field |
| `list_network_requests` | See API calls the page is making |
| `resize_page` | Test different viewport sizes (mobile) |

### Workflow

1. Make sure `bun dev` is running (the backend-agent will start it, or run it yourself)
2. Use `navigate_page` to go to `http://localhost:3000`
3. After making UI changes, use `take_screenshot` to see the result
4. Check `list_console_messages` for any errors
5. Use `resize_page` to test mobile layout, then `take_screenshot` again
6. Use `list_network_requests` to verify tRPC calls are working

### When to Screenshot

- After creating/modifying any component
- After styling changes
- Before marking a task as complete (visual verification)
- When debugging layout issues
- When testing responsive design

## Testing Your Work

```bash
bun dev
# Then use Chrome DevTools MCP to verify:
# 1. navigate_page → http://localhost:3000
# 2. take_screenshot → see the UI
# 3. list_console_messages → check for errors
# 4. resize_page → test mobile, then take_screenshot again
```

## When to Ask for Human Input

- If the API types change and you're unsure how to adapt
- If you want to add a dependency not in the plan (e.g. framer-motion)
- If the design direction is unclear
- If you encounter tRPC client issues you can't resolve
- If Chrome DevTools MCP can't connect (dev server might not be running)
