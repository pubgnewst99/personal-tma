# Personal TMA: Complete Project Documentation

## 1. Project Summary

`personal-tma` is a Telegram Mini App for personal knowledge and task management.

It combines four user-facing capabilities:

- Read markdown from `Bacaan` and `Idea` directories.
- View content detail pages with markdown rendering and syntax highlighting.
- Manage tasks from a filesystem `todo.md` file with bidirectional sync.
- See a unified activity feed combining content changes, todo events, and GitHub stars.

The system is designed to run in two environments:

- Local/VPS Node runtime with direct filesystem access.
- Cloudflare Worker runtime (OpenNext) with fallback/proxy behavior to a remote Node API for filesystem operations.

---

## 2. Architecture Choices and Rationale

### 2.1 Framework: Next.js App Router

Choice:

- Next.js 16 App Router for both UI and API route handlers.

Why:

- Single codebase for frontend and backend endpoints.
- Good fit for Telegram WebApp UI and client-side navigation.
- Simple deployment pipeline with OpenNext + Wrangler for Cloudflare.

Tradeoff:

- Filesystem APIs are Node-dependent and cannot execute on pure Edge-only environments.

### 2.2 Runtime Model: Explicit Node Runtime for API Handlers

Choice:

- All filesystem-backed API routes are pinned to `runtime = "nodejs"`.

Why:

- Routes import `fs`, `path`, `os` directly or indirectly.
- Prevents accidental Edge runtime breakage.

Files:

- `src/app/api/assets/route.ts`
- `src/app/api/content/route.ts`
- `src/app/api/content/[id]/route.ts`
- `src/app/api/todos/route.ts`
- `src/app/api/todos/toggle/route.ts`

Tradeoff:

- These routes require Node compatibility and local filesystem access.

### 2.3 Hybrid Cloudflare + Remote Source Strategy

Choice:

- Keep app deployed on Cloudflare (OpenNext Worker), but allow content/todo API routes to proxy to remote origin when local filesystem access is unavailable.

Why:

- Cloudflare Worker does not provide access to VPS local files (`~/Bacaan`, `~/Idea`, `~/todo.md`).
- Fallback keeps frontend functional in Cloudflare deployment.

Mechanism:

- `FEED_SOURCE_API_BASE_URL` (or `NEXT_PUBLIC_API_BASE_URL`) used as upstream.
- `canProxyToRemote()` prevents same-origin loops.
- Routes proxy payload/status/content-type from upstream when local operations fail.

Tradeoff:

- Adds network dependency and additional failure modes (upstream availability, CORS, auth, latency).

### 2.4 Content Indexing and Metadata Extraction

Choice:

- Parse markdown via `gray-matter`, with fallback metadata extraction.

Why:

- Supports frontmatter metadata while tolerating incomplete files.
- Works with mixed existing markdown conventions.

Fallbacks:

- Title: frontmatter -> first H1 -> filename.
- Date: frontmatter -> `Date Saved:` pattern -> file mtime.
- Summary: frontmatter -> first non-heading paragraph.

Optimization:

- In-memory 30-second cache in `src/lib/indexer.ts`.
- Batched file processing to reduce spikes.

### 2.5 Todo Concurrency and Section Behavior

Choice:

- Optimistic concurrency with `revision` (`mtimeMs`) and line-index-based toggling.

Why:

- Prevents silent overwrite when file is changed externally.
- Keeps implementation deterministic and lightweight.

Behavior:

- Toggling checked item moves it to `## Finished` section when present.
- Unchecking in finished section moves item back above finished section.
- Frontend hides empty project headings when all child tasks are completed.

Tradeoff:

- Line-index operations can be sensitive to concurrent structural edits.

### 2.6 Home Feed as Aggregation Layer

Choice:

- Build feed server-side by merging content updates, todo events, and GitHub stars.

Why:

- Single timeline on home tab.
- Compatible with partial source failures via warnings.

Notes:

- Todo feed events use persisted snapshot log (`.tma-feed-events.json`) when filesystem available.
- Fallback to in-memory feed history in restricted environments.

---

## 3. High-Level System Design

## 3.1 Logical Components

