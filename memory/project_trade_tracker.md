---
name: project-trade-tracker
description: Trade Republic personal investment tracker app — full-stack React+Express+SQLite at /Users/coze/Desktop/trade
metadata:
  type: project
---

Full-stack personal investment tracker for Trade Republic DCA strategy.

**Why:** Personal usage only. 300 €/mois DCA: 250 CT (World 160, Nasdaq 45, Europe 35, EM 10) + 50 BTC. 30-year horizon.

**Stack:** React + Vite (frontend, port 5173) · Express (backend, port 3001) · SQLite via better-sqlite3 · Tailwind CSS · Recharts · bcryptjs + JWT (cookies)

**Key paths:**
- Server: `server/index.js` — all API routes + DB init
- DB file: `data/trade.db` (auto-created)
- React entry: `src/main.jsx` → `src/App.jsx`
- Components: `src/components/` (Dashboard, AddEntry, Assets, Projection, History, Layout, Login, Setup)
- Utilities: `src/lib/utils.js` (math, formatters, chart builders) · `src/lib/api.js` (fetch helpers)

**DB schema:**
- `users` (id, password_hash)
- `entries` (id, poche ct/crypto, amount, date, note, type dca/detail/simple, breakdown_world/nasdaq/eur/em)
- `portfolio_values` (id, poche, actif world/nasdaq/europe/em/btc/total, value, date)

**Start:** `npm run dev` (requires Node.js ≥ 18). First launch shows Setup page to create password.
**Prod:** `npm run build && npm start`

**Colors:** CT #378ADD · Nasdaq #7F77DD · Europe #1D9E75 · EM #D85A30 · Crypto/BTC #E9A827

**How to apply:** When resuming work on this project, check server/index.js for API, src/lib/utils.js for shared logic, and refer to these notes for the data model and business rules.
