# IMDb Actor Ratings - Architecture & Master Plan

## Overview

A web app where users search for an actor and see a graph of their IMDb movie
ratings over time. Data is scraped from IMDb using Playwright.

## Tech Stack

| Layer         | Technology                                      |
|---------------|------------------------------------------------|
| Framework     | **Next.js 15** (App Router)                     |
| Language      | **TypeScript** throughout                       |
| Runtime       | **Bun** (dev + build)                           |
| API Layer     | **tRPC v11** (end-to-end typesafe)              |
| Scraping      | **Playwright** (full install in Docker)          |
| Frontend      | **React 19** + **Tailwind CSS v4** + **Recharts** |
| Deployment    | **Render.com** (Docker web service, free tier)   |
| Caching       | **JSON file** on disk (`data/cache.json`)        |

## Hosting: Why Render.com (Not Vercel)

Vercel's free tier limits serverless functions to **10 seconds** — far too short
for Playwright scraping (30-60s). Here's the comparison:

| Platform | Playwright | Timeout | Cache Persistence | Free Tier |
|----------|-----------|---------|-------------------|-----------|
| **Render.com** | Native (Docker) | **100 min** | Ephemeral (resets on deploy) | 750 hrs/month |
| Vercel (Hobby) | @sparticuz/chromium hack | 10s | Ephemeral | Unusable for Playwright |
| Vercel (Pro) | @sparticuz/chromium | 60s | Ephemeral | $20/month |
| Cloudflare Workers | @cloudflare/playwright | 60s | KV (persistent) | 10 min browser/day |
| Fly.io | Docker | No limit | Volumes ($) | No free tier |
| Hetzner + Coolify | Docker | No limit | Persistent disk | ~$4/month |

**Render.com wins** because:
- Playwright just works in Docker — no serverless hacks needed
- 100 minute response timeout — plenty for scraping
- 750 free hours/month — enough for a personal project
- Deploys from GitHub with zero config
- Sleeps after 15 min of inactivity (cold start ~30s, acceptable)

**Cloudflare is the runner-up** if you need persistent cache across deploys
(via KV), but the 10 min/day free browser limit and `@cloudflare/playwright`
fork add complexity.

## Caching: Simple JSON File

No database. No Redis. Just a JSON file.

```
data/cache.json
```

Structure:
```json
{
  "nm0000138": {
    "scrapedAt": "2026-02-16T12:00:00Z",
    "name": "Leonardo DiCaprio",
    "imageUrl": "https://...",
    "movies": [
      { "title": "Titanic", "year": 1997, "rating": 7.9, "imdbUrl": "..." },
      ...
    ]
  }
}
```

Rules:
- **Cache hit**: If actor ID exists AND `scrapedAt` < 90 days ago → return cached data
- **Cache miss**: Scrape IMDb, write result to JSON, return data
- **On Render**: File persists while container runs, resets on redeploy (rebuilds naturally as users search)
- **Locally**: File persists across dev server restarts
- **`.gitignore`**: Add `data/cache.json` so cache doesn't bloat the repo

The JSON file is read/written with `fs.readFileSync`/`fs.writeFileSync` + a
simple mutex to avoid concurrent write corruption.

## Key Architecture Decisions

### Scraping Strategy
IMDb is server-rendered, but some data (full filmography) requires JavaScript.
Playwright handles both cases. We'll scrape:
1. **Actor search**: `https://www.imdb.com/find/?q={query}&s=nm` - find actor
2. **Actor filmography**: `https://www.imdb.com/name/{id}/` - get all movies
3. **Movie ratings**: Available on the filmography page or individual movie pages

### API Shape (tRPC)
```
actor.search(query: string) -> { id, name, knownFor, imageUrl }[]
actor.ratings(imdbId: string) -> { name, movies: { title, year, rating, imdbUrl }[] }
```