- UI layer: `src/app/*`, `src/components/*`
- API layer: `src/app/api/*`
- Domain services: `src/lib/indexer.ts`, `src/lib/todo-service.ts`, `src/lib/feed-service.ts`
- Security/path policy: `src/lib/path-policy.ts`, `src/lib/auth.ts`
- Client API adapter: `src/lib/api-client.ts`
- Runtime glue: `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`

### 3.2 Request/Data Flow

Local/VPS mode:

1. Client page calls `apiClient`.
2. `/api/*` route executes in Node runtime.
3. Service accesses local filesystem.
4. Response returned as JSON/content bytes.

Cloudflare mode (filesystem unavailable):

1. Client calls same `/api/*` route on Worker origin.
2. Route attempts local service; on failure checks remote fallback eligibility.
3. Route proxies request to `FEED_SOURCE_API_BASE_URL`.
4. Worker returns upstream payload/status to client.

### 3.3 Navigation Model

Bottom tab navigation:

- Home (`/`) = unified feed.
- Bacaan (`/bacaan`) = reading list.
- Idea (`/idea`) = grouped notes.
- Todos (`/todos`) = task board.

---

## 4. Directory and Module Reference

`src/app`

- `page.tsx`: Home feed UI.
- `bacaan/page.tsx`: list with tag chips, search, sorting.
- `idea/page.tsx`: grouped list by folder with filtering/search.
- `content/[id]/page.tsx`: markdown detail renderer.
- `todos/page.tsx`: todo screen shell.
- `api/*`: route handlers.

`src/components`

- `Navigation.tsx`: fixed bottom tab bar.
- `FileCard.tsx`: card UI for content item.
- `TodoList.tsx`: task rendering, toggle UX, finished section handling.

`src/lib`

- `api-client.ts`: browser/client fetch wrapper and response normalization.
- `indexer.ts`: markdown indexing + detail retrieval.
- `todo-service.ts`: parse/toggle/save todo file.
- `feed-service.ts`: unified feed synthesis and source fallback.
- `path-policy.ts`: allowlist path validation.
- `auth.ts`: Telegram init-data verification helper.

---

## 5. Data Model

### 5.1 Content

`ContentMetadata`

- `id`: base64url of absolute file path.
- `source`: `bacaan | idea`.
- `path`: relative file path to source root.
- `title`, `date`, `tags`, `summary`, `updatedAt`, `folder`, `readingTime`.

`ContentItem`

- `metadata` + raw markdown `content`.

### 5.2 Todo

`TodoNode`

- `type`: `item | heading`.
- `id`: line index in file.
- `text`, and optional `checked`, `indent`, `level`.

`TodoState`

- `raw`: full file string.
- `parsed`: parsed nodes.
- `revision`: mtime-based concurrency token.

### 5.3 Feed

`FeedItem`

- `source`: `bacaan | idea | todo | github`.
- `type`: `content_updated | todo_added | todo_completed | github_starred`.
- `title`, optional `subtitle`, `timestamp`, optional metadata links.

`FeedResponse`

- `items`, `warnings`, `generatedAt`.

---

## 6. API Design

### `GET /api/content?source=bacaan|idea`

- Returns list of `ContentMetadata`.
- Local-first; remote proxy fallback if configured.
- Graceful degrade: returns empty list + warning header on local failure.

### `GET /api/content/:id`

- Returns `ContentItem` for specific markdown file.
- Local-first; remote proxy fallback.

### `GET /api/assets?path=...&source=bacaan|idea`

- Reads and serves binary asset from allowed source root.
- Validates file path via allowlist.

### `GET /api/todos`

- Returns `TodoState`.
- Local-first; remote proxy fallback.

### `PATCH /api/todos/toggle`

- Body: `{ id, checked, revision }`.
- Performs optimistic-concurrency guarded update.
- Local-first; remote proxy fallback.

### `GET /api/feed`

- Returns merged `FeedResponse` with warnings for partial source failures.

---

## 7. Configuration and Environment

### 7.1 App/Backend Variables

- `TMA_BACAAN_DIR`: source directory for Bacaan markdown.
- `TMA_IDEA_DIR`: source directory for Idea markdown.
- `TMA_TODO_FILE`: absolute path to todo markdown file.
- `TMA_FEED_LOG_FILE`: optional persisted todo event log path.
- `NEXT_PUBLIC_API_BASE_URL`: optional upstream base URL.
- `FEED_SOURCE_API_BASE_URL`: preferred upstream base for server-side fallback.

