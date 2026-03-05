/**
 * [...route].ts — Catch-all router for consolidated API endpoints.
 *
 * This single Vercel function handles all consolidated routes:
 *   GET  /api/games
 *   GET  /api/players
 *   GET  /api/players/:id/stats
 *   GET  /api/players/photo
 *   GET  /api/players/compare/:id1/:id2
 *   GET  /api/research/:playerName
 *   POST /api/research/generate
 *   GET  /api/discord/help
 *   GET  /api/discord/today
 *   POST /api/picks/settle
 *   GET  /api/nba/* (routes to same handlers as /api/*)
 *
 * Reduces function count by consolidating 14+ endpoints into 1.
 */

export { default } from './_router.js';
