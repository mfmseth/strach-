# Home Overview Dashboard — for Claude Design

This is my Home Assistant "Home Overview" dashboard (single view, `home-overview`). Attached: `home_overview_dashboard.yaml` — the exact current Lovelace config.

## What's on it today (top to bottom)
1. **Greeting/weather header** — markdown card, "Good Morning/Afternoon/Evening" + temp + condition, with a gradient background that changes based on current weather (sunny/clear-night/rainy/snowy/cloudy).
2. **Who's Home** — Mushroom person card (me) + a boolean toggle standing in for a second person ("Halley").
3. **Presence & Occupancy** — 4-column grid of Mushroom template cards (Upstairs / Bedroom / Bathroom / Downstairs), each showing occupied/clear + how long, motion-sensor icon that toggles color.
4. **Lights** — split into Upstairs (Kitchen, Entryway, Bedroom, Bathroom) and Downstairs (All Downstairs, Living Room, Office, Stairs) subgroups, 4-col grids of Mushroom light cards with brightness sliders.
5. **Fans** — 3-col grid, 6 Mushroom fan cards with percentage control (Living Room, Office, Entryway, Office Tower Fan, Bedroom Air Circulator, Living Room Air Circulator).
6. **Climate** — 3 Mushroom climate cards side by side (Upstairs, Bedroom, Downstairs) with temperature control.
7. **Vacuums** — 2 Mushroom template cards (Saros 10R, Roborock) showing "ran today" status with a check/x badge, derived from `input_datetime` helpers.
8. A view-level badge showing backup manager state.

## Tech stack constraints
- Home Assistant Lovelace, **storage mode** dashboard.
- Uses **Mushroom cards** (custom:mushroom-*) and **card-mod** for styling — both HACS custom cards, already installed. Any redesign should stay within what Mushroom/card-mod/native Lovelace (tile, heading, grid, stack, sections view) can do, since that's what will actually render.
- Every section is wrapped in a `vertical-stack` with the same card-mod "soft rounded panel" style (`rgba(var(--rgb-primary-color), 0.04)` background, subtle border, 18px radius) — that's the current visual language.
- Styling uses HA theme variables (`--rgb-primary-color` etc.) so it should adapt to light/dark theme, not hardcoded colors (except the intentional weather gradient).

## What I'd like help with
Take this and make it better — happy to hear ideas on layout, information density, visual hierarchy, what to cut/add, whether to move to a "sections" view, etc. Attaching the full YAML so you have every entity ID, template, and style already in place rather than guessing.
