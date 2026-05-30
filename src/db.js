// ============================================================================
// db.js · Capa de sincronización ORC Race Tracker
//
// Diseño:
// - Si hay credenciales de Supabase → sincroniza en la nube + realtime.
// - Si NO las hay → cae automáticamente a localStorage (la app sigue igual).
// - Multi-escritura total; acceso por join_code; passages append-only con dedup.
//
// Cómo conectar Supabase (sin tocar este archivo):
//   En Vercel define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY,
//   o llama a configureCloud(url, publishableKey) desde la app (Config → Nube).
//   La "publishable key" (sb_publishable_...) es la que va en el navegador.
//   NUNCA uses la "secret key" (sb_secret_...).
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// ── localStorage helpers (fallback) ─────────────────────────────────────────
const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const SK = "orc-v7", IDX_KEY = "orc-champs-idx";
const chKey = id => `orc-ch-${id}`;
const CFG_KEY = "orc-cloud-cfg";

// ── Device id anónimo (para saber quién registra cada paso) ──────────────────
export function deviceId() {
  let id = localStorage.getItem("orc-device-id");
  if (!id) { id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 12); localStorage.setItem("orc-device-id", id); }
  return id;
}

// ── Cliente Supabase (lazy) ──────────────────────────────────────────────────
let _sb = null, _url = null, _key = null;

function readCfg() {
  // 1) variables de entorno (Vite); 2) config guardada en localStorage
  const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : null;
  const envKey = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_ANON_KEY : null;
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  return lsGet(CFG_KEY) || {};
}

export function configureCloud(url, key) {
  lsSet(CFG_KEY, { url, key });
  _sb = null; // forzar recreación
  return getClient();
}

export function isCloudEnabled() {
  const { url, key } = readCfg();
  return !!(url && key);
}

function getClient() {
  if (_sb) return _sb;
  const { url, key } = readCfg();
  if (!url || !key) return null;
  _url = url; _key = key;
  _sb = createClient(url, key, { realtime: { params: { eventsPerSecond: 5 } } });
  return _sb;
}

// ── Código de campeonato ─────────────────────────────────────────────────────
export function makeJoinCode(name = "") {
  const base = (name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || "ORC").toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return base + rnd;
}

// ============================================================================
// API pública — la app llama a estas. Todas devuelven Promesas.
// Si la nube está desactivada, operan sobre localStorage con la misma forma.
// ============================================================================

// Guardar el estado completo de un campeonato.
export async function saveChampionship(localId, state) {
  if (!isCloudEnabled()) { lsSet(chKey(localId), state); return { ok: true, local: true }; }
  try {
    const sb = getClient();
    const champId = await upsertChampionship(sb, state);
    await upsertBoats(sb, champId, state.fleet || []);
    await upsertRaces(sb, champId, state.races || []);
    await upsertPassages(sb, champId, state.races || []);
    lsSet(chKey(localId), { ...state, _cloudId: champId }); // cache local
    return { ok: true, cloudId: champId };
  } catch (e) {
    console.error("saveChampionship cloud error, fallback local:", e);
    lsSet(chKey(localId), state);
    return { ok: false, error: e.message, local: true };
  }
}

// Cargar un campeonato por su join_code (entrar con código).
export async function loadByCode(code) {
  if (!isCloudEnabled()) return null;
  const sb = getClient();
  const { data: champ, error } = await sb.from("championships").select("*").eq("join_code", code.toUpperCase()).maybeSingle();
  if (error || !champ) return null;
  return hydrate(sb, champ);
}

// Cargar por id local (usa cache local, y si hay nube refresca).
export async function loadChampionship(localId) {
  const cached = lsGet(chKey(localId));
  if (!isCloudEnabled()) return cached;
  if (!cached?._cloudId) return cached;
  try {
    const sb = getClient();
    const { data: champ } = await sb.from("championships").select("*").eq("id", cached._cloudId).maybeSingle();
    if (!champ) return cached;
    return hydrate(sb, champ);
  } catch { return cached; }
}

