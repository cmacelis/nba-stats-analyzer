# Phase 0: Breaking Changes & Dependencies Analysis

**Document Purpose:** Catalog all breaking changes, dependency shifts, and compatibility concerns introduced by the LeagueAdapter refactor.

**Date:** March 2, 2026 | **Phase:** 0 Architecture Design

---

## Executive Summary

Phase 0 introduces moderate breaking changes that require:
1. Database schema modifications (nullable columns, new indexes)
2. API contract changes (new endpoints, potential response format changes)
3. Dependency injection pattern adoption
4. TypeScript type compatibility updates
5. Frontend data handling adjustments

**Critical Success Factor:** Maintain 100% backwards compatibility during transition (Phase 0 → Phase 1) by running both old and new systems in parallel.

---

## 1. Breaking API Changes

### 1.1 Response Format Changes

#### Issue: Game Model Response Schema
**Before (Current NBA-only system):**
```json
{
  "id": "0021900001",
  "season": 2025,
  "date": "2025-10-22T19:30:00Z",
  "homeTeam": {
    "id": "1610612738",
    "name": "Boston Celtics",
    "abbreviation": "BOS"
  },
  "awayTeam": {
    "id": "1610612761",
    "name": "Dallas Mavericks",
    "abbreviation": "DAL"
  },
  "homeScore": 110,
  "awayScore": 105,
  "status": "completed"
}
```

**After (With League Support):**
```json
{
  "id": "0021900001",
  "leagueId": "nba",           // ← NEW FIELD
  "season": 2025,
  "date": "2025-10-22T19:30:00Z",
  "homeTeam": {
    "id": "1610612738",
    "leagueId": "nba",         // ← NEW FIELD
    "name": "Boston Celtics",
    "abbreviation": "BOS"
  },
  "awayTeam": {
    "id": "1610612761",
    "leagueId": "nba",         // ← NEW FIELD
    "name": "Dallas Mavericks",
    "abbreviation": "DAL"
  },
  "homeScore": 110,
  "awayScore": 105,
  "status": "completed"
}
```

**Breaking Impact:** MEDIUM
- **Frontend:** Must handle `leagueId` in Team objects
- **Third-party APIs:** New field breaks strict schema validation
- **Mobile apps:** Response larger by ~3-5 bytes per object

**Mitigation:**
```typescript
// Option 1: API versioning
GET /api/v1/nba/schedule      // Old format (leagueId omitted)
GET /api/v2/nba/schedule      // New format (leagueId included)

// Option 2: Query parameter
GET /api/nba/schedule?format=v2  // New format with leagueId
```

---

#### Issue: TeamStats Model Response Schema

**Before:**
```json
{
  "teamId": "1610612738",
  "season": 2025,
  "wins": 45,
  "losses": 20,
  "pointsPerGame": 112.5,
  "defensiveRating": 105.2,
  "offensiveRating": 113.1
}
```

**After:**
```json
{
  "teamId": "1610612738",
  "leagueId": "nba",           // ← NEW
  "season": 2025,
  "asOf": "2025-03-02T10:00:00Z",  // ← NEW (data freshness timestamp)
  "wins": 45,
  "losses": 20,
  "pointsPerGame": 112.5,
  "defensiveRating": 105.2,
  "offensiveRating": 113.1
}
```

**Breaking Impact:** MEDIUM
- **Dashboards:** Charts assuming stats don't have `asOf` field
- **Calculations:** Code checking `teamId` directly might need adjustment
- **Comparisons:** New `asOf` timestamp enables multi-league comparison

---

### 1.2 Endpoint URL Changes

| Current Endpoint | New Endpoint | Legacy Support | Notes |
|------------------|--------------|---|---|
| `GET /api/nba/schedule` | `GET /api/nba/schedule` + `GET /api/{league}/schedule` | ✅ Yes | Both work; new one preferred |
| `GET /api/nba/players` | `GET /api/{league}/players` | ✅ Yes (delegate) | Must accept league ID |
| `GET /api/nba/stats` | `GET /api/{league}/stats` | ✅ Yes | New endpoint in use |
| `POST /api/nba/edge` | `POST /api/{league}/edge` | ✅ Yes | Core endpoint, must be adapted |
| `GET /api/nba/injuries` | `GET /api/{league}/injuries` | ✅ Yes | New endpoint |
| `GET /api/nba/odds` | `GET /api/{league}/odds` | ✅ Yes | New endpoint for multi-league |

