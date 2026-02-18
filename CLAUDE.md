# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Start Vite dev server on port 5173
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint (max-warnings 0 — zero warnings allowed)
```

### Backend (`backend/`)
```bash
npm run dev       # ts-node-dev with auto-respawn on port 3001
npm run build     # TypeScript compile to /dist
npm run start     # Run compiled /dist output
npm run lint      # ESLint on TypeScript files
npm run test      # Jest
```

Both services must run simultaneously for local development. The frontend proxies `/api/*` to `localhost:3001` via Vite config.

## Architecture

This is a full-stack NBA statistics app split into `frontend/` (React/Vite) and `backend/` (Express) directories. There is also a mostly inactive root-level Vite config and a `server/` directory — the canonical code lives in `frontend/src/` and `backend/src/`.

### Data Flow
1. Frontend (port 5173) calls `/api/*` endpoints via axios
2. Vite dev proxy forwards to backend (port 3001)
3. Backend either returns mock data or calls the **BallDontLie API** using `VITE_NBA_API_KEY` from `backend/.env`
4. React Query caches responses (5-min stale time) and drives UI state

### Backend API Routes
```
GET /api/health
GET /api/players?search=<name>
GET /api/players/:id/stats
GET /api/players/compare/:id1/:id2   # uses Promise.all for parallel fetches
```

### Frontend Structure (`frontend/src/`)
- **`pages/`** — Top-level route components: `Home`, `PlayerComparison`, `GamePredictor`, `PerformanceDashboard`
- **`components/`** — UI components grouped by domain (`players/`, `common/`, `skeletons/`, `performance/`)
- **`hooks/`** — 20+ custom hooks; data-fetching hooks wrap React Query (e.g., `usePlayerComparison`, `useSearchPlayers`)
- **`services/`** — Business logic and caching: `playerService`, `statsService`, `cacheService`, `indexedDBService`
- **`contexts/`** — React Context providers: `ThemeContext`, `AnimationProvider`, `PerformanceProvider`, `SoundContext`, `LoadingContext`
- **`config/statConfig`** — Centralized stat definitions used across charts and tables

### Key Patterns
- **React Query** is the primary data-fetching layer. Query keys follow the pattern `['players', 'search', term, page]`.
- **Caching is layered**: React Query (in-memory) → `cacheService` (in-memory) → `indexedDBService` (persistent). Service Worker provides offline support.
- **Error boundaries** wrap pages; `withErrorHandling` HOC is available for component-level fault tolerance.
- **TypeScript strict mode** is enabled on both frontend and backend. ESLint `max-warnings: 0` is enforced — lint must be clean before merging.
- **MUI v5** is the UI framework. Use Emotion-based `sx` prop or `styled()` for custom styling rather than plain CSS files.

- **Token Efficiency**: Favor short, specific file edits over full-file rewrites to preserve context window.