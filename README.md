# KNUST Shuttle — Campus Transit Live

A live campus shuttle tracker for KNUST, Kumasi, built with React + TypeScript,
MapLibre GL, Supabase (auth + Postgres + realtime), and a Nitro server layer.

Three role-based apps share one platform:

- **Student** (`/tracker`) — live moving-shuttle map, arrival ETAs, nearest-stop
  walk distance.
- **Driver** (`/driver`) — pick an assigned shuttle, start a trip, and broadcast
  your live location to every tracker viewer.
- **Admin** (`/admin`) — manage stops, draw & road-snap routes, assign shuttles
  and drivers, create driver accounts, and set roles.

## Tech stack

| Layer       | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| UI          | React 18 + TypeScript + Vite                                  |
| Styling     | Tailwind CSS + shadcn/ui                                      |
| Map         | MapLibre GL with a bundled campus snap-style (or `VITE_MAP_STYLE_URL`) |
| Backend     | Supabase (Postgres + Auth + Realtime) + Nitro server routes   |
| Edge funcs  | Supabase Edge Functions (admin-only user ops)                 |

## Getting started

```bash
npm install
npm run dev
```

No `.env` is required to run — the app falls back to the connected KNUST
Supabase project. To override, copy `.env.example` to `.env` (see below).

## Environment variables

See `.env.example`. All are optional:

| Variable                 | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (browser-safe)                            |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key (browser-safe)                        |
| `VITE_MAP_STYLE_URL`     | Optional MapLibre style URL to replace the built-in campus map |

> Secrets (`service_role`, DB URL) **never** live in the client bundle. They are
> only used inside Edge Functions, which ship pre-configured with
> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
> `SUPABASE_DB_URL`.

## Auth & routing

- `/login` — Supabase Auth UI (email + password, toggle sign-up). Redirects
  return to `/auth/callback`, which resolves the role and routes the user home
  (`/tracker`, `/driver`, or `/admin`).
- `/reset-password` — password-update screen for `type=recovery` links.
- `/` — landing page; authenticated users are smart-redirected by role.
- `ProtectedRoute` gates each app page; `/admin` requires the `admin` role,
  `/driver` requires `driver` or `admin`.

The first account ever created becomes the **admin** by default — the
`handle_new_user` trigger on `auth.users` sets `role='admin'` when the
`profiles` table is empty, and `student` on every later sign-up.

## Admin workflow

1. **People** — create a driver (name + email + temp password) or flip any
   user's role via the dropdown. Password resets email a recovery link.
2. **Stops** — add stops by clicking the map (or your GPS location), rename,
   move, delete.
3. **Routes** — draw a path on the map, click **Snap to roads**
   (`POST /api/snap-route`, OSRM), then order the stops the bus visits.
4. **Shuttles** — add buses, link them to a route and a driver, toggle live
   visibility.
5. **Overview** — fleet health: shuttles, live-now, routes, stops, drivers,
   and trips today.

## Backend notes

### Nitro routes (`server/routes/api/`)

- `POST /api/snap-route` — snaps a drawn polyline to campus roads via OSRM,
  returns the snapped `LineString` + `distance_m`.
- `POST /api/walk-distance` — straight-line walking distance from a point to a
  stop.
- `GET /api/hello` — health/smoke test.

Nitro is wired in `vite.config.ts` (`nitro()` last in plugins) and configured by
`nitro.config.ts` (`serverDir: "./server"`). h3 helpers are imported from
`nitro/h3`; `defineHandler`/`useRuntimeConfig` from `nitro`.

### Edge Functions (`supabase/functions/`)

These verify the caller's JWT, confirm the `admin` role, and use
`SUPABASE_SERVICE_ROLE_KEY`:

- `list-users` — all auth users joined with profile role/name (emails are not
  exposed via the Data API).
- `set-role` — update a user's role (blocks changing your own role).
- `create-driver` — create a confirmed user with the `driver` role
  (admins approve who holds the role rather than open sign-ups).

## Database

Tables: `profiles`, `stops`, `routes`, `route_stops`, `buses`,
`bus_locations`, `trips`.

- RLS is enabled everywhere; clients only see rows they own (plus admin
  visibility), and only drivers can write to their assigned bus's location via
  policies scoped to `buses.driver_id`.
- A trigger on `auth.users` creates a `profiles` row on sign-up.

### Demo seed data

The connected project ships with seeded demo data so the tracker, admin
dashboard, and fleet views are populated instantly:

- **12 stops** around campus (Tech Junction, Great Hall, Commercial Area, …)
- **2 routes** — *Main Loop* (7 stops) and *University Link* (6 stops), each
  with road geometry + stop order
- **4 shuttles** (*Shuttle 1–4*) assigned across the two routes (one inactive)

No live `bus_locations` are seeded — shuttles appear on the tracker when a
driver starts a trip and broadcasts. Admins can edit or delete all of this from
the admin dashboard at any time.

## Deployment notes

- Client + Nitro deploy to Vercel (`vercel.json` provided); Edge Functions run
  in Supabase and deploy automatically with the project.
- The `Providers`/URL configuration must allow your deployment origin (and the
  local preview origin) for `/auth/callback` and `/reset-password` redirects.
- Road snap + walk distance depend on the Nitro API being reachable from the
  client (same origin in dev/preview).
