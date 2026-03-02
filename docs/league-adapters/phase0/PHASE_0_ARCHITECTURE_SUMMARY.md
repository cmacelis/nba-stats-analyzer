# Phase 0 Architecture Summary
## Multi-Sport League Adapter Design

**Document Date:** March 2, 2026 | **Phase:** 0 (Foundation) | **Status:** Design Ready

---

## Overview

Phase 0 establishes the foundational architecture for NBA Stats Analyzer to support multiple sports leagues (starting with NBA, expanding to WNBA). The core innovation is the **LeagueAdapter pattern**, which abstracts league-specific logic into pluggable implementations while keeping the core platform league-agnostic.

**Phase 0 Goals:**
1. ✅ Design LeagueAdapter interface with all required capabilities
2. ✅ Implement NBAAdapter as first implementation
3. ✅ Refactor NBA code to work 100% through adapter (no NBA-only code in core)
4. ✅ Make APIs league-aware (`/api/{league}/...`)
5. ✅ Enable WNBA support in Phase 1 (without Phase 0 code changes)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  - League Selector (NBA/WNBA toggle)                    │
│  - League-aware API calls (/api/{league}/...)           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│             API Layer (Express/Node.js)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ League-aware Middleware                          │  │
│  │  - Extract {league} from route                   │  │
│  │  - Instantiate correct adapter                   │  │
│  │  - Attach to request context                     │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Generic API Endpoints                            │  │
│  │  - GET /api/{league}/schedule                    │  │
│  │  - GET /api/{league}/players                     │  │
│  │  - GET /api/{league}/stats                       │  │
│  │  - GET /api/{league}/injuries                    │  │
│  │  - GET /api/{league}/odds                        │  │
│  │  - [Deprecated] /api/nba/* (backwards compat)    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│        Adapter Layer (League Abstraction)               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         LeagueAdapterFactory                    │  │
│  │  - Registers adapters at startup                │  │
│  │  - Creates adapter instances on demand          │  │
│  │  - Validates league is supported                │  │
│  └─────────────────────────────────────────────────┘  │
│                    ↓ ↓ ↓                               │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ │
│  │ NBAAdapter  │ │WNBAAdapter  │ │ Future Adapters  │ │
│  │  (Phase 0)  │ │  (Phase 1)  │ │   (EuroLeague?)  │ │
│  │             │ │             │ │                  │ │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │                  │ │
│  │ │Schedule │ │ │ │Schedule │ │ │  Implements      │ │
│  │ │Players  │ │ │ │Players  │ │ │  ILeagueAdapter  │ │
│  │ │Stats    │ │ │ │Stats    │ │ │                  │ │
│  │ │Injuries │ │ │ │Injuries │ │ │  with:           │ │
│  │ │Odds     │ │ │ │Odds     │ │ │  - Data sources  │ │
│  │ │         │ │ │ │         │ │ │  - Transformers  │ │
│  │ └─────────┘ │ │ └─────────┘ │ │  - Cache logic   │ │
│  └─────────────┘ └─────────────┘ └──────────────────┘ │
│                                                         │
│  Each adapter includes:                               │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Data Source Clients                             │  │
│  │  - ESPN API client                              │  │
│  │  - NBA Stats API client                         │  │
│  │  - Betting Lines clients (DraftKings, FanDuel)  │  │
│  │  - [WNBA] WNBA-specific sources                 │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Data Transformers                               │  │
│  │  - Convert API responses to generic models      │  │
│  │  - Handle missing/optional fields               │  │
│  │  - Normalize IDs and formats                    │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Caching Layer (per-adapter)                     │  │
│  │  - In-memory L1 cache (1min TTL)                │  │
│  │  - Redis L2 cache (15min TTL)                   │  │
│  │  - Database L3 cache (persistent)               │  │
│  │  - TTLs: schedule:1h, players:24h, stats:30m,  │  │
│  │         injuries:15m, odds:5m                   │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│           Data Source Layer                             │
│                                                         │
│  ┌──────────────────┐ ┌──────────────────┐             │
│  │  Official APIs   │ │   Betting Lines  │             │
│  │                  │ │                  │             │
│  │ - NBA Stats API  │ │ - DraftKings API │             │
│  │ - ESPN API       │ │ - FanDuel API    │             │
│  │ - [WNBA] WNBA    │ │ - BetMGM API     │             │
│  │   Official API   │ │                  │             │
│  └──────────────────┘ └──────────────────┘             │
│  ┌──────────────────┐                                   │
│  │  Local Database  │                                   │
│  │                  │                                   │
│  │ - Players table  │                                   │
│  │ - Teams table    │                                   │
│  │ - Stats cache    │                                   │
│  │ - Redis cache    │                                   │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. ILeagueAdapter Interface (Deliverable: ✅)

Defines the contract all league implementations must follow:

**Core Methods:**
```typescript
// Schedule operations
schedule(query?: ScheduleQuery): Promise<Game[]>
getGame(gameId: string): Promise<Game | null>
getTeamSchedule(teamId: string, season?: number): Promise<Game[]>

// Player search and info
playerSearch(query: PlayerSearchQuery): Promise<Player[]>
getPlayer(playerId: string): Promise<Player | null>
getTeamRoster(teamId: string): Promise<Player[]>
getTeams(): Promise<Team[]>

// Game logs and stats
gameLogs(query: GameLogsQuery): Promise<GameLog[]>
teamStats(season?: number): Promise<TeamStats[]>
getPlayerStats(playerId: string, season?: number): Promise<Partial<GameLog>>

// Health and availability
injuries(): Promise<Injury[]>
getPlayerStatus(playerId: string): Promise<PlayerStatus>

// Betting and odds
oddsMapping(oddsType: OddsType): Promise<OddsMapping[]>
getGameOdds(gameId: string): Promise<OddsMapping | null>
getPlayerPropOdds(playerId: string, season?: number): Promise<OddsMapping[]>

// Data management
refresh(): Promise<void>
clearCache(): Promise<void>
healthCheck(): Promise<{healthy: boolean; message: string}>
```

**Benefits:**
- League-agnostic contracts for all operations
- Clear expectations for implementers
- Enables easy addition of new leagues
- Supports testing with mock adapters

### 2. NBAAdapter Implementation (Deliverable: ✅)

Concrete implementation for NBA league:

**Data Sources:**
- NBA Stats API (`stats.nba.com`) - authoritative stats
- ESPN API - schedules, rosters, injuries
- Betting APIs (DraftKings, FanDuel, BetMGM) - odds/props
- Local database - historical data, supplemental info

**Features:**
- Multi-layer caching (memory → redis → database)
- Circuit breaker for API failures
- Graceful degradation to cached data
- Data transformation/normalization
- Comprehensive error handling
- Health check monitoring

**Example Usage:**
```typescript
import { LeagueAdapterFactory, League } from './adapters';
import { NBAAdapter } from './adapters/nba';

// Register adapters at startup
LeagueAdapterFactory.register(League.NBA, NBAAdapter);

// Use in API handler
async function getSchedule(leagueId: string, query: ScheduleQuery) {
  const league = leagueId as League;
  const adapter = LeagueAdapterFactory.create(league);
  await adapter.initialize(2025);
  return adapter.schedule(query);
}
```

### 3. API Layer Refactoring

**New League-Aware Endpoints:**

```
GET /api/{league}/schedule        # League schedule
  ?startDate=2025-01-01
  &endDate=2025-12-31
  &teamId=LAL
  &status=completed

GET /api/{league}/schedule/{gameId}  # Single game

GET /api/{league}/teams           # All teams

GET /api/{league}/players         # Player search
  ?firstName=LeBron
  &lastName=James
  &position=SF

GET /api/{league}/players/{playerId}  # Player details

GET /api/{league}/stats           # Team/player stats
  ?season=2025
  &teamId=LAL

GET /api/{league}/injuries        # Injury reports
  ?teamId=LAL
  &status=out

GET /api/{league}/odds            # Betting odds
  ?oddsType=moneyline
  &gameId=0021900001
```

**Backwards Compatibility:**

```
GET /api/nba/schedule             # Still works (delegates to adapter)
  └─ Internally calls: NBAAdapter.schedule()
  └─ Deprecation header: "Deprecated, use /api/nba/schedule instead"
```

### 4. Middleware & Request Flow

```typescript
// LeagueMiddleware extracts {league} parameter and sets up adapter
app.use('/api/:league', leagueMiddleware);

const leagueMiddleware = async (req, res, next) => {
  const { league } = req.params;
  
  // Validate league is supported
  if (!LeagueAdapterFactory.isSupported(league)) {
    return res.status(400).json({ error: 'Unsupported league' });
  }
  
  // Create adapter instance
  const adapter = LeagueAdapterFactory.create(league);
  await adapter.initialize(2025); // current season
  
  // Attach to request for handlers to use
  req.adapter = adapter;
  
  next();
};

// In route handler
app.get('/api/:league/schedule', async (req, res) => {
  const games = await req.adapter.schedule(req.query);
  res.json(games);
});
```

---

## Backwards Compatibility Assessment

### ✅ Fully Compatible (No Changes Required)

1. **Database schema** - New league_id columns are nullable, old code still works
2. **Legacy API endpoints** - `/api/nba/*` routed through adapter
3. **Existing deployments** - Code runs without WNBA changes
4. **Data consumers** - Old API clients continue to work

### ⚠️ Partially Compatible (Minor Changes)

1. **Frontend** - Optional league selector, works with just NBA by default
2. **Internal services** - Adapter instantiation, but backwards-compatible
3. **Data models** - New optional fields, old code ignores them

### ❌ Breaking Changes (Require Action)

1. **TypeScript types** - If code checks exact type match (use `Partial<T>`)
2. **API response format** - See versioning strategy below
3. **Adapter pattern** - New developers must understand architecture

### Versioning Strategy

To maintain backwards compatibility while supporting new league-aware endpoints:

**Phase 0 (Current):**
- Keep `/api/v1/nba/*` endpoints (legacy NBA-only)
- Create `/api/v2/{league}/*` endpoints (new league-aware)
- Both versions live simultaneously
- Frontend can gradually migrate from v1 to v2

**Transition Period (3-6 months):**
- Monitor v1 vs v2 usage
- Alert API consumers of deprecation
- Provide v1→v2 migration guide
- Support both versions

**Deprecation (6+ months):**
- Remove v1 endpoints
- All clients must use v2
- Clear communication timeline

---

## Data Model Changes

### New Structures (Phase 0)

```typescript
// League enumeration
export enum League {
  NBA = 'nba',
  WNBA = 'wnba',
  // Future expansion
}

// All data models include league_id
export interface Game {
  id: string;
  leagueId: League;        // ← NEW
  season: number;
  date: Date;
  // ... rest of model
}

export interface Player {
  id: string;
  leagueId: League;        // ← NEW
  // ... rest of model
}

export interface TeamStats {
  teamId: string;
  leagueId: League;        // ← NEW
  // ... rest of model
}
```

### Database Migrations Required

```sql
-- Phase 0: Add nullable league_id columns
ALTER TABLE games ADD COLUMN league_id VARCHAR(20);
ALTER TABLE players ADD COLUMN league_id VARCHAR(20);
ALTER TABLE team_stats ADD COLUMN league_id VARCHAR(20);
ALTER TABLE injuries ADD COLUMN league_id VARCHAR(20);
ALTER TABLE odds ADD COLUMN league_id VARCHAR(20);

-- Create indexes
CREATE INDEX idx_games_league ON games(league_id);
CREATE INDEX idx_players_league ON players(league_id);

-- Phase 0.5: Backfill data (all existing rows are NBA)
UPDATE games SET league_id = 'nba';
UPDATE players SET league_id = 'nba';
UPDATE team_stats SET league_id = 'nba';
UPDATE injuries SET league_id = 'nba';
UPDATE odds SET league_id = 'nba';

-- Phase 1: Make league_id non-nullable
ALTER TABLE games MODIFY COLUMN league_id VARCHAR(20) NOT NULL;
-- ... etc
```

---

## Implementation Roadmap

### Phase 0: Foundation (3-4 weeks)
- [ ] Design & validate LeagueAdapter interface ✅
- [ ] Implement NBAAdapter ✅
- [ ] Refactor existing NBA code to use adapter
- [ ] Create league-aware API endpoints
- [ ] Update frontend for league selector
- [ ] Comprehensive testing & QA
- [ ] Production deployment
- **Output:** NBA working 100% through adapter, ready for WNBA

### Phase 1: WNBA (2-3 weeks after Phase 0)
- [ ] Research & audit WNBA data sources
- [ ] Implement WNBAAdapter
- [ ] Frontend multi-league UI
- [ ] Testing & QA
- [ ] Production deployment
- **Output:** Full WNBA support alongside NBA

### Phase 2+: Future Leagues
- [ ] EuroLeague adapter
- [ ] FIBA World Cup
- [ ] Other sports (MLB, NFL, etc.)

---

## Testing Strategy

### Unit Tests (>90% Coverage)

```typescript
describe('NBAAdapter', () => {
  describe('schedule()', () => {
    it('returns games matching query filters', () => {
      // Test with various filters
    });
    
    it('uses cache on repeated calls', () => {
      // Test cache hit logic
    });
    
    it('handles API errors gracefully', () => {
      // Test error handling
    });
  });
  
  describe('Transformers', () => {
    it('transforms ESPN schedule to Game model', () => {
      // Test data transformation
    });
  });
});
```

### Integration Tests

```typescript
describe('API Endpoints', () => {
  it('GET /api/nba/schedule returns games', async () => {
    const res = await request(app).get('/api/nba/schedule');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
  
  it('GET /api/{league}/stats requires valid league', async () => {
    const res = await request(app).get('/api/invalid-league/stats');
    expect(res.status).toBe(400);
  });
});
```

### E2E Tests

```typescript
describe('Full User Workflows', () => {
  it('User selects NBA, loads schedule, clicks game, sees details', () => {
    // Full browser-based test
  });
  
  it('User switches from NBA to WNBA, data updates', () => {
    // Test league switching
  });
});
```

---

## Dependencies & Version Requirements

- **Node.js:** >= 18 (async/await, latest ES features)
- **TypeScript:** >= 4.9 (advanced type features)
- **Express:** >= 4.18
- **Redis:** >= 7.0 (caching layer)
- **MySQL:** >= 8.0 (storage)

---

## Success Criteria (Phase 0 Complete)

✅ **Functional:**
- LeagueAdapter interface fully defined and documented
- NBAAdapter implements all interface methods
- All existing NBA functionality works through adapter
- Core code contains zero NBA-specific imports
- Legacy `/api/nba/*` endpoints backwards-compatible
- New `/api/{league}/` endpoints functional

✅ **Quality:**
- >90% unit test coverage
- All integration tests passing
- Zero data inconsistencies vs. old system
- <2s schedule load time (cached)
- <500ms player search response time

✅ **Operations:**
- Monitoring/alerting configured
- Error handling fully implemented
- Cache strategy working as designed
- Data freshness acceptable
- Adapter health checks operational

✅ **Team:**
- Documentation complete
- Team trained on architecture
- WNBA preparation started
- Code review process defined

---

## Known Limitations & Future Work

**Phase 0 Limitations:**
1. WNBA not yet implemented (Phase 1)
2. Real-time score updates not included (separate WebSocket system)
3. Advanced ML features (projections) not adapted yet (future phase)
4. Fantasy sports integration not included (future)

**Future Enhancements:**
- Adapter support for other sports (MLB, NFL, NHL, MLS)
- Real-time data via WebSocket/Server-Sent Events
- Advanced stats (win shares, PER, etc.)
- Fantasy sports integration
- Custom league support (G-League, overseas leagues)
- International sports APIs integration

---

## Questions & Clarifications

**Q: What happens if a data source API is down?**
A: Circuit breaker activates, system returns cached data with freshness indicator. Users see "Last updated 2h ago" message.

**Q: Can we add a new sport in < 1 week?**
A: Yes, if data sources are available. Just implement new adapter (500-1000 LOC) and register it.

**Q: What about data consistency between old and new systems during migration?**
A: Run parallel systems for 1-2 weeks, validate data differences, alert on mismatches >1%.

**Q: How do we handle WNBA's smaller player base and fewer data sources?**
A: Adapter design allows for league-specific logic. WNBAAdapter can fallback to alternative sources or manual data.

**Q: Performance impact of adapter layer?**
A: Negligible (~5-10ms per request). Caching absorbs most overhead. Monitored closely during Phase 0.

---

## References

- `PHASE_0_LeagueAdapter_Interface.ts` - Interface definition
- `PHASE_0_NBAAdapter.ts` - NBA implementation
- `PHASE_0_MIGRATION_CHECKLIST.md` - Task checklist
- `PHASE_0_RISK_ASSESSMENT.md` - Risk analysis
