# Spec decisions

Locked overrides for Crema. UI/UX Requirements win on colour, type, theme, and micro-interaction numbers. Dev Requirements win on API, data, and security. A detailed animation page wins over that spec's own summary table. This file wins where those documents disagree with each other.

## Theme

Three themes, visitor local time:

- Morning Brew, 06:00–11:59, light
- Afternoon Chill, 12:00–17:59, light
- Night Decaf, 18:00–05:59, dark

There is no golden-hour theme. At 19:30 with no manual choice the theme is Night Decaf before first paint.

Precedence is manual toggle, then time of day, then `prefers-color-scheme`. The system theme is used only when local time is unknown. A manual choice is stored in `localStorage` under `crema:theme`.

The first HTML render uses a neutral greeting, "Freshly poured.", unless a `crema-tz` cookie is already set. An inline script in `head` sets `data-tod` and `data-theme` before paint and writes that cookie. `<html>` uses `suppressHydrationWarning`.

## Motion tier

- STATIC when `prefers-reduced-motion: reduce` or `localStorage["crema:reduceMotion"] === "1"`.
- LITE when Save-Data is on, or `hardwareConcurrency` is present and `<= 4`, or `deviceMemory` is present and `<= 4`.
- Missing `deviceMemory` is not low. A machine with 5 or more cores is not LITE from the CPU count alone. The animation spec's `< 6` core cutoff is not used.
- FULL otherwise. If a FULL session stays under 50 fps for 2 seconds, it drops to LITE and stays there.

Glass uses the same LITE tier: blur capped at 12px, no extra saturation. Without `backdrop-filter`, the surface is an 0.88 tint plus noise.

## Motion numbers

- Add to cart is 600 ms. The badge scales `1 → 1.2 → 1` with `cubic-bezier(.2, .8, .2, 1)`.
- ANIM-16 reduced motion is a static seasonal SVG. It does not run on Home.
- Home's only signature moment is the pour (ANIM-01). Time-of-day lighting may run with it. The steam cursor and seasonal particles may not.

## Colour and type

Espresso 900 `#2B1A12` on Matcha 500 `#8DBF6A` is 7.78:1. The 10.0:1 figure in TK-C02 is wrong. The hex values stay. The pair still passes AAA.

Fonts are self-hosted through `next/font`, Latin only. Fraunces uses `wght` and `SOFT`, not `opsz`. Inter and JetBrains Mono make up the other two families. Target 150 KB, fail the budget above 180 KB.

## Orders, loyalty, payments

Customer stages move forward only: `received → grinding → brewing → steaming → ready → collected`, plus terminal `cancelled`. `pending_payment` is not a tracker stage. The barista advances stages on the KDS. Events are append-only. A correction is a new event with a reason.

Stamps and beans are written only when an order becomes `collected`, one ledger row per qualifying drink line, idempotent per line. Ten stamps issue a free-drink reward. Beans are `floor(line subtotal)` and feed the 12-month tier. The client never increments either balance.

Gift cards are out of v1. Checkout does not offer them.

Customer realtime is SSE with a 15 second heartbeat. The stream closes while the tab is hidden and resumes with `Last-Event-ID`. The poll fallback is `GET /orders/{id}` every 15 seconds.

Guest checkout uses an httpOnly `crema_guest` cookie, `SameSite=Lax`. Customer sign-in for v1 is a magic link. Passkeys come in phase 2. Prices, tax, slots, and loyalty are computed on the server.

## Run

```powershell
corepack pnpm install
uv sync --directory services/api
docker compose -f infra/docker-compose.yml up -d
corepack pnpm dev:api
corepack pnpm dev
```

Web: http://localhost:3000. API: http://127.0.0.1:8000/health and http://127.0.0.1:8000/v1/config.
