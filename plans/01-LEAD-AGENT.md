# Lead Agent (Orchestrator) Plan

## Role

You are the team lead. You coordinate three teammates: `backend-agent`,
`frontend-agent`, and `deployment-agent`. You do NOT write code yourself.
Use **delegate mode** (Shift+Tab after spawning the team).

## How tmux Split Panes Work

You MUST be inside a tmux session before running `claude`. When you are,
Claude Code automatically creates a new tmux pane for each teammate it spawns.
You end up with 4 panes (1 lead + 3 teammates), all visible simultaneously.

If you're NOT in tmux, agents still work but share one terminal (in-process mode).

Ensure `~/.claude/settings.json` has the full config from CLAUDE.md, including:
```json
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "teammateMode": "tmux",
  "permissions": { "allow": ["Bash(bun *)", "Bash(bunx *)", "...see CLAUDE.md..."] }
}
```

The **permissions pre-approval** is critical. Without it, every file write and
shell command triggers a permission dialog that bubbles up to the lead, creating
constant interruptions. See CLAUDE.md for the full permissions list.

## Launch Prompt

Start tmux (`tmux new -s imdb`), run `claude`, then paste this:

```
Create an agent team with split panes (tmux) for building an IMDb actor ratings
website. Read the plans in ./plans/ for full context. Read CLAUDE.md for the
full project setup including MCP servers and permissions.

Spawn 3 teammates. Use Sonnet for each teammate to save tokens:

1. **backend-agent**: Owns src/server/, src/scraper/, and API setup.
   Prompt: "You are the backend agent. Read plans/02-BACKEND-AGENT.md for your
   full instructions. You own all files in src/server/ and src/scraper/.
   Start by reading plans/00-ARCHITECTURE.md for context."

2. **frontend-agent**: Owns src/app/, src/components/, src/hooks/, and styles.
   Prompt: "You are the frontend agent. Read plans/03-FRONTEND-AGENT.md for your
   full instructions. You own all files in src/app/, src/components/, src/hooks/.
   Start by reading plans/00-ARCHITECTURE.md for context. You have access to
   Chrome DevTools MCP — use take_screenshot and navigate_page to visually
   verify your UI work at http://localhost:3000."

3. **deployment-agent**: Owns Dockerfile, render.yaml, next.config.ts, and deployment.
   Prompt: "You are the deployment agent. Read plans/04-DEPLOYMENT-AGENT.md for
   your full instructions. You own Dockerfile, render.yaml, next.config.ts, and deployment.
   Start by reading plans/00-ARCHITECTURE.md for context. Walk through every
   deployment step with the human — ask for input before each major action."

Task ordering:
- backend-agent starts FIRST with project scaffolding and tRPC types
- frontend-agent starts UI work after backend has tRPC types committed
- deployment-agent starts after both have initial working code
- All agents should ask for human input if stuck or unsure
- Aim for 5-6 tasks per agent

Use delegate mode - I will only coordinate, not write code.
Wait for all teammates to finish before declaring the team done.
```

## Coordination Responsibilities

### Phase 1: Scaffolding
- Tell `backend-agent` to start with project init + tRPC setup
- Wait for backend to commit initial types before unblocking frontend
- Message `frontend-agent`: "tRPC types are ready in src/server/router.ts, you can start"

### Phase 2: Parallel Development
- Monitor both `backend-agent` (scraper) and `frontend-agent` (UI) working in parallel
- If backend changes API shape, message frontend: "API changed: [describe change]"
- If frontend needs a new endpoint, relay to backend
- Remind frontend-agent to use Chrome DevTools MCP to screenshot their work
- Use **Ctrl+T** to check the shared task list regularly

### Phase 3: Integration
- Tell `deployment-agent` to start Dockerfile + Render.com configuration
- Have deployment-agent verify the Docker build works locally
- Coordinate: deployment-agent should message backend-agent if build fails

### Phase 4: Deploy & Verify
- `deployment-agent` walks the human through Render.com setup step by step
- All agents verify their parts work in production
- Frontend-agent screenshots the production URL to confirm it works
- Fix any issues that arise

## Tips from the Docs

- If the lead starts implementing tasks itself, tell it: "Wait for your
  teammates to complete their tasks before proceeding"
- If tasks seem stuck, check if a teammate forgot to mark them complete —
  nudge the teammate or update the status manually
- Use `broadcast` sparingly (costs tokens for every teammate)
- Use `message` for targeted agent-to-agent communication
- When done, tell the lead to "clean up the team" — shut down all teammates
  first, then clean up team resources

## When to Ask Human

- If any agent is stuck for more than 2 failed attempts
- If there's a design decision not covered in the architecture doc
- If IMDb's page structure has changed and scraping doesn't work
- If Render.com deployment has permission/auth issues
- Before the first production deploy
