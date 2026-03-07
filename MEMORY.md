# MEMORY.md

## Health: Stage 2 CKD
Creatinine 1.41 (↓ from 1.74), eGFR 63. Supplement: Nitric Oxide 750mg x3/day.
Priorities: Na <2000mg, Protein 0.8g/kg, BP <130/80, 150min exercise/wk, NO NSAIDs.

## Model Routing
- Claude Code Pro ($100/mo): All coding — unlimited
- Ollama (local): Ellis agent conversations — free
- Claude Haiku API: Vercel serverless only (NBA research, gated by ENABLE_CLAUDE_RESEARCH)
- Budget: $55/mo API cap | Kill switch: ~/.openclaw/DISABLE_CLAUDE

## Infrastructure
- EllaMac: M1 mini @ 192.168.10.101 | NBA backend:3000, Scout Mode daily 5:15 PM
- Local Ollama: localhost:11434 | qwen2.5-coder:7b (primary), llama3.2:3b, qwen2.5:14b
- Gateway: ws://127.0.0.1:18789

## Channels
- Telegram: Active decisions (@Ellis_Mac_bot)
- Discord: #nba-stats, #ninja-trader, #ellis, #spendguard

## NBA Stats Analyzer
Status: Phase 2 deployed, near launch
Vercel: nba-stats-analyzer-chuers-projects.vercel.app (root=frontend/)
Data: BallDontLie API, Reddit+ESPN sentiment, Claude Haiku research
Discord bot: /help, /predict, /sentiment, /stats
Revenue: Free → $9.99 → $24.99 + affiliate

## Other Projects
- NinjaTrader VWAP: Paused (entry logic needs rework)
- Scout Mode: Daily domain scanning, price cap $150
- Domains: nbaanalyticshub.com + .net

## Backups
Daily 6AM external, nightly 11PM GitHub, weekly 3AM Sun complete
