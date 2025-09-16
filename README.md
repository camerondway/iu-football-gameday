# Indiana Football Roster Explorer

A Vite + React application that pulls the full Indiana University football roster from ESPN and presents it in a fast, searchable table.

## Features
- Live roster data sourced directly from ESPN, automatically keeps the roster current
- Quick search across player name, jersey number, position, class, and hometown
- Tailwind CSS-powered UI with sticky table headers on desktop and mobile-friendly player cards
- Lightweight and fast thanks to Vite, TypeScript, and modern React

## Getting Started
1. Install dependencies (already included in `package-lock.json`):
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the printed local URL in your browser to explore the roster. Changes you make in `src/` will hot reload instantly.

## Production Build
Create an optimized bundle with:
```bash
npm run build
```
The static assets are emitted to the `dist/` folder.

## Notes
- The roster data comes from `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/84?enable=roster`. No additional API keys are required.
- If the API is unavailable, the app shows a friendly error message and encourages a retry.
- Styling is handled with Tailwind CSS (`tailwind.config.js` + `src/index.css`).
