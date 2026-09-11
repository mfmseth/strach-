/*
 * Modernist Home Card
 *
 * A 1:1 port of the "Home Dashboard" design study (Home Dashboard.dc.html) into a
 * real Home Assistant Lovelace custom card. The design study is a bespoke CSS-grid
 * layout with 2px divider rule-lines and hand-built toggle/slider controls - not
 * achievable by styling native tile cards, so this reproduces its exact markup and
 * wires it to live entities instead of the mockup's local component state.
 *
 * Config:
 *   type: custom:modernist-home-card
 *   person: person.vanden
 *   halley: input_boolean.halley
 *   weather: weather.forecast_home
 *   dark_mode_helper: input_boolean.dark_mode
 *   backup_state: sensor.backup_backup_manager_state
 *   backup_last: sensor.backup_last_successful_automatic_backup
 *   occupancy: [{entity, name}, ...]
 *   lights_up: [{entity, name}, ...]
 *   lights_down: [{entity, name}, ...]
 *   fans: [{entity, name, room}, ...]
 *   climate: [{entity, name}, ...]
 *   vacuums: [{entity, name, room, last_run_helper}, ...]
 */

const SPACE = { 1: "4px", 2: "8px", 3: "12px", 4: "16px", 6: "24px", 8: "32px" };

const PALETTE = {
  light: { bg: "#f3f2f2", surface: "#f3f2f2", text: "#201e1d", muted: "#6b6764", divider: "#201e1d", track: "#d4d1cf", onAccent: "#ffffff", knob: "#f3f2f2", accent: "#ec3013" },
  dark:  { bg: "#161514", surface: "#1c1b1a", text: "#f3f2f2", muted: "#a39e9a", divider: "#3a3836", track: "#3a3836", onAccent: "#161514", knob: "#161514", accent: "#ff4a2b" },
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function titleCase(s) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isSameLocalDay(isoString, ref) {
  if (!isoString) return false;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function formatBackupTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const hhmm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (isSameLocalDay(isoString, now)) return `${hhmm} today`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(isoString, yesterday)) return `${hhmm} yesterday`;
  return d.toLocaleDateString();
}

