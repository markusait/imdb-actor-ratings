# Deployment Status Report

**Date:** 2026-02-16
**URL:** https://imdb-actor-ratings.onrender.com
**Status:** 502 Bad Gateway ❌

## What's Been Checked

### ✅ Local Configuration
- **Dockerfile**: Correct (Python3, cinemagoer, Next.js standalone)
- **render.yaml**: Properly configured (port 3000, health check on `/`)
- **next.config.ts**: Has `output: 'standalone'` for Docker
- **Python scripts**: Present in `scripts/` with proper shebangs
- **Python path**: Fixed in commit `52def23` to use `python3` in production
- **Git status**: Latest code pushed to GitHub (commit `4baeaca`)

### ✅ Recent Fixes Applied
- `52def23`: Fixed Python path for production (was causing 502)
- `533b810`: Fixed pip install with `--break-system-packages` flag
- `d2b08e2`: Fixed Next.js standalone build (copy static assets)

## Possible Causes

Since configuration is correct and previous fixes are applied, the 502 indicates:

1. **Render hasn't redeployed** - Auto-deploy might not be enabled, or the latest commit hasn't triggered a rebuild
2. **Build failing on Render** - Something failing during `bun install`, `playwright install`, or `pip install`
3. **Container crashing on startup** - Python import errors, missing dependencies, or permission issues
4. **Memory limit exceeded** - Free tier has 512MB limit, Playwright+Chromium use ~300-400MB
5. **Health check timing out** - App takes too long to start, Render marks it as unhealthy

## Debugging with Render MCP (no dashboard needed)

This project has **Render MCP** configured in `.mcp.json`. In Cursor you can use the MCP tools to inspect logs and deploys without opening the dashboard.

### 1. Get your service ID
- Use the **`list_services`** tool (Render MCP). It lists all services; find `imdb-actor-ratings` and note its `serviceId`.

### 2. Check deployment history
- **`list_deploys`** with `serviceId: "<your-service-id>"` — see whether the latest deploy succeeded or failed.

### 3. Fetch logs (even when dashboard shows “no logs”)
- **`list_logs`** with `resource: ["srv-<your-service-id>"]` (use the full resource ID Render uses for logs).
- Optional filters: `level: ["error"]`, `type: ["build","deploy","runtime"]`, `limit: 50`, `startTime` / `endTime` in RFC3339.

### 4. Get deploy details
- **`get_deploy`** with `serviceId` and `deployId` from `list_deploys` — build output and status.

### 5. Optional: PORT mismatch
- Render’s default is **PORT=10000**. We set **PORT=3000** in `render.yaml`. If Render overwrites env vars, the app could listen on 3000 while the proxy expects 10000 → 502. If MCP logs show the app starting but no requests, try removing the PORT override from `render.yaml` so the app uses Render’s injected PORT.

---

## Next Steps Required (dashboard)

If you prefer the dashboard:
- [ ] Is auto-deploy enabled? If not, manually trigger deploy
- [ ] Check build logs: Did all install steps succeed?
- [ ] Check container logs: Any startup errors or crashes?
- [ ] Check memory usage: Is it hitting 512MB limit?
- [ ] Check deployment status: What does Render show?

**Dashboard URL:** https://dashboard.render.com/

## Technical Details

- **Repository:** https://github.com/markusait/imdb-actor-ratings
- **Branch:** main
- **Latest commit:** 4baeaca (Add Render MCP server)
- **Docker working directory:** `/app/.next/standalone`
- **Server command:** `node server.js`
- **Expected port:** 3000 (set via PORT env var)
