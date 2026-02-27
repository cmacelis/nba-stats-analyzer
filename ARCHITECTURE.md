# Architecture Overview — Ellis & the Machine

**Last Updated:** Feb 21, 2026 (Saturday 7:00 AM)  
**User:** Chuler Macelis  
**Timezone:** EST (America/New_York)

---

## 🏗️ Infrastructure

### Main Machine
- **Type:** Your development Mac (where OpenClaw is running)
- **Purpose:** Interactive work, building features, testing
- **Runs:**
  - OpenClaw session (this conversation)
  - NBA Analyzer frontend dev (`npm run dev` on port 5173)
  - Scout Mode build + test (before deployment)

### EllaMac (Always-On Server)
- **Machine:** M1 Mac mini @ 192.168.10.101
- **Status:** Setup Phase 1 complete (Feb 20, 2026)
- **Purpose:** 24/7 dedicated services (sleeps when main Mac off)
- **Runs 24/7:**
  - NBA backend API (port 3000)
  - PostgreSQL database
  - Redis cache
  - Ollama (local LLM inference)
  - Scout Mode cron crawler (5:15 PM daily)
  - Research collector job (every 6 hours)

**Setup Progress:**
- ✅ Fresh macOS installed
- ✅ Homebrew, Node@18, Git, PostgreSQL, Redis, Ollama
- ✅ NBA backend repo cloned + dependencies installed
- ✅ Database created + migrated
- ⏳ TypeScript import fixes (almost done)

**Next Checklist:**
1. Finish TypeScript fix
2. Start backend: `npm run dev`
3. Test `/health` endpoint
4. LaunchAgent auto-start setup
5. Deploy Scout Mode cron

**SSH Access:** `ssh user@192.168.10.101` (or configure in .ssh/config)

---

## 🏀 NBA Stats Analyzer

### Repo
- **Location (Main Mac):** `/Users/ellis/.openclaw/workspace/nba-analyzer`
- **Repo Name:** `cmacelis/NBA-STATS`

### Stack
- **Backend:** Node.js + TypeScript (port 3000)
- **Frontend:** React + Vite (port 5173)
- **Database:** PostgreSQL (on EllaMac)
- **Cache:** Redis (on EllaMac)
- **ML/Inference:** Python + Ollama (on EllaMac)
- **Budget:** $55/month API costs (Claude Haiku focus)

### Phase 1: Complete ✅
- User registration & login
- Player search
- Game-by-game stats display
- Season averages
- Responsive dashboard
- Data pipeline (NBA official stats API)

### Phase 2: In Progress 🚀 (Social Sentiment Research Layer)
**Completed Feb 19, 2026**

**Components:**

1. **Scraper Service** (`backend/src/services/research/scraper.ts`)
   - Fetches mentions from Reddit (public API, no auth)
   - Fetches tweets from X/Twitter (Bearer token, simulated fallback)
   - Stores mentions in `social_mentions` table

2. **Sentiment Analyzer** (`backend/src/services/research/sentiment.ts`)
   - Keyword-based scoring (positive/negative/neutral)
   - Returns sentiment score (-1 to +1) with confidence
   - Stores in `sentiment_scores` table + tracks 7d history

3. **Research Synthesizer** (`backend/src/services/research/synthesizer.ts`)
   - Claude API generates AI research reports
   - Returns OVER/UNDER/NEUTRAL predictions + confidence + reasoning
   - 24h TTL caching (fresh on next request)
   - Graceful degradation without API key

**Database Tables:**
- `social_mentions` — Raw social posts
- `sentiment_scores` — Aggregated sentiment + trends
- `research_reports` — AI-generated insights

**API Endpoints:**
- `GET /api/research/:playerName` — Get report + sentiment
- `GET /api/research/:playerName/sentiment` — Get sentiment + trend
- `GET /api/research/:playerName/mentions?hours=24` — Get raw mentions
- `POST /api/research/:playerName/refresh` — Force refresh

**Background Job:**
- Runs every 6 hours
- Tracks 10 players: Luka, LeBron, KD, Giannis, SGA, Tatum, Curry, Lillard, Jokic, AD
- Scrapes → analyzes sentiment → generates reports → stores

**Frontend:**
- `ResearchPanel` React component (`frontend/src/components/ResearchPanel.tsx`)
- Displays: prediction, confidence, sentiment breakdown, key factors
- Refresh button + loading/error states
- Ready to drop into dashboard

**Cost Estimate:**
- Claude API: ~$0.50-1.00/day
- Fits in $55/month budget
- Reddit: Free
- Twitter: Free tier (if token available, simulated otherwise)

---

## 🔍 Scout Mode (Domain Acquisition Bot)

