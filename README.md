# SAKAY

SAKAY is a ride-hailing and logistics platform for localized transport, focused on tricycles. This repository is an npm workspaces monorepo containing the passenger and driver apps, the TODA and LGU portals, the backend API, and shared code.

## Repository layout

| Path | What it is |
|---|---|
| `apps/passenger-pwa/` | Passenger PWA (React + Vite + MUI) |
| `apps/driver-pwa/` | Driver PWA (React + Vite + MUI) |
| `apps/toda-portal/` | TODA administration portal |
| `apps/lgu-portal/` | Local Government Unit portal |
| `packages/shared/` | Shared types and helper utilities (`@sakay/shared`) |
| `server/` | Express API backend (Node.js + TypeScript) |
| `supabase/` | Supabase config, migrations, and seed data |
| `docs/` | Policy decisions and compliance matrix |

## Getting started

Install dependencies for every workspace from the repository root:

```bash
npm install
```

Each app and the server ships a `.env.example`. Copy it to `.env` in the same folder and fill in the values before starting that workspace:

```bash
cp apps/passenger-pwa/.env.example apps/passenger-pwa/.env
cp server/.env.example server/.env
```

## Running locally

All commands run from the repository root.

| Command | Starts |
|---|---|
| `npm run dev` | Passenger PWA (alias for `dev:passenger`) |
| `npm run dev:passenger` | Passenger PWA |
| `npm run dev:driver` | Driver PWA |
| `npm run dev:toda` | TODA portal |
| `npm run dev:lgu` | LGU portal |
| `npm run dev:server` | Backend API |

## Building

| Command | Builds |
|---|---|
| `npm run build` | Everything (alias for `build:all`) |
| `npm run build:passenger` | Passenger PWA |
| `npm run build:driver` | Driver PWA |
| `npm run build:toda` | TODA portal |
| `npm run build:lgu` | LGU portal |
| `npm run build:server` | Backend API |

## Further reading

- [AGENTS.md](AGENTS.md) — coding standards, styling conventions, and contribution rules
- [ARCHITECTURE.md](ARCHITECTURE.md) — workspace layout and passenger feature mapping
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — detailed directory reference