**Transition Strategy:**

```typescript
// Phase 0: Implement both endpoints
app.get('/api/nba/schedule', handleNBAScheduleLegacy);    // delegates to adapter
app.get('/api/{league}/schedule', handleSchedule);         // new endpoint

// Phase 1: Add deprecation headers
app.get('/api/nba/schedule', (req, res) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Wed, 01 Jan 2026 00:00:00 GMT');
  handleNBAScheduleLegacy(req, res);
});

// Phase 2 (optional): Remove legacy endpoints
// DELETE /api/nba/* entirely
```

---

### 1.3 Query Parameter Changes

**Schedule Endpoint Example:**

**Before:**
```
GET /api/nba/schedule?startDate=2025-01-01&endDate=2025-12-31&teamId=LAL
```

**After (unchanged):**
```
GET /api/nba/schedule?startDate=2025-01-01&endDate=2025-12-31&teamId=LAL
GET /api/{league}/schedule?startDate=2025-01-01&endDate=2025-12-31&teamId=LAL
```

**Note:** No breaking changes to query parameters at the HTTP level. League is specified in URL path, not query string.

---

### 1.4 Error Response Format

**New Error Handling:**

```json
// API Error (new format with league context)
{
  "error": "Unsupported league",
  "league": "mlb",
  "message": "League 'mlb' is not yet supported",
  "supportedLeagues": ["nba", "wnba"],
  "code": "UNSUPPORTED_LEAGUE",
  "timestamp": "2025-03-02T10:00:00Z"
}

// Data Source Failure (graceful degradation)
{
  "data": [...cached data...],
  "warning": "Using cached data (3 hours old)",
  "freshness": "STALE",
  "lastUpdate": "2025-03-02T07:00:00Z",
  "nextRefresh": "2025-03-02T10:30:00Z"
}
```

**Breaking Impact:** LOW
- Clients checking `error` field still work
- New fields are additive, don't break existing parsing
- Better error context for debugging

---

## 2. Breaking Database Changes

### 2.1 Schema Modifications

#### New Columns (Non-Breaking)

```sql
-- Phase 0: Add nullable league_id columns
ALTER TABLE games ADD COLUMN league_id VARCHAR(20) DEFAULT 'nba';
ALTER TABLE players ADD COLUMN league_id VARCHAR(20) DEFAULT 'nba';
ALTER TABLE team_stats ADD COLUMN league_id VARCHAR(20) DEFAULT 'nba';
ALTER TABLE injuries ADD COLUMN league_id VARCHAR(20) DEFAULT 'nba';
ALTER TABLE odds ADD COLUMN league_id VARCHAR(20) DEFAULT 'nba';

-- Benefits:
-- - Existing queries still work (default value provided)
-- - No data migration needed
-- - Can be made NOT NULL in Phase 1
-- - Can revert easily if needed
```

**Breaking Impact:** NONE (backwards compatible)
- Old code doesn't need to change
- New code can use league_id
- Default values ensure consistency

#### New Indexes (Performance)

```sql
-- Required for league-based queries
CREATE INDEX idx_games_league_season ON games(league_id, season);
CREATE INDEX idx_players_league_team ON players(league_id, team_id);
CREATE INDEX idx_team_stats_league_season ON team_stats(league_id, season);
CREATE INDEX idx_injuries_league_team ON injuries(league_id, team_id);
CREATE INDEX idx_odds_league_game ON odds(league_id, game_id);

-- Composite Unique Constraints (Phase 1)
-- ALTER TABLE games ADD CONSTRAINT unique_league_game UNIQUE(league_id, id);
```

