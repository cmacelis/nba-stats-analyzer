# Phase 0 Migration Checklist
## Multi-Sport League Adapter Refactoring

**Timeline:** Estimated 3-4 weeks | **Priority:** High - blocking WNBA integration | **Risk Level:** Medium

---

## 1. ANALYSIS & PLANNING (Week 1)

### 1.1 Code Audit
- [ ] **Map existing NBA-specific code**
  - [ ] Identify all files importing from `nba/*` packages
  - [ ] Document external API calls (ESPN, NBA Stats, betting sources)
  - [ ] List hardcoded NBA constants and configurations
  - [ ] Find NBA-specific business logic in core modules
  
- [ ] **Dependency Analysis**
  - [ ] Create dependency graph (which modules depend on what)
  - [ ] Identify circular dependencies that might block refactoring
  - [ ] Flag third-party packages that are NBA-specific
  - [ ] Document data model assumptions (NBA-only fields)

- [ ] **API Endpoint Mapping**
  - [ ] Document current `/api/nba/*` endpoints
  - [ ] Identify which endpoints can be generalized to `/api/{league}/*`
  - [ ] List endpoints that need league-specific wrappers
  - [ ] Flag endpoints with hardcoded NBA data

### 1.2 Requirements Confirmation
- [ ] Review and finalize LeagueAdapter interface with team
- [ ] Agree on cache strategy and TTLs
- [ ] Define error handling and fallback behavior
- [ ] Establish testing requirements (unit, integration, E2E)

### 1.3 Documentation
- [ ] Create architecture decision record (ADR)
- [ ] Document data flow (old NBA-only → new adapter-based)
- [ ] Create migration guide for other developers
- [ ] List breaking changes and deprecation timeline

---

## 2. IMPLEMENTATION PHASE (Weeks 2-3)

### 2.1 Setup & Infrastructure
- [ ] **Create adapter package structure**
  ```
  src/
    adapters/
      index.ts                    // Factory registration
      ILeagueAdapter.ts           // Interface (done ✓)
      base/
        BaseAdapter.ts            // Abstract base class
        AdapterCache.ts           // Shared caching logic
      nba/
        NBAAdapter.ts             // NBA implementation (done ✓)
        transformers.ts           // NBA-specific data transformation
        clients/                  // External API clients
          NBAStatsClient.ts
          ESPNClient.ts
          BettingLinesClient.ts
      wnba/
        WNBAAdapter.ts            // Placeholder for Phase 1
        transformers.ts
  ```

- [ ] **Create base adapter class**
  - [ ] Implement common caching logic
  - [ ] Implement common error handling
  - [ ] Implement common data validation
  - [ ] Document abstract methods

- [ ] **Setup dependency injection**
  - [ ] Create AdapterFactory (done in interface ✓)
  - [ ] Wire factory into app bootstrap
  - [ ] Make it injectable via DI container

### 2.2 NBAAdapter Implementation
- [ ] **Implement data source clients**
  - [ ] NBAStatsClient - connect to stats.nba.com
    - [ ] schedule()
    - [ ] playerStats()
    - [ ] teamStats()
    - [ ] Test with real API calls
  
  - [ ] ESPNClient - connect to ESPN API
    - [ ] schedule()
    - [ ] teams()
    - [ ] injuries()
    - [ ] Test with real API calls
  
  - [ ] BettingLinesClient - aggregate odds sources
    - [ ] getGameOdds()
    - [ ] getPlayerPropOdds()
    - [ ] Support multiple sportsbooks
    - [ ] Test aggregation logic

- [ ] **Implement data transformations**
  - [ ] Create transformers for each data type
  - [ ] Handle missing/optional fields gracefully
  - [ ] Normalize team IDs, player IDs, etc.
  - [ ] Add comprehensive logging for debugging
  - [ ] Write unit tests for each transformer

- [ ] **Implement caching layer**
  - [ ] Implement cache hit/miss logic
  - [ ] Set appropriate TTLs per data type
  - [ ] Add cache invalidation hooks
  - [ ] Add metrics (hit rate, memory usage)

- [ ] **Implement error handling**
  - [ ] Circuit breaker for API failures
  - [ ] Graceful degradation (cached data when API down)
  - [ ] Retry logic with exponential backoff
  - [ ] Comprehensive logging and alerting

### 2.3 API Layer Refactoring
- [ ] **Create league-aware middleware**
  - [ ] Extract {league} parameter from routes
  - [ ] Validate league is supported
  - [ ] Instantiate correct adapter
  - [ ] Attach to request context