class ModernistHomeCard extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("modernist-home-card: config required");
    this._config = config;
    this._dark = null; // resolved from dark_mode_helper on first hass update
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 24;
  }

  _call(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  _lightPct(entity) {
    const st = this._hass.states[entity];
    if (!st || st.state !== "on") return 0;
    const b = st.attributes.brightness;
    return b == null ? 100 : Math.round((b / 255) * 100);
  }

  _fanPct(entity) {
    const st = this._hass.states[entity];
    if (!st || st.state !== "on") return 0;
    const p = st.attributes.percentage;
    return p == null ? 100 : Math.round(p);
  }

  _onSetFromClick(e, kind, entity) {
    const track = e.currentTarget;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    if (kind === "light") {
      if (pct <= 0) this._call("light", "turn_off", { entity_id: entity });
      else this._call("light", "turn_on", { entity_id: entity, brightness_pct: pct });
    } else {
      if (pct <= 0) this._call("fan", "turn_off", { entity_id: entity });
      else this._call("fan", "turn_on", { entity_id: entity, percentage: pct });
    }
  }

  _onToggle(kind, entity) {
    this._call(kind, "toggle", { entity_id: entity });
  }

  _onNudge(entity, delta) {
    const st = this._hass.states[entity];
    if (!st) return;
    const min = st.attributes.min_temp ?? 60;
    const max = st.attributes.max_temp ?? 85;
    const cur = st.attributes.temperature;
    if (cur == null) return;
    const next = Math.max(min, Math.min(max, cur + delta));
    this._call("climate", "set_temperature", { entity_id: entity, temperature: next });
  }

  _onToggleDarkMode() {
    const helper = this._config.dark_mode_helper;
    if (helper) this._call("input_boolean", "toggle", { entity_id: helper });
  }

  _chipStyle(active, t, accent) {
    return [
      "display:inline-block",
      "margin-top:8px",
      `padding:3px 10px`,
      `border:2px solid ${active ? accent : t.muted}`,
      `background:${active ? accent : "transparent"}`,
      `color:${active ? t.onAccent : t.muted}`,
      "font-size:11px",
      "font-weight:600",
      "letter-spacing:0.12em",
      "text-transform:uppercase",
    ].join(";");
  }

  _sliderRow(kind, item, t, accent, dense) {
    const entity = item.entity;
    const st = this._hass.states[entity];
    const on = st ? st.state === "on" : false;
    const pct = kind === "light" ? this._lightPct(entity) : this._fanPct(entity);
    const pctLabel = on ? `${pct}%` : "Off";
    const unavailable = !st || st.state === "unavailable";

    const rowStyle = [
      "display:grid",
      "grid-template-columns:52px minmax(120px,1fr) minmax(0,1.6fr) 48px",
      "align-items:center",
      "gap:16px",
      `padding:${dense ? "8px" : "12px"} 0`,
      `border-top:2px solid ${t.divider}`,
    ].join(";");

    const trackStyle = [
      "appearance:none",
      "width:48px",
      "height:26px",
      "padding:2px",
      `border:2px solid ${on ? accent : t.text}`,
      `background:${on ? accent : "transparent"}`,
      "display:flex",
      "align-items:center",
      `justify-content:${on ? "flex-end" : "flex-start"}`,
      "cursor:pointer",
    ].join(";");

    const knobStyle = ["display:block", "width:18px", "height:18px", `background:${on ? t.knob : t.text}`].join(";");
    const fillStyle = ["position:absolute", "top:0", "bottom:0", "left:0", `width:${on ? pct : 0}%`, `background:${on ? accent : "transparent"}`].join(";");

    const label = kind === "fan"
      ? `<div style="min-width:0">
           <div style="font-family:var(--mh-font);font-weight:700;font-size:15px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.name)}</div>
           <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${t.muted}">${esc(item.room || "")}</div>
         </div>`
      : `<div style="font-family:var(--mh-font);font-weight:700;font-size:15px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.name)}</div>`;

    return `
      <div style="${rowStyle}${unavailable ? ";opacity:0.4" : ""}">
        <button data-toggle="${kind}:${entity}" style="${trackStyle}" ${unavailable ? "disabled" : ""}><span style="${knobStyle}"></span></button>
        ${label}
        <div data-slider="${kind}:${entity}" style="height:24px;display:flex;align-items:center;cursor:pointer">
          <div style="position:relative;width:100%;height:8px;background:${t.track}">
            <div style="${fillStyle}"></div>
          </div>
        </div>
        <div style="font-family:var(--mh-font);font-weight:800;font-size:14px;font-variant-numeric:tabular-nums;text-align:right;min-width:48px">${pctLabel}</div>
      </div>`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;
    const hass = this._hass;

    const darkHelper = cfg.dark_mode_helper && hass.states[cfg.dark_mode_helper];
    const dark = darkHelper ? darkHelper.state === "on" : false;
    const t = dark ? PALETTE.dark : PALETTE.light;
    const accent = t.accent;
    const dense = !!cfg.dense_rows;

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

    const weatherSt = cfg.weather && hass.states[cfg.weather];
    const outsideTemp = weatherSt && weatherSt.attributes.temperature != null
      ? `${Math.round(weatherSt.attributes.temperature)}°${hass.config.unit_system.temperature || ""}` : "—";
    const outsideCondition = weatherSt ? titleCase(weatherSt.state) : "—";

    // Presence: people + occupancy zones in one ruled grid.
    const people = [];
    if (cfg.person && hass.states[cfg.person]) {
      const st = hass.states[cfg.person];
      const home = st.state === "home";
      people.push({ name: st.attributes.friendly_name || "Person", state: home ? "Home" : "Away", active: home });
    }
    if (cfg.halley && hass.states[cfg.halley]) {
      const st = hass.states[cfg.halley];
      const home = st.state === "on";
      people.push({ name: st.attributes.friendly_name || "Halley", state: home ? "Home" : "Away", active: home });
    }
    const zones = (cfg.occupancy || []).map((z) => {
      const st = hass.states[z.entity];
      const occupied = st ? st.state === "on" : false;
      return { name: z.name, state: occupied ? "Detected" : "Clear", since: st ? timeAgo(st.last_changed) : "", active: occupied };
    });
    const occupiedCount = zones.filter((z) => z.active).length;

    const presenceCellsHtml = [
      ...people.map((p) => `
        <div style="background:${t.surface};padding:16px">
          <div style="font-family:var(--mh-font);font-weight:800;font-size:16px;letter-spacing:-0.01em">${esc(p.name)}</div>
          <div style="${this._chipStyle(p.active, t, accent)}">${esc(p.state)}</div>
        </div>`),
      ...zones.map((z) => `
        <div style="background:${t.surface};padding:16px">
          <div style="font-family:var(--mh-font);font-weight:800;font-size:16px;letter-spacing:-0.01em">${esc(z.name)}</div>
          <div style="${this._chipStyle(z.active, t, accent)}">${esc(z.state)}</div>
          <div style="font-size:11px;font-weight:500;color:${t.muted};margin-top:4px">${esc(z.since)}</div>
        </div>`),
    ].join("");

    // Lights / fans summaries + rows.
    const lightsUp = cfg.lights_up || [];
    const lightsDown = cfg.lights_down || [];
    const allLights = [...lightsUp, ...lightsDown];
    const lightsOn = allLights.filter((l) => hass.states[l.entity] && hass.states[l.entity].state === "on").length;
    const fans = cfg.fans || [];
    const fansOn = fans.filter((f) => hass.states[f.entity] && hass.states[f.entity].state === "on").length;

    const climateRows = (cfg.climate || []).map((c) => {
      const st = hass.states[c.entity];
      const current = st ? st.attributes.current_temperature : null;
      const target = st ? st.attributes.temperature : null;
      const mode = st ? titleCase(st.state) : "—";
      return `
        <div style="background:${t.surface};padding:16px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:16px">
          <div style="min-width:0">
            <div style="font-family:var(--mh-font);font-weight:800;font-size:15px;letter-spacing:-0.01em">${esc(c.name)}</div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${t.muted};margin-top:4px">${esc(mode)} · now ${current != null ? Math.round(current) + "°" : "—"}</div>
          </div>
          <div style="font-family:var(--mh-font);font-weight:800;font-size:38px;line-height:0.9;letter-spacing:-0.03em;font-variant-numeric:tabular-nums">${target != null ? Math.round(target) + "°" : "—"}</div>
          <div style="display:flex;gap:4px">
            <button data-nudge="${c.entity}:-1" style="width:34px;height:34px;border:2px solid ${t.text};background:transparent;color:${t.text};font-family:var(--mh-font);font-weight:800;font-size:18px;line-height:1;cursor:pointer">−</button>
            <button data-nudge="${c.entity}:1" style="width:34px;height:34px;border:2px solid ${t.text};background:transparent;color:${t.text};font-family:var(--mh-font);font-weight:800;font-size:18px;line-height:1;cursor:pointer">+</button>
          </div>
        </div>`;
    }).join("");

    const today = new Date();
    const vacuumRows = (cfg.vacuums || []).map((v) => {
      const st = hass.states[v.entity];
      const lastRun = v.last_run_helper && hass.states[v.last_run_helper];
      const ran = lastRun && lastRun.state && lastRun.state !== "unknown" && lastRun.state !== "unavailable" && isSameLocalDay(lastRun.state, today);
      const liveState = st ? titleCase(st.state) : "—";
      return `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 0;border-top:2px solid ${t.divider}">
          <div style="min-width:0">
            <div style="font-family:var(--mh-font);font-weight:700;font-size:15px">${esc(v.name)}</div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${t.muted};margin-top:4px">${esc(v.room || "")}${v.room ? " · " : ""}${esc(liveState)}</div>
          </div>
          <div style="${this._chipStyle(!ran, t, accent)}">${ran ? "Ran today" : "Not yet today"}</div>
        </div>`;
    }).join("");

    const backupSt = cfg.backup_state && hass.states[cfg.backup_state];
    const backupLastSt = cfg.backup_last && hass.states[cfg.backup_last];
    let unavailableCount = 0;
    for (const eid in hass.states) {
      if (hass.states[eid].state === "unavailable") unavailableCount++;
    }
    const systemRows = [
      { name: "Backup manager", value: backupSt ? titleCase(backupSt.state) : "—", alert: false },
      { name: "Last backup", value: backupLastSt ? formatBackupTime(backupLastSt.state) : "—", alert: false },
      { name: "Unavailable entities", value: String(unavailableCount), alert: unavailableCount > 0 },
    ].map((s) => `
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 0;border-top:2px solid ${t.divider}">
        <div style="font-size:13px;font-weight:600;color:${t.muted}">${esc(s.name)}</div>
        <div style="font-family:var(--mh-font);font-weight:800;font-size:14px;color:${s.alert ? accent : t.text}">${esc(s.value)}</div>
      </div>`).join("");

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');
        :host { --mh-font: "Archivo", system-ui, sans-serif; display:block; }
        * { box-sizing: border-box; }
        button { font: inherit; }
        button:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; }
      </style>
      <div style="min-height:100%;background:${t.bg};color:${t.text};font-family:var(--mh-font);font-size:14px;line-height:1.4">

        <header style="display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding:16px 32px;border-bottom:2px solid ${t.divider};flex-wrap:wrap">
          <div style="display:flex;align-items:baseline;gap:16px">
            <div style="font-family:var(--mh-font);font-weight:800;font-size:26px;letter-spacing:-0.025em">${esc(greeting)}</div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted}">Home overview</div>
          </div>
          <div style="display:flex;align-items:baseline;gap:24px">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font-family:var(--mh-font);font-weight:800;font-size:20px;font-variant-numeric:tabular-nums">${esc(outsideTemp)}</span>
              <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${t.muted}">${esc(outsideCondition)}</span>
            </div>
            <div style="width:2px;align-self:stretch;background:${t.divider}"></div>
            <div style="font-family:var(--mh-font);font-weight:800;font-size:20px;font-variant-numeric:tabular-nums">${esc(clock)}</div>
            <button data-toggle-dark style="appearance:none;border:2px solid ${t.text};background:transparent;color:${t.text};font-family:var(--mh-font);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:4px 12px;cursor:pointer">${dark ? "Light" : "Dark"}</button>
          </div>
        </header>

        <section style="border-bottom:2px solid ${t.divider}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:12px 32px 0">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted}">Presence</div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${t.muted}">${occupiedCount} of ${zones.length} zones occupied</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(${people.length + zones.length || 1},minmax(0,1fr));gap:2px;background:${t.divider};margin:12px 32px 24px;border:2px solid ${t.divider}">
            ${presenceCellsHtml}
          </div>
        </section>

        <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(340px,1fr);gap:2px;background:${t.divider}">
          <div style="background:${t.bg}">

            <section style="padding:24px 32px;border-bottom:2px solid ${t.divider}">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted}">Lights — ${lightsOn} on</div>
                <button data-all-off="light" style="border:2px solid ${t.text};background:transparent;color:${t.text};font-family:var(--mh-font);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:4px 12px;cursor:pointer">All off</button>
              </div>
              <div style="font-family:var(--mh-font);font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px">Upstairs</div>
              <div style="display:flex;flex-direction:column;margin-bottom:24px">
                ${lightsUp.map((l) => this._sliderRow("light", l, t, accent, dense)).join("")}
              </div>
              <div style="font-family:var(--mh-font);font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px">Downstairs</div>
              <div style="display:flex;flex-direction:column">
                ${lightsDown.map((l) => this._sliderRow("light", l, t, accent, dense)).join("")}
              </div>
            </section>

            <section style="padding:24px 32px">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted}">Fans — ${fansOn} on</div>
                <button data-all-off="fan" style="border:2px solid ${t.text};background:transparent;color:${t.text};font-family:var(--mh-font);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:4px 12px;cursor:pointer">All off</button>
              </div>
              <div style="display:flex;flex-direction:column">
                ${fans.map((f) => this._sliderRow("fan", f, t, accent, dense)).join("")}
              </div>
            </section>
          </div>

          <div style="background:${t.bg}">
            <section style="padding:24px 32px;border-bottom:2px solid ${t.divider}">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted};margin-bottom:16px">Climate</div>
              <div style="display:flex;flex-direction:column;gap:2px;background:${t.divider};border:2px solid ${t.divider}">
                ${climateRows}
              </div>
            </section>

            <section style="padding:24px 32px;border-bottom:2px solid ${t.divider}">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted};margin-bottom:12px">Vacuums</div>
              <div style="display:flex;flex-direction:column">${vacuumRows}</div>
            </section>

            <section style="padding:24px 32px">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${t.muted};margin-bottom:12px">System</div>
              <div style="display:flex;flex-direction:column">${systemRows}</div>
            </section>
          </div>
        </div>
      </div>
    `;

    this._wireEvents();
  }

  _wireEvents() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-toggle]").forEach((el) => {
      const [kind, entity] = el.getAttribute("data-toggle").split(":");
      el.addEventListener("click", () => this._onToggle(kind, entity));
    });
    root.querySelectorAll("[data-slider]").forEach((el) => {
      const [kind, entity] = el.getAttribute("data-slider").split(":");
      el.addEventListener("click", (e) => this._onSetFromClick(e, kind, entity));
    });
    root.querySelectorAll("[data-nudge]").forEach((el) => {
      const [entity, delta] = el.getAttribute("data-nudge").split(":");
      el.addEventListener("click", () => this._onNudge(entity, Number(delta)));
    });
    root.querySelectorAll("[data-all-off]").forEach((el) => {
      const kind = el.getAttribute("data-all-off");
      el.addEventListener("click", () => {
        const list = kind === "light" ? [...(this._config.lights_up || []), ...(this._config.lights_down || [])] : (this._config.fans || []);
        list.forEach((item) => this._call(kind, "turn_off", { entity_id: item.entity }));
      });
    });
    const darkBtn = root.querySelector("[data-toggle-dark]");
    if (darkBtn) darkBtn.addEventListener("click", () => this._onToggleDarkMode());
  }
}

customElements.define("modernist-home-card", ModernistHomeCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "modernist-home-card",
  name: "Modernist Home Card",
  description: "1:1 port of the Modernist Home Dashboard design study",
});
