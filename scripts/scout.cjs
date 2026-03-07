#!/usr/bin/env node

// This script is a wrapper to run the scout-mode system
// It's called by the cron job: npm run scout --prefix /Users/ellis/.openclaw/workspace/nba-analyzer

const { execSync } = require('child_process');
const path = require('path');

console.log('🏀 NBA Analyzer Scout Mode Wrapper');
console.log('📅', new Date().toISOString());

try {
  // Run the actual scout-mode system
  const scoutModePath = path.join(process.env.HOME, 'scout-mode');
  const result = execSync(`cd "${scoutModePath}" && /opt/homebrew/bin/node index.js`, {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('✅ Scout Mode executed successfully via wrapper');
  process.exit(0);
} catch (error) {
  console.error('❌ Scout Mode wrapper failed:', error.message);
  process.exit(1);
}