- [ ] **Refactor API endpoints**
  - [ ] Create `/api/{league}/schedule` endpoint
    - [ ] Implement query parameters filtering
    - [ ] Add pagination support
    - [ ] Document response schema
  
  - [ ] Create `/api/{league}/players` endpoint
    - [ ] Support player search with multiple filters
    - [ ] Add pagination
    - [ ] Cache results
  
  - [ ] Create `/api/{league}/stats` endpoint
    - [ ] Support team stats queries
    - [ ] Support player stats queries
    - [ ] Add season filtering
  
  - [ ] Create `/api/{league}/injuries` endpoint
    - [ ] Filter by team/player
    - [ ] Include status updates
  
  - [ ] Create `/api/{league}/odds` endpoint
    - [ ] Support odds type filtering
    - [ ] Include line history where available

- [ ] **Keep legacy endpoints for compatibility** (Phase 0 only)
  - [ ] `/api/nba/*` routes delegate to adapter
  - [ ] Add deprecation warnings to legacy endpoints
  - [ ] Plan removal timeline (Phase 1)

### 2.4 Frontend Integration
- [ ] **Add league selector UI component**
  - [ ] Dropdown or toggle for NBA/WNBA
  - [ ] Persist selection in localStorage
  - [ ] Default to NBA

- [ ] **Update API calls**
  - [ ] Create league-aware API client
  - [ ] Replace hardcoded `/api/nba/` with `/api/{league}/`
  - [ ] Handle league parameter throughout app
  - [ ] Test with multiple leagues

- [ ] **Update data displays**
  - [ ] Ensure all stats tables work with new data format
  - [ ] Update charts/graphs to handle league variations
  - [ ] Handle missing league-specific fields gracefully
  - [ ] Update tooltips and help text

---

## 3. TESTING (Ongoing + Final Week)

### 3.1 Unit Tests
- [ ] **Adapter tests**
  - [ ] Test each adapter method in isolation
  - [ ] Mock all external API calls
  - [ ] Test cache hit/miss scenarios
  - [ ] Test error conditions
  - [ ] Target: >90% coverage

- [ ] **Transformer tests**
  - [ ] Test data transformation for each data type
  - [ ] Test missing/optional field handling
  - [ ] Test edge cases (null values, empty arrays, etc.)
  - [ ] Test data validation

- [ ] **Cache tests**
  - [ ] Test TTL expiration
  - [ ] Test cache invalidation
  - [ ] Test concurrent access
  - [ ] Test memory limits

### 3.2 Integration Tests
- [ ] **Test adapter → API endpoint flow**
  - [ ] Schedule endpoint returns correct data format
  - [ ] Players endpoint filters work correctly
  - [ ] Stats endpoint aggregates properly
  - [ ] Injury endpoint is current

- [ ] **Test data consistency**
  - [ ] Team IDs match across data types
  - [ ] Player IDs are consistent
  - [ ] Stats sum up correctly
  - [ ] Game scores match schedule

- [ ] **Test error handling**
  - [ ] API failures are handled gracefully
  - [ ] Fallback to cached data works
  - [ ] Errors are logged properly
  - [ ] User receives appropriate error messages

### 3.3 E2E Tests
- [ ] **Test full user workflows**
  - [ ] Load app, select league, view schedule
  - [ ] Search for player across leagues
  - [ ] View team stats for different leagues
  - [ ] Check injury reports
  - [ ] Place mock bets with correct odds

- [ ] **Test performance**
  - [ ] Schedule load time <2s (with cache)
  - [ ] Player search responds in <500ms
  - [ ] Stats aggregation <1s
  - [ ] API response times within SLA

### 3.4 Compatibility Testing
- [ ] **Backward compatibility**
  - [ ] Legacy `/api/nba/` endpoints still work
  - [ ] Old API clients can still connect
  - [ ] Frontend works without changes (for NBA)
  - [ ] Database migrations are backwards-compatible

- [ ] **Cross-browser testing**
  - [ ] UI works in Chrome, Safari, Firefox
  - [ ] Mobile responsiveness maintained
  - [ ] localStorage API works correctly

---

## 4. REFACTORING EXISTING CODE (Weeks 2-3)

### 4.1 Identify NBA-Only Code
- [ ] Find imports from current `src/nba/` directory
- [ ] Identify hardcoded "NBA" strings and constants
- [ ] Find NBA-specific data models
- [ ] Find NBA-specific business logic

### 4.2 Extract to Adapter
- [ ] Move NBA-specific logic into NBAAdapter
- [ ] Extract NBA-specific data transformations
- [ ] Move NBA-specific API clients into adapter
- [ ] Keep only generic logic in core

### 4.3 Remove NBA-Specific Code from Core
- [ ] **Data Models**
  - [ ] Extract NBA-only fields to adapter
  - [ ] Use generic types in core API responses
  
