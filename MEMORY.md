# MEMORY.md

## Health: Stage 2 CKD
Creatinine 1.41 (↓ from 1.74), eGFR 63. Supplement: Nitric Oxide 750mg x3/day.
Priorities: Na <2000mg, Protein 0.8g/kg, BP <130/80, 150min exercise/wk, NO NSAIDs.

## Model Routing (Updated Mar 6, 2026)
- **Primary:** Google Gemini 2.5 Flash (FREE — 250 req/day)
- **Fallback chain:** DeepSeek V3 ($0.28/1M) → Groq Llama 3.3 70B (free) → Claude Haiku 4.5 ($0.80/1M)
- Cerebras removed Mar 6 — free tier ended, all models require payment now
- Claude Code Pro ($100/mo): All coding — unlimited (separate subscription)
- Heartbeat: Ollama qwen2.5:7b-instruct (local, every 30m)
- Budget: $55/mo API cap | Kill switch: ~/.openclaw/DISABLE_CLAUDE
- Cost note: Mar 1 spike was $30 (6 feature commits). Normal daily <$6.

## Infrastructure
- EllaMac: M1 mini @ 192.168.10.101 | NBA backend:3000, Scout Mode daily 5:15 PM
- Local Ollama: localhost:11434 | qwen2.5-coder:7b, llama3.2:3b, qwen2.5:14b
- Gateway: ws://127.0.0.1:18789 (port 18789)
- Mission Control: localhost:5174 (frontend) / :5175 (backend) — ~/mission-control/
- QMD memory: working (timeoutMs: 30000 for CPU reranker)

## Channels
- Telegram: Active decisions (@Ellis_Mac_bot) — PRIMARY
- Discord: #nba-stats, #ninja-trader, #ellis, #spendguard (full access — send, read, react)

## NBA Stats Analyzer
Status: Phase 4 (Real WNBA Data) deployed and verified
Vercel: nba-stats-analyzer-chuers-projects.vercel.app (root=frontend/)
Data: BallDontLie API (NBA), Real WNBA 2025 season stats
Discord bot: /help, /predict, /sentiment, /stats
Revenue: Free → $19 → $24.99 + affiliate

Phase 4 Complete (Mar 7, 2026):
- Real WNBA 2025 season statistics integrated (12 key players)
- Three-tier data fetch: BDL → ESPN → Real stats
- Verified: /api/wnba/edge, /api/edge?league=wnba, /api/alerts/run?league=wnba
- NBA behavior preserved (18 edges, unchanged)
- Commits: 43c01a5 (feat), 39612d0 (docs)

## Token Optimization (Completed Mar 3)
- Phases 1-3 all operational. Hard limit $50, weekly Telegram alerts.
- Per-project: NBA 60%, Ninja 25%, Infra 10%, Research 5%
- 13 scripts + Mission Control dashboard deployed.

## Other Projects
- NinjaTrader VWAP: Paused (entry logic needs rework)
- Scout Mode: Daily domain scanning, price cap $150
- Domains: nbaanalyticshub.com + .net

## Backups
Daily 6AM external, nightly 11PM GitHub, weekly 3AM Sun complete