### Purpose
Autonomous digital asset scout within NBA Analytics + AI Automation niches. Identifies underpriced "Buy It Now" .com domains under $150 for flipping or NBA Analyzer project support.

### Schedule
- **Dry Run:** 3:00 PM daily (verify Telegram connectivity)
- **Live Run:** 5:15 PM daily (production scan)
- **Deployment:** Runs on EllaMac (24/7)
- **Cron Job:** `cron('15 17 * * *')` for live, `cron('0 15 * * *')` for dry run

### Scraper Strategy (Hybrid)
1. **GoDaddy API** — Fast, accurate pricing, official source
2. **Playwright (ExpiredDomains)** — Headless browser, broader capture, bypasses UI

### Keyword Clusters

**Tier 1 (Legacy):**
- NBA, basketball, hoops, dunk, stats

**Tier 2 (Expansion):**
- Soccer: pitch, striker, VAR, gaffer
- Pickleball: pickle, dink, padel, rally
- WNBA: WNBA, herhoops, swish
- Performance: velo, bio, load, pulse

**Tier 3 (Tech Suffixes):**
- AI, bot, engine, data, analytics, metrics, predictor, oracle, IQ, pro, scout, hub, logic, tech, sense

### Golden Strings (Highest Priority)
Flag as "High Match":
- [Sport] + AI (e.g., PitchAI.com)
- [Sport] + Metrics (e.g., DinkMetrics.com)

### Filtering Rules
- **Price Cap:** $150 max
- **TLD Priority:** .com > .net > .io
- **Fuzzy Match:** 85% threshold (scale to 75% if lead volume low)
- **Bias:** Over-flag (miss noise, catch category-killers)

### Database
- **Location:** `/Users/ellis/.openclaw/workspace/scout-mode/misses.db` (SQLite)
- **Tables:**
  - `misses` — Sold/non-matching domains (trend analysis)
  - `alerts_sent` — Logged alerts (click-through optimization)

### Output
- **Delivery:** Telegram DM (instant notifications)
- **Content:** Grouped by match type (Golden, Tier 1, Tier 2)
- **Format:** Domain + Price + Source (GoDaddy/ExpiredDomains)

### Baseline Reference
- `nbaanalyticshub.com` (owned Feb 20, 2026)
- `nbaanalyticshub.net` (owned Feb 20, 2026)
- Quality baseline for new acquisitions

### Build Status
- ✅ v2.1 specs locked
- ⏳ Local build (main Mac)
- ⏳ 3:00 PM dry run
- ⏳ Deploy to EllaMac
- ⏳ 5:15 PM live production run

### Code Location (TBD)
- Backend integration: `backend/src/scout-mode/`
- Cron setup: `backend/src/jobs/scoutMode.ts`
- Local testing: `/Users/ellis/.openclaw/workspace/scout-mode/`

---

## 📊 Mission Control Dashboard

### Purpose
Real-time API cost visibility + model routing monitoring. Track token usage, spending vs $55/month budget, and per-task costs.

### Architecture

**Event Flow:**
1. **Event Emitter** (`backend/src/services/eventEmitter.ts`)
   - Captures all work: task start/end, API calls, errors
   - Batches events (max 10, every 5 seconds)
   - Posts to `/api/events` endpoint

2. **Backend Endpoint** (`backend/src/routes/events.ts`)
   - `POST /api/events` — Ingest batched events
   - `GET /api/events/summary?period=today|week|month` — Cost summary
   - `GET /api/events/tasks?limit=20&sort=cost_desc` — Task breakdown

3. **Database** (PostgreSQL on EllaMac)
   - `events` — Raw logs (timestamp, type, tokens, cost)
   - `task_costs` — Per-task breakdown
   - `sessions` — Session totals
   - Data retention: 30 days (auto-cleanup)

4. **Frontend Dashboard** (`frontend/src/pages/Dashboard.tsx`)
   - React components: CostSummary, CostBreakdown, TaskTable
   - Uses React Query (polls every 5-10s)
   - Auto-refreshing charts + tables

### Database Tables

```sql
events — Raw logs
├── id, timestamp, event_type (task_start/end/api_call/error)
├── session_key, task_id, task_name
├── model, status (success/failed)
├── estimated_tokens, actual_tokens, cost_usd, duration_ms
└── metadata (JSONB)

task_costs — Per-task summary
├── task_id, task_name, model, session_key
├── tokens_used, cost_usd, duration_ms, status
└── completed_at

sessions — Active/completed sessions
├── session_key, name, status (active/idle/completed)
├── total_cost_usd, total_tasks
├── started_at, ended_at
└── (auto-tracked by event emitter)

cost_summaries — Pre-computed aggregates (optional, for perf)
├── period (today/week/month)
├── date_start, date_end
├── total_cost_usd, total_tasks, total_tokens
└── breakdown (JSONB: {haiku: 0.50, sonnet: 1.20, ...})
```