**Breaking Impact:** NONE
- Indexes improve query performance
- No structural changes to queries

#### Primary Key Considerations (Phase 1)

**Current (works for NBA only):**
```sql
PRIMARY KEY (id)  -- Game ID is globally unique
```

**Future (Phase 1+):**
```sql
PRIMARY KEY (league_id, id)  -- Composite key for multi-league
```

**Breaking Impact:** HIGH (deferred to Phase 1)
- Requires application code to include league_id in all queries
- Postponed until WNBA implementation
- Full migration plan documented separately

---

### 2.2 Query Changes Required

**Before (NBA only):**
```python
# Python/ORM example
game = db.query(Game).filter_by(id="0021900001").first()
stats = db.query(TeamStats).filter_by(teamId="1610612738", season=2025).all()
```

**After (League-aware):**
```python
# With backwards compatibility
game = db.query(Game).filter_by(league_id="nba", id="0021900001").first()

# Or with new query builder
game = adapter.getGame("0021900001")  # league implicit from adapter context
stats = db.query(TeamStats).filter(
    (TeamStats.league_id == "nba") &
    (TeamStats.team_id == "1610612738") &
    (TeamStats.season == 2025)
).all()
```

**Breaking Impact:** MEDIUM
- Direct database queries need league_id filter
- ORM relationships need adjustment
- Existing raw SQL might return unwanted leagues

**Mitigation:**
```python
# Create database view for NBA-only queries (backwards compat)
CREATE VIEW games_nba AS
SELECT * FROM games WHERE league_id = 'nba';

# Old code can query this view
game = db.query(GameNBA).filter_by(id="0021900001").first()
```

---

## 3. Breaking Code Structure Changes

### 3.1 Imports & Module Organization

**Before (Current):**
```typescript
// Importing directly from league modules
import { getNBASchedule } from 'src/leagues/nba/schedule';
import { getNBATeamStats } from 'src/leagues/nba/stats';
import { getNBAInjuries } from 'src/leagues/nba/injuries';

// Using league-specific types
import type { NBAGame, NBAPlayer } from 'src/leagues/nba/types';
```

**After (Phase 0):**
```typescript
// Importing from generic interface
import { ILeagueAdapter, Game, Player } from 'src/adapters';
import { NBAAdapter } from 'src/adapters/nba';

// Using league-agnostic types
import type { Game, Player } from 'src/adapters/interfaces';

// Getting adapter from factory
const adapter = LeagueAdapterFactory.create(League.NBA);
const schedule = await adapter.schedule(query);
```

**Breaking Impact:** HIGH
- All imports need updating
- Type references need adjustment
- Service instantiation pattern changes

**Migration Path:**
```typescript
// Step 1: Create adapter layer alongside old code
// Step 2: Update imports gradually (route by route)
// Step 3: Delete old league-specific code when fully migrated

// Old code (to be removed)
// src/leagues/nba/*

// New code (replace with)
// src/adapters/nba/NBAAdapter.ts
// src/adapters/ILeagueAdapter.ts
```

---

### 3.2 Service Layer Changes

**Before:**
```typescript
// Service is NBA-specific
class StatsService {
  async getTeamStats(teamId: string): Promise<NBATeamStats> {
    // Hardcoded NBA logic
  }
}

// Usage
const service = new StatsService();
const stats = await service.getTeamStats("1610612738");
```

**After:**
```typescript
// Service is league-aware
class StatsService {
  async getTeamStats(adapter: ILeagueAdapter, teamId: string) {
    // Uses adapter (could be NBA, WNBA, etc.)
    return adapter.teamStats();
  }
}

// Usage
const nbaAdapter = LeagueAdapterFactory.create(League.NBA);
const service = new StatsService();
const stats = await service.getTeamStats(nbaAdapter, "1610612738");
```

**Breaking Impact:** MEDIUM
- Service methods need adapter parameter
- Dependency injection patterns required
- Testing requires mock adapters

---

### 3.3 Type System Changes

