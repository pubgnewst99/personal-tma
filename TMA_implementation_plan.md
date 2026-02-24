# Implementation Plan: Personal Telegram Mini App (TMA)

A minimalist Telegram Mini App to read Markdown from VPS folders and manage `todo.md` with true bidirectional sync.

## 1) Goals

- Build a fast Telegram Mini App for internal use.
- Deploy frontend globally (Cloudflare) while keeping file access secure on VPS.
- Read Markdown content from VPS paths:
  - `~/Bacaan` (flat list)
  - `~/Ideea` (nested folders)
  - `~/todo.md` (task source of truth)
- Support YAML frontmatter tags/metadata.
- Support infinite scrolling for content lists.
- Support bidirectional `todo.md` editing:
  - Toggle in app updates file on VPS.
  - External file edits are reflected in app.

## 2) Non-Goals (v1)

- Public multi-user platform.
- Full CMS/editor for all markdown documents.
- Complex collaborative real-time conflict merging.

## 3) Source of Truth and Storage Strategy

- VPS filesystem is the primary source of truth.
- App reads/writes directly through backend APIs running on the same VPS.
- Cloudflare edge deployment is for frontend delivery and edge networking, not VPS filesystem storage.
- GitHub is optional backup/history mirror, not primary runtime storage.
  - No commit-per-checkbox-click workflow.
  - Optional scheduled sync to private repo for audit/rollback.

## 4) Architecture

### 4.1 Frontend

- Next.js (App Router) UI for Telegram Mini App.
- Tailwind CSS for styling.
- Markdown renderer:
  - `remark-gfm`
  - `remark-frontmatter`
  - `gray-matter` for metadata parsing

### 4.2 Backend (same VPS)

- Next.js Route Handlers or a small Node service (Express/Fastify) on VPS.
- Backend owns all filesystem operations:
  - Scan folders
  - Parse frontmatter
  - Read/write `todo.md`
- Client never accesses filesystem paths directly.

### 4.3 Hosting Topology (Cloudflare + VPS)

- Frontend host: Cloudflare Pages or Cloudflare Workers (Next.js adapter).
- Backend host: VPS service with direct access to `~/Bacaan`, `~/Ideea`, `~/todo.md`.
- Network path:
  - Telegram client -> Cloudflare frontend URL (HTTPS).
  - Frontend -> VPS API via Cloudflare Tunnel or restricted public origin.
- Important constraint:
  - Do not rely on Cloudflare Workers filesystem for app data persistence.
  - VPS filesystem remains canonical.

### 4.4 Internal Modules

- `lib/path-policy.ts`: path normalization + allowlist checks.
- `lib/markdown-indexer.ts`: recursive scan, metadata extraction, cursor pagination.
- `lib/todo-service.ts`: parse/toggle/write `todo.md`.
- `lib/telegram-auth.ts`: Telegram init-data verification.

## 5) Path Policy

- Canonical runtime paths (configurable via env):
  - `TMA_BACAAN_DIR=~/Bacaan`
  - `TMA_IDEA_DIR=~/Ideea`
  - `TMA_TODO_FILE=~/todo.md`
- Expand `~` to absolute home path at startup.
- Reject any path outside allowlisted roots.
- Resolve symlinks and block traversal (`../`) escapes.

## 6) Security Model

- Verify Telegram `initData` signature on session bootstrap.
- Create short-lived server session token after verification.
- Require auth token for all API read/write endpoints.
- Restrict API CORS to frontend origin (for example `https://app.yourdomain.com`).
- Enforce origin allowlist for browser requests.
- Rate limit mutating endpoints (`todo` writes).
- Add audit logs for write events:
  - timestamp
  - user id
  - changed line/item
- Enforce strict input validation for all query/body fields.

## 7) Data and Metadata Model

### 7.1 Frontmatter Schema (v1)

Supported fields:
- `title: string`
- `date: string` (ISO preferred)
- `tags: string[]`
- `summary: string`
- `draft: boolean`

Fallbacks when missing:
- `title` from first `#` heading, else filename.
- `summary` from first paragraph snippet.
- `date` from file mtime.
- `tags` defaults to `[]`.

### 7.2 Content Item Shape

- `id` (stable hash from full path)
- `source` (`bacaan` | `idea`)
- `path` (relative to source root)
- `title`
- `summary`
- `date`
- `tags`
- `readTime`
- `folder` (for Idea grouping)
- `updatedAt`

## 8) API Contract (v1)

### 8.1 Auth

- `POST /api/auth/telegram`
  - body: `{ initData: string }`
  - verifies Telegram payload
  - returns session token

### 8.2 Content Lists

- `GET /api/content?source=bacaan|idea&cursor=<opaque>&limit=20&tag=<optional>&q=<optional>`
  - sorted by `date desc`, fallback `updatedAt desc`
  - returns:
    - `items: ContentItem[]`
    - `nextCursor: string | null`

### 8.3 Content Detail

- `GET /api/content/:id`
  - returns markdown body + parsed metadata.

### 8.4 Todo Read

- `GET /api/todo`
  - returns:
    - `raw: string`
    - `parsed: TodoLine[]`
    - `revision: string` (etag/hash/mtime token)

### 8.5 Todo Toggle (interactive mode)