### Frontend Components

1. **CostSummary** — Big number display
   - Today's spend vs $55 budget
   - Budget remaining + % used
   - Progress bar (red if >75%)

2. **CostBreakdown** — Pie chart
   - Cost by model (Haiku %, Sonnet %, etc.)
   - Ranked by spend

3. **TaskTable** — Sortable list
   - Task name, model, cost, tokens, duration, status
   - Sort by: cost, duration, recent
   - Top 20 tasks displayed

4. **Period Selector** — Today / Week / Month
   - Button tabs to switch time ranges

### API Endpoints

```
POST /api/events
├── Headers: x-api-key: <EVENT_API_KEY>
├── Body: [event1, event2, ...] (batch)
└── Response: {inserted: N, totalCostUSD: X, ids: [...]}

GET /api/events/summary?period=today|week|month
└── Response: {period, totalCost, budgetRemaining, totalTasks, totalTokens, uniqueModels}

GET /api/events/tasks?limit=20&sort=cost_desc|duration_desc|recent
└── Response: [{task_id, task_name, model, tokens_used, cost_usd, duration_ms, status, completed_at}, ...]
```

### Environment Variables
```
EVENT_API_KEY=your_secret_key_here
EVENT_API_URL=http://localhost:3000/api/events
ANTHROPIC_API_KEY=your_key_here
REACT_APP_API_URL=http://localhost:3000/api
```

### Build Status
- ✅ Database schema designed
- ✅ Backend endpoint code written
- ✅ Frontend components written
- ⏳ Integration into NBA backend (add routes + event emitter)
- ⏳ Testing (test flow with dummy events)
- ⏳ Deploy to EllaMac

---

## 🔄 Data Flows

### NBA Analyzer Flow
```
NBA Backend (EllaMac:3000)
├── Research Collector Job (every 6h)
│   ├── Scrapes Reddit + Twitter (10 players)
│   ├── Analyzes sentiment (keyword-based)
│   ├── Generates AI reports (Claude Haiku)
│   └── Stores in PostgreSQL
├── API Routes
│   ├── GET /api/research/:playerName
│   ├── GET /api/research/:playerName/sentiment
│   └── POST /api/research/:playerName/refresh
└── Emits Events → Event Emitter → Mission Control Dashboard

Frontend (Main Mac:5173)
├── Displays player stats
├── Shows research panel (prediction, sentiment, reasoning)
└── Queries Mission Control for cost visibility
```

### Scout Mode Flow
```
Scout Mode (EllaMac, cron @ 5:15 PM)
├── 1. Scrape
│   ├── GoDaddy API → closeouts under $150
│   └── Playwright → ExpiredDomains.net auctions
├── 2. De-dupe & Score
│   ├── Remove duplicates
│   └── Fuzzy match (85%) against keyword clusters
├── 3. Filter
│   ├── Price ≤ $150
│   ├── TLD priority (.com > .net > .io)
│   └── Flag golden strings (Sport + AI/Metrics)
├── 4. Log Misses
│   └── SQLite: sold/non-matching domains
└── 5. Alert
    └── Telegram DM to your personal account (instant)
```

### Mission Control Flow
```
NBA Backend (EllaMac:3000)
├── Event Emitter (batches every 5s)
│   ├── task_start → eventEmitter.taskStart(...)
│   ├── task_end → eventEmitter.taskEnd(...)
│   ├── api_call → eventEmitter.apiCall(...)
│   └── error → eventEmitter.error(...)
├── POST /api/events (batch ingest)
│   └── Inserts into PostgreSQL
├── Dashboard API
│   ├── GET /api/events/summary
│   ├── GET /api/events/tasks
│   └── Real-time cost breakdown
└── Frontend (Main Mac:5173)
    └── React Query polls every 5-10s
        ├── Displays total spend vs budget
        ├── Shows cost breakdown by model
        └── Lists top tasks by cost/duration
```

---

## 🚀 Deployment Checklist

### EllaMac Setup (Next Session)
- [ ] Finish TypeScript import fixes
- [ ] `npm run dev` on backend
- [ ] Test `GET http://192.168.10.101:3000/health`
- [ ] Set up LaunchAgent for auto-start on boot
- [ ] Deploy Scout Mode cron job
- [ ] Test Scout Mode dry run (3:00 PM)