**Before:**
```typescript
// Specific types for NBA
interface GameScore {
  nbaGameId: string;
  homeScore: number;
  awayScore: number;
  nbaTeamIds: [string, string];
}

function updateScore(score: GameScore): void {
  // NBA-specific logic
}
```

**After:**
```typescript
// Generic types with league context
interface GameScore {
  gameId: string;
  leagueId: League;
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
}

function updateScore(score: GameScore): void {
  // League-agnostic logic, dispatch to adapter
}
```

**Breaking Impact:** MEDIUM
- TypeScript compilation might fail if types are too strict
- Union types instead of specific types
- Discriminated unions useful (using `leagueId`)

**Example of Safe Migration:**
```typescript
// Before (unsafe, only works for NBA)
const game: NBAGame = { ... };
processGame(game);

// After (safe, works for any league)
const game: Game = { leagueId: League.NBA, ... };
processGame(game);

// Type guard for league-specific logic
if (game.leagueId === League.NBA) {
  // NBA-specific processing
}
```

---

## 4. Breaking Changes in Core Logic

### 4.1 Initialization Pattern

**Before:**
```typescript
// App startup (NBA hardcoded)
async function bootstrap() {
  const nbaData = await loadNBATeams();
  const nbaSchedule = await loadNBASchedule();
  global.NBA = { teams: nbaData, schedule: nbaSchedule };
}

bootstrap();
```

**After:**
```typescript
// App startup (multi-league)
async function bootstrap() {
  // Register adapters
  LeagueAdapterFactory.register(League.NBA, NBAAdapter);
  LeagueAdapterFactory.register(League.WNBA, WNBAAdapter);
  
  // Lazy load data (per-request, not global)
  const nbaAdapter = LeagueAdapterFactory.create(League.NBA);
  await nbaAdapter.initialize(2025);
}

bootstrap();
```

**Breaking Impact:** HIGH
- Global state pattern changes to per-adapter pattern
- Initialization sequence changes
- Testing requires adapter setup

---

### 4.2 Data Aggregation & Calculations

**Before (NBA-specific calculations):**
```typescript
function calculateWinPercentage(wins: number, losses: number): number {
  return wins / (wins + losses);  // NBA uses this formula
}

function rankTeams(teams: NBATeam[]): NBATeam[] {
  // NBA-specific ranking logic
  return teams.sort((a, b) => b.wins - a.wins);
}
```

**After (League-aware, adaptable):**
```typescript
// Generic calculation
function calculateWinPercentage(wins: number, losses: number): number {
  return wins / (wins + losses);  // Same for all leagues
}

// Adapter-specific ranking
class ILeagueAdapter {
  async rankTeams(season: number): Promise<Team[]> {
    // Each adapter implements own ranking
    // WNBA and EuroLeague might have different logic
  }
}
```

**Breaking Impact:** MEDIUM
- Shared calculations need extraction
- League-specific calculations move to adapters
- Testing becomes more complex (multiple adapter implementations)

---

## 5. Frontend Breaking Changes

### 5.1 Component Props Changes

**Before (NBA-only):**
```typescript
interface ScheduleProps {
  games: NBAGame[];
  onGameClick: (gameId: string) => void;
}

function ScheduleTable({ games }: ScheduleProps) {
  return (
    <table>
      {games.map(game => (
        <tr key={game.id}>
          <td>{game.homeTeam.name}</td>
          <td>{game.homeScore}</td>
        </tr>
      ))}
    </table>
  );
}
```

**After (League-aware):**
```typescript
interface ScheduleProps {
  games: Game[];        // Generic, includes leagueId
  league: League;
  onGameClick: (gameId: string, league: League) => void;
}

function ScheduleTable({ games, league }: ScheduleProps) {
  return (
    <table>
      {games.map(game => (
        <tr key={`${game.leagueId}-${game.id}`}>
          <td>{game.homeTeam.name}</td>
          <td>{game.homeScore}</td>
        </tr>
      ))}
    </table>
  );
}

// Usage changed
<ScheduleTable games={games} league="nba" onGameClick={...} />
```