### Docker Deployment (Render)
- Single `Dockerfile` that builds Next.js + installs Playwright + Chromium
- `render.yaml` for service configuration (Blueprint spec)
- Exposed on port 3000
- Region: Oregon (Render's default free region)

## Project Structure

```
imdb-actor-ratings/
├── CLAUDE.md                    # Shared instructions for all agents
├── Dockerfile                   # Docker build for Render deployment
├── render.yaml                  # Render Blueprint (IaC)
├── plans/
│   ├── 00-ARCHITECTURE.md       # This file
│   ├── 01-LEAD-AGENT.md         # Orchestrator instructions
│   ├── 02-BACKEND-AGENT.md      # Backend agent plan
│   ├── 03-FRONTEND-AGENT.md     # Frontend agent plan
│   └── 04-DEPLOYMENT-AGENT.md   # Deployment agent plan
├── data/
│   └── .gitkeep                 # cache.json lives here at runtime
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page (search + results)
│   │   ├── globals.css          # Tailwind + global styles
│   │   └── api/
│   │       └── trpc/
│   │           └── [trpc]/
│   │               └── route.ts # tRPC HTTP handler
│   ├── server/
│   │   ├── trpc.ts              # tRPC init + context
│   │   ├── router.ts            # Root router (merges sub-routers)
│   │   ├── cache.ts             # JSON file cache read/write
│   │   └── routers/
│   │       └── actor.ts         # actor.search + actor.ratings
│   ├── scraper/
│   │   ├── browser.ts           # Playwright launch helper
│   │   ├── search.ts            # Search IMDb for actors
│   │   └── filmography.ts       # Scrape actor filmography + ratings
│   ├── components/
│   │   ├── SearchBar.tsx         # Actor search input
│   │   ├── ActorCard.tsx         # Search result card
│   │   ├── RatingsChart.tsx      # Recharts line graph
│   │   └── MovieList.tsx         # Tabular movie list below chart
│   ├── lib/
│   │   ├── trpc.ts              # tRPC React client setup
│   │   └── types.ts             # Shared types
│   └── hooks/
│       └── useDebounce.ts       # Debounce search input
├── public/
│   └── favicon.ico
├── next.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

## Agent Team Setup

### Agents
1. **Lead** (Opus, delegate mode) - coordinates, reviews, unblocks
2. **backend-agent** (Sonnet) - tRPC server, Playwright scraper, JSON cache
3. **frontend-agent** (Sonnet) - React UI, search, chart, styling + Chrome DevTools MCP
4. **deployment-agent** (Sonnet) - Dockerfile, Render config, step-by-step deployment

### MCP Servers

The project includes `.mcp.json` with **Chrome DevTools MCP** configured.
All teammates automatically inherit this. It provides:
- `take_screenshot` — see the actual UI
- `navigate_page` — open localhost:3000 or production URL
- `list_console_messages` — read browser errors
- `evaluate_script` — run JS in the browser
- `click`, `fill` — interact with the page

Primarily used by frontend-agent to visually verify UI work.

### Quality Gate Hooks

Project-level hooks in `.claude/settings.json` enforce quality:

**TaskCompleted** — runs `tsc --noEmit` before any task can be marked done.
If there are TypeScript errors, the task stays open and the agent gets the
errors as feedback to fix.

The hook script lives at `.claude/hooks/check-build.sh`.

### Permission Pre-Approval

Teammate permission prompts bubble up to the lead, causing friction. The
`~/.claude/settings.json` pre-approves common operations (bun, npm, git,
docker, file read/write/edit). See CLAUDE.md for the full permissions config.

### Communication Flow
```
Lead
 ├── backend-agent  ──→ defines tRPC types ──→ frontend-agent sees types
 ├── frontend-agent ──→ consumes tRPC API  ──→ asks backend if API changes
 └── deployment-agent ──→ configures hosting ──→ asks both agents for requirements
```

### Task Dependencies
1. Backend: project scaffold + tRPC setup (FIRST - frontend depends on types)
2. Backend: Playwright scraper + JSON cache (parallel with frontend after types exist)
3. Frontend: UI components + tRPC client (after tRPC types are defined)
4. Deployment: Dockerfile + Render config (after both backend + frontend are working)
5. Deployment: first deploy + verification (LAST)

## How to Launch

### One-time setup

1. Install bun (if not present):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Enable agent teams in Claude Code settings (`~/.claude/settings.json`):
   ```json
   {
     "env": {
       "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
     },
     "teammateMode": "tmux",
     "permissions": {
       "allow": [
         "Bash(bun *)", "Bash(bunx *)", "Bash(npm *)", "Bash(npx *)",
         "Bash(node *)", "Bash(git *)", "Bash(curl *)", "Bash(mkdir *)",
         "Bash(touch *)", "Bash(ls *)", "Bash(cat *)", "Bash(docker *)",
         "Read", "Write", "Edit", "Glob", "Grep"
       ]
     }
   }
   ```
   The permissions pre-approval is **critical** for agent teams. Without it,
   every tool use triggers a permission prompt that interrupts the workflow.

### Each session

```bash
# 1. Start a tmux session FIRST — this is required for split panes.
#    Claude Code detects it's inside tmux and automatically creates
#    a separate pane for each teammate agent. Without tmux, all agents
#    run in one terminal (in-process mode, switch with Shift+Up/Down).
tmux new -s imdb

# 2. Inside tmux, launch Claude Code in the project directory
cd /Users/markus/Code/imdb-actor-ratings
claude

# 3. Paste the launch prompt from plans/01-LEAD-AGENT.md
#    → Claude spawns 3 teammates, tmux splits into 4 panes automatically
#    → You can see all agents working side-by-side in real time

# 4. Press Shift+Tab to enter delegate mode (lead coordinates only, no code)

# 5. Click into any tmux pane to interact with that agent directly
```