### 7.2 GitHub Feed Variables

- `GITHUB_TOKEN`: token for GitHub API reliability/rate limits.
- `GITHUB_USERNAME`: account used for stars feed.
- `GITHUB_STARS_LIMIT`: max starred repos to read.

### 7.3 Cloudflare/Wrangler Configuration

- Worker entrypoint: `.open-next/worker.js`
- Static assets binding: `ASSETS`
- Compatibility flag: `nodejs_compat`
- Config source of truth: `wrangler.jsonc`

Secrets and vars management:

- Use Wrangler CLI for runtime config.
- Example: `wrangler secret put GITHUB_TOKEN`

---

## 8. Security and Reliability Design

Implemented controls:

- Path allowlist validation to block traversal (`validatePath`).
- Content-type validation and normalized API error extraction in client.
- Optimistic concurrency for todo writes.
- Fallback strategy for remote source unavailability.

Partially implemented / gap:

- `verifyTelegramAuth` helper exists but is not enforced by middleware/routes yet.
- CORS middleware currently uses `Access-Control-Allow-Origin: *` and should be tightened for production.
- GitHub fallback username exists in code and should be explicitly configured per environment.

---

## 9. Development Bug Log and Resolutions

This section documents notable bugs observed in development history and how they were fixed.

| Commit | Problem | Root Cause | Resolution |
|---|---|---|---|
| `6fe241a` | API routes failed in Cloudflare/Edge builds | Filesystem APIs were executed under incompatible runtime assumptions | Forced Node runtime for filesystem-backed API routes |
| `e809843` | `/api/feed` failed in Cloudflare environment | Feed depended on local FS-only sources | Added remote source fallback path |
| `093ecde` | Content list/detail failed when local source unavailable | No upstream fallback behavior in content routes | Added remote fallback proxy for content APIs |
| `fe985c0` | Todos API unavailable outside local FS context | Todo endpoints had no remote fallback | Added remote fallback for todos APIs |
| `8583e4b` | Browser calls failed due to stale external base URL | Client fetch builder preferred external base in browser | Forced same-origin API path in browser |
| `b43e03e` | Bacaan/Idea list page fully failed on upstream/local errors | Hard failure in list API response | Degraded list API to return empty collection + warning |
| `a2ccb8a` | Content page runtime crash | Client route param handling mismatch | Switched to `useParams` in client content page |
| `7c25758` | Markdown images broken | Relative image links unresolved in app context | Added `/api/assets` serving + markdown image URL rewrite |
| `dd7c0d8` | Invalid date rendering and tag mismatch | Inconsistent metadata parsing (`tags` vs `labels`) | Normalized tags and date handling |
| `b32bd68` | Bacaan page build/runtime issue in App Router | Missing required Suspense boundary around search params usage | Added Suspense wrapper |
| `e835c86` | Idea sorting not respected in folder order | Sorting logic only applied inside folder, not folder groups | Reordered folders by selected sort mode |
| `c2194bf` | API error UX degraded and Todos tab regression | Combined navigation/API refactor introduced regressions | Fixed API errors and restored dedicated Todos tab |
| `03a6b88` / `058df58` | Markdown output lacked expected formatting/features | Renderer pipeline did not include desired plugins/styles | Added GFM, highlight, and GitHub markdown style |
| `01e0d84` / `7f6b56e` / `ad98a4f` | Todo section behavior inconsistent (movement, visibility) | Heading and section render logic did not match movement rules | Corrected move behavior, finished rendering, and hide-empty-heading logic |
| `c357566` | Feed showed only one tag per content activity | Subtitle builder used first tag only | Changed feed subtitle to include all content tags |
| `0dfc2fa` / `dbe425b` / `eb69375` / `35ba2bb` | GitHub feed config instability across environments | Runtime variable/secret handling inconsistency during deployment | Standardized Wrangler vars+secrets strategy and username fallback |
| `78b3455` | Deployment build failure due to component mode mismatch | Pages needing hooks were not client components | Converted required pages to client components |
| `1e62f82` | Multiple UI and state handling regressions | Rapid iteration introduced nav/filter/accessibility gaps | Consolidated and fixed UI logic/accessibility/todo error paths |

