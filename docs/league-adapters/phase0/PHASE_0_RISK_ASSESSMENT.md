# Phase 0 Risk Assessment
## Multi-Sport League Adapter Architecture

**Assessment Date:** March 2, 2026 | **Project:** NBA Stats Analyzer WNBA Expansion | **Phase:** 0 (Foundation)

---

## Executive Summary

Phase 0 introduces a major architectural refactor to support multiple leagues. While necessary for long-term scalability, this introduces **medium-to-high risk** during implementation. The refactor affects core data flow, API contracts, and frontend integration.

**Overall Risk Level: MEDIUM**
- **Technical Risk:** MEDIUM (complex refactor, many integration points)
- **Business Risk:** LOW (Phase 0 doesn't require WNBA to be live)
- **Operational Risk:** MEDIUM (deployment complexity, monitoring requirements)
- **Data Risk:** MEDIUM (data consistency issues possible during transition)

---

## High-Risk Areas

### 1. Data Consistency & Integrity (CRITICALITY: HIGH)

#### Risk: New adapter returns different data than old system

**Probability:** MEDIUM (75%)
**Impact:** HIGH (users see inconsistent stats, betting odds mismatches)
**Severity:** CRITICAL

**Root Causes:**
- Different API endpoints have slightly different data formats
- Transformation logic not handling all edge cases
- Missing fields in new data model
- Rounding/precision differences in stats calculations
- Timing differences (stale cache vs. live data)

**Scenarios:**
- Schedule shows game at 7 PM, score updates show 7:30 PM game
- Player stats in new system don't match ESPN/official NBA stats
- Team record doesn't match number of games shown
- Betting odds from new system differ significantly from old system

**Mitigation:**
- [ ] Create comprehensive data comparison tests
- [ ] Run parallel systems for 1-2 weeks before cutover
- [ ] Build daily data validation reports
- [ ] Alert on data discrepancies >1% variance
- [ ] Keep fallback to old system available
- [ ] Document known differences (intentional vs. bugs)

**Detection:**
- Automated comparison tests between old/new systems
- Manual spot checks (10-20 data points daily)
- User reports of inconsistencies
- Metrics: Data freshness, cache staleness alerts

---

### 2. Breaking Changes - API Contracts (CRITICALITY: HIGH)

#### Risk: API response format changes break existing clients

**Probability:** HIGH (85%)
**Impact:** HIGH (frontend breaks, third-party integrations fail)
**Severity:** CRITICAL

**Breaking Changes Identified:**

| Endpoint | Change | Impact | Mitigation |
|----------|--------|--------|-----------|
| `GET /api/nba/schedule` | Response schema changes with new Game model | Frontend code breaks | Keep legacy endpoint, add deprecation header |
| `GET /api/nba/players/{id}` | Player model has optional league-specific fields | Missing fields break assumptions | Default missing fields, document as optional |
| `GET /api/nba/stats/{teamId}` | TeamStats model structure changes | Charts/graphs break if code assumes specific fields | Add schema validation, use optional chaining in frontend |
| `POST /api/nba/edge` | Parameter format changes | Edge detection queries fail | Accept both old and new formats during transition |

**API Consumer Impact:**
- Frontend React components (HIGH risk)
- Third-party integrations (MEDIUM risk)
- Mobile apps (if any) (MEDIUM risk)
- Data pipelines (Python ML code) (MEDIUM risk)

**Mitigation:**
- [ ] **Versioning Strategy**
  - Keep `/api/v1/nba/*` endpoints with old format
  - Create `/api/v2/{league}/*` endpoints with new format
  - Run both versions during transition period
  - Deprecate v1 endpoints on documented timeline (e.g., 6 months)

- [ ] **Compatibility Layer**
  - Create response transformers to convert new format to old
  - Maintain backwards compatibility for 2-3 releases
  - Use feature flags to control which endpoints are live

- [ ] **Communication**
  - Document all breaking changes with migration guide
  - Notify all API consumers 30 days before cutover
  - Provide code examples for new format
  - Offer support during transition

**Detection:**
- Test all API endpoints before deployment
- Monitor 5xx errors post-deployment
- Alert on increased error rates from known clients
- Require API version in User-Agent headers for tracking

---

### 3. External API Dependency Failures (CRITICALITY: MEDIUM)

#### Risk: Data source APIs become unavailable during migration

**Probability:** MEDIUM (40%)
**Impact:** HIGH (no schedule/player/odds data available)
**Severity:** HIGH

**Affected Data Sources:**
1. **NBA Stats API** (stats.nba.com)
   - Availability: ~99.9% (occasional maintenance)
   - Timeout: 5-30 seconds
   
2. **ESPN API**
   - Availability: ~99.5% (more frequent maintenance)
   - Timeout: 2-10 seconds
   - Rate limiting: Unknown limits
   
3. **Betting Lines APIs** (DraftKings, FanDuel, BetMGM)
   - Availability: ~98% (competitive, more downtime)
   - Timeout: 3-15 seconds
   - Rate limiting: Strict, often change without notice

**Failure Scenarios:**
- ESPN API returns 500 during early morning (affects schedule load)
- DraftKings odds endpoint throttles requests (props load slowly)
- NBA Stats API maintenance window hits during peak usage
- Network timeout cascades to 30-second frontend hangs

**Mitigation:**
- [ ] **Implement Circuit Breaker Pattern**
  ```typescript
  // Example: If API fails 5x in 60s, stop calling for 5 minutes
  - Fail-fast behavior to prevent cascading failures
  - Automatic retry with exponential backoff
  - Clear error messages to users
  ```

- [ ] **Comprehensive Caching**
  - Cache all data with aggressive TTLs
  - Use stale data when APIs are down
  - Indicate data freshness to users ("Last updated 2h ago")
  - Store 7-day historical data for replay

- [ ] **Fallback Strategies**
  - Fallback to ESPN if NBA Stats API down
  - Use closing odds if live odds unavailable
  - Show cached schedule if API down
  - Queue updates for when service recovers

- [ ] **Monitoring & Alerting**
  - Monitor response times from each API (alert if >10s)
  - Track error rates (alert if >5%)
  - Alert on cache staleness (>24h old)
  - Daily health check reports

**Detection:**
- Real-time API health monitoring
- User reports (monitor support channels)
- Automated E2E tests (ping endpoints every 5 minutes)
- Data freshness alerts

---

### 4. Cache Coherency & Staleness (CRITICALITY: MEDIUM)

#### Risk: Cached data becomes stale, users see outdated information

**Probability:** MEDIUM (50%)
**Impact:** MEDIUM (users see outdated scores, old injuries, stale odds)
**Severity:** MEDIUM

**Scenarios:**
- Game finishes at 10 PM, but user sees old score until cache expires at 11 PM (1h old)
- Player injury reported at noon, but system shows as active until odds cache refreshes at 1 PM
- Odds change 10x in one minute, but user sees 30-minute-old line

**Cache TTLs (Proposed):**
- Schedule: 1 hour (games update infrequently, score updates in separate system)
- Players: 24 hours (roster changes rare)
- Stats: 30 minutes (updates frequently post-game)
- Injuries: 15 minutes (critical data, needs freshness)
- Odds: 5 minutes (highly time-sensitive)

**Problems with These TTLs:**
- 1h schedule cache: Users won't see live game updates
- 5min odds cache: High API traffic, betting lines API might throttle
- 30min stats cache: Advanced bettors miss early season stat updates

**Mitigation:**
- [ ] **Implement Cache Invalidation**
  - Event-driven invalidation (game finishes → update immediately)
  - Webhooks from data sources (if available)
  - Manual invalidation via admin panel
  - Scheduled refresh at key times (game start, finals)

- [ ] **Show Data Freshness**
  - Include "Last Updated" timestamp in API responses
  - Gray out data older than 30 minutes
  - Alert users if data >2h old
  - Let users manually refresh if needed

- [ ] **Multiple Cache Layers**
  - L1: In-memory cache (1min, very fast)
  - L2: Redis cache (15min, distributed)
  - L3: Database (persistent, no TTL)
  - Fallback to L3 if upstream unavailable

- [ ] **Real-Time Data Channels**
  - WebSocket connections for live score updates
  - Separate from cached historical data
  - Only sync changes, not full objects
  - Reduces API load

**Detection:**
- Monitor cache hit rates (should be >80%)
- Alert if data freshness drops below threshold
- Compare timestamps in user reports
- Track "data is stale" complaints

---

### 5. Database & ORM Changes (CRITICALITY: MEDIUM)

#### Risk: Data model changes require migrations, breaking existing queries

**Probability:** MEDIUM (60%)
**Impact:** MEDIUM (queries fail, slow performance)
**Severity:** MEDIUM

**Database Changes Needed:**

| Table | Change | Migration Risk | Rollback Risk |
|-------|--------|-----------------|-----------------|
| `games` | Add `league_id` column | Medium (index needed) | Low (column nullable) |
| `players` | Add `league_id` column | Medium (composite key) | Low (backward compatible) |
| `team_stats` | Add `league_id` column | Medium (composite key) | Low |
| `injuries` | Add `league_id` column | Low (new data) | Low |
| `odds` | Add `league_id`, restructure fields | High (major change) | High (needs backfill) |

**Migration Strategy:**
1. Add new columns to tables with nullable constraints
2. Deploy new code that handles both old (NBA only) and new (league-aware) formats
3. Backfill data in background job
4. Drop old columns in future release

**Risk Scenarios:**
- Migration hangs on `odds` table (10M+ rows)
- Query performance degrades after migration (missing indexes)
- Rollback incomplete, data inconsistency
- Old code tries to query data it doesn't understand

**Mitigation:**
- [ ] **Test migrations on production-sized data**
  - Clone production DB locally
  - Run migrations, measure time
  - Verify no locking issues
  - Test rollback procedure
  - Plan for downtime if needed

- [ ] **Zero-Downtime Migration Strategy**
  - Use feature flags to enable league_id handling
  - Deploy code before migrations
  - Run migrations during low-traffic window
  - Monitor for query failures
  - Keep old columns for backwards compatibility

- [ ] **Comprehensive Testing**
  - Unit test all new queries
  - Integration tests with real data
  - Performance tests (query times unchanged)
  - Backfill job testing
  - Rollback testing

- [ ] **Rollback Plan**
  - Keep old columns populated
  - Feature flag to revert to old query logic
  - Document how to reverse each migration
  - Test rollback procedure regularly

**Detection:**
- Monitor query performance (alert if queries slow >2x)
- Monitor application error logs
- Alert on migration failure
- User reports of missing data

---

### 6. Team Knowledge & Training (CRITICALITY: MEDIUM)

#### Risk: Team lacks understanding of new adapter pattern, causes bugs

**Probability:** HIGH (70%)
**Impact:** MEDIUM (bugs introduced in Phase 1, slow WNBA development)
**Severity:** MEDIUM

**Knowledge Gaps:**
- How adapter pattern works
- How to implement new sport adapters
- How to debug adapter-related issues
- Where league-specific code belongs
- How cache invalidation works

**Potential Issues:**
- Developer adds NBA-only code to core (regression)
- Adapter implementation has memory leaks
- New adapter implementer duplicates code instead of using base class
- Cache not cleared on data updates, causing bugs
- Performance regressions due to misunderstanding of caching

**Mitigation:**
- [ ] **Documentation**
  - Architecture Decision Record (ADR)
  - Developer guide for creating new adapters
  - Commented code examples
  - Troubleshooting guide
  - Video walkthrough of system

- [ ] **Training & Review**
  - Architecture review session with team (1-2 hours)
  - Code review process for Phase 1 (WNBA)
  - Pair programming on first WNBA implementation
  - Regular knowledge sharing meetings

- [ ] **Guardrails**
  - Linting rules to prevent NBA imports in core code
  - Architecture tests (verify no league-specific code in core)
  - Code review checklist for adapter implementations
  - Template for new sport adapters

**Detection:**
- Code review findings
- Architecture test failures
- User bug reports related to leagues
- Performance issues in new adapters

---

### 7. Performance Degradation (CRITICALITY: MEDIUM)

#### Risk: New adapter layer adds latency, slows down API responses

**Probability:** MEDIUM (40%)
**Impact:** MEDIUM (user-facing latency increase)
**Severity:** MEDIUM

**Latency Sources:**
1. **Adapter instantiation**: 5-10ms per request (factory pattern overhead)
2. **Cache lookup**: 1-2ms per request (redis overhead)
3. **Data transformation**: 10-50ms depending on data size
4. **Additional API calls**: If aggregating from multiple sources

**Performance Targets:**
- Schedule endpoint: <2s (95th percentile)
- Player search: <500ms (95th percentile)
- Stats: <1s (95th percentile)
- Odds: <500ms (95th percentile)

**Risk Scenarios:**
- Adapter instantiation becomes bottleneck (factory too heavy)
- Cache layer adds significant latency (redis network delay)
- Transformation logic too slow (O(n²) algorithm)
- New league data sources slower than old sources

**Mitigation:**
- [ ] **Performance Profiling**
  - Baseline performance of current system
  - Profile new adapter code for bottlenecks
  - Load testing with realistic data volumes
  - Identify slow transformation functions

- [ ] **Optimization Strategies**
  - Object pooling for adapter instances (reuse)
  - Async/parallel requests where possible
  - Optimize transformation algorithms (use maps, not nested loops)
  - Consider lazy loading for heavy data
  - Use batch endpoints if available

- [ ] **Caching**
  - Multi-layer cache (memory + redis + database)
  - Cache transformation results, not just API responses
  - Precompute expensive calculations
  - Implement cache warming

- [ ] **Monitoring**
  - Monitor response times per endpoint
  - Alert if p95 latency increases >10%
  - Track cache hit rates
  - Monitor CPU/memory usage

**Detection:**
- Performance regression tests (CI)
- Production monitoring (APM tools)
- User complaints about slowness
- Analytics on page load times

---

### 8. WNBA Data Availability & Quality (CRITICALITY: MEDIUM)

#### Risk: WNBA data sources are less mature, causing inconsistencies

**Probability:** HIGH (75%)
**Impact:** MEDIUM (WNBA feature quality issues)
**Severity:** MEDIUM

**Known Issues:**
- WNBA API documentation is sparse
- Fewer historical data sources (stats APIs, etc.)
- Betting odds from fewer sportsbooks
- Injury reports less consistently updated
- Player salary data not always available

**Risk Scenarios:**
- WNBA schedule API returns different data format than NBA
- Player props available only for major books, not all
- Historical stats incomplete or missing
- Injury reports lag by hours

**Mitigation:**
- [ ] **Preemptive Research**
  - Audit all available WNBA data sources
  - Identify gaps (missing stats, sparse APIs)
  - Plan workarounds (manual data entry, alternative sources)
  - Document WNBA vs NBA differences

- [ ] **Data Quality Checks**
  - Validation tests for WNBA data format
  - Completeness checks (all teams, players represented)
  - Consistency checks (records match games)
  - Outlier detection (stats within reasonable ranges)

- [ ] **Graceful Degradation**
  - Hide features if data unavailable (no props if not available)
  - Show data freshness/confidence levels
  - Provide fallback displays
  - Clear error messages to users

- [ ] **Community Sourcing**
  - Allow users to report data errors
  - Build feedback loop with official WNBA sources
  - Consider supplementing with community data if needed

**Detection:**
- Data quality monitoring
- User feedback on WNBA data accuracy
- Comparison tests (WNBA vs official sources)
- Historical trending of data gaps

---

## Medium-Risk Areas

### 9. Frontend Integration Complexity

**Risk:** Frontend components need significant changes to support league selection

**Probability:** MEDIUM (50%)
**Impact:** MEDIUM (longer development time, more QA)
**Severity:** MEDIUM

**Mitigations:**
- Abstract league selection into reusable component
- Create mock adapters for testing
- Invest in frontend testing infrastructure

---

### 10. Third-Party Integration Issues

**Risk:** Third-party APIs (betting, stats) change unexpectedly, breaking adapters

**Probability:** MEDIUM (50%)
**Impact:** MEDIUM (data features unavailable temporarily)
**Severity:** MEDIUM

**Mitigations:**
- Monitor API status pages continuously
- Implement robust error handling
- Have fallback data sources
- Regular integration testing

---

### 11. Concurrent Release Timing

**Risk:** Phase 0 delivery delays Phase 1 WNBA launch

**Probability:** MEDIUM (50%)
**Impact:** MEDIUM (business timeline pressure)
**Severity:** MEDIUM

**Mitigations:**
- Buffer timeline (3-4 weeks realistic for Phase 0)
- Identify WNBA blockers early
- Parallelize WNBA prep work during Phase 0

---

## Low-Risk Areas

### 12. Testing & QA
- Risk: Insufficient test coverage
- Mitigation: >90% code coverage target, comprehensive integration tests

### 13. Documentation
- Risk: New developers don't understand architecture
- Mitigation: Comprehensive documentation, training sessions

### 14. Operational Handoff
- Risk: Ops team doesn't know how to monitor/debug adapters
- Mitigation: Documentation, runbooks, training for ops

---

## Risk Response Plan

### If High-Risk Issue Occurs

**Data Consistency Problem:**
1. Immediately disable new adapter endpoints
2. Revert to legacy `/api/nba/` endpoints
3. Investigate root cause
4. Fix and re-test
5. Gradual rollout to users

**Breaking API Changes:**
1. Revert code changes
2. Implement proper versioning (v1 vs v2 endpoints)
3. Parallel run both versions
4. Gradual migration of clients
5. Deprecation period before removal

**Performance Degradation:**
1. Profile and identify bottleneck
2. Implement caching/optimization
3. Rollback if critical
4. Deploy fix incrementally

**Data Source Outage:**
1. Activate fallback data sources
2. Alert monitoring/ops team
3. Serve cached data to users
4. Implement circuit breaker if needed

---

## Monitoring & Metrics

**Phase 0 Specific Monitoring:**

```
Metrics to Track:
- API response times (p50, p95, p99)
- Cache hit rates
- Data freshness (time since last update)
- Error rates per endpoint
- External API latency and error rates
- Database query performance
- Memory usage of adapter instances
- Number of adapter instantiations per second

Alerting Rules:
- Response time p95 > 2000ms
- Cache hit rate < 70%
- Data freshness > 1 hour (injuries) or > 24 hours (players)
- Error rate > 5%
- External API error rate > 10%
- Database query time > 500ms
```

---

## Sign-Off

- **Technical Lead:** _______________  Date: _______
- **QA Lead:** _______________  Date: _______
- **Product Manager:** _______________  Date: _______
- **DevOps Lead:** _______________  Date: _______

---

## Appendix: Reference Documents

- PHASE_0_LeagueAdapter_Interface.ts
- PHASE_0_NBAAdapter.ts
- PHASE_0_MIGRATION_CHECKLIST.md
- Architecture Decision Record (TBD)
