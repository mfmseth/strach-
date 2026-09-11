# Home Overview — redesign handoff

Two deliverables:

- `home_overview_dashboard.v2.yaml` — drop-in replacement for the current view. Paste into
  **Dashboard → Edit → ⋮ → Raw configuration editor**. Back up `home_overview_dashboard.yaml` first.
- `Home Dashboard.dc.html` — the visual design study (desktop, Modernist type/grid system).
  Reference for hierarchy and density, not for HA theming.

## What changed and why

**Sections view instead of stacked vertical-stacks.** The old view was one column of eight
panels, so on desktop everything below Lights was off-screen. `type: sections` with
`max_columns: 3` reflows into columns, and each section is independently draggable.

**The rounded-panel card-mod wrapper is gone.** Every section carried the same
`rgba(var(--rgb-primary-color), 0.04)` panel, so the styling stopped distinguishing anything.
Sections already group visually; `heading` cards carry the hierarchy. This also removes ~8
copies of duplicated card-mod CSS.

**Status moved to view badges.** Who's home, weather temp/condition, and backup manager state
are now badges at the top. The "Who's Home" section is deleted — it was two cards of vertical
space for two booleans. The backup badge is conditional: it only appears when state is not
`idle`.

**Greeting slimmed.** Kept the weather-gradient header — it is the one deliberate piece of
colour — but dropped the duplicated temp/condition line (now a badge) and reduced it to one
line of text.

**Occupancy: Mushroom template cards → native tiles.** `state_content: [state, last_changed]`
produces "Detected · 12 minutes ago" natively. Four cards' worth of Jinja for icon and colour
swaps deleted; state colouring is native tile behaviour.

**Lights and fans: vertical icon grids → horizontal tiles with inline sliders.** The 4-across
Mushroom grid put brightness sliders at ~60px wide. Full-width tiles give a real slider, and
the name is always legible. Fans renamed `Room — Type` so `air_circulator` vs
`air_circulator_2` is unambiguous.

**Climate: Mushroom climate → native tile** with `target-temperature` and `climate-hvac-modes`
features, plus current temperature in `state_content`.

**Vacuums kept on Mushroom.** The "ran today" badge derived from `input_datetime` helpers has
no native equivalent, so this section stays as-is (with vacuum state appended to the
secondary line).

## Custom dependencies after this change

Only `custom:mushroom-template-card` (chores section) and `card-mod` (greeting gradient).
`mushroom-person-card`, `mushroom-entity-card`, `mushroom-light-card`, `mushroom-fan-card`,
and `mushroom-climate-card` are no longer used by this view.

## Verify after pasting

1. Tile `features_position: inline` requires HA 2024.8+. If sliders render below the tile
   instead of beside it, the HA version is older — remove the `features_position` lines.
2. `heading` card `badges:` requires HA 2024.11+. Remove the `badges:` block under the Lights
   heading if it errors.
3. Confirm `binary_sensor.*_occupancy*` entities have a device class of `occupancy` or
   `motion`, otherwise tiles will show "On/Off" rather than "Detected/Clear".

## Open questions

- Cameras, locks, and energy are not in the current view. Worth adding, or deliberately out?
- The `input_boolean.halley` stand-in: a real `person` entity would let the presence badge
  colour and last-changed work properly.