### 9.1 Incident: Cloudflare Runtime/Env Failures Before Final Fix

This incident remained unstable during several iterations and was only fully resolved after standardizing Wrangler-managed runtime configuration.

Symptoms observed during development:

- Worker deploy/build appeared successful but runtime feed/API behavior was inconsistent.
- GitHub stars source intermittently failed due to missing/incorrect runtime vars.
- Non-interactive deployment sessions failed when required Cloudflare auth/env was not present.

Why it happened:

- Runtime config drift between local assumptions and Cloudflare Worker runtime variables/secrets.
- Repeated changes to how GitHub username/token were injected created inconsistent state.
- Relying on dashboard/manual state instead of a single CLI-managed source of truth increased mismatch risk.

Timeline (relevant commits):

- `0dfc2fa`: Persist GitHub username in Wrangler runtime vars.
- `dbe425b`: Remove GitHub username from Wrangler config (rollback attempt).
- `eb69375`: Add runtime fallback username to reduce immediate breakage.
- `35ba2bb`: Reintroduce Wrangler vars strategy with explicit secret handling note.

Final stabilization approach:

- Treat Wrangler config/secrets as source of truth for runtime env.
- Provision secrets explicitly via CLI, e.g. `wrangler secret put GITHUB_TOKEN`.
- Keep non-secret runtime vars declared in `wrangler.jsonc` or set via Wrangler CLI.
- Validate deploy path in non-interactive mode using token-based auth (`CLOUDFLARE_API_TOKEN`).

--- 

## 10. Deployment Design

### 10.1 Build and Deploy Pipeline

- Build command: `next build` (wrapped by OpenNext for Worker bundle).
- Cloudflare build/deploy scripts:
  - `npm run preview`
  - `npm run deploy`

### 10.2 Worker Requirements

- Must have `.open-next/worker.js` generated before deploy.
- Wrangler auth required in CI/non-interactive shells via `CLOUDFLARE_API_TOKEN`.
- Secrets should be provisioned with Wrangler (`wrangler secret put ...`).

### 10.3 Recommended Topologies

Option A (current practical model):

- Cloudflare Worker serves UI and stateless APIs.
- Remote VPS API owns filesystem read/write.
- Worker routes proxy on failure/unavailability.

Option B (future full-Cloudflare):

- Migrate data from local filesystem to R2/D1/KV.
- Remove dependency on VPS filesystem paths.

---

## 11. Operational Runbook

### Local Development

1. Set `.env.local` with source paths and optional API base vars.
2. Run `npm install`.
3. Run `npm run dev`.

### Cloudflare Deployment

1. Ensure Wrangler login/token is configured.
2. Set secrets/vars:
   - `wrangler secret put GITHUB_TOKEN`
   - `wrangler secret put TELEGRAM_BOT_TOKEN` (if auth enforcement is added)
   - Configure `GITHUB_USERNAME`, `FEED_SOURCE_API_BASE_URL`, etc.
3. Run `npm run deploy`.

### Validation Checklist

- Home feed loads with warnings but no hard crash.
- Bacaan and Idea lists open and search/filter work.
- Content detail renders markdown and images.
- Todo toggle updates with conflict handling.
- API routes return expected JSON/content types.

---

## 12. Known Technical Debt and Next Improvements

- Enforce Telegram init-data verification on all mutating/read APIs.
- Tighten CORS allowlist for production origins.
- Replace deprecated `middleware` convention with Next.js `proxy` convention.
- Add automated tests for:
  - todo move/revision logic
  - remote fallback behavior
  - feed aggregation correctness
- Replace hardcoded GitHub username fallback with environment-only requirement.

---

## 13. Key Files (Quick Index)

- `src/lib/indexer.ts`
- `src/lib/todo-service.ts`
- `src/lib/feed-service.ts`
- `src/lib/path-policy.ts`
- `src/lib/api-client.ts`
- `src/app/api/content/route.ts`
- `src/app/api/content/[id]/route.ts`
- `src/app/api/todos/route.ts`
- `src/app/api/todos/toggle/route.ts`
- `src/app/api/feed/route.ts`
- `src/components/TodoList.tsx`
- `wrangler.jsonc`
- `next.config.ts`