- [ ] **Configuration**
  - [ ] Move NBA-only config to NBAAdapter
  - [ ] Use generic config in core
  - [ ] Move hardcoded constants
  
- [ ] **API Handlers**
  - [ ] Remove NBA-specific logic from route handlers
  - [ ] Use adapter interface instead of NBA imports
  - [ ] Test handlers with different adapters
  
- [ ] **Business Logic**
  - [ ] Move NBA-specific calculations to adapter
  - [ ] Keep generic calculations in core
  - [ ] Extract NBA-specific rules

### 4.4 Update Imports
- [ ] Replace `import from 'src/nba'` with adapter
- [ ] Update internal service calls
- [ ] Remove references to hardcoded NBA paths
- [ ] Update type imports to use generic types

---

## 5. DEPLOYMENT & VALIDATION (Week 4)

### 5.1 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite against staging
- [ ] Performance test (load testing)
- [ ] Run security scan
- [ ] Validate all integrations (APIs, databases, etc.)

### 5.2 Data Validation
- [ ] Compare new adapter output vs. old code
  - [ ] Schedule data matches
  - [ ] Player data is identical
  - [ ] Stats calculations are the same
  - [ ] Injury reports are current
  - [ ] Odds are from same sources

- [ ] Verify data consistency
  - [ ] No missing games or players
  - [ ] Stats totals match
  - [ ] Timestamps are correct

### 5.3 Production Deployment
- [ ] Blue-green deployment strategy
- [ ] Feature flag for adapter endpoints
- [ ] Keep legacy NBA endpoints active initially
- [ ] Monitor error rates closely
- [ ] Gradual rollout to users

### 5.4 Monitoring & Alerting
- [ ] Setup adapter health check monitoring
- [ ] Monitor API response times
- [ ] Monitor cache hit rates
- [ ] Alert on data freshness issues
- [ ] Track adapter-specific metrics

---

## 6. DOCUMENTATION & CLEANUP (Final)

### 6.1 Documentation
- [ ] Update README with league adapter info
- [ ] Create developer guide for adding new leagues
- [ ] Document adapter interface and contract
- [ ] Create API documentation for new endpoints
- [ ] Update architecture docs

### 6.2 Code Cleanup
- [ ] Remove dead code (old NBA-specific code if not needed)
- [ ] Run linter and fix issues
- [ ] Ensure consistent code style
- [ ] Remove debug logging
- [ ] Add JSDoc comments

### 6.3 Knowledge Transfer
- [ ] Present architecture to team
- [ ] Train team on adapter pattern
- [ ] Document lessons learned
- [ ] Update team wikis/docs

---

## 7. PHASE 1 PREPARATION (End of Phase 0)

### 7.1 WNBAAdapter Skeleton
- [ ] Create WNBA-specific API client stubs
- [ ] Identify WNBA data sources
- [ ] Map WNBA data to LeagueAdapter interface
- [ ] Plan data transformation logic

### 7.2 WNBA Data Sources
- [ ] [ ] Research WNBA Stats API
- [ ] [ ] Identify injury report sources
- [ ] [ ] Research WNBA betting odds APIs
- [ ] [ ] Document API endpoints and auth

### 7.3 Feature Flags
- [ ] Add feature flag for WNBA in code
- [ ] Make league selection configurable
- [ ] Document how to enable WNBA

---

## Risk Mitigation Strategies

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Breaking existing NBA functionality | Comprehensive testing, backwards-compatible endpoints, feature flags | QA + Dev |
| Performance degradation | Cache strategy, load testing, metrics monitoring | Backend Dev |
| Data inconsistency | Integration tests, data validation, comparison with old system | QA |
| Team unfamiliarity with adapter pattern | Documentation, training, code reviews | Tech Lead |
| External API reliability | Circuit breaker, graceful degradation, redundant sources | Ops |

---

## Success Criteria

- ✅ All Phase 0 requirements met (interface, NBAAdapter, refactored core)
- ✅ 100% backward compatibility with legacy `/api/nba/` endpoints
- ✅ >90% unit test coverage
- ✅ Zero data inconsistencies vs. old system
- ✅ <2s schedule load time (with cache)
- ✅ New `/api/{league}/` endpoints fully functional
- ✅ Frontend supports league selector
- ✅ Documentation complete
- ✅ Team trained and comfortable with architecture
- ✅ Ready for WNBA implementation in Phase 1

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Disable adapter endpoints with feature flag
2. **Short-term**: Revert to legacy `/api/nba/` endpoints
3. **Analysis**: Root cause analysis, fix in branch
4. **Retry**: Deploy fix, comprehensive testing, gradual rollout
5. **Communication**: Update stakeholders on timeline

**Rollback success criteria**: All NBA functionality restored, zero data loss