- `PATCH /api/todo/toggle`
  - body:
    - `lineIndex: number`
    - `checked: boolean`
    - `revision: string`
  - behavior:
    - validates revision (optimistic concurrency)
    - toggles only target checkbox token
    - preserves other formatting
  - returns updated `raw`, `parsed`, `revision`.

### 8.6 Todo Save Raw (raw mode)

- `PUT /api/todo/raw`
  - body:
    - `raw: string`
    - `revision: string`
  - behavior:
    - validates revision
    - writes full file
  - returns new `revision`.

### 8.7 Health

- `GET /api/health`
  - returns service status and path-policy readiness.
  - used by deployment and uptime checks.

## 9) Infinite Scroll Design

- Cursor-based pagination (no offset pagination).
- Cursor encodes sortable fields (`date`, `id`) for stable ordering.
- Deduplicate by `id` on client merge.
- Stop condition: `nextCursor = null`.
- Load states:
  - initial skeleton
  - append spinner
  - retry row on error

## 10) Todo Bidirectional Sync Rules

- Parser recognizes GFM task items:
  - `- [ ] task`
  - `- [x] task`
  - supports indented nested tasks.
- Preserve:
  - non-task lines
  - heading blocks
  - blank lines
  - line ending style (`LF` / `CRLF`)
- Conflict handling:
  - if revision mismatch, return `409`
  - UI prompts reload/merge choice
- Polling/WebSocket:
  - v1: lightweight polling every 10-20s on Todo screen
  - optional v2: websocket push updates

## 11) Telegram Mini App Integration

- Bot launch wiring:
  - Set bot menu button via `@BotFather /setmenubutton` or Bot API `setChatMenuButton`.
  - Use `MenuButtonWebApp` URL with production HTTPS frontend URL.
- Web app bootstrap:
  - Include Telegram WebApp SDK (`telegram-web-app.js`).
  - Call `Telegram.WebApp.ready()` on app init.
  - Call `Telegram.WebApp.expand()` for better initial viewport usage.
- Auth flow:
  - Read `Telegram.WebApp.initData`.
  - Send to `POST /api/auth/telegram`.
  - Store short-lived session token for API calls.
- Sync theme using Telegram theme params -> CSS variables.
- Use Telegram viewport/safe-area values for layout.
- Wire BackButton to app routing on detail views.
- Keep Mini App URL directly reachable over HTTPS (no login wall before Telegram load).
- Optional:
  - haptic feedback on task toggle
  - MainButton for raw-save mode

## 12) UI/UX Notes

- Keep minimalist documentation style.
- Use one accent color per screen.
- Ensure accessible contrast for Telegram light/dark themes.
- Use explicit empty states:
  - no files
  - filtered no-match
  - failed fetch
- Show inline error at action point (especially todo writes).

## 13) Implementation Phases

### Phase 1: Foundation

- Scaffold Next.js app and shared UI shell.
- Add Telegram auth bootstrap and session handling.
- Configure bot menu button to point to production Mini App URL.
- Add Cloudflare frontend deploy + VPS API connectivity.
- Implement path policy and env-based roots.

### Phase 2: Content Pipeline

- Build indexer for Bacaan + Ideea.
- Parse frontmatter and compute metadata.
- Ship list/detail endpoints and list/detail UI.

### Phase 3: Todo Sync

- Implement todo parser + revision model.
- Add toggle endpoint + raw save endpoint.
- Add interactive/raw editor modes in UI.

### Phase 4: Hardening

- Add caching, rate limiting, and structured logging.
- Add conflict UX and retry flows.
- Add regression tests and deploy checklist.

## 14) Testing and Verification

### 14.1 Automated Tests

- Unit:
  - frontmatter parser fallback behavior
  - path traversal rejection
  - todo parser/toggle round-trip
  - revision conflict handling
- Integration:
  - list pagination and cursor correctness
  - content detail load by id
  - todo toggle persistence to disk
- E2E:
  - Bacaan -> Article navigation
  - Idea folder expansion + article open
  - toggle task and verify persisted state after refresh

### 14.2 Manual Checklist

- Telegram mobile + desktop theme sync.
- Safe area spacing at bottom nav and sticky header.
- Infinite scroll end-of-list and error retry.
- External manual edit to `todo.md` reflected in app.
- Frontmatter tags visible and filterable.

## 15) Deployment

- Preferred deployment mode:
  - Frontend on Cloudflare (Pages/Workers) with custom domain `app.<domain>`.
  - Backend on VPS for filesystem access.
  - Optional Cloudflare Tunnel from VPS for origin protection.
- Alternative mode:
  - Frontend + backend both on VPS behind Cloudflare proxy.
- Reverse proxy on VPS with Nginx/Caddy for backend service.
- Environment variables:
  - `TMA_FRONTEND_ORIGIN`
  - `TMA_API_BASE_URL`
  - `TMA_BACAAN_DIR`
  - `TMA_IDEA_DIR`
  - `TMA_TODO_FILE`
  - `TELEGRAM_BOT_TOKEN`
  - `SESSION_SECRET`
- Telegram config:
  - bot menu button WebApp URL set to frontend production URL.
- Add service manager (systemd/pm2) and log rotation.
- Add backup job for content and `todo.md`.

## 16) Open Decisions to Confirm

- Confirm final folder name: `~/Ideea` vs `~/Idea`.
- Decide polling interval for todo live updates.
- Decide whether to enable optional GitHub mirror in v1.
- Decide Cloudflare Tunnel vs direct restricted VPS API exposure.
