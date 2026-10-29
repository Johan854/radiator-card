{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Radiator Card (FR)
 * Carte Home Assistant pour radiateur / sèche-serviette connecté : dessin animé qui chauffe (ou photo de l'appareil),
 * température ambiante, consigne réglable, modes, préréglages et interrupteurs (Boost, Programme, Absence...).
 * Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.0.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */
const DEFAULTS = {
  name: "", theme: "auto", ...GV_DEFAULTS,
  entity: "", // climate
  appliance: "towel", // towel (sèche-serviette) | radiator (radiateur)
  temperature_entity: "", // température ambiante (sinon current_temperature du climate)
  target_entity: "", // number / input_number de consigne (sinon la consigne du climate)
  boost_entity: "", // switch du mode boost (mis en avant)
  switches: [], // autres interrupteurs : Programme, Absence, Présence...
  info_entities: [],
  image: "", image_mode: "background", image_opacity: 0.35,
  temp_step: 0, show_controls: true, show_modes: true, show_presets: true,
};
const MODES = { off: ["Arrêt", "mdi:power"], heat: ["Chauffage", "mdi:radiator"], auto: ["Auto", "mdi:thermostat-auto"], heat_cool: ["Auto", "mdi:sun-snowflake-variant"], cool: ["Froid", "mdi:snowflake"], fan_only: ["Ventilation", "mdi:fan"], dry: ["Déshumid.", "mdi:water-percent"] };
const PRESETS = { eco: "Éco", comfort: "Confort", away: "Absent", home: "Présent", boost: "Boost", sleep: "Nuit", none: "Aucun", activity: "Activité", manual: "Manuel", schedule: "Programme", frost_protection: "Hors-gel" };
const ACTIONS = { heating: "Chauffe", idle: "En attente", off: "Arrêt", cooling: "Refroidit", fan: "Ventile", drying: "Déshumidifie" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isNum = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
const bad = (st) => !st || st.state === "unavailable" || st.state === "unknown";
const tr = (map, k) => (map[k] !== undefined ? (Array.isArray(map[k]) ? map[k][0] : map[k]) : k ? String(k).charAt(0).toUpperCase() + String(k).slice(1).replace(/_/g, " ") : "");
let UID = 0;

function artSvg(kind, mode, uid) {
  const heat = mode === "heat" || mode === "boost";
  const bars = Array.from({ length: kind === "towel" ? 7 : 0 }, (_, i) => 30 + i * 13);
  if (kind === "radiator") {
    const cols = Array.from({ length: 7 }, (_, i) => 20 + i * 11);
    return `<svg viewBox="0 0 120 110" aria-hidden="true" class="sv"><rect x="10" y="22" width="100" height="62" rx="8" fill="var(--rd-box)" stroke="var(--rd-line)" stroke-width="1.4"/>
      ${cols.map((x) => `<rect x="${x}" y="28" width="7" height="50" rx="3.5" fill="${heat ? "var(--rd-hot)" : "var(--rd-pipe)"}" ${heat ? `class="glow"` : ""}/>`).join("")}
      <rect x="22" y="84" width="6" height="12" fill="var(--rd-line)"/><rect x="92" y="84" width="6" height="12" fill="var(--rd-line)"/>
      ${heat ? waves(60, 18) : ""}</svg>`;
  }
  return `<svg viewBox="0 0 120 150" aria-hidden="true" class="sv">
    <rect x="22" y="22" width="76" height="106" rx="8" fill="var(--rd-box)" stroke="var(--rd-line)" stroke-width="1.4"/>
    <rect x="22" y="22" width="9" height="106" rx="4" fill="var(--rd-pipe)" stroke="var(--rd-line)"/><rect x="89" y="22" width="9" height="106" rx="4" fill="var(--rd-pipe)" stroke="var(--rd-line)"/>
    ${bars.map((y, i) => `<rect x="31" y="${y}" width="58" height="7" rx="3.5" fill="${heat ? "var(--rd-hot)" : "var(--rd-pipe)"}" ${heat ? `class="glow" style="animation-delay:${-i * 0.25}s"` : ""}/>`).join("")}
    <path d="M40 132 V140 M80 132 V140" stroke="var(--rd-line)" stroke-width="3" stroke-linecap="round"/>
    ${heat ? waves(60, 14) : ""}</svg>`;
}
function waves(x, y) {
  return [-18, 0, 18].map((dx, i) => `<path class="wv" style="animation-delay:${-i * 0.5}s" d="M${x + dx} ${y} q4 -5 0 -10 t0 -10" fill="none" stroke="var(--rd-hot)" stroke-width="2" stroke-linecap="round"/>`).join("");
}

class RadiatorCard extends HTMLElement {
  static getConfigElement() { return document.createElement("radiator-card-editor"); }
  static getStubConfig(hass) {
    const e = Object.keys((hass && hass.states) || {}).find((k) => k.startsWith("climate.") && /serviette|radiat|chauff|towel|riva/i.test(k + ((hass.states[k].attributes || {}).friendly_name || ""))) || "";
    return { ...DEFAULTS, entity: e };
  }
  constructor() { super(); this.attachShadow({ mode: "open" }); this._sig = ""; this._uid = ++UID; this._pending = null; }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("radiator-card : « entity » (l'entité climate) est obligatoire");
    this._config = { ...DEFAULTS, ...config };
    ["switches", "info_entities"].forEach((k) => { if (!Array.isArray(this._config[k])) this._config[k] = []; });
    this._sig = "";
    if (this._hass) this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const c = this._config;
    const ids = [c.entity, c.temperature_entity, c.target_entity, c.boost_entity, ...this._list("switches").map((x) => x.entity), ...this._list("info_entities").map((x) => x.entity)].filter(Boolean);
    const sig = ids.map((e) => { const s = hass.states[e]; return s ? s.state + "|" + JSON.stringify([s.attributes.hvac_action, s.attributes.temperature, s.attributes.current_temperature, s.attributes.preset_mode]) : "x"; }).join(";") + (this._isDark() ? "d" : "l") + "#" + this._pending;
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  getCardSize() { return 5; }
  _list(k) { return (this._config[k] || []).map((i) => (typeof i === "string" ? { entity: i } : i)).filter((i) => i && i.entity); }
  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _fmt(n, d = 1) { const lang = (this._hass && this._hass.locale && this._hass.locale.language) || "fr"; return new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n)); }
  _more(id) { if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })); }

  /* consigne : entité number dédiée, sinon la consigne du climate */
  _target() {
    const c = this._config, h = this._hass;
    const te = c.target_entity ? h.states[c.target_entity] : null;
    if (te && !bad(te) && isNum(te.state)) {
      const a = te.attributes;
      return { value: Number(te.state), step: Number(a.step) > 0 ? Number(a.step) : 0.5, min: isNum(a.min) ? Number(a.min) : 5, max: isNum(a.max) ? Number(a.max) : 35, entity: c.target_entity, dom: c.target_entity.split(".")[0] };
    }
    const st = h.states[c.entity], a = (st && st.attributes) || {};
    if (!isNum(a.temperature)) return null;
    return { value: Number(a.temperature), step: Number(a.target_temp_step) > 0 ? Number(a.target_temp_step) : 0.5, min: isNum(a.min_temp) ? Number(a.min_temp) : 5, max: isNum(a.max_temp) ? Number(a.max_temp) : 35, entity: c.entity, dom: "climate" };
  }
  _adjust(dir) {
    const t = this._target();
    if (!t) return;
    const cs = Number(this._config.temp_step), step = cs > 0 ? cs : t.step;
    const base = this._pending !== null ? this._pending : t.value;
    this._pending = Math.round(Math.min(t.max, Math.max(t.min, Math.round((base + dir * step) / step) * step)) * 100) / 100;
    this._sig = ""; this._render();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      if (t.dom === "climate") this._hass.callService("climate", "set_temperature", { entity_id: t.entity, temperature: this._pending });
      else this._hass.callService(t.dom, "set_value", { entity_id: t.entity, value: this._pending });
      setTimeout(() => { this._pending = null; this._sig = ""; this._render(); }, 4000);
    }, 700);
  }
  _toggle(eid) { this._hass.callService("homeassistant", "toggle", { entity_id: eid }); }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const st = h.states[c.entity], a = (st && st.attributes) || {}, dark = this._isDark();
    const unknown = bad(st);
    const boostS = c.boost_entity ? h.states[c.boost_entity] : null;
    const boostOn = !!(boostS && boostS.state === "on");
    const heating = !unknown && st.state !== "off" && (a.hvac_action === "heating" || (!a.hvac_action && st.state === "heat"));
    const mode = unknown ? "off" : st.state === "off" ? "off" : boostOn ? "boost" : heating ? "heat" : "idle";
    const stateLabel = unknown ? "Indisponible" : st.state === "off" ? "Arrêt" : boostOn ? "Boost" : a.hvac_action ? tr(ACTIONS, a.hvac_action) : tr(MODES, st.state);
    const name = c.name || (st && a.friendly_name) || "Chauffage";
    const unit = (h.config && h.config.unit_system && h.config.unit_system.temperature) || "°C";
    const ts = c.temperature_entity ? h.states[c.temperature_entity] : null;
    const curRaw = ts && !bad(ts) && isNum(ts.state) ? ts.state : a.current_temperature;
    const cur = isNum(curRaw) ? this._fmt(curRaw) : "—";
    const tg = this._target();
    const tval = this._pending !== null ? this._pending : tg ? tg.value : null;

    /* noms courts : on retire le préfixe commun avec le climate (nom de l'appareil) */
    const base = (a.friendly_name || "").split(/\s+/);
    const short = (s2, fallback) => {
      const w = String((s2 && s2.attributes.friendly_name) || fallback).split(/\s+/);
      let i = 0; while (i < w.length - 1 && i < base.length && w[i].toLowerCase() === base[i].toLowerCase()) i++;
      return w.slice(i).join(" ");
    };
    const sw = [];
    if (c.boost_entity) sw.push({ entity: c.boost_entity, name: "Boost", icon: "mdi:rocket-launch-outline", boost: true });
    this._list("switches").forEach((x) => sw.push(x));
    const swHtml = sw.map((x) => {
      const s2 = h.states[x.entity], off = bad(s2), on = !off && s2.state === "on";
      const nm = x.name || short(s2, x.entity);
      const icon = x.icon || (s2 && s2.attributes.icon) || (x.boost ? "mdi:rocket-launch-outline" : "mdi:toggle-switch-outline");
      return `<button class="sw ${on ? "on" : ""} ${x.boost ? "bst" : ""}" ${off ? "disabled" : `data-toggle="${esc(x.entity)}"`} data-more-alt="${esc(x.entity)}" title="${esc(nm)}"><ha-icon icon="${esc(icon)}"></ha-icon><span>${esc(nm)}</span></button>`;
    }).join("");

    const modes = c.show_modes && !unknown && Array.isArray(a.hvac_modes) ? `<div class="modes">${a.hvac_modes.map((m) => { const mm = MODES[m] || [tr({}, m), "mdi:thermostat"]; return `<button class="mode ${m === st.state ? "sel" : ""}" data-mode="${esc(m)}"><ha-icon icon="${mm[1]}"></ha-icon><span>${esc(mm[0])}</span></button>`; }).join("")}</div>` : "";
    const presets = c.show_presets && !unknown && Array.isArray(a.preset_modes) && a.preset_modes.length ? `<div class="seg">${a.preset_modes.map((p) => `<button class="${p === a.preset_mode ? "sel" : ""}" data-preset="${esc(p)}">${esc(tr(PRESETS, p))}</button>`).join("")}</div>` : "";
    const tiles = this._list("info_entities").map((x) => {
      const s2 = h.states[x.entity]; let v = "—";
      if (!bad(s2)) { v = isNum(s2.state) ? this._fmt(s2.state, Number.isInteger(Number(s2.state)) ? 0 : 1) : s2.state; if (s2.attributes.unit_of_measurement) v += " " + s2.attributes.unit_of_measurement; }
      return `<button class="tile" data-more="${esc(x.entity)}"><span class="tl"><ha-icon icon="${esc(x.icon || (s2 && s2.attributes.icon) || "mdi:information-outline")}"></ha-icon><span class="tn">${esc(x.name || short(s2, x.entity))}</span></span><span class="tv">${esc(v)}</span></button>`;
    }).join("");

    const okImg = c.image && !/^\s*(javascript|vbscript|data:text)/i.test(String(c.image)) && this._imgFailed !== c.image;
    const bg = okImg && c.image_mode !== "replace" ? `<img class="bgimg" src="${esc(c.image)}" alt="" loading="lazy" style="opacity:${isNum(c.image_opacity) ? Math.max(0, Math.min(1, Number(c.image_opacity))) : 0.35}">` : "";
    const art = okImg && c.image_mode === "replace" ? `<div class="art photo"><img src="${esc(c.image)}" alt="${esc(name)}"></div>` : `<div class="art">${artSvg(c.appliance === "radiator" ? "radiator" : "towel", mode, this._uid)}</div>`;

    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --rd-text:#f4f6fb; --rd-muted:#a9afc0; --rd-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%)); --rd-border:rgba(255,255,255,.14); --rd-shadow:0 .6em 2em rgba(0,0,0,.35); --rd-glass:rgba(255,255,255,.07); --rd-glass-b:rgba(255,255,255,.13); --rd-fill:rgba(255,255,255,.09); --rd-fill-b:rgba(255,255,255,.16); --rd-hot:#ff8a3d; --rd-boost:#ff5c5c; --rd-ok:#6fd49a; --rd-off:#8a8f9c; --rd-box:rgba(255,255,255,.06); --rd-pipe:rgba(255,255,255,.2); --rd-line:rgba(255,255,255,.3); }
      ha-card.light { --rd-text:#1c2030; --rd-muted:#5d6477; --rd-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%)); --rd-border:rgba(20,24,40,.12); --rd-shadow:0 .4em 1.4em rgba(20,24,40,.12); --rd-glass:rgba(255,255,255,.7); --rd-glass-b:rgba(20,24,40,.1); --rd-fill:rgba(20,24,40,.06); --rd-fill-b:rgba(20,24,40,.14); --rd-hot:#e06a14; --rd-boost:#d63a3a; --rd-ok:#2e9d4a; --rd-off:#8a8f9c; --rd-box:rgba(20,24,40,.05); --rd-pipe:rgba(20,24,40,.16); --rd-line:rgba(20,24,40,.3); }
      ha-card { container-type:inline-size; display:flex; flex-direction:column; gap:12px; padding:16px; color:var(--rd-text); border-radius:24px; border:1px solid var(--rd-border); background:var(--rd-bg); box-shadow:var(--rd-shadow); overflow:hidden; }
      button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; text-align:left; -webkit-tap-highlight-color:transparent; }
      ha-icon { --mdc-icon-size:1.2em; flex:none; }
      .head { display:flex; flex-direction:column; gap:3px; } .head b { font-size:1.1em; font-weight:650; }
      .state { display:flex; align-items:center; gap:.5em; font-size:.85em; font-weight:600; color:var(--rd-off); } .state::before { content:""; width:.6em; height:.6em; border-radius:50%; background:currentColor; box-shadow:0 0 .6em currentColor; }
      .state.heat, .state.idle { color:var(--rd-hot); } .state.idle { color:var(--rd-ok); } .state.boost { color:var(--rd-boost); }
      .panel { position:relative; overflow:hidden; display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr); gap:12px; align-items:center; padding:14px; border-radius:18px; background:var(--rd-glass); border:1px solid var(--rd-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
      .panel.heat { box-shadow:inset 0 0 3em color-mix(in srgb, var(--rd-hot) 18%, transparent); } .panel.boost { box-shadow:inset 0 0 3em color-mix(in srgb, var(--rd-boost) 26%, transparent); }
      .panel > :not(.bgimg) { position:relative; z-index:1; }
      .bgimg { position:absolute; right:0; top:0; height:100%; width:62%; object-fit:contain; object-position:right center; pointer-events:none; z-index:0; -webkit-mask-image:radial-gradient(ellipse 70% 80% at 70% 45%,#000 30%,transparent 78%); mask-image:radial-gradient(ellipse 70% 80% at 70% 45%,#000 30%,transparent 78%); }
      .art { display:grid; place-items:center; } .art svg, .art img { width:100%; max-width:9em; height:auto; display:block; } .art.photo img { border-radius:.8em; object-fit:contain; }
      .panel.boost { --rd-hot:var(--rd-boost); }
      .glow { animation:rd-glow 1.8s ease-in-out infinite; filter:drop-shadow(0 0 3px var(--rd-hot)); } @keyframes rd-glow { 50% { opacity:.6; } }
      .wv { opacity:0; animation:rd-up 2.2s ease-in infinite; } @keyframes rd-up { 0% { opacity:0; transform:translateY(8px); } 30% { opacity:.8; } 100% { opacity:0; transform:translateY(-8px); } }
      .read { display:flex; flex-direction:column; gap:12px; min-width:0; }
      .lbl { font-size:.72em; text-transform:uppercase; letter-spacing:.08em; color:var(--rd-muted); }
      .big { font-size:2.6em; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; } .big small { font-size:.4em; font-weight:600; opacity:.7; margin-left:.15em; }
      .set { display:flex; align-items:center; gap:.5em; } .set .val { font-size:1.5em; font-weight:650; min-width:3.4em; text-align:center; font-variant-numeric:tabular-nums; } .set .val small { font-size:.55em; opacity:.7; }
      .step { display:grid; place-items:center; width:2.4em; height:2.4em; border-radius:50%; background:var(--rd-fill); border:1px solid var(--rd-fill-b); font-size:1.1em; font-weight:700; touch-action:manipulation; } .step:active { background:var(--rd-fill-b); }
      .sws { display:flex; flex-wrap:wrap; gap:.5em; }
      .sw { display:flex; align-items:center; gap:.45em; padding:.55em .95em; border-radius:2em; font-size:.82em; font-weight:600; background:var(--rd-fill); border:1px solid var(--rd-fill-b); color:var(--rd-muted); } .sw:disabled { opacity:.4; cursor:default; }
      .sw.on { color:var(--rd-text); border-color:var(--rd-hot); background:color-mix(in srgb, var(--rd-hot) 16%, transparent); } .sw.on ha-icon { color:var(--rd-hot); }
      .sw.bst.on { border-color:var(--rd-boost); background:color-mix(in srgb, var(--rd-boost) 20%, transparent); } .sw.bst.on ha-icon { color:var(--rd-boost); }
      .modes { display:grid; grid-template-columns:repeat(auto-fit,minmax(4.6em,1fr)); gap:.5em; }
      .mode { display:flex; flex-direction:column; align-items:center; gap:.3em; padding:.6em .3em; border-radius:1em; font-size:.78em; font-weight:600; text-align:center; background:var(--rd-glass); border:1px solid var(--rd-glass-b); color:var(--rd-muted); } .mode ha-icon { --mdc-icon-size:1.6em; }
      .mode.sel { color:var(--rd-hot); border-color:currentColor; background:var(--rd-fill); }
      .seg { display:flex; flex-wrap:wrap; gap:.3em; } .seg button { padding:.35em .8em; border-radius:2em; font-size:.8em; font-weight:600; background:var(--rd-fill); border:1px solid var(--rd-fill-b); } .seg button.sel { background:var(--rd-text); } ha-card.dark .seg button.sel { color:#1b1e32; } ha-card.light .seg button.sel { color:#fff; }
      .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(9em,1fr)); gap:.6em; } .tile { display:flex; flex-direction:column; gap:.35em; padding:.7em .85em; border-radius:1em; background:var(--rd-glass); border:1px solid var(--rd-glass-b); min-width:0; }
      .tl { display:flex; align-items:center; gap:.45em; font-size:.74em; color:var(--rd-muted); } .tn { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .tv { font-size:1.2em; font-weight:650; }
      @container (max-width:300px) { .panel { grid-template-columns:1fr; } }
      @media (prefers-reduced-motion: reduce) { .glow, .wv { animation:none; } }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">
      <div class="head"><b>${esc(name)}</b><span class="state ${mode}">${esc(stateLabel)}</span></div>
      <div class="panel ${mode}">${bg}${art}
        <div class="read">
          <div><div class="lbl">Température</div><button class="big" data-more="${esc(c.temperature_entity || c.entity)}">${esc(cur)}<small>${esc(unit)}</small></button></div>
          ${tval !== null ? `<div><div class="lbl">Consigne</div><div class="set">${c.show_controls ? `<button class="step" data-action="down" aria-label="Baisser">−</button>` : ""}<span class="val">${esc(this._fmt(tval))}<small>${esc(unit)}</small></span>${c.show_controls ? `<button class="step" data-action="up" aria-label="Augmenter">+</button>` : ""}</div></div>` : ""}
        </div>
      </div>
      ${swHtml ? `<div class="sws">${swHtml}</div>` : ""}
      ${c.show_controls ? modes : ""}${c.show_controls ? presets : ""}
      ${tiles ? `<div class="tiles">${tiles}</div>` : ""}
    </ha-card>`;
    const r = this.shadowRoot;
    r.querySelectorAll("[data-toggle]").forEach((el) => {
      let t = null, long = false;
      el.addEventListener("pointerdown", () => { long = false; t = setTimeout(() => { long = true; this._more(el.dataset.moreAlt); }, 550); });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, () => clearTimeout(t)));
      el.addEventListener("click", () => { if (!long) this._toggle(el.dataset.toggle); });
    });
    r.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._more(el.dataset.more)));
    r.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => this._adjust(el.dataset.action === "up" ? 1 : -1)));
    r.querySelectorAll("[data-mode]").forEach((el) => el.addEventListener("click", () => h.callService("climate", "set_hvac_mode", { entity_id: c.entity, hvac_mode: el.dataset.mode })));
    r.querySelectorAll("[data-preset]").forEach((el) => el.addEventListener("click", () => h.callService("climate", "set_preset_mode", { entity_id: c.entity, preset_mode: el.dataset.preset })));
    r.querySelectorAll("img.bgimg, .art.photo img").forEach((im) => im.addEventListener("error", () => { this._imgFailed = c.image; this._sig = ""; this._render(); }));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS, entity: "Chauffage (entité climate)", name: "Nom (facultatif)", appliance: "Type d'appareil", temperature_entity: "Température ambiante (facultatif)", target_entity: "Consigne : number / input_number (facultatif)",
  boost_entity: "Mode Boost (interrupteur)", switches: "Autres interrupteurs (Programme, Absence, Présence...)", info_entities: "Capteurs à afficher", image: "Photo de l'appareil (URL)", image_mode: "Affichage de la photo", image_opacity: "Opacité de la photo",
  temp_step: "Pas de la consigne (0 = automatique)", show_controls: "Afficher les commandes", show_modes: "Afficher les modes", show_presets: "Afficher les préréglages", theme: "Thème" };
class RadiatorCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...DEFAULTS, ...config }; this._keep = { switches: (config.switches || []).filter((x) => x && typeof x === "object"), info_entities: (config.info_entities || []).filter((x) => x && typeof x === "object") }; if (!this._form) this._build(); else this._form.data = this._data(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _data() { const m = (l) => (l || []).map((i) => (typeof i === "string" ? i : i.entity)); return { ...this._config, switches: m(this._config.switches), info_entities: m(this._config.info_entities) }; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._data(); el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
      { type: "grid", name: "", schema: [{ name: "name", selector: { text: {} } }, { name: "appliance", selector: { select: { mode: "dropdown", options: [{ value: "towel", label: "Sèche-serviette" }, { value: "radiator", label: "Radiateur" }] } } }] },
      { name: "temperature_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "target_entity", selector: { entity: { domain: ["number", "input_number"] } } },
      { name: "boost_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
      { name: "switches", selector: { entity: { multiple: true, domain: ["switch", "input_boolean"] } } },
      { name: "info_entities", selector: { entity: { multiple: true } } },
      { name: "image", selector: { text: {} } },
      { type: "grid", name: "", schema: [{ name: "image_mode", selector: { select: { mode: "dropdown", options: [{ value: "background", label: "En arrière-plan (comme les électroménagers)" }, { value: "replace", label: "À la place du dessin" }] } } }, { name: "image_opacity", selector: { number: { min: 0.05, max: 1, step: 0.05, mode: "slider" } } }] },
      { type: "grid", name: "", schema: [{ name: "temp_step", selector: { number: { min: 0, max: 5, step: 0.1, mode: "box" } } }, { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }] },
      { type: "grid", name: "", schema: [{ name: "show_controls", selector: { boolean: {} } }, { name: "show_modes", selector: { boolean: {} } }, { name: "show_presets", selector: { boolean: {} } }] },
      { type: "expandable", name: "", title: "Nuance de couleur", schema: GV_FIELDS },
    ];
    el.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const cfg = { ...ev.detail.value };
      ["switches", "info_entities"].forEach((k) => { cfg[k] = (cfg[k] || []).map((id) => (this._keep[k].find((x) => x.entity === id)) || id); });
      ["temperature_entity", "target_entity", "boost_entity", "image"].forEach((k) => { if (!cfg[k]) delete cfg[k]; });
      this._config = cfg;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    });
    this._form = el; this.appendChild(el);
  }
}

customElements.define("radiator-card", RadiatorCard);
customElements.define("radiator-card-editor", RadiatorCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "radiator-card", name: "Radiator Card (FR)", description: "Radiateur / sèche-serviette connecté : dessin animé ou photo, température, consigne, Boost, modes et interrupteurs.", preview: true });
console.info(`%c RADIATOR-CARD %c v${CARD_VERSION} `, "color:#fff;background:#e06a14;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#e06a14;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
