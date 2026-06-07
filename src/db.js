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

// Normaliza un nº de vela para comparaciones/sincronización:
// "ESP-52801", "ESP 52801", "esp52801" → "ESP52801"
export function normSail(s){ return String(s||"").toUpperCase().replace(/[\s-]/g,""); }

import { createClient } from "@supabase/supabase-js";

// ── localStorage helpers (fallback) ─────────────────────────────────────────
const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const lsRemove = k => { try { localStorage.removeItem(k); } catch {} };

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
    const { id: champId, joinCode } = await upsertChampionship(sb, state);
    // Cada paso protegido: si boats/races/passages falla, no perdemos el código.
    try { await upsertBoats(sb, champId, state.fleet || []); } catch(e){ console.error("upsertBoats:", e.message); }
    try { await upsertRaces(sb, champId, state.races || []); } catch(e){ console.error("upsertRaces:", e.message); }
    try { await upsertPassages(sb, champId, state.races || []); } catch(e){ console.error("upsertPassages:", e.message); }
    // Cache local CON el cloudId y el joinCode, para que el código persista
    lsSet(chKey(localId), { ...state, _cloudId: champId, champ: { ...state.champ, joinCode } });
    return { ok: true, cloudId: champId, joinCode };
  } catch (e) {
    console.error("saveChampionship cloud error, fallback local:", e);
    lsSet(chKey(localId), state);
    return { ok: false, error: e.message, local: true };
  }
}

