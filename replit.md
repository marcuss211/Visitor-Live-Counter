# VEVOB BAHİS - Live Active Users Counter

## Overview
An iGaming-themed "Live Active Users" counter that displays a synchronized active user count across all connected clients. Uses Server-Sent Events (SSE) for real-time updates with fallback polling.

## Architecture
- **Frontend**: React SPA with custom iGaming dark theme CSS
- **Backend**: Express with SSE broadcasting
- **Sync mechanism**: 45-second time slots, deterministic number computation based on Istanbul timezone
- **No database required**: Numbers are deterministically computed from server time

## Key Features
- Deterministic active user count based on Istanbul time (hour ranges, weekend boost)
- SSE real-time broadcasting every 45 seconds
- Fallback to polling if SSE connection fails
- Turkish number formatting (tr-TR locale)
- Green glow effect when count increases
- Rate limiting on API endpoints

## API Endpoints
- `GET /api/active-users` - Returns current active users data (JSON)
- `GET /events` - SSE stream for real-time updates
- `GET /health` - Health check

## Project Structure
- `client/src/pages/home.tsx` - Main page component with SSE client logic
- `client/src/pages/igaming.css` - Custom iGaming dark theme styles
- `server/activeUsers.ts` - Active users engine (computation, slots, SSE broadcasting)
- `server/routes.ts` - API routes and SSE endpoint

## Recent Changes
- 2026-02-11: Initial build of live active users counter
