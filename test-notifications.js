#!/usr/bin/env node

/**
 * Test script for notification endpoints
 * Usage: node test-notifications.js
 */

const BASE_URL = 'https://nba-stats-analyzer-chuers-projects.vercel.app/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdXNlci5jb20iLCJpYXQiOjE3NDI4NDgwMDAsImV4cCI6MTc0MzQ1MjgwMH0.test-signature-do-not-use-in-production';

async function testEndpoint(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`\n=== Testing ${method} ${path} ===`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const status = response.status;
    const text = await response.text();
    
    console.log(`Status: ${status}`);
    
    try {
      const json = JSON.parse(text);
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch {
      console.log('Response (text):', text.substring(0, 200));
    }
    
    return { status, ok: response.ok };
  } catch (error) {
    console.log('Error:', error.message);
    return { status: 0, ok: false };
  }
}

async function runTests() {
  console.log('=== Testing Notification Endpoints ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test token: ${TEST_TOKEN.substring(0, 50)}...`);
  
  // Test 1: GET /api/notifications/preferences (should return 401 without token)
  await testEndpoint('GET', '/notifications/preferences');
  
  // Test 2: GET /api/notifications/preferences with token
  await testEndpoint('GET', '/notifications/preferences', null, {
    'Authorization': `Bearer ${TEST_TOKEN}`
  });
  
  // Test 3: POST /api/notifications/register with token
  await testEndpoint('POST', '/notifications/register', {
    device_token: 'ExpoPushToken[TestDeviceToken123]',
    platform: 'ios'
  }, {
    'Authorization': `Bearer ${TEST_TOKEN}`
  });
  
  // Test 4: POST /api/notifications/preferences with token
  await testEndpoint('POST', '/notifications/preferences', {
    saved_player_alerts: true,
    daily_top_edge: false,
    game_day_alerts: true
  }, {
    'Authorization': `Bearer ${TEST_TOKEN}`
  });
  
  // Test 5: Test that other endpoints still work
  await testEndpoint('GET', '/players?search=lebron');
  await testEndpoint('GET', '/auth-mobile/session');
  
  console.log('\n=== Tests Complete ===');
}

// Run tests
runTests().catch(console.error);