**Breaking Impact:** LOW
- New `league` prop optional for Phase 0 (defaults to NBA)
- Key prop needs updating (includes league)
- Backwards compatible if props are optional

---

### 5.2 State Management Changes

**Before (Redux NBA store):**
```typescript
// Redux selector (NBA-only)
const selectSchedule = (state) => state.nba.schedule.games;

function MyComponent() {
  const games = useSelector(selectSchedule);
  return <ScheduleTable games={games} />;
}
```

**After (League-aware Redux):**
```typescript
// Redux selector (multi-league)
const selectSchedule = (state, league) => 
  state.leagues[league].schedule.games;

function MyComponent() {
  const selectedLeague = useSelector(selectLeague);
  const games = useSelector((state) => selectSchedule(state, selectedLeague));
  return <ScheduleTable games={games} league={selectedLeague} />;
}
```

**Breaking Impact:** MEDIUM
- Store structure needs refactoring
- Selectors need parameters
- New league selector component required

**Mitigation:**
```typescript
// Create compatibility layer
function selectNBASchedule(state) {
  return selectSchedule(state, League.NBA);
}

// Old code still works
const games = useSelector(selectNBASchedule);
```

---

### 5.3 API Call Changes

**Before:**
```typescript
// Direct API calls (NBA hardcoded)
async function loadSchedule(startDate, endDate) {
  const response = await fetch(`/api/nba/schedule?startDate=${startDate}&endDate=${endDate}`);
  return response.json();
}

useEffect(() => {
  loadSchedule(new Date(), new Date());
}, []);
```

**After:**
```typescript
// League-aware API calls
async function loadSchedule(league, startDate, endDate) {
  const response = await fetch(`/api/${league}/schedule?startDate=${startDate}&endDate=${endDate}`);
  return response.json();
}

function ScheduleContainer() {
  const selectedLeague = useContext(LeagueContext);
  
  useEffect(() => {
    loadSchedule(selectedLeague, new Date(), new Date());
  }, [selectedLeague]);
}
```

**Breaking Impact:** MEDIUM
- All API calls need league parameter
- Component dependencies on league change
- URL construction changes

---

## 6. Dependency Shift Summary

### What Adapters Replace

| Old System | New Adapter | Breaking? |
|-----------|-----------|---|
| `src/leagues/nba/schedule.ts` | `NBAAdapter.schedule()` | Yes |
| `src/leagues/nba/players.ts` | `NBAAdapter.playerSearch()` | Yes |
| `src/leagues/nba/stats.ts` | `NBAAdapter.teamStats()` | Yes |
| `src/leagues/nba/injuries.ts` | `NBAAdapter.injuries()` | Yes |
| `src/leagues/nba/odds.ts` | `NBAAdapter.oddsMapping()` | Yes |
| Global NBA configuration | `LeagueMetadata` | Yes |
| NBA-specific types | Generic interface types | Yes |

### What Stays the Same

| System | Status | Notes |
|--------|--------|-------|
| Database queries | Must adapt | Add league filter to all queries |
| API endpoints (v1) | Backwards compat | Still work via adapter |
| Frontend Redux | Must refactor | Store structure changes |
| Business logic | Might move | Some goes to adapters |
| External APIs | No change | Still call ESPN, DraftKings, etc. |

---

## 7. Dependency Graph Impact

### Current (Phase 0 Start)
```
API Layer
  ├─ getNBASchedule → NBAStatsAPI
  ├─ getNBAPlayers → ESPNApi
  ├─ getNBAStats → NBAStatsAPI
  ├─ getNBAInjuries → ESPNApi
  └─ getNBAOdds → BettingAPIs

Frontend
  ├─ ScheduleComponent → Redux.nba.schedule
  ├─ PlayerComponent → Redux.nba.players
  └─ StatsComponent → Redux.nba.stats
```