### Mission Control Integration
- [ ] Add event emitter to NBA backend
- [ ] Add `/api/events` routes
- [ ] Wire up event emissions in services
- [ ] Add dashboard page to frontend
- [ ] Test with dummy events
- [ ] Deploy to EllaMac

### Scout Mode Deployment
- [ ] Build locally (main Mac)
- [ ] Test with fixtures (dry run 3:00 PM)
- [ ] Deploy to EllaMac
- [ ] Configure Telegram alerts
- [ ] Test live run (5:15 PM)
- [ ] Monitor miss log for trend analysis

---

## 📞 Key Contacts

**OpenClaw Environment:**
- **Session:** main (direct chat with Chuler)
- **Workspace:** `/Users/ellis/.openclaw/workspace`
- **Model:** Claude Haiku 4.5 (default)
- **Budget:** $55/month API spend

**Machine Setup:**
- **Main Mac:** Ellis's workstation (dev, interactive)
- **EllaMac:** M1 mini @ 192.168.10.101 (24/7 server, always-on)

**Services:**
- **NBA Backend:** EllaMac, port 3000
- **Frontend:** Main Mac, port 5173 (dev)
- **PostgreSQL:** EllaMac (shared DB)
- **Redis:** EllaMac (cache layer)
- **Ollama:** EllaMac (local LLM)

**Notifications:**
- **Scout Mode Alerts:** Telegram DM (time-sensitive)
- **Status Updates:** Telegram primary

---

## 📚 Key Files

**NBA Analyzer:**
- `/Users/ellis/.openclaw/workspace/nba-analyzer/backend/src/services/research/` — Scraper, sentiment, synthesizer
- `/Users/ellis/.openclaw/workspace/nba-analyzer/backend/src/routes/research.ts` — API endpoints
- `/Users/ellis/.openclaw/workspace/nba-analyzer/frontend/src/components/ResearchPanel.tsx` — Frontend

**Mission Control:**
- `/Users/ellis/.openclaw/workspace/nba-analyzer/backend/src/services/eventEmitter.ts` — Event logging
- `/Users/ellis/.openclaw/workspace/nba-analyzer/backend/src/routes/events.ts` — API endpoints
- `/Users/ellis/.openclaw/workspace/nba-analyzer/frontend/src/pages/Dashboard.tsx` — Dashboard UI

**Scout Mode:**
- `/Users/ellis/.openclaw/workspace/scout-mode/scoutMode.ts` — Main logic
- `/Users/ellis/.openclaw/workspace/scout-mode/misses.db` — SQLite (miss tracking)
- `/Users/ellis/.openclaw/workspace/nba-analyzer/backend/src/jobs/scoutMode.ts` — Cron setup

**Config:**
- `.env` — API keys, database credentials
- `.env.example` — Template for .env

---

## 🎯 Current Status (Feb 21, 2026 — 7:00 AM)

### NBA Analyzer
- ✅ Phase 1 complete (basic stats + dashboard)
- 🚀 Phase 2 in progress (research layer built, ready to test)
- ⏳ Mission Control in design phase (schema done, code ready)

### EllaMac
- ✅ Hardware setup complete
- ✅ Dependencies installed (Node, PostgreSQL, Redis, Ollama)
- ⏳ Backend startup (TypeScript fixes almost done)
- ⏳ Auto-start setup (LaunchAgent)

### Scout Mode
- ✅ v2.1 specs finalized
- ⏳ Build locally (main Mac)
- ⏳ 3:00 PM dry run
- ⏳ Deploy to EllaMac for 5:15 PM live run

---

## 💡 Decision Log

- **Feb 19, 2026**: Built Phase 2 research layer. Opted for background job + 24h caching over real-time to save API costs. Using Claude Haiku 3.5 (cheaper).
- **Feb 20, 2026**: Set up EllaMac (M1 mini) as 24/7 dedicated server. Isolated from dev work on main Mac.
- **Feb 21, 2026 (AM)**: Designed Mission Control dashboard + event emitter. Added to NBA backend (not standalone). Event batching every 5s.
- **Feb 21, 2026 (AM)**: Designed Scout Mode v2.1. Hybrid scraper (GoDaddy API + Playwright). Fuzzy 85% matching. Deploy on EllaMac for 24/7 crawling.

---

## 🔐 Security Notes

- `.env` files contain sensitive keys (API keys, DB credentials) — Never commit
- EllaMac SSH access via local network only (no public exposure)
- Mission Control dashboard (TBD auth) — Plan multi-user access if shared
- Scout Mode alerts are instant (Telegram DM) — No email latency
- SQLite miss log is local analysis tool — Not sensitive

---

**If I (Ghost) forget context, paste this file back and I'll remember where we left off. 👻**
