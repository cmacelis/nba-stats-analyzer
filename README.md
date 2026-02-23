# NBA Edge Detector

A web app for analyzing NBA statistics, comparing players, predicting game outcomes, and generating AI-powered prop bet edge signals.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + MUI — `frontend/`
- **Backend:** Node.js + Express + TypeScript — `backend/`

## Local Development

### Prerequisites
- Node.js 20+
- A [BallDontLie](https://www.balldontlie.io) API key
- An [Anthropic](https://console.anthropic.com) API key (for Edge Signal AI analysis)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in BALL_DONT_LIE_API_KEY and ANTHROPIC_API_KEY
npm run dev            # starts on http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:5173
```

The frontend proxies `/api/*` to `localhost:3000` in development.

## Environment Variables

| Variable | Where | Required |
|---|---|---|
| `BALL_DONT_LIE_API_KEY` | `backend/.env` | ✅ Yes |
| `ANTHROPIC_API_KEY` | `backend/.env` | ✅ Yes (falls back to simulated if missing) |
| `PORT` | `backend/.env` | Set to `3000` |
| `VITE_API_BASE_URL` | Vercel env settings | Production only — set to Heroku backend origin (no `/api`) |

## Deployment

### Frontend → Vercel
Connected via Vercel's GitHub integration. Deploys automatically on every push to `main`.

Config: [`vercel.json`](vercel.json)
- Build: `cd frontend && npm run build`
- Output: `frontend/dist`
- **Required:** Set `VITE_API_BASE_URL` in Vercel project settings to the Heroku backend origin (e.g. `https://your-app.herokuapp.com` — no `/api` suffix)

### Backend → Heroku
Deployed via GitHub Actions (`deploy.yml`) on push to `main`.

- Builds TypeScript (`tsc`) then deploys `backend/` to Heroku
- Heroku runs `npm start` → `node dist/index.js`
- Set all backend env vars in Heroku Config Vars

## CI

| Workflow | Triggers on | What it does |
|---|---|---|
| `frontend-ci.yml` | `frontend/**` changes | `npm ci` → lint → build (tsc + vite) |
| `backend-ci.yml` | `backend/**` changes | `npm ci` → build (tsc) |
| `deploy.yml` | push to `main` | Build + deploy backend to Heroku |
