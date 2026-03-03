/**
 * Smoke Test Pack for Phase 0
 * 
 * Tests critical endpoints to ensure NBA functionality remains intact
 * during Phase 0 adapter foundation work.
 * 
 * Usage: npx ts-node server/tests/smoke-test.ts
 * Or in CI: npm run test:smoke
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TIMEOUT = 10000;

interface TestResult {
  name: string;
  passed: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * Test helper: make HTTP request and check response
 */
async function test(name: string, method: string, path: string, expectedStatus = 200): Promise<void> {
  const startTime = Date.now();
  
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`\n▶ ${name}`);
    console.log(`  ${method.toUpperCase()} ${url}`);
    
    const response = await axios({
      method: method.toLowerCase(),
      url,
      timeout: TIMEOUT,
      validateStatus: () => true, // Don't throw on any status code
    });
    
    const duration = Date.now() - startTime;
    const passed = response.status === expectedStatus;
    
    results.push({
      name,
      passed,
      statusCode: response.status,
      duration,
    });
    
    if (passed) {
      console.log(`  ✓ Status: ${response.status} (${duration}ms)`);
    } else {
      console.log(`  ✗ Expected ${expectedStatus}, got ${response.status}`);
      console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as AxiosError;
    
    results.push({
      name,
      passed: false,
      error: err.message,
      duration,
    });
    
    console.log(`  ✗ Error: ${err.message} (${duration}ms)`);
    if (err.response?.data) {
      console.log(`  Response: ${JSON.stringify(err.response.data).substring(0, 200)}`);
    }
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Phase 0 Smoke Test Pack - NBA Stability Checks       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  // Health checks
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Health & System Checks');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await test('Health Check', 'GET', '/api/health', 200);
  
  // NBA endpoints
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('NBA Data Endpoints');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Player endpoints
  await test('Player Search (LeBron)', 'GET', '/api/nba/player/search?name=lebron', 200);
  await test('Player Stats (Generic ID)', 'GET', '/api/nba/player/12345/stats', 200);
  
  // Game endpoints
  await test('Games List', 'GET', '/api/nba/games', 200);
  await test('Schedule', 'GET', '/api/nba/schedule', 200);
  
  // Comparison endpoint
  await test('Player Compare', 'GET', '/api/nba/compare?player1Id=1&player2Id=2', 200);
  
  // Additional endpoints
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Additional Endpoints');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await test('News Feed', 'GET', '/api/nba/news', 200);
  
  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total);
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Average Duration: ${avgDuration}ms\n`);
  
  // Detailed results
  console.log('Detailed Results:');
  results.forEach((result, i) => {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${i + 1}. [${icon}] ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Exit with appropriate code
  const failureCount = total - passed;
  if (failureCount === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failureCount} test(s) failed\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