// Índice de campeonatos (lista de la pantalla inicial).
export async function saveIndex(arr) { lsSet(IDX_KEY, arr); }
export async function loadIndex() { return lsGet(IDX_KEY) || []; }

// Registrar UN paso de baliza (append-only, dedup en servidor).
export async function recordPassage(state, { raceLocalId, boatSailNo, leg, realTime }) {
  if (!isCloudEnabled()) return { ok: true, local: true };
  try {
    const sb = getClient();
    const champId = lsGet(chKey(state._champId))?. _cloudId;
    const raceCloudId = await raceCloudIdFor(sb, champId, raceLocalId);
    if (!champId || !raceCloudId) return { ok: false };
    const { error } = await sb.from("passages").upsert({
      championship_id: champId, race_id: raceCloudId,
      boat_sail_no: boatSailNo, leg, real_time: realTime, device_id: deviceId(),
    }, { onConflict: "race_id,boat_sail_no,leg", ignoreDuplicates: true });
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── Suscripción realtime ──────────────────────────────────────────────────────
// onChange() se dispara con cada INSERT/UPDATE/DELETE en el campeonato.
// Devuelve una función para desuscribirse.
export function subscribe(cloudId, onChange) {
  if (!isCloudEnabled() || !cloudId) return () => {};
  const sb = getClient();
  const ch = sb.channel(`champ-${cloudId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "passages", filter: `championship_id=eq.${cloudId}` }, p => onChange("passages", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "races",    filter: `championship_id=eq.${cloudId}` }, p => onChange("races", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "boats",    filter: `championship_id=eq.${cloudId}` }, p => onChange("boats", p))
    .subscribe();
  return () => { try { sb.removeChannel(ch); } catch {} };
}

// ============================================================================
// Internos: mapeo estado(app) ↔ filas(Supabase)
// ============================================================================

async function upsertChampionship(sb, state) {
  const existingId = lsGet(chKey(state._champId))?._cloudId;
  const row = {
    join_code: (state.champ.joinCode || makeJoinCode(state.champ.name)).toUpperCase(),
    name: state.champ.name,
    scoring_mode: state.champ.scoringMode || "WL_ToT",
    own_sail_no: state.fleet?.find(b => b.id === state.champ.ownId)?.sailNo || null,
    data: { mainUrl: state.champ.mainUrl, resultsUrl: state.champ.resultsUrl, docsUrl: state.champ.docsUrl, photosUrl: state.champ.photosUrl, entryListUrl: state.champ.entryListUrl, ownId: state.champ.ownId },
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    await sb.from("championships").update(row).eq("id", existingId);
    return existingId;
  }
  const { data, error } = await sb.from("championships").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertBoats(sb, champId, fleet) {
  if (!fleet.length) return;
  const rows = fleet.map(b => ({
    championship_id: champId, sail_no: b.sailNo || b.id, name: b.name, cls: b.cls,
    boat_type: b.boatType, nation: b.nation, bow_num: String(b.bowNum ?? ""),
    gph: b.gpH ?? null, rating: b.rating ?? null, cert_no: b.certNo ?? null, valid_until: b.validUntil ?? null,
    color: b.color, hull_color: b.hullColor, main_color: b.mainColor, jib_color: b.jibColor, spi_color: b.spiColor,
    trim_bands_main: b.trimBandsMain ?? b.trimBands ?? null, trim_bands_jib: b.trimBandsJib ?? null, trim_bands_spi: b.trimBandsSpi ?? null,
    is_own: !!b.own, updated_at: new Date().toISOString(),
  }));
  await sb.from("boats").upsert(rows, { onConflict: "championship_id,sail_no" });
}

async function upsertRaces(sb, champId, races) {
  if (!races.length) return;
  const rows = races.map(r => ({
    championship_id: champId, local_id: r.id, name: r.name, scoring_mode: r.scoringMode ?? null,
    start_time: r.startTime ?? null, countdown_at: r.countdownAt ?? null, finished_at: r.finishedAt ?? null,
    course: r.course ?? null, discarded: !!r.discarded, updated_at: new Date().toISOString(),
  }));
  await sb.from("races").upsert(rows, { onConflict: "championship_id,local_id" });
}

async function upsertPassages(sb, champId, races) {
  const rows = [];
  for (const r of races) {
    const raceCloudId = await raceCloudIdFor(sb, champId, r.id);
    if (!raceCloudId) continue;
    for (const p of (r.passages || [])) {
      rows.push({ championship_id: champId, race_id: raceCloudId, boat_sail_no: p.boatSailNo || p.boatId, leg: p.leg, real_time: p.realTime, device_id: p.deviceId || deviceId() });
    }
  }
  if (rows.length) await sb.from("passages").upsert(rows, { onConflict: "race_id,boat_sail_no,leg", ignoreDuplicates: true });
}

const _raceIdCache = {};
async function raceCloudIdFor(sb, champId, localId) {
  const k = `${champId}:${localId}`;
  if (_raceIdCache[k]) return _raceIdCache[k];
  const { data } = await sb.from("races").select("id").eq("championship_id", champId).eq("local_id", localId).maybeSingle();
  if (data?.id) _raceIdCache[k] = data.id;
  return data?.id;
}

// Reconstruir el objeto de estado de la app desde las filas de Supabase.
async function hydrate(sb, champ) {
  const [{ data: boats }, { data: races }] = await Promise.all([
    sb.from("boats").select("*").eq("championship_id", champ.id),
    sb.from("races").select("*").eq("championship_id", champ.id),
  ]);
  const raceIds = (races || []).map(r => r.id);
  let passages = [];
  if (raceIds.length) {
    const { data } = await sb.from("passages").select("*").in("race_id", raceIds);
    passages = data || [];
  }
  const byRaceCloud = {};
  for (const p of passages) (byRaceCloud[p.race_id] ||= []).push({ boatSailNo: p.boat_sail_no, leg: p.leg, realTime: Number(p.real_time), deviceId: p.device_id });

  const fleet = (boats || []).map(b => ({
    id: b.sail_no, sailNo: b.sail_no, name: b.name, cls: b.cls, boatType: b.boat_type, nation: b.nation,
    bowNum: b.bow_num, gpH: b.gph != null ? Number(b.gph) : null, rating: b.rating, certNo: b.cert_no, validUntil: b.valid_until,
    color: b.color, hullColor: b.hull_color, mainColor: b.main_color, jibColor: b.jib_color, spiColor: b.spi_color,
    trimBandsMain: b.trim_bands_main, trimBandsJib: b.trim_bands_jib, trimBandsSpi: b.trim_bands_spi, own: b.is_own,
  }));
  const racesOut = (races || []).map(r => ({
    id: r.local_id, name: r.name, scoringMode: r.scoring_mode, startTime: r.start_time ? Number(r.start_time) : null,
    countdownAt: r.countdown_at ? Number(r.countdown_at) : null, finishedAt: r.finished_at ? Number(r.finished_at) : null,
    course: r.course, discarded: r.discarded, passages: byRaceCloud[r.id] || [],
  }));
  return {
    _champId: champ.id, _cloudId: champ.id,
    champ: { name: champ.name, joinCode: champ.join_code, scoringMode: champ.scoring_mode, ownId: champ.data?.ownId,
             mainUrl: champ.data?.mainUrl || "", resultsUrl: champ.data?.resultsUrl || "", docsUrl: champ.data?.docsUrl || "",
             photosUrl: champ.data?.photosUrl || "", entryListUrl: champ.data?.entryListUrl || "" },
    fleet,
    races: racesOut.length ? racesOut : [{ id: "r1", name: "Prueba 1", startTime: null, countdownAt: null, finishedAt: null, passages: [], course: null, discarded: false }],
    activeRaceId: racesOut[0]?.id || "r1",
  };
}
