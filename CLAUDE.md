# IMDb Actor Ratings

## Project Overview
A web app to search for actors and see their IMDb movie ratings plotted over time.
Data is scraped from IMDb using Playwright.

## Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Runtime**: Bun
- **API**: tRPC v11 (end-to-end typesafe)
- **Scraping**: Playwright (full install, runs in Docker)
- **Frontend**: React 19, Tailwind CSS v4, Recharts
- **Deployment**: Render.com (Docker web service, free tier)
- **Caching**: JSON file on disk (`data/cache.json`, 90-day TTL)
- **Browser Preview**: Chrome DevTools MCP (screenshots, console, DOM inspection)

## Architecture
- `src/server/` - tRPC server, routers, JSON cache logic
- `src/scraper/` - Playwright scraping logic (browser launcher, search, filmography)
- `src/components/` - React UI components (SearchBar, ActorCard, RatingsChart, MovieList)
- `src/app/` - Next.js pages and API routes
- `src/lib/` - Shared types and tRPC client setup
- `data/` - Runtime cache directory (cache.json lives here, gitignored)
- `plans/` - Agent-specific instructions and architecture docs

## Deployment
- Hosted on **Render.com** as a Docker web service (free tier)
- Playwright runs natively in the Docker container (no serverless hacks)
- 100-minute response timeout (plenty for scraping)
- Container sleeps after 15 min inactivity (~30s cold start)
- `Dockerfile` + `render.yaml` define the deployment config
- `next.config.ts` uses `output: 'standalone'` for Docker builds

## Conventions
- Use Bun for all package management (`bun add`, `bun dev`, `bun run build`)
- All code in TypeScript, strict mode
- Use tRPC for all API communication (no raw fetch calls)
- Tailwind utility classes for styling (no CSS modules)
- File naming: PascalCase for components, camelCase for utilities

## Agent Team Setup

This project is built using **Claude Code Agent Teams** — multiple Claude Code
instances coordinating via shared tasks and messaging.

### Prerequisites

**tmux is required for split-pane mode.** Claude Code agent teams can display
teammates in two ways:
- **In-process**: all agents in one terminal, switch with Shift+Up/Down (works anywhere)
- **Split panes**: each agent gets its own tmux pane so you can see all agents working
  simultaneously, and click into any pane to interact directly

Split-pane mode only activates if Claude Code detects it is running **inside a
tmux session**. Claude Code creates the panes automatically — you just need to
start tmux first. If you are NOT in tmux, it falls back to in-process mode.

**One-time setup** — add to `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "tmux",
  "permissions": {
    "allow": [
      "Bash(bun *)",
      "Bash(bunx *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(curl *)",
      "Bash(mkdir *)",
      "Bash(touch *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(docker *)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep"
    ]
  }
}
```

This does three things:
1. Enables the experimental agent teams feature
2. Sets display to tmux split panes
3. **Pre-approves common tool permissions** — this is critical for agent teams.
   Without it, every file edit and shell command triggers a permission prompt
   that bubbles up to the lead agent, creating massive friction. The list above
   covers all safe operations the agents need.

### MCP Servers (Browser Preview)

The project includes a `.mcp.json` that configures **Chrome DevTools MCP** for
all agents. This lets the frontend agent (and others) open a browser, navigate
to `localhost:3000`, take screenshots, read console errors, and inspect the DOM.

All teammates automatically inherit MCP servers from the project's `.mcp.json`.

Key tools available via Chrome DevTools MCP:
- `take_screenshot` — capture what the page looks like
- `navigate_page` — go to a URL (e.g., `http://localhost:3000`)
- `list_console_messages` — read browser console errors/warnings
- `evaluate_script` — run JavaScript in the browser
- `click`, `fill` — interact with page elements
- `list_network_requests` — inspect API calls

### Model Selection

To save tokens (and money), you can use Sonnet for teammate agents while keeping
Opus for the lead. Specify this in the launch prompt:
```
Use Sonnet for each teammate.
```
Sonnet is faster and cheaper. Opus is only needed for the lead's coordination.

### Team Structure
| Agent | Role | Owns |
|-------|------|------|
| **Lead** | Orchestrator (delegate mode, Opus) | Coordination only |
| **backend-agent** | tRPC API, Playwright scraper, cache (Sonnet) | `src/server/`, `src/scraper/`, `data/` |
| **frontend-agent** | React UI, search, chart, styling (Sonnet) | `src/app/` (not api/), `src/components/`, `src/hooks/` |
| **deployment-agent** | Docker, Render.com, deploys (Sonnet) | `Dockerfile`, `render.yaml`, `next.config.ts` |

### Agent Rules
- Each agent owns specific directories — **do NOT modify files you don't own**
- If you need a change in another agent's files, **message them via the team**
- Coordinate `package.json` changes — message the lead before adding dependencies
- **Ask for human input** when stuck, unsure, or need auth (Render login, GitHub push)
- Read `plans/00-ARCHITECTURE.md` first for full context
- Read your specific plan file (`plans/02-BACKEND-AGENT.md`, etc.) for detailed instructions
- Aim for **5-6 tasks per agent** — small enough to deliver, big enough to be meaningful
- Use **Ctrl+T** to toggle the shared task list view

### Quality Gates (Hooks)

The project uses hooks to enforce quality before agents stop working. These are
configured in `.claude/settings.json` (project-level):

- **TaskCompleted hook**: Runs `bun run build` before any task can be marked done.
  If the build fails, the task stays open and the agent gets the error as feedback.
- **TeammateIdle hook**: When an agent tries to go idle, checks that no TypeScript
  errors remain. If there are errors, the agent continues working.

See `plans/00-ARCHITECTURE.md` for the hook configuration.

### How to Launch the Team

```bash
# Step 1: Start a tmux session (REQUIRED for split panes)
tmux new -s imdb

# Step 2: Inside tmux, navigate to the project and launch Claude Code
cd /Users/markus/Code/imdb-actor-ratings
claude

# Step 3: Paste the launch prompt from plans/01-LEAD-AGENT.md
#         Claude will automatically create split panes for each teammate

# Step 4: After team spawns, press Shift+Tab to enter delegate mode
#         This restricts the lead to coordination only (no code writing)
```

**What happens when you launch:**
1. You paste the prompt → Claude (lead) reads the plan files
2. Claude spawns 3 teammates → tmux automatically splits into 4 panes
   (1 lead + 3 teammates), each with its own Claude Code session
3. You can see all agents working simultaneously in their own panes
4. Click into any pane to interact with that agent directly
5. The lead coordinates via the shared task list and messaging

See `plans/01-LEAD-AGENT.md` for the full launch prompt.

### Communication
- Lead creates tasks → agents claim and work on them
- Agents message each other for cross-cutting concerns (e.g., API changes)
- Backend notifies frontend when tRPC types are ready
- Deployment agent asks human to handle Render.com auth steps
- Click into any tmux pane to talk to that agent directly
- Shift+Up/Down also works to cycle between agent views
- Ctrl+T toggles the shared task list

## Common Commands
```bash
bun dev             # Start dev server (port 3000)
bun run build       # Production build
bun run lint        # Run linter
docker build -t imdb-actor-ratings .   # Test Docker build locally
docker run -p 3000:3000 imdb-actor-ratings  # Run Docker container locally
```