### After Phase 0
```
API Layer
  ├─ Adapter Factory
  │   ├─ NBAAdapter
  │   │   ├─ NBAStatsClient → NBAStatsAPI
  │   │   ├─ ESPNClient → ESPNApi
  │   │   └─ BettingClient → BettingAPIs
  │   └─ WNBAAdapter (Phase 1)

Frontend
  ├─ LeagueContext (selected league)
  ├─ ScheduleComponent → API.{league}.schedule → Adapter
  ├─ PlayerComponent → API.{league}.players → Adapter
  └─ StatsComponent → API.{league}.stats → Adapter
```

**Breaking Changes:**
- ALL code importing from `src/leagues/nba/*` must change
- ALL code using NBA-specific types must change
- ALL service constructors need adapter parameters
- ALL tests need mock adapters

---

## 8. Backwards Compatibility Strategy

### What CAN Stay the Same (Low-Risk)

```typescript
// External APIs (unchanged)
- stats.nba.com
- ESPN API
- DraftKings API
- FanDuel API
- Database tables (structure extended)

// API Endpoints (v1 backed by adapter)
- GET /api/nba/* (delegates to NBAAdapter)
- POST /api/nba/* (delegates to NBAAdapter)

// Frontend Components (with optional league prop)
<ScheduleTable games={games} />  // Defaults to NBA
```

### What MUST Change (Breaking)

```typescript
// Imports
import { getNBASchedule } from 'src/leagues/nba'  // ❌
import { NBAAdapter } from 'src/adapters/nba'     // ✅

// Service instantiation
const service = new NBAService()              // ❌
const adapter = LeagueAdapterFactory.create() // ✅

// Data types
const game: NBAGame                           // ❌
const game: Game & { leagueId: League.NBA }  // ✅

// Database queries
Game.findOne({ id: gameId })                          // ❌
Game.findOne({ leagueId: 'nba', id: gameId })        // ✅
```

---

## 9. Migration Timeline

### Week 1: Analysis & Planning
- Identify all breaking changes
- Map dependencies
- Estimate scope

### Week 2-3: Code Migration
- Update imports in stages
- Refactor services
- Update tests

### Week 3-4: Integration & Testing
- Integration testing
- Performance verification
- Backwards compatibility checks

### Week 4: Deployment & Validation
- Staging deployment
- Production rollout (with feature flag)
- Monitor for issues

---

## 10. Risk Mitigation Checklist

- [ ] **Code Changes**: All imports updated, tested, and code reviewed
- [ ] **Database**: Migrations tested on production-sized database
- [ ] **APIs**: Both v1 and v2 endpoints functional and tested
- [ ] **Frontend**: League selector implemented and tested
- [ ] **Types**: TypeScript compilation passes, no type errors
- [ ] **Tests**: All unit, integration, and E2E tests passing
- [ ] **Performance**: Load testing shows no degradation
- [ ] **Documentation**: All breaking changes documented
- [ ] **Rollback**: Rollback plan tested and validated

---

## 11. Success Criteria

✅ All breaking changes mitigated with backwards-compatible alternatives
✅ Zero production issues post-deployment
✅ All team members understand adapter pattern and can explain breaking changes
✅ Clear deprecation timeline (e.g., remove v1 endpoints in 6 months)
✅ WNBA implementation unblocked by Phase 0

---

## Appendix: Quick Reference Table

| Component | Severity | Status | Mitigation |
|-----------|----------|--------|-----------|
| API Response Format | MEDIUM | Requires versioning | Use `/api/v2/` for new format |
| Database Schema | NONE | Backwards compatible | Add nullable columns with defaults |
| Import Paths | HIGH | Requires refactoring | Gradual migration to adapter imports |
| Service Constructor | MEDIUM | Requires pattern change | Add adapter parameter |
| Type System | MEDIUM | Requires updates | Use generic types with discriminated unions |
| Frontend Components | LOW | Optional adaptation | League prop defaults to NBA |
| Redux Store | MEDIUM | Requires refactoring | Multi-league store structure |
| API Client Calls | MEDIUM | Requires updates | Add league parameter to fetch URLs |
| Database Queries | MEDIUM | Requires filters | Add `league_id` filter to all queries |
| Tests | HIGH | Requires rewrites | Create mock adapters for testing |