// Cargar directamente por el id de la nube (para realtime, sin depender de localStorage).
export async function loadByCloudId(cloudId) {
  if (!isCloudEnabled() || !cloudId) return null;
  try {
    const sb = getClient();
    const { data: champ } = await sb.from("championships").select("*").eq("id", cloudId).maybeSingle();
    if (!champ) return null;
    return hydrate(sb, champ);
  } catch { return null; }
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

// Listar campeonatos existentes en la nube (para recuperar código tras recargar).
export async function listChampionships() {
  if (!isCloudEnabled()) return [];
  try {
    const sb = getClient();
    const { data } = await sb.from("championships").select("id,join_code,name,updated_at").order("updated_at", { ascending: false }).limit(20);
    return data || [];
  } catch { return []; }
}

// Borrar un campeonato de la nube directamente por su id de nube.
export async function deleteByCloudId(cloudId) {
  if (!isCloudEnabled() || !cloudId) return { ok: false };
  try {
    const sb = getClient();
    await sb.from("passages").delete().eq("championship_id", cloudId);
    await sb.from("races").delete().eq("championship_id", cloudId);
    await sb.from("boats").delete().eq("championship_id", cloudId);
    const { error } = await sb.from("championships").delete().eq("id", cloudId);
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Borrar un campeonato de la nube (cascade borra boats/races/passages por la FK).
export async function deleteChampionship(localId) {
  const cloudId = lsGet(chKey(localId))?._cloudId;  // leer ANTES de borrar local
  lsRemove(chKey(localId));
  if (!isCloudEnabled() || !cloudId) return { ok: true, local: true };
  try {
    const sb = getClient();
    const { error } = await sb.from("championships").delete().eq("id", cloudId);
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Borrar UNA prueba de la nube (y sus passages y marcas) por su local_id.
// upsertRaces nunca borra; sin esto, una prueba eliminada en un móvil reaparece
// al sincronizar desde otro. Aquí la borramos de verdad en Supabase.
export async function deleteRace(state, raceLocalId) {
  if (!isCloudEnabled()) return { ok: true, local: true };
  try {
    const sb = getClient();
    const champId = lsGet(chKey(state._champId))?._cloudId || state._cloudId;
    if (!champId) return { ok: false };
    const raceCloudId = await raceCloudIdFor(sb, champId, raceLocalId);
    // Borrar passages de esa prueba (por su id de nube) y marcas (por local_id)
    if (raceCloudId) await sb.from("passages").delete().eq("race_id", raceCloudId);
    try { await sb.from("marks").delete().eq("championship_id", champId).eq("race_local_id", raceLocalId); } catch {}
    // Limpiar la cache del id de nube de esta prueba
    try { delete _raceIdCache[`${champId}:${raceLocalId}`]; } catch {}
    const { error } = await sb.from("races").delete().eq("championship_id", champId).eq("local_id", raceLocalId);
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

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
      boat_sail_no: normSail(boatSailNo), leg, real_time: realTime, device_id: deviceId(),
    }, { onConflict: "race_id,boat_sail_no,leg", ignoreDuplicates: true });
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Borra TODOS los passages de una prueba en la nube (para "Limpiar todos").
export async function clearRacePassages(state, raceLocalId) {
  if (!isCloudEnabled()) return { ok: true, local: true };
  try {
    const sb = getClient();
    const champId = lsGet(chKey(state._champId))?._cloudId;
    if (!champId) return { ok: false };
    const raceCloudId = await raceCloudIdFor(sb, champId, raceLocalId);
    if (!raceCloudId) return { ok: false };
    const { error } = await sb.from("passages").delete().eq("race_id", raceCloudId);
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── MARCAS SIN ASIGNAR (tabla "marks") ───────────────────────────────────────
// Mismo patrón que passages: cada dispositivo añade/borra su marca sin pisar
// las de los demás. Se sincronizan en tiempo real.

// Registrar UNA marca de tiempo sin asignar.
export async function recordMark(state, { raceLocalId, mark }) {
  if (!isCloudEnabled()) return { ok: true, local: true };
  try {
    const sb = getClient();
    const champId = lsGet(chKey(state._champId))?._cloudId || state._cloudId;
    if (!champId || !mark?.id) return { ok: false };
    const { error } = await sb.from("marks").upsert({
      id: mark.id, championship_id: champId, race_local_id: raceLocalId,
      mark_time: mark.time, device_id: deviceId(),
    }, { onConflict: "id", ignoreDuplicates: true });
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Borrar UNA marca (al asignarla a un barco o al descartarla).
export async function removeMark(state, markId) {
  if (!isCloudEnabled() || !markId) return { ok: true, local: true };
  try {
    const sb = getClient();
    const { error } = await sb.from("marks").delete().eq("id", markId);
    return { ok: !error, error: error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Borrar TODAS las marcas de una prueba (para "Limpiar todos").
export async function clearRaceMarks(state, raceLocalId) {
  if (!isCloudEnabled()) return { ok: true, local: true };
  try {
    const sb = getClient();
    const champId = lsGet(chKey(state._champId))?._cloudId || state._cloudId;
    if (!champId) return { ok: false };
    const { error } = await sb.from("marks").delete()
      .eq("championship_id", champId).eq("race_local_id", raceLocalId);
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
    .on("postgres_changes", { event: "*", schema: "public", table: "championships", filter: `id=eq.${cloudId}` }, p => onChange("championship", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "passages", filter: `championship_id=eq.${cloudId}` }, p => onChange("passages", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "races",    filter: `championship_id=eq.${cloudId}` }, p => onChange("races", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "boats",    filter: `championship_id=eq.${cloudId}` }, p => onChange("boats", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "marks",    filter: `championship_id=eq.${cloudId}` }, p => onChange("marks", p))
    .subscribe();
  return () => { try { sb.removeChannel(ch); } catch {} };
}

// ============================================================================
// Internos: mapeo estado(app) ↔ filas(Supabase)
// ============================================================================

async function upsertChampionship(sb, state) {
  let existingId = lsGet(chKey(state._champId))?._cloudId;
  let fixedCode = state.champ.joinCode ? state.champ.joinCode.toUpperCase() : null;

  // 1) Si ya tenemos un código fijo, buscar por ese código.
  if (!existingId && fixedCode) {
    const { data: found } = await sb.from("championships").select("id,join_code").eq("join_code", fixedCode).maybeSingle();
    if (found?.id) existingId = found.id;
  }
  // 2) Si NO hay código fijo, buscar por NOMBRE un campeonato ya existente y reutilizarlo
  //    (evita crear duplicados con código aleatorio para el mismo campeonato).
  if (!existingId && !fixedCode && state.champ.name) {
    const { data: byName } = await sb.from("championships")
      .select("id,join_code").eq("name", state.champ.name)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (byName?.id) { existingId = byName.id; fixedCode = byName.join_code; }
  }
  // 3) Solo si de verdad no existe ninguno, generamos un código nuevo.
  const joinCode = (fixedCode || makeJoinCode(state.champ.name)).toUpperCase();

  const row = {
    join_code: joinCode,
    name: state.champ.name,
    scoring_mode: state.champ.scoringMode || "WL_ToT",
    own_sail_no: normSail(state.fleet?.find(b => b.id === state.champ.ownId)?.sailNo) || null,
    data: { mainUrl: state.champ.mainUrl, resultsUrl: state.champ.resultsUrl, docsUrl: state.champ.docsUrl,
            photosUrl: state.champ.photosUrl, entryListUrl: state.champ.entryListUrl, ownId: state.champ.ownId,
            discardEvery: state.champ.discardEvery ?? 4, discardMin: state.champ.discardMin ?? 4,
            ndRaces: state.champ.ndRaces || [],
            orcStandings: state.champ.orcStandings || [], orcRaces: state.champ.orcRaces || [],
            orcNumRaces: state.champ.orcNumRaces || 0, orcLastSync: state.champ.orcLastSync || null },
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { data: cur } = await sb.from("championships").select("join_code").eq("id", existingId).maybeSingle();
    const finalCode = cur?.join_code || joinCode;
    await sb.from("championships").update({ ...row, join_code: finalCode }).eq("id", existingId);
    return { id: existingId, joinCode: finalCode };
  }
  const { data, error } = await sb.from("championships").insert(row).select("id,join_code").single();
  if (error) throw error;
  return { id: data.id, joinCode: data.join_code };
}

async function upsertBoats(sb, champId, fleet) {
  if (!fleet.length) return;
  const rows = fleet.map(b => ({
    championship_id: champId, sail_no: normSail(b.sailNo || b.id), name: b.name, cls: b.cls,
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
      rows.push({ championship_id: champId, race_id: raceCloudId, boat_sail_no: normSail(p.boatSailNo || p.boatId), leg: p.leg, real_time: p.realTime, device_id: p.deviceId || deviceId() });
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
  for (const p of passages) (byRaceCloud[p.race_id] ||= []).push({ boatSailNo: normSail(p.boat_sail_no), leg: p.leg, realTime: Number(p.real_time), deviceId: p.device_id });

  // Marcas SIN asignar — desde su tabla propia (igual que passages), por race_local_id
  let marksRows = [];
  try {
    const { data } = await sb.from("marks").select("*").eq("championship_id", champ.id);
    marksRows = data || [];
  } catch { marksRows = []; }
  const byRaceMarks = {};
  for (const m of marksRows) (byRaceMarks[m.race_local_id] ||= []).push({ id: m.id, time: Number(m.mark_time), deviceId: m.device_id });
  // Orden estable por tiempo
  for (const k in byRaceMarks) byRaceMarks[k].sort((a, z) => a.time - z.time);

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
    marks: byRaceMarks[r.local_id] || [],
  }));
  return {
    _champId: champ.id, _cloudId: champ.id,
    champ: { ...(champ.data || {}),
             name: champ.name, joinCode: champ.join_code, scoringMode: champ.scoring_mode,
             ownId: champ.data?.ownId,
             mainUrl: champ.data?.mainUrl || "", resultsUrl: champ.data?.resultsUrl || "", docsUrl: champ.data?.docsUrl || "",
             photosUrl: champ.data?.photosUrl || "", entryListUrl: champ.data?.entryListUrl || "",
             discardEvery: champ.data?.discardEvery ?? 4, discardMin: champ.data?.discardMin ?? 4,
             ndRaces: champ.data?.ndRaces || [],
             orcStandings: champ.data?.orcStandings || [], orcRaces: champ.data?.orcRaces || [],
             orcNumRaces: champ.data?.orcNumRaces || 0, orcLastSync: champ.data?.orcLastSync || null },
    fleet,
    races: racesOut.length ? racesOut : [{ id: "r1", name: "Prueba 1", startTime: null, countdownAt: null, finishedAt: null, passages: [], course: null, discarded: false }],
    activeRaceId: racesOut[0]?.id || "r1",
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BIBLIOTECA DE BARCOS — guarda barcos por sailNo entre campeonatos       ║
// ║                                                                          ║
// ║  Requiere la tabla `boats_library` en Supabase (ver ORC_boats_library.sql)║
// ║  Se rellena al subir un certificado; se consulta al crear un campeonato. ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Helper interno: barco app → fila SQL
function _boatToLibRow(b) {
  return {
    sail_no_norm:   normSail(b.sailNo || ""),
    sail_no:        (b.sailNo || "").trim(),
    name:           (b.name || "").trim(),
    boat_type:      b.boatType || b.rating?.boatType || null,
    bow_num:        b.bowNum != null ? Number(b.bowNum) : null,
    cls:            b.cls || null,
    nation:         b.nation || null,
    color:          b.color || null,
    hull_color:     b.hullColor || null,
    rating:         b.rating || null,
    gp_h:           b.gpH != null ? Number(b.gpH) : null,
    cert_no:        b.rating?.certNo || null,
    cert_ref:       b.rating?.certRef || b.rating?.cert_ref || null,
    valid_until:    b.rating?.validUntil || null,
    photo_beat_url: b.photoBeat || b.photo_beat_url || null,
    photo_run_url:  b.photoRun  || b.photo_run_url  || null,
    trim_bands:     b.trimBands || null,
    notes:          b.notes || null,
    source:         b.source || "manual",
    last_seen_at:   new Date().toISOString(),
  };
}

// Helper interno: fila SQL → barco app
function _libRowToBoat(row) {
  if (!row) return null;
  return {
    sailNo:    row.sail_no,
    name:      row.name,
    boatType:  row.boat_type,
    bowNum:    row.bow_num,
    cls:       row.cls,
    nation:    row.nation,
    color:     row.color,
    hullColor: row.hull_color,
    rating:    row.rating,
    gpH:       row.gp_h,
    photoBeat: row.photo_beat_url,
    photoRun:  row.photo_run_url,
    trimBands: row.trim_bands || [],
    notes:     row.notes,
    _library: {
      cert_no:      row.cert_no,
      cert_ref:     row.cert_ref,
      valid_until:  row.valid_until,
      source:       row.source,
      last_seen_at: row.last_seen_at,
      updated_at:   row.updated_at,
    },
  };
}

// Busca UN barco por sailNo. Devuelve barco listo para la app, o null.
export async function getBoatFromLibrary(sailNo) {
  const sb = getClient();
  if (!sb) return null;
  const key = normSail(sailNo || "");
  if (!key) return null;
  const { data, error } = await sb
    .from("boats_library")
    .select("*")
    .eq("sail_no_norm", key)
    .maybeSingle();
  if (error) { console.warn("getBoatFromLibrary:", error.message); return null; }
  return _libRowToBoat(data);
}

// Busca varios barcos a la vez. Devuelve Map(sailNoNorm → barco).
export async function getBoatsFromLibrary(sailNos) {
  const sb = getClient();
  if (!sb) return new Map();
  const keys = (sailNos || []).map(s => normSail(s || "")).filter(Boolean);
  if (!keys.length) return new Map();
  const { data, error } = await sb
    .from("boats_library")
    .select("*")
    .in("sail_no_norm", keys);
  if (error) { console.warn("getBoatsFromLibrary:", error.message); return new Map(); }
  const map = new Map();
  for (const row of (data || [])) map.set(row.sail_no_norm, _libRowToBoat(row));
  return map;
}

// UPSERT por sail_no_norm. Hace merge no-destructivo de fotos/color/notas
// (lo que viene en el barco nuevo gana; si está vacío se conserva el anterior).
export async function saveBoatToLibrary(boat) {
  const sb = getClient();
  if (!sb) return null;
  const key = normSail(boat.sailNo || "");
  if (!key) { console.warn("saveBoatToLibrary: sailNo vacío"); return null; }

  const existing = await getBoatFromLibrary(boat.sailNo);
  const merged = {
    ...boat,
    color:     boat.color     || existing?.color,
    hullColor: boat.hullColor || existing?.hullColor,
    photoBeat: boat.photoBeat || existing?.photoBeat,
    photoRun:  boat.photoRun  || existing?.photoRun,
    trimBands: (boat.trimBands && boat.trimBands.length) ? boat.trimBands : (existing?.trimBands || []),
    notes:     boat.notes     || existing?.notes,
    rating:    boat.rating    || existing?.rating,
    gpH:       boat.gpH       || existing?.gpH,
  };

  const row = _boatToLibRow(merged);
  const { data, error } = await sb
    .from("boats_library")
    .upsert(row, { onConflict: "sail_no_norm" })
    .select()
    .maybeSingle();
  if (error) { console.warn("saveBoatToLibrary:", error.message); return null; }
  return _libRowToBoat(data);
}

// Lista todos los barcos (orden alfabético). Para pantalla "Mi biblioteca".
export async function listLibraryBoats() {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("boats_library")
    .select("*")
    .order("name", { ascending: true });
  if (error) { console.warn("listLibraryBoats:", error.message); return []; }
  return (data || []).map(_libRowToBoat);
}

// Borra un barco de la biblioteca.
export async function deleteBoatFromLibrary(sailNo) {
  const sb = getClient();
  if (!sb) return false;
  const key = normSail(sailNo || "");
  if (!key) return false;
  const { error } = await sb
    .from("boats_library")
    .delete()
    .eq("sail_no_norm", key);
  if (error) { console.warn("deleteBoatFromLibrary:", error.message); return false; }
  return true;
}

// Marca un barco como "visto recientemente" (last_seen_at).
export async function touchBoatInLibrary(sailNo) {
  const sb = getClient();
  if (!sb) return;
  const key = normSail(sailNo || "");
  if (!key) return;
  await sb
    .from("boats_library")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("sail_no_norm", key);
}
