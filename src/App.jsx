import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as cloud from "./db.js";

// ── ERROR BOUNDARY — muestra el error real en lugar de pantalla en blanco ──
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e.message || String(e) }; }
  componentDidCatch(e, info) { console.error("ORC Tracker error:", e, info); }
  render() {
    if (this.state.err) {
      const clearAll = async () => {
        try {
          localStorage.removeItem("orc-v7");
          localStorage.removeItem("orc-champs-idx");
          Object.keys(localStorage).filter(k=>k.startsWith("orc-ch-")).forEach(k=>localStorage.removeItem(k));
        } catch{}
        this.setState({ err: null });
      };
      return React.createElement("div", {
        style: { padding:20, background:BG, minHeight:"100vh", color:T1, fontFamily:"system-ui" }
      },
        React.createElement("style", null, CSS),
        React.createElement("div", { style:{fontSize:36,marginBottom:12,textAlign:"center"} }, "⚠️"),
        React.createElement("h3", { style:{color:"#ef4444",marginBottom:8,textAlign:"center"} }, "Error en ORC Tracker"),
        React.createElement("pre", { style:{fontSize:10,whiteSpace:"pre-wrap",background:"#111",padding:12,borderRadius:8,color:"#fca5a5",marginBottom:16,overflowX:"auto"} }, this.state.err),
        React.createElement("button", {
          onClick: () => this.setState({ err: null }),
          style: { display:"block",width:"100%",padding:"11px 0",background:ACC,color:"#fff",borderRadius:8,border:"none",fontWeight:700,fontSize:14,marginBottom:8,cursor:"pointer" }
        }, "↺ Reintentar"),
        React.createElement("button", {
          onClick: clearAll,
          style: { display:"block",width:"100%",padding:"11px 0",background:"#1a0a0a",color:RED,borderRadius:8,border:`1px solid ${RED}`,fontWeight:700,fontSize:13,cursor:"pointer" }
        }, "🗑 Limpiar datos y empezar de nuevo")
      );
    }
    return this.props.children;
  }
}

// ── DIÁLOGO DE CONFIRMACIÓN (sin window.confirm, funciona en móvil) ────────
function ConfirmDialog({ msg, onOk, onCancel }) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
    }}>
      <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:"20px 18px", maxWidth:300, width:"90%" }}>
        <p style={{ fontSize:13, color:T1, marginBottom:16, lineHeight:1.5 }}>{msg}</p>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onOk}     style={{ flex:1, padding:"10px 0", background:RED,  color:"#fff", borderRadius:8, border:"none", fontWeight:700, fontSize:13 }}>Confirmar</button>
          <button onClick={onCancel} style={{ flex:1, padding:"10px 0", background:CARD2,color:T1,  borderRadius:8, border:"1px solid "+BDR, fontWeight:700, fontSize:13 }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const SK="orc-v7";
const IDX_KEY="orc-champs-idx";
const chKey = id=>`orc-ch-${id}`;
const PHOTO_DB_KEY = "orc-boat-photos-v1"; // Base de datos compartida de fotos

const lsGet = k=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch{ return null; }};
const lsSet = (k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

const saveS   = async s => lsSet(SK, s);
const loadS   = async ()=> lsGet(SK);
const saveIdx = async arr => { lsSet(IDX_KEY, arr); try{ await cloud.saveIndex(arr); }catch{} };
const loadIdx = async ()=> lsGet(IDX_KEY)||[];
// saveCh/loadCh delegan en la nube si está configurada; si no, localStorage.
const saveCh  = async (id,s) => { lsSet(chKey(id), s); try{ return await cloud.saveChampionship(id, s); }catch(e){ console.error("cloud save:",e); return {ok:false,error:e.message}; } };
const loadCh  = async id => { try{ const r=await cloud.loadChampionship(id); if(r) return r; }catch{} return lsGet(chKey(id)); };
// deleteCh: borra el campeonato. cloud.deleteChampionship lee el _cloudId
// y borra tanto la nube como la entrada local (en ese orden).
const deleteCh = async id => {
  try{ await cloud.deleteChampionship(id); }
  catch(e){ console.error("delete:",e); try{ localStorage.removeItem(chKey(id)); }catch{} }
};

// Base de datos compartida — window.storage (shared) para artifact, localStorage como fallback
const loadPhotoDb = async()=>{
  try{ const r=await window.storage.get(PHOTO_DB_KEY,true); return r?JSON.parse(r.value):{} ; }
  catch{ return lsGet(PHOTO_DB_KEY)||{}; }
};
const savePhotoDb = async db=>{
  const s=JSON.stringify(db);
  try{ await window.storage.set(PHOTO_DB_KEY,s,true); }catch{}
  lsSet(PHOTO_DB_KEY,db);
};

const CLASS0=[
  {id:"SS",name:"SUMMER STORM",       sailNo:"USA 520",   bowNum:13,  cls:"Clase 0", boatType:"TP 52",         gpH:556, color:"#ef4444", hullColor:"#222222", mainColor:"#ffffff", spiColor:"#ef4444",  jibColor:"#ffffff"},
  {id:"RN",name:"ROCKETNIKKA",         sailNo:"ITA-51001", bowNum:11,  cls:"Clase 0", boatType:"Wallyrocket 51",gpH:537, color:"#e879f9", hullColor:"#111111", mainColor:"#ffffff", spiColor:"#e879f9",  jibColor:"#ffffff"},
  {id:"VD",name:"VUDU",                sailNo:"AUS-52",    bowNum:128, cls:"Clase 0", boatType:"TP 52",         gpH:558, color:"#06b6d4", hullColor:"#06b6d4", mainColor:"#ffffff", spiColor:"#06b6d4",  jibColor:"#ffffff"},
  {id:"DJ",name:"DJANGO WR",           sailNo:"GBR-51X",   bowNum:115, cls:"Clase 0", boatType:"Wallyrocket 51",gpH:534, color:"#f97316", hullColor:"#f97316", mainColor:"#ffffff", spiColor:"#f97316",  jibColor:"#ffffff"},
  {id:"FF",name:"FINAL FINAL",         sailNo:"USA 60564", bowNum:6,   cls:"Clase 0", boatType:"PAC 52",        gpH:558, color:"#3b82f6", hullColor:"#1d4ed8", mainColor:"#ffffff", spiColor:"#3b82f6",  jibColor:"#ffffff"},
  {id:"UR",name:"VITHAS URBANIA",      sailNo:"ESP-52801", bowNum:14,  cls:"Clase 0", boatType:"Soto 52",       gpH:561, color:"#22c55e", hullColor:"#111111", mainColor:"#111111", spiColor:"#22c55e",  jibColor:"#111111", trimBandsMain:["#22c55e","#22c55e","#22c55e"], own:true},
  {id:"RB",name:"RED BANDIT",          sailNo:"GER 8399",  bowNum:10,  cls:"Clase 0", boatType:"TP 52",         gpH:558, color:"#dc2626", hullColor:"#111111", mainColor:"#ffffff", spiColor:"#dc2626",  jibColor:"#ffffff"},
  {id:"AL",name:"ALBATOR 3",           sailNo:"FRA-2775",  bowNum:134, cls:"Clase 0", boatType:"Botin 44",      gpH:540, color:"#7c3aed", hullColor:"#7c3aed", mainColor:"#ffffff", spiColor:"#7c3aed",  jibColor:"#ffffff"},
  {id:"XI",name:"XIO",                 sailNo:"ITA-23520", bowNum:23,  cls:"Clase 0", boatType:"TP52",          gpH:557, color:"#f59e0b", hullColor:"#f59e0b", mainColor:"#ffffff", spiColor:"#f59e0b",  jibColor:"#ffffff"},
  {id:"SL",name:"SPIRIT OF LORINA II", sailNo:"FRA-2030",  bowNum:122, cls:"Clase 0", boatType:"TP 52",         gpH:560, color:"#10b981", hullColor:"#10b981", mainColor:"#ffffff", spiColor:"#10b981",  jibColor:"#ffffff"},
  {id:"MU",name:"MUSICA",              sailNo:"SUI 52111", bowNum:5,   cls:"Clase 0", boatType:"TP 52",         gpH:562, color:"#8b5cf6", hullColor:"#8b5cf6", mainColor:"#ffffff", spiColor:"#8b5cf6",  jibColor:"#ffffff"},
  {id:"AB",name:"ARKAS BLUE MOON",     sailNo:"TUR 3535",  bowNum:3,   cls:"Clase 0", boatType:"TP52",          gpH:560, color:"#3b82f6", hullColor:"#1d4ed8", mainColor:"#ffffff", spiColor:"#3b82f6",  jibColor:"#ffffff"},
  {id:"KI",name:"KILARA II",           sailNo:"SUI 5103",  bowNum:7,   cls:"Clase 0", boatType:"Wallyrocket 51",gpH:535, color:"#34d399", hullColor:"#34d399", mainColor:"#ffffff", spiColor:"#34d399",  jibColor:"#ffffff"},
  {id:"NS",name:"NIGHT SHADOW",        sailNo:"ESP-5757",  bowNum:9,   cls:"Clase 0", boatType:"B&C 52",        gpH:545, color:"#64748b", hullColor:"#1e293b", mainColor:"#ffffff", spiColor:"#3b82f6",  jibColor:"#ffffff"},
  {id:"CH",name:"CHOCOLATE 3",         sailNo:"HUN 53",    bowNum:4,   cls:"Clase 0", boatType:"Farr 52",       gpH:550, color:"#92400e", hullColor:"#92400e", mainColor:"#ffffff", spiColor:"#92400e",  jibColor:"#ffffff"},
];

const BOAT_COLORS=["#ef4444","#06b6d4","#f59e0b","#3b82f6","#dc2626","#8b5cf6","#10b981","#fbbf24","#f97316","#e879f9","#34d399","#60a5fa","#fb923c","#a78bfa","#4ade80","#facc15","#f472b6","#38bdf8"];

// Clase A — GPH aprox 530-555 (rendimiento alto)
const CLASS_A=[
  {id:"RA", name:"RAN",              sailNo:"SWE-30",  bowNum:0, cls:"Clase A", boatType:"Carkeek 40+", gpH:533, color:"#1d4ed8"},
  {id:"MV", name:"MORGAN V",         sailNo:"ITA-42",  bowNum:0, cls:"Clase A", boatType:"Swan 42",     gpH:543, color:"#06b6d4"},
  {id:"GM", name:"GARM 42",          sailNo:"SWE-42",  bowNum:0, cls:"Clase A", boatType:"GP42",        gpH:538, color:"#fbbf24"},
  {id:"DJP",name:"DJANGO JP",        sailNo:"ITA-40",  bowNum:0, cls:"Clase A", boatType:"Fast 40+",    gpH:536, color:"#f97316"},
];
// Clase B — GPH aprox 555-575 (rendimiento medio)
const CLASS_B=[
  {id:"TN", name:"TECHNONICOL",      sailNo:"MLT-41",  bowNum:0, cls:"Clase B", boatType:"X-41",        gpH:562, color:"#8b5cf6"},
  {id:"TB2",name:"TO BE",            sailNo:"ITA-41",  bowNum:0, cls:"Clase B", boatType:"IRC",         gpH:558, color:"#10b981"},
  {id:"ARB",name:"ARABELLA",         sailNo:"LTU-11",  bowNum:0, cls:"Clase B", boatType:"Italia 11.98",gpH:568, color:"#22c55e"},
  {id:"MS", name:"MASCALZONE LATINO",sailNo:"ITA-40F", bowNum:0, cls:"Clase B", boatType:"Farr 40",     gpH:555, color:"#ef4444"},
];
// Clase C — GPH aprox 575-620 (cruceros rápidos)
const CLASS_C=[
  {id:"RM", name:"ROBE DA MAT",      sailNo:"ESP-11",  bowNum:0, cls:"Clase C", boatType:"MAT-11",      gpH:580, color:"#92400e"},
  {id:"FR", name:"FREEDOM 24",       sailNo:"CYP-37",  bowNum:0, cls:"Clase C", boatType:"Vrolijk 37",  gpH:590, color:"#f59e0b"},
  {id:"LD", name:"LADY DAY 998",     sailNo:"ITA-998", bowNum:0, cls:"Clase C", boatType:"Italia 9.98", gpH:605, color:"#ec4899"},
  {id:"DH", name:"DIPUTACION DE HUELVA",sailNo:"ESP-37",bowNum:0,cls:"Clase C", boatType:"Salona 37",   gpH:595, color:"#dc2626"},
  {id:"CH2",name:"CHISUM",           sailNo:"ITA-31",  bowNum:0, cls:"Clase C", boatType:"Cape 31",     gpH:615, color:"#64748b"},
  {id:"BX", name:"B.LEX",            sailNo:"ITA-30",  bowNum:0, cls:"Clase C", boatType:"Farr 30",     gpH:620, color:"#7c3aed"},
];
const NUM_ES={
  "uno":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,
  "siete":7,"ocho":8,"nueve":9,"diez":10,"once":11,
  "doce":12,"trece":13,"catorce":14,"quince":15,"dieciséis":16,
  "uno":1,"barco uno":1,"número uno":1,"barco dos":2,"número dos":2,
  "barco tres":3,"barco cuatro":4,"barco cinco":5,"barco seis":6,
  "barco siete":7,"barco ocho":8,"barco nueve":9,"barco diez":10,
};

// Interpretar entrada de voz → barco
// Resultados ORC World Championship 2026 — Clase 0 · 8 pruebas (14 mayo 2026)
const ORC_WORLDS_2026_STANDINGS = [
  {pos:1, nation:"USA", boat:"SUMMER STORM",       sailNo:"USA 520",   bowNum:13, cls:"TP 52",         breakdown:[1,1,1.5,1,1,11,2,2],              totalPts:18.5},
  {pos:2, nation:"AUS", boat:"VUDU",                sailNo:"AUS-52",    bowNum:128,cls:"TP 52",         breakdown:[2,2,4,10,4,1,3,5],                totalPts:21},
  {pos:3, nation:"ITA", boat:"ROCKETNIKKA",         sailNo:"ITA-51001", bowNum:11, cls:"Wallyrocket 51",breakdown:[4,5,3,2,2,2,4,4],                 totalPts:21},
  {pos:4, nation:"ITA", boat:"DJANGO WR",           sailNo:"GBR-51X",   bowNum:115,cls:"Wallyrocket 51",breakdown:[3,4,5,6,5,4,1,1],                totalPts:23},
  {pos:5, nation:"USA", boat:"FINAL FINAL",         sailNo:"USA 60564", bowNum:6,  cls:"PAC 52",        breakdown:[7,3,10,3,7.5,3,"16 RET",6],       totalPts:39.5},
  {pos:6, nation:"ITA", boat:"XIO",                 sailNo:"ITA-23520", bowNum:23, cls:"TP52",          breakdown:[5,8,1.5,"16 RET","16 DNC",7,5,3], totalPts:45.5},
  {pos:7, nation:"ESP", boat:"VITHAS URBANIA",      sailNo:"ESP-52801", bowNum:14, cls:"Soto 52",       breakdown:[11,7,6,4,3,8,8,10],               totalPts:47},
  {pos:8, nation:"GER", boat:"RED BANDIT",          sailNo:"GER 8399",  bowNum:10, cls:"TP 52",         breakdown:[6,6,11,11,10,5,6,8],              totalPts:52},
  {pos:9, nation:"FRA", boat:"ALBATOR 3",           sailNo:"FRA-2775",  bowNum:134,cls:"Botin 44",      breakdown:[8,10,13,8,7.5,6,11,11],           totalPts:61.5},
  {pos:10,nation:"FRA", boat:"SPIRIT OF LORINA II", sailNo:"FRA-2030",  bowNum:122,cls:"TP 52",         breakdown:[12,11,7,7,9,9,9,"16 DNS"],        totalPts:64},
  {pos:11,nation:"TUR", boat:"ARKAS BLUE MOON",     sailNo:"TUR 3535",  bowNum:3,  cls:"TP52",          breakdown:[9,12,9,9,12,12,7,7],              totalPts:65},
  {pos:12,nation:"SUI", boat:"MUSICA",              sailNo:"SUI 52111", bowNum:5,  cls:"TP 52",         breakdown:[10,9,12,5,11,10,12,"16 DNS"],     totalPts:69},
  {pos:13,nation:"AUS", boat:"KILARA II",           sailNo:"SUI 5103",  bowNum:7,  cls:"Wallyrocket 51",breakdown:["16 DNC",13,8,13,6,14,10,9],     totalPts:76},
  {pos:14,nation:"SUI", boat:"NIGHT SHADOW",        sailNo:"ESP-5757",  bowNum:9,  cls:"B&C 52",        breakdown:[13,14,14,12,13,15,13,13],         totalPts:93},
  {pos:15,nation:"HUN", boat:"CHOCOLATE 3",         sailNo:"HUN 53",    bowNum:4,  cls:"Farr 52",       breakdown:[14,"16 DSQ",15,14,14,13,14,12],   totalPts:96},
];

// Comprimir imagen a base64 JPEG (max 700px, calidad 72%)
function compressImage(file, maxW=700, quality=0.72){
  return new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = e=>{
      const img = new Image();
      img.onload = ()=>{
        const scale = Math.min(1, maxW/img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width*scale);
        canvas.height = Math.round(img.height*scale);
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Guardar/cargar foto local por barco (base64 — solo local, no compartida)
const saveLocalPhoto = (sailNo,type,data)=>lsSet(`orc-p-${type}-${(sailNo||'').replace(/[^A-Z0-9]/gi,'')}`,data);
const loadLocalPhoto = (sailNo,type)=>lsGet(`orc-p-${type}-${(sailNo||'').replace(/[^A-Z0-9]/gi,'')}`)||null;

// Subir foto al servidor Vercel (Blob) — devuelve URL pública válida en todos los dispositivos
async function uploadPhotoToServer(base64, sailNo, type){
  if(IS_ARTIFACT) return null;
  try{
    const res = await fetch("/api/upload-photo",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({base64, sailNo, type})
    });
    if(!res.ok) return null;
    const data = await res.json();
    return data.url||null;
  }catch{ return null; }
}

// Analizar colores del barco desde una foto usando Claude Vision
async function analyzeBoatColors(base64Image, mediaType="image/jpeg"){
  try{
    const res = await fetch(CLAUDE_API,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model: IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages:[{role:"user", content:[
          {type:"image", source:{type:"base64", media_type:mediaType, data:base64Image.replace(/^data:image\/\w+;base64,/,"")}},
          {type:"text", text:`Analiza esta foto de un velero de regata y extrae los colores exactos.
Responde ÚNICAMENTE con JSON sin markdown:
{"hullColor":"#hexcolor","sailColor":"#hexcolor","trimBands":["#hex1","#hex2"],"confidence":"high/medium/low"}

- hullColor: color principal del casco (hex)
- sailColor: color principal de la vela mayor (hex)  
- trimBands: colores de las bandas/rayas de trimming en las velas (array de hex, puede estar vacío)
- Si el casco es negro usa #111111, si es blanco usa #f8fafc`}
        ]}]
      })
    });
    const data = await res.json();
    const raw = (data.content||[]).map(c=>c.text||"").join("");
    const m = raw.match(/\{[\s\S]*\}/);
    if(m) return JSON.parse(m[0]);
  }catch(e){ console.warn("analyzeBoatColors error:",e); }
  return null;
}
// Extraer clasificación de campeonato desde una captura de pantalla de resultados
async function extractResultsFromImage(base64Image, mediaType="image/jpeg"){
  try{
    const res = await fetch(CLAUDE_API,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model: IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages:[{role:"user", content:[
          {type:"image", source:{type:"base64", media_type:mediaType, data:base64Image.replace(/^data:image\/\w+;base64,/,"")}},
          {type:"text", text:`Esta es una captura de una tabla de clasificación general de una regata ORC.
Extrae para cada barco: su nº de vela (N.Vela), nombre (Yate), nacionalidad si aparece, modelo/clase, las posiciones de cada prueba individual (columnas numeradas 1,2,3... antes de Puntos/Total) y el total de puntos.
Responde ÚNICAMENTE con JSON sin markdown, sin texto antes ni después:
{"eventName":"...","numRaces":2,"overallStandings":[{"pos":1,"sailNo":"ESP52801","boat":"VITHAS URBANIA","nation":"ESP","cls":"SOTO 52","breakdown":[1,2],"totalPts":3}]}
- breakdown: array con la posición de cada prueba EN ORDEN (R1, R2...). Si una celda pone "DNF","DNC","RET","DSQ" etc., ponla como el texto tal cual (ej. "16 DNF").
- totalPts: el número de la columna Puntos/Total.
- Ordena overallStandings por posición (pos) ascendente.`}
        ]}]
      })
    });
    const data = await res.json();
    const raw = (data.content||[]).map(c=>c.text||"").join("");
    const m = raw.match(/\{[\s\S]*"overallStandings"[\s\S]*\}/);
    if(m){ try{ const p=JSON.parse(m[0]); if(p.overallStandings?.length) return p; }catch{} }
  }catch(e){ console.warn("extractResultsFromImage error:",e); }
  return null;
}

const _srvPhotoCache = {};

async function loadServerPhotos(){
  if(IS_ARTIFACT||_srvPhotoCache._loaded) return _srvPhotoCache;
  try{
    const res = await fetch("/api/upload-photo");
    if(!res.ok) return {};
    const {photos=[]} = await res.json();
    photos.forEach(p=>{ _srvPhotoCache[p.pathname]=p.url; });
    _srvPhotoCache._loaded = true;
  }catch{}
  return _srvPhotoCache;
}
function getServerPhotoUrl(sailNo, type){
  const key = `orc-boats/${(sailNo||'').replace(/[^A-Z0-9]/gi,'')}-${type}.jpg`;
  return _srvPhotoCache[key]||null;
}

function parseVoiceInput(text, fleet) {
  const raw = text.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"");
  
  // Intentar número de proa por dígito o palabra
  const numDigit = parseInt(raw);
  const numWord  = NUM_ES[raw];
  const bowNum   = (!isNaN(numDigit) && numDigit>0) ? numDigit : (numWord||null);
  
  if (bowNum) {
    const byBow = fleet.filter(b=>b.bowNum===bowNum);
    if (byBow.length===1) return {type:"confirmed", boat:byBow[0]};
    if (byBow.length>1)   return {type:"ambiguous", matches:byBow};
  }
  
  // Intentar número de vela / sail number
  const bySail = fleet.filter(b=> b.sailNo && raw.includes(b.sailNo.toLowerCase()));
  if (bySail.length===1) return {type:"confirmed", boat:bySail[0]};
  
  // Intentar nombre del barco (fuzzy)
  const byName = fleet.map(b=>{
    const bn = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"");
    let s=0;
    if(bn===raw)s=1;
    else if(bn.includes(raw)||raw.includes(bn))s=.9;
    else{const ws=raw.split(/\s+/).filter(w=>w.length>2);if(ws.some(w=>bn.includes(w)))s=.7;}
    return{b,s};
  }).filter(x=>x.s>.55).sort((a,z)=>z.s-a.s);
  
  if (byName.length===1) return {type:"confirmed", boat:byName[0].b};
  if (byName.length>1)   return {type:"ambiguous", matches:byName.slice(0,4).map(x=>x.b)};
  
  return null;
}
const WINDS=[6,8,10,12,14,16,20];
const DCOURSE={mark1Dist:1.5,mark1aDist:0.15,gateDist:0.3,mark1aSide:"port",windKnots:14,countdownMin:5,raceType:"wl",coastalLegs:[]};
const INIT={champ:{name:"ORC World Championship 2026",ownId:"UR",mainUrl:"",resultsUrl:"",docsUrl:"",photosUrl:"",entryListUrl:"",scoringMode:"AP_ToD",discardEvery:4,discardMin:4},fleet:CLASS0,races:[{id:"r1",name:"Prueba 1",startTime:null,countdownAt:null,finishedAt:null,passages:[],course:DCOURSE,discarded:false}],activeRaceId:"r1"};
// Genera los tramos según el nº de vueltas: Ceñida, Offset, Popa por vuelta + Llegada
function buildLegs(vueltas=2){
  const legs=[]; let n=1;
  for(let v=1; v<=vueltas; v++){
    legs.push({n:n++, mark:"Boya 1",   type:"beat",   label:`Ceñida ${v}`, col:"#d97706", kind:"beat"});
    legs.push({n:n++, mark:"Offset",   type:"reach",  label:`Offset ${v}`, col:"#7c3aed", kind:"offset"});
    legs.push({n:n++, mark:"Puerta",   type:"run",    label:`Popa ${v}`,   col:"#0891b2", kind:"run"});
  }
  legs.push({n:n++, mark:"Llegada", type:"finish", label:"Llegada", col:"#16a34a", kind:"finish"});
  return legs;
}
// Tramos de una prueba (según course.vueltas; por defecto 2)
function raceLegs(course){ return buildLegs(course?.vueltas||2); }
const LEG_DEF=buildLegs(2);


// ── TEMA: los tokens son CSS variables, así un único cambio de :root cambia
// toda la app sin tocar los cientos de usos de ${CARD}, ${T2}, etc. ───────────
const BG="var(--bg)",CARD="var(--card)",CARD2="var(--card2)",BDR="var(--bdr)";

// Detectar entorno: artifact de Claude (iframe) vs Vercel (standalone)
const IS_ARTIFACT = typeof window!=="undefined" && window.self!==window.top;
const CLAUDE_API  = IS_ARTIFACT
  ? CLAUDE_API
  : "/api/claude";

const T1="var(--t1)",T2="var(--t2)",T3="var(--t3)";
const ACC="var(--acc)",GRN="var(--grn)",RED="var(--red)",GLD="var(--gld)",CYN="var(--cyn)",PRP="var(--prp)";

// Paletas. El interruptor de tema pone data-theme="light" en <html>.
const THEME_VARS = `
:root{
  --bg:#070d18; --card:#0d1826; --card2:#111f2e; --bdr:#1a3050;
  --t1:#e8eef4; --t2:#90abc4; --t3:#5a7a96;
  --acc:#3b82f6; --grn:#10b981; --red:#ef4444; --gld:#f59e0b; --cyn:#22b8cf; --prp:#a78bfa;
}
[data-theme="light"]{
  --bg:#f2f5f9; --card:#ffffff; --card2:#eef2f7; --bdr:#d3dde8;
  --t1:#0f1d2e; --t2:#3d5573; --t3:#7089a3;
  --acc:#1d4ed8; --grn:#047857; --red:#dc2626; --gld:#b45309; --cyn:#0e7490; --prp:#6d28d9;
}`;
const CSS=THEME_VARS+`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body,#root{background:${BG};color:${T1};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;height:100vh;height:100dvh;overflow:hidden;transition:background .2s,color .2s}input,select{width:100%;color:${T1};background:${CARD2};border:1px solid ${BDR};border-radius:8px;padding:8px 10px;font-size:13px;outline:none}input:focus,select:focus{border-color:${ACC}}button{cursor:pointer;border:none;outline:none}button:active{transform:scale(.95)}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${BDR}}@keyframes pop{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}.pop{animation:pop .18s ease}`;

function ft(s,plus=false){if(s==null||isNaN(s))return"--:--";const g=s<0?"-":(plus&&s>0?"+":"");const a=Math.abs(Math.round(s));const h=Math.floor(a/3600),m=Math.floor((a%3600)/60),sc=a%60;return h>0?`${g}${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`:`${g}${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;}

// ── MODELO DE RATING ORC ────────────────────────────────────────────────────
// Cada barco guarda su certificado completo, no un escalar. Las claves "single"
// son los Single Number Scoring Options del certificado; "curves" son las tablas
// Time Allowances (secs/NM) por velocidad de viento.
const SCORING_MODES = [
  {key:"WL_ToT",   label:"W/L · ToT",      kind:"ToT", curve:"wl",      single:"wl_tot"},
  {key:"WL_ToD",   label:"W/L · ToD",      kind:"ToD", curve:"wl",      single:"wl_tod"},
  {key:"AP_ToD",   label:"All Purpose ToD",kind:"ToD", curve:"ap",      single:"ap_tod"},
  {key:"AP_ToT",   label:"All Purpose ToT",kind:"ToT", curve:"ap",      single:"ap_tot"},
  {key:"CLD_ToD",  label:"Coastal/LD ToD", kind:"ToD", curve:"coastal", single:"cld_tod"},
];
const DEFAULT_SCORING = "WL_ToT";
const scoringMode = k => SCORING_MODES.find(m=>m.key===k) || SCORING_MODES[0];

// ── DESCARTES ────────────────────────────────────────────────────────────
// races: [{pts:Number, nonDiscardable:Bool}] · una entrada por prueba puntuada.
// discardEvery: cada cuántas pruebas válidas se descarta una (0 = sin descartes).
// discardMin: nº mínimo de pruebas completadas para empezar a descartar.
// Devuelve {total, discardedIdx:[índices descartados], counted}.
function applyDiscards(races, discardEvery=4, discardMin=4){
  const all = races.map((r,i)=>({pts:Number(r.pts)||0, nd:!!r.nonDiscardable, i}));
  const n = all.length;
  // nº de descartes permitidos: 1 cada discardEvery, solo si hay >= discardMin pruebas
  let nDiscards = 0;
  if(discardEvery>0 && n>=discardMin){ nDiscards = Math.floor(n/discardEvery); }
  // candidatas a descarte: solo las descartables, ordenadas de peor (más puntos) a mejor
  const discardable = all.filter(r=>!r.nd).sort((a,b)=>b.pts-a.pts);
  const toDiscard = new Set(discardable.slice(0, nDiscards).map(r=>r.i));
  const total = all.reduce((s,r)=> s + (toDiscard.has(r.i)?0:r.pts), 0);
  return {total, discardedIdx:[...toDiscard], counted:n-toDiscard.size};
}

// ¿El barco tiene un rating utilizable para este modo de scoring?
function hasValidRating(b, modeKey=DEFAULT_SCORING){
  const m = scoringMode(modeKey), r = b?.rating;
  if(!r) return false;
  if(r.single && r.single[m.single]!=null) return true;          // single number disponible
  if(r.curves && Array.isArray(r.curves[m.curve]) && r.curves[m.curve].length) return true; // curva disponible
  // compatibilidad hacia atrás: barco viejo con gpH escalar (= All Purpose ToD)
  if(m.single==="ap_tod" && b.gpH) return true;
  return false;
}

// Devuelve el ToD efectivo (segundos/milla) para un viento dado, usando la curva
// real del certificado si existe; si no, cae al single number; si no, al gpH legacy.
function ratingToD(b, tws, modeKey=DEFAULT_SCORING){
  const m = scoringMode(modeKey), r = b?.rating;
  if(r?.curves?.[m.curve]?.length){
    const row = r.curves[m.curve], i = WINDS.indexOf(tws);
    if(i>=0 && row[i]!=null) return row[i];
  }
  if(r?.single?.[m.single]!=null && m.kind==="ToD") return r.single[m.single];
  if(b.gpH) return b.gpH; // legacy
  return null;
}

// Tiempos corregidos por tramo, derivados de la curva real cuando está disponible.
// beat = ceñida (VMG barlovento), run = popa (VMG run), reach a ~90°.
function vpp(b, tws, modeKey=DEFAULT_SCORING){
  // Si el barco trae las curvas detalladas del certificado, las usamos directamente.
  const r = (typeof b==="object") ? b?.rating : null;
  const i = WINDS.indexOf(tws);
  if(r?.ta && i>=0 && r.ta.beat?.[i]!=null){
    return {beat:r.ta.beat[i], reach:r.ta.r90?.[i] ?? r.ta.beat[i], run:r.ta.run?.[i] ?? r.ta.beat[i]};
  }
  // Fallback legacy: derivar de un escalar (acepta número o barco con gpH).
  const gpH = (typeof b==="number") ? b : ratingToD(b, tws, modeKey);
  if(gpH==null) return {beat:null,reach:null,run:null};
  const bi=[1.27,1.14,1.07,1.03,1.01,1.00,.99],ri=[1.30,1.19,1.10,1.05,1.02,1.00,.99];
  if(i<0)return{beat:gpH,reach:+(gpH*.97).toFixed(1),run:gpH};
  return{beat:+(gpH*bi[i]).toFixed(1),reach:+(gpH*(.97+(bi[i]-.97)*.3)).toFixed(1),run:+(gpH*ri[i]).toFixed(1)};
}
function legDist(n,c){const r=Math.max(0.1,+(c.mark1Dist+c.mark1aDist-c.gateDist).toFixed(3));return[c.mark1Dist,c.mark1aDist,r,c.mark1Dist,c.mark1aDist,r][n-1]||c.mark1Dist;}
function totalDist(c){return Array.from({length:6},(_,i)=>legDist(i+1,c)).reduce((a,b)=>a+b,0);}
// Corrección de tiempo (ToD) por tramo usando la curva real del certificado.
// Cada tramo se corrige con el allowance del ángulo correspondiente al viento
// de la regata; si no hay curva, cae al ToD efectivo × distancia (legacy).
function computeStd(passages,startTime,fleet,course,modeKey=DEFAULT_SCORING){
  const tws=course?.windKnots||14;
  const legType=n=>(n%3===1?"beat":n%3===2?"reach":"run"); // 1,4=ceñida 2,5=través 3,6=popa
  return fleet.map(b=>{
    const done=passages.filter(p=>p.boatId===b.id).sort((a,z)=>z.leg-a.leg);
    if(!done.length||!startTime) return {b,ct:null,el:null,leg:0};
    const last=done[0], el=(last.realTime-startTime)/1000;
    let allowance=null;
    if(hasValidRating(b,modeKey)){
      const v=vpp(b,tws,modeKey);
      allowance=0;
      for(let i=1;i<=last.leg;i++){ const a=v[legType(i)]; if(a==null){allowance=null;break;} allowance+=a*legDist(i,course); }
      if(allowance==null){ // sin curva: usar ToD efectivo escalar
        const tod=ratingToD(b,tws,modeKey);
        allowance = tod!=null ? tod*Array.from({length:last.leg},(_,i)=>legDist(i+1,course)).reduce((a,x)=>a+x,0) : null;
      }
    }
    return {b, ct: allowance!=null ? el-allowance : null, el, leg:last.leg};
  }).sort((a,z)=>a.ct!=null&&z.ct!=null?a.ct-z.ct:a.ct!=null?-1:z.ct!=null?1:0);
}

const Dot=({c,z=10})=>React.createElement("span",{style:{display:"inline-block",width:z,height:z,borderRadius:"50%",background:c,flexShrink:0}});
const Mono=({v,z=13,c=CYN})=>React.createElement("span",{style:{fontFamily:"monospace",fontSize:z,fontWeight:700,color:c}},v);
const Lbl=({v})=>React.createElement("div",{style:{fontSize:9,color:T2,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}},v);
const Sep=()=>React.createElement("div",{style:{borderTop:`1px solid ${BDR}`,margin:"8px 0"}});

function Btn({v,onClick,c="acc",fw,lg,sm,dis,st={}}){
  const cols={acc:ACC,grn:GRN,red:RED,gld:GLD,cyn:CYN,dim:T3,prp:PRP};
  return React.createElement("button",{onClick,disabled:dis,style:{padding:lg?"12px 20px":sm?"5px 10px":"9px 15px",background:dis?CARD2:(cols[c]||ACC),color:dis?T2:"#fff",borderRadius:8,fontSize:lg?15:sm?11:13,fontWeight:700,width:fw?"100%":"auto",opacity:dis?0.5:1,...st}},v);
}
function Card({children,st={},glow}){
  return React.createElement("div",{style:{background:CARD,border:`1px solid ${glow||BDR}`,borderLeft:glow?`3px solid ${glow}`:"",borderRadius:10,padding:"10px 13px",...st}},children);
}

// Icono visual del barco con sus colores reales
function BoatIcon({b,size=52}){
  const hull  = b.hullColor||b.color||"#222";
  const deck  = b.deckColor||"#ffffff18"; // subtle deck highlight
  const main  = b.mainColor||"#f0f0f0";
  const jib   = b.jibColor ||"#e8e8e8";
  const spi   = b.spiColor ||b.color||"#3b82f6";
  const mast  = "#999999";
  const bandsMain = b.trimBandsMain||b.trimBands||[];
  const bandsJib  = b.trimBandsJib||[];
  // Boat faces right (bow right). Mast at x=32.
  // Viewbox 52×52
  // Hull: stern(5,41) → bow(47,39) → bow-waterline(47,44) → stern-waterline(5,45)
  // Mast: (32,4) → (32,41)
  // Boom: (32,40) → (8,39)
  // Main: (32,4)-(32,40)-(8,39)  ← mast + boom triangle
  // Genoa: (32,13)-(47,40)-(32,40) ← forestay + deck triangle
  // Main hypotenuse: from (32,4) top to (8,39) boom end
  //   x(y) = 32 + (8-32)*(y-4)/(39-4) = 32 - 24*(y-4)/35
  const mainX = y => 32 - 24*(y-4)/35;
  // Genoa hypotenuse: from (32,13) to (47,40)
  //   x(y) = 32 + (47-32)*(y-13)/(40-13) = 32 + 15*(y-13)/27
  const jibbX = y => 32 + 15*(y-13)/27;

  return(
    <svg width={size} height={size} viewBox="0 0 52 52" style={{display:"block",flexShrink:0}}>
      {/* Keel */}
      <path d="M30,44 L28,52 L34,44 Z" fill={hull} opacity="0.7"/>
      {/* Genova */}
      <path d="M32,13 L47,40 L32,40 Z" fill={jib} stroke="#00000033" strokeWidth="0.5"/>
      {/* Génova trim bands */}
      {bandsJib.map((color,i)=>{
        const t=(i+1)/(bandsJib.length+1);
        const y=13+t*27;
        const xR=jibbX(y);
        return <line key={i} x1={32} y1={y} x2={xR} y2={y} stroke={color} strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      {/* Vela mayor */}
      <path d="M32,4 L32,40 L8,39 Z" fill={main} stroke="#00000022" strokeWidth="0.5"/>
      {/* Mayor trim bands */}
      {bandsMain.map((color,i)=>{
        const t=(i+1)/(bandsMain.length+1);
        const y=4+t*35;
        const xL=mainX(y);
        return <line key={i} x1={xL} y1={y} x2={32} y2={y} stroke={color} strokeWidth="2" strokeLinecap="round"/>;
      })}
      {/* Mástil */}
      <line x1="32" y1="4" x2="32" y2="41" stroke={mast} strokeWidth="1"/>
      {/* Botavara */}
      <line x1="32" y1="40" x2="8" y2="39" stroke={mast} strokeWidth="0.7"/>
      {/* Casco — forma realista */}
      <path d="M5,42 Q18,44 32,44 Q40,44 47,42 L47,46 Q32,49 8,47 L5,42 Z" fill={hull}/>
      {/* Cubierta */}
      <path d="M5,42 Q25,40 47,42" fill="none" stroke={deck} strokeWidth="1.5"/>
      {/* Palo mayor en cubierta */}
      <circle cx="32" cy="41" r="1.2" fill={mast}/>
    </svg>
  );
}

// Picker de color con etiqueta
function ColorField({label,value,onChange}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
      <span style={{fontSize:10,color:T2,width:55,flexShrink:0}}>{label}</span>
      <input type="color" value={value||"#ffffff"} onChange={e=>onChange(e.target.value)}
        style={{width:34,height:26,border:`1px solid ${BDR}`,borderRadius:6,cursor:"pointer",padding:2,background:"none"}}/>
      <div style={{width:24,height:24,borderRadius:5,background:value||"#ffffff",border:`1px solid ${BDR}`}}/>
    </div>
  );
}


// Buscar foto del barco — upwind (ceñida) o downwind (popa/spinnaker)
async function findBoatPhoto(name, sailNo, cls, regattaName="", type="upwind"){
  try{
    const slug = name.toLowerCase().replace(/[\s_-]+/g,'');
    const typeQ = type==="run" ? "spinnaker popa downwind" : "ceñida upwind beat";
    const res = await fetch(CLAUDE_API,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:600,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        messages:[{role:"user",content:
`Find a direct image URL (.jpg/.jpeg/.png/.webp) of sailing yacht "${name}" (${sailNo}, ${cls}) sailing ${typeQ}.

Search in this order:
1. Instagram accounts: try "@${slug}" or "@${slug}sailing" or "@${slug}tp52" or "@${slug}sailingteam" — search "instagram ${name} sailing team account photo"
2. "${name}" sailing photo ${regattaName||"ORC racing"} ${typeQ}
3. Sailing media sites: sailingscuttlebutt.com, sail-world.com, rolex.com, kosphoto.com, maxroam.com

IMPORTANT: Return ONLY a direct image file URL (ending .jpg/.jpeg/.png/.webp). NOT a webpage URL. NOT an instagram.com post URL. The actual image file. If you find an Instagram post, get the CDN image URL from it (fbcdn.net or cdninstagram.com).`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(i=>i.text||"").join("");
    const m = text.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?/i);
    return m ? m[0] : null;
  }catch{return null;}
}

// Analizar imagen en base64 (foto desde cámara del móvil)


// Analizar foto del barco para extraer colores y bandas de trimming automáticamente



// Posiciones SVG del recorrido — viewBox 380×310 (1:1 con píxeles en móvil)
const MAP_MARKS=[
  {x:165,y:278},  // 0: Salida
  {x:252,y:62},   // 1: Boya 1 barlovento
  {x:88, y:62},   // 2: Boya 1a offset
  {x:152,y:193},  // 3: Puerta Gate (centro)
  {x:252,y:62},   // 4: Boya 1 (2ª vez)
  {x:88, y:62},   // 5: Boya 1a (2ª vez)
  {x:272,y:278},  // 6: Meta/Llegada
];

// progress: 0=inicio del tramo, 1=al llegar a la boya
// atStart: todos en línea de salida antes de largar
function boatMapPos(lc, idx, total, progress, atStart) {
  const sp = Math.min(20, 160/Math.max(total-1,1));
  const spread = (idx-(total-1)/2)*sp;
  // Antes de largar o barcos en espera: en la línea de salida
  if (atStart) return { x: MAP_MARKS[0].x+spread, y: MAP_MARKS[0].y };
  if (lc >= 6)  return { x: MAP_MARKS[6].x+spread, y: MAP_MARKS[6].y };
  const p = progress != null ? progress : 0.5;
  const from = MAP_MARKS[lc], to = MAP_MARKS[Math.min(lc+1,6)];
  return { x: from.x+(to.x-from.x)*p+spread, y: from.y+(to.y-from.y)*p };
}

function CourseDiagram({course,passages,fleet,started,onTap,legRank={},boatProg={}}){
  const W=380, H=320;
  const hasOffset = (course.mark1aDist||0) > 0;
  const isPort    = (course.mark1aSide||"port") === "port"; // port = izquierda

  // Posiciones fijas de referencia
  const m1   = {x:220, y:65};          // Boya 1 Barlovento — arriba derecha
  const g4s  = {x:140, y:210};          // Puerta 4s — abajo izquierda
  const g4p  = {x:240, y:210};          // Puerta 4p — abajo derecha
  const stPos= {x:160, y:290};          // Comité salida
  const fin  = {x:270, y:290};          // Meta
  const flagX= 75;                       // Boya de salida

  // Posición de la boya 1a según lado y si hay offset
  const m1a  = hasOffset
    ? isPort
      ? {x: 80, y:65}                   // Puerto = izquierda
      : {x:330, y:65}                   // Estribor = derecha
    : null;

  // Construir líneas del recorrido según configuración
  const lines = [];
  const push = (x1,y1,x2,y2,col,d) => lines.push({x1,y1,x2,y2,col,d});

  if(hasOffset && m1a){
    // Con offset: Salida→M1→1a→Gate→M1(2)→1a(2)→Meta
    // 1ª ceñida
    push(stPos.x,stPos.y, m1.x,m1.y,   GLD,"8,5");
    // M1 → 1a
    push(m1.x,m1.y,       m1a.x,m1a.y, PRP,"6,4");
    // 1a → Puerta
    push(m1a.x,m1a.y,     g4s.x,g4s.y, CYN,"6,5");
    // 2ª ceñida: Puerta→M1
    push(g4p.x,g4p.y,     m1.x-8,m1.y, GLD,"8,5");
    // M1 → 1a (2ª vez)
    push(m1.x-8,m1.y,     m1a.x-8,m1a.y,PRP,"6,4");
    // 1a → Meta
    push(m1a.x-8,m1a.y,   fin.x,fin.y,  CYN,"6,5");
  } else {
    // Sin offset: Salida→M1→Gate→M1(2)→Meta
    push(stPos.x,stPos.y, m1.x,m1.y,   GLD,"8,5");
    push(m1.x,m1.y,       g4s.x,g4s.y, CYN,"6,5");
    push(g4p.x,g4p.y,     m1.x-8,m1.y, GLD,"8,5");
    push(m1.x-8,m1.y,     fin.x,fin.y,  CYN,"6,5");
  }

  // Posiciones de barcos (sin cambios)
  const bpos = fleet.map((b,idx)=>{
    const lc = passages.filter(p=>p.boatId===b.id).length;
    let progress = boatProg[b.id] ?? null;
    if(progress===null){
      if(started && lc<6){
        const rank=legRank[lc+1];
        progress = rank?.length>1
          ? Math.max(0.1, 0.75-(rank.indexOf(b.id)/(rank.length-1))*0.55)
          : 0.18;
      }
    }
    return {b, lc, ...boatMapPos(lc, idx, fleet.length, progress??0.3, !started)};
  });

  const Mark = ({x,y,label,col,side="right"})=>(
    <g>
      <polygon points={`${x},${y+13} ${x-11},${y-2} ${x+11},${y-2}`} fill={col} opacity={.9}/>
      <text x={side==="left"?x-16:x+14} y={y+5} fontSize={10} fill={T1} fontWeight="700">{label}</text>
    </g>
  );

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",maxHeight:320}}>
      {/* Viento */}
      <text x={10} y={20} fontSize={10} fill={T2}>Viento</text>
      <line x1={22} y1={26} x2={22} y2={58} stroke={T2} strokeWidth={2}/>
      <polygon points="22,64 17,54 27,54" fill={T2}/>

      {/* Líneas dinámicas */}
      {lines.map((l,i)=>(
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.col} strokeWidth={2.2} strokeDasharray={l.d} opacity={.65}/>
      ))}

      {/* Boyas */}
      <Mark x={m1.x} y={m1.y} label="1 Barlvto" col={GLD}/>
      {hasOffset&&m1a&&(
        <Mark x={m1a.x} y={m1a.y} label={`1a (${isPort?"Bab":"Estr"})`}
          col={PRP} side={isPort?"right":"left"}/>
      )}
      <Mark x={g4s.x} y={g4s.y} label="4s" col={CYN} side="left"/>
      <Mark x={g4p.x} y={g4p.y} label="4p" col={CYN}/>

      {/* Línea de salida */}
      <line x1={flagX} y1={stPos.y} x2={stPos.x} y2={stPos.y} stroke="#3b82f6" strokeWidth={3}/>
      <rect x={flagX-6} y={stPos.y-18} width={12} height={14} fill="#e67e22" rx={1}/>
      <line x1={flagX} y1={stPos.y-18} x2={flagX} y2={stPos.y} stroke="#666" strokeWidth={1.5}/>
      <rect x={stPos.x-9} y={stPos.y-9} width={18} height={18} rx={3} fill="#556" stroke="#999" strokeWidth={1.5}/>
      <text x={flagX-6} y={stPos.y+16} fontSize={10} fill={T2}>Salida</text>

      {/* Meta */}
      <line x1={stPos.x} y1={fin.y} x2={fin.x} y2={fin.y} stroke="#3b82f6" strokeWidth={3}/>
      <circle cx={fin.x} cy={fin.y} r={8} fill="none" stroke="#888" strokeWidth={2}/>
      <text x={fin.x-10} y={fin.y+16} fontSize={10} fill={T2}>Meta</text>

      {/* Total distancia */}
      <text x={6} y={H-4} fontSize={10} fill={T2}>{`Total: ${totalDist(course).toFixed(2)}nm`}</text>

      {/* Barcos */}
      {bpos.map(({b,lc,x,y})=>{
        const canTap = started&&lc<6;
        const legCol = lc<6?LEG_DEF[lc]?.col||GLD:GRN;
        return(
          <g key={b.id}>
            <circle cx={x} cy={y} r={20} fill={b.color}
              stroke={lc>=6?"#fff":canTap?"#fff":"#333"}
              strokeWidth={lc>=6?3:canTap?2:1} opacity={.95}/>
            <text x={x} y={y+4} fontSize={8} fill="#000" textAnchor="middle" fontWeight="800">
              {b.name.slice(0,4)}
            </text>
            {lc>=6&&<text x={x} y={y-25} fontSize={12} fill={GRN} textAnchor="middle">✓</text>}
            {canTap&&<text x={x} y={y+34} fontSize={8} fill={legCol} textAnchor="middle">→{LEG_DEF[lc]?.mark}</text>}
            <circle cx={x} cy={y} r={30} fill="transparent"
              onClick={()=>canTap&&onTap&&onTap(b.id)}
              style={{cursor:canTap?"pointer":"default"}}/>
          </g>
        );
      })}
    </svg>
  );
}

// Determina si un color es oscuro (para elegir texto blanco o negro)
const isDark = c => {
  if (!c || c.length < 7) return true;
  const r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 < 128;
};

// ── SUBIR CERTIFICADO ORC — extrae GPH/ToT del PDF oficial ──────────────────
function OrcCertUploader({boatName, sailNo, onRatingExtracted}){
  const [busy, setBusy]   = useState(false);
  const [msg,  setMsg]    = useState("");
  const [ok,   setOk]     = useState(false);
  const fileRef = useRef(null);

  const handleFile = async e=>{
    const file = e.target.files?.[0];
    if(!file) return;
    if(file.type!=="application/pdf"){ setMsg("❌ Selecciona un PDF (certificado ORC)"); return; }

    setBusy(true); setOk(false);
    setMsg("⏳ Leyendo certificado ORC...");

    try{
      // Convertir PDF a base64
      const b64 = await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=e=>res(e.target.result.split(",")[1]);
        r.onerror=rej;
        r.readAsDataURL(file);
      });

      const res = await fetch(CLAUDE_API,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model: IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001",
          max_tokens: 1200,
          messages:[{role:"user", content:[
            {type:"document", source:{type:"base64", media_type:"application/pdf", data:b64}},
            {type:"text", text:`Este es un certificado ORC 2026. Extrae los valores EXACTOS de las tablas. Las columnas de viento son siempre: 6,8,10,12,14,16,20 kt (ignora 4 kt y 24 kt).

1. Datos del barco: boatName, sailNo, boatType (Class), certNo, validUntil (formato YYYY-MM-DD).
2. Tabla "Single Number Scoring Options": para Windward/Leeward y All purpose toma Time On Distance y Time On Time. De "Coastal/Long Distance" toma su Time On Distance.
3. Tabla "Time Allowances in secs/NM" (página 2). Necesito tres filas como arrays de 7 números (6,8,10,12,14,16,20 kt):
   - "Beat VMG" → beat
   - la fila "90°" → r90
   - "Run VMG" → run
4. De "Selected Courses" toma las filas "Windward / Leeward" y "All purpose" como arrays de 7 (curvas wl y ap). De "Performance Curve" la fila "Coastal/Long Distance" como array de 7 (curva coastal).

Responde SOLO JSON, sin markdown:
{"boatName":"HISPANIA","sailNo":"ESP-10000","boatType":"TP 52","certNo":"1000002","validUntil":"2026-12-31",
"single":{"wl_tod":477.7,"wl_tot":1.2560,"ap_tod":381.5,"ap_tot":1.5729,"cld_tod":416.4},
"ta":{"beat":[686.6,574.5,533.0,510.6,496.7,486.7,475.9],"r90":[417.9,371.4,336.2,310.8,293.8,280.4,259.9],"run":[703.9,549.5,470.8,420.9,375.5,332.2,263.4]},
"curves":{"wl":[695.2,562.0,501.9,465.7,436.1,409.5,369.6],"ap":[533.1,443.3,400.7,373.2,350.7,330.9,302.6],"coastal":[696.1,530.0,451.7,400.3,365.6,334.9,287.3]}}`}
          ]}]
        })
      });

      const data = await res.json();
      if(data.error){
        const m=data.error.message||"";
        if(m.includes("rate limit")) setMsg("⏱ Rate limit — espera 1 minuto e inténtalo de nuevo");
        else setMsg("❌ "+m.slice(0,100));
        setBusy(false); return;
      }

      const raw = (data.content||[]).map(c=>c.text||"").join("");
      const match = raw.match(/\{[\s\S]*\}/);
      if(!match){ setMsg("❌ No se pudo leer el certificado"); setBusy(false); return; }

      const rating = JSON.parse(match[0]);
      const s = rating.single||{};
      // Validación: exigimos al menos un número de scoring real
      if(s.wl_tot==null && s.wl_tod==null && s.ap_tod==null){
        setMsg("❌ No se encontraron los ratings (Single Number Scoring) en el certificado");
        setBusy(false); return;
      }
      // Compatibilidad: gpH legacy = All Purpose ToD
      if(s.ap_tod!=null) rating.gpH = s.ap_tod;

      onRatingExtracted(rating);
      setOk(true);
      const parts=[];
      if(s.wl_tot!=null) parts.push(`W/L ToT ${s.wl_tot}`);
      if(s.wl_tod!=null) parts.push(`W/L ToD ${s.wl_tod}`);
      if(s.ap_tod!=null) parts.push(`AP ToD ${s.ap_tod}`);
      const curvasOk = rating.ta?.beat?.length===7;
      setMsg(`✅ ${rating.boatType||""} · ${parts.join(" · ")}${curvasOk?" · curvas ✓":" · sin curvas"} · válido hasta ${rating.validUntil||"—"}`);
    }catch(e){
      setMsg("❌ Error: "+e.message);
    }
    setBusy(false);
    e.target.value="";
  };

  return(
    <div>
      <input ref={fileRef} type="file" accept="application/pdf" style={{display:"none"}} onChange={handleFile}/>
      <button onClick={()=>fileRef.current?.click()} disabled={busy}
        style={{width:"100%",padding:"9px 0",borderRadius:7,
          background:ok?`${GRN}22`:busy?CARD2:CYN,
          color:ok?GRN:busy?T3:"#fff",
          border:`1px solid ${ok?GRN:busy?BDR:CYN}`,
          fontSize:11,fontWeight:700,cursor:busy?"default":"pointer"}}>
        {busy?"⏳ Leyendo certificado...":ok?"✅ Certificado aplicado":"📄 Subir certificado ORC (PDF)"}
      </button>
      {msg&&(
        <div style={{marginTop:5,fontSize:9,padding:"5px 8px",borderRadius:6,lineHeight:1.5,
          background:ok?`${GRN}15`:msg.startsWith("❌")||msg.startsWith("⏱")?`${RED}15`:`${CYN}15`,
          color:ok?GRN:msg.startsWith("❌")||msg.startsWith("⏱")?RED:CYN}}>
          {msg}
        </div>
      )}
    </div>
  );
}

function BoatCard({b, isOwn, onUpdate, onDelete, regattaName=""}){
  const [open,      setOpen]     = useState(false);
  const [loading,   setLoading]  = useState(null);
  const [analyzing, setAnalyzing]= useState(false);
  const [imgErr,    setImgErr]   = useState(false);
  const [msg,       setMsg]      = useState("");
  const fileRef = useRef(null);
  const hasAutoSearched = useRef(false); // evitar búsqueda duplicada

  // Auto-búsqueda de fotos cuando se abre la ficha por primera vez
  useEffect(()=>{
    if(open && !hasAutoSearched.current && !b.photoUrlBeat && !b.photoUrlRun && !b.photoUrl){
      hasAutoSearched.current = true;
      setMsg("🔍 Buscando fotos automáticamente...");
      Promise.all([
        findBoatPhoto(b.name, b.sailNo, b.cls, regattaName, "beat"),
        findBoatPhoto(b.name, b.sailNo, b.cls, regattaName, "run")
      ]).then(([beat, run])=>{
        if(beat){ onUpdate("photoUrlBeat", beat); }
        if(run) { onUpdate("photoUrlRun",  run);  }
        if(beat||run) setMsg(`✓ Fotos encontradas automáticamente`);
        else setMsg("No se encontraron fotos. Usa 🔍 para buscar manualmente o 📷 para hacer foto.");
      }).catch(()=>setMsg("Error buscando fotos."));
    }
  // eslint-disable-next-line
  },[open]);

  const searchPhoto = async()=>{
    setLoading(true); setImgErr(false); setMsg("");
    const url = await findBoatPhoto(b.name, b.sailNo, b.cls, regattaName);
    if(url){ onUpdate("photoUrl", url); setMsg("✓ Foto encontrada"); setImgErr(false); }
    else { setImgErr(true); setMsg("No se encontró foto. Pega una URL o haz una foto."); }
    setLoading(false);
  };

  const handleCameraPhoto = async(e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setAnalyzing(true); setMsg("Procesando foto...");
    const reader = new FileReader();
    reader.onload = async(ev)=>{
      const dataUrl = ev.target.result; // data:image/jpeg;base64,...
      const [meta, base64] = dataUrl.split(",");
      const mediaType = meta.match(/:(.*?);/)?.[1]||"image/jpeg";
      onUpdate("photoUrl", dataUrl); // guardar como data URL
      setImgErr(false);
      setMsg("Analizando colores con IA...");
      const colors = await analyzeBoatColors(base64, mediaType);
      if(colors){
        if(colors.hullColor) { onUpdate("hullColor",colors.hullColor); onUpdate("color",colors.hullColor); }
        if(colors.mainColor) onUpdate("mainColor",colors.mainColor);
        if(colors.jibColor)  onUpdate("jibColor", colors.jibColor);
        if(colors.spiColor)  onUpdate("spiColor",  colors.spiColor);
        if(colors.trimBandsMain?.length) onUpdate("trimBandsMain",colors.trimBandsMain);
        if(colors.trimBandsJib?.length)  onUpdate("trimBandsJib", colors.trimBandsJib);
        if(colors.trimBandsSpi?.length)  onUpdate("trimBandsSpi", colors.trimBandsSpi);
        // Compat
        if(colors.trimBandsMain?.length) onUpdate("trimBands",colors.trimBandsMain);
        setMsg(`✓ Colores detectados desde tu foto`);
      } else {
        setMsg("Foto guardada. Pulsa '🎨 Auto-detectar colores' para analizar.");
      }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const autoAnalyze = async()=>{
    if(!b.photoUrl){ setMsg("⚠️ Primero busca o haz una foto del barco."); return; }
    setAnalyzing(true); setMsg("Analizando foto con IA...");
    let colors = null;
    if(b.photoUrl.startsWith("data:")){
      const [meta,base64]=b.photoUrl.split(",");
      const mediaType=meta.match(/:(.*?);/)?.[1]||"image/jpeg";
      colors = await analyzeBoatColors(base64, mediaType);
    } else {
      colors = await analyzeBoatColors(b.photoUrl, b.name);
    }
    if(colors){
      if(colors.hullColor) { onUpdate("hullColor",colors.hullColor); onUpdate("color",colors.hullColor); }
      if(colors.mainColor) onUpdate("mainColor",colors.mainColor);
      if(colors.jibColor)  onUpdate("jibColor", colors.jibColor);
      if(colors.spiColor)  onUpdate("spiColor",  colors.spiColor);
      if(colors.trimBandsMain?.length) onUpdate("trimBandsMain",colors.trimBandsMain);
      if(colors.trimBandsJib?.length)  onUpdate("trimBandsJib", colors.trimBandsJib);
      if(colors.trimBandsSpi?.length)  onUpdate("trimBandsSpi", colors.trimBandsSpi);
      if(colors.trimBandsMain?.length) onUpdate("trimBands",colors.trimBandsMain);
      setMsg(`✓ Colores detectados automáticamente`);
    } else {
      setMsg("No se pudieron detectar los colores. Configúralos manualmente.");
    }
    setAnalyzing(false);
  };

  const textColor = b.hullColor ? (isDark(b.hullColor)?"#fff":"#000") : "#fff";
  const bandsMain = b.trimBandsMain||b.trimBands||[];
  const bandsJib  = b.trimBandsJib||[];
  const bandsSpi  = b.trimBandsSpi||[];

  // Helper para renderizar la sección de bandas de una vela
  const BandsSection = ({label, bandsKey, bands, col})=>(
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:10,color:col,fontWeight:700}}>{label}</span>
        <div style={{display:"flex",gap:4}}>
          {bands.length>0&&<button onClick={()=>onUpdate(bandsKey,bands.slice(0,-1))} style={{padding:"2px 7px",background:T3,color:"#fff",borderRadius:5,fontSize:9,border:"none"}}>−</button>}
          <button onClick={()=>onUpdate(bandsKey,[...bands,bands[bands.length-1]||"#ff0000"])} style={{padding:"2px 7px",background:GRN,color:"#fff",borderRadius:5,fontSize:9,border:"none"}}>+</button>
        </div>
      </div>
      {bands.length===0
        ?<div style={{fontSize:9,color:T3,padding:"4px 8px",background:CARD2,borderRadius:6}}>Sin bandas — pulsa + para añadir</div>
        :<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {bands.map((color,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              <input type="color" value={color||"#ffffff"} onChange={e=>{const nb=[...bands];nb[i]=e.target.value;onUpdate(bandsKey,nb);}}
                style={{width:28,height:22,border:`1px solid ${BDR}`,borderRadius:5,cursor:"pointer",padding:1,background:"none"}}/>
              <div style={{width:20,height:20,borderRadius:4,background:color,border:`1px solid ${BDR}`}}/>
            </div>
          ))}
        </div>
      }
    </div>
  );

  return(
    <div style={{background:CARD,border:`1px solid ${open?b.color:BDR}`,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
      {/* Input oculto para cámara */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{display:"none"}} onChange={handleCameraPhoto}/>

      {/* Cabecera */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{flexShrink:0}}>
          {b.photoUrl&&!imgErr
            ?<img src={b.photoUrl} onError={()=>setImgErr(true)}
               style={{width:52,height:52,objectFit:"cover",borderRadius:8,border:`1px solid ${BDR}`}}/>
            :<BoatIcon b={{...b,trimBands:bandsMain}} size={52}/>
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <div style={{width:28,height:28,borderRadius:6,background:b.hullColor||b.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:900,color:textColor}}>{b.bowNum||"?"}</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:isOwn?b.color:T1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
              {b.name}{isOwn?" ⭐":""}
            </div>
          </div>
          <div style={{fontSize:9,color:T2}}>{b.sailNo} · {b.cls}</div>
          <div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>
            {[["M",b.mainColor||"#fff"],["E",b.spiColor||b.color],["G",b.jibColor||"#fff"],["C",b.hullColor||b.color]].map(([l,c])=>(
              <div key={l} style={{width:18,height:18,borderRadius:4,background:c,border:`1px solid #ffffff33`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:7,color:isDark(c)?"#fff":"#000",fontWeight:700}}>{l}</span>
              </div>
            ))}
            {bandsMain.slice(0,3).map((c,i)=><div key={i} style={{width:18,height:6,borderRadius:3,background:c,border:`1px solid #ffffff22`,marginTop:6}}/>)}
            {/* GPH editable inline — doble tap para editar */}
            <div onClick={e=>{e.stopPropagation();}} style={{marginLeft:4}}>
              <input
                type="number" step="0.1" value={b.gpH||""} 
                onChange={e=>onUpdate("gpH",parseFloat(e.target.value)||0)}
                onClick={e=>e.stopPropagation()}
                style={{width:52,background:"transparent",border:"none",borderBottom:`1px solid ${CYN}44`,color:CYN,fontSize:10,fontFamily:"monospace",fontWeight:700,padding:"0 2px",textAlign:"center"}}
                title="GPH — pulsa para editar"/>
              <span style={{fontSize:8,color:T3,marginLeft:1}}>GPH</span>
            </div>
          </div>
        </div>
        <span style={{color:T2,fontSize:14,flexShrink:0}}>{open?"▲":"▼"}</span>
      </div>

      {/* Detalles expandibles */}
      {open&&(
        <div style={{padding:"0 12px 14px",borderTop:`1px solid ${BDR}`}}>

          {/* Rating ORC */}
          <div style={{marginTop:10,padding:"8px 10px",background:CARD2,borderRadius:8,border:`1px solid ${CYN}33`}}>
            <div style={{fontSize:10,fontWeight:700,color:CYN,marginBottom:6}}>📋 Rating ORC</div>

            {/* Upload certificado ORC — extrae el rating completo (curvas + scoring) */}
            <OrcCertUploader boatName={b.name} sailNo={b.sailNo}
              onRatingExtracted={rating=>{
                // Guardamos el certificado completo, no solo un escalar
                onUpdate("rating", {single:rating.single, ta:rating.ta, curves:rating.curves});
                if(rating.gpH)      onUpdate("gpH", rating.gpH);          // legacy / All Purpose ToD
                if(rating.single?.ap_tot) onUpdate("gpT", rating.single.ap_tot);
                if(rating.boatType) onUpdate("boatType", rating.boatType);
                if(rating.certNo)   onUpdate("certNo", rating.certNo);
                if(rating.validUntil) onUpdate("validUntil", rating.validUntil);
              }}/>

            {b.rating&&(
              <div style={{marginTop:8,padding:"6px 9px",background:`${GRN}12`,border:`1px solid ${GRN}33`,borderRadius:7,fontSize:9,color:GRN,lineHeight:1.6}}>
                Certificado cargado{b.certNo?` · nº ${b.certNo}`:""}{b.validUntil?` · válido hasta ${b.validUntil}`:""}<br/>
                {b.rating.single?.wl_tot!=null&&<>W/L ToT <strong>{b.rating.single.wl_tot}</strong> · </>}
                {b.rating.single?.wl_tod!=null&&<>W/L ToD <strong>{b.rating.single.wl_tod}</strong> · </>}
                {b.rating.single?.ap_tod!=null&&<>AP ToD <strong>{b.rating.single.ap_tod}</strong> · </>}
                {b.rating.ta?.beat?.length===7?"curvas ✓":"sin curvas (usará single number)"}
              </div>
            )}

            {/* Edición manual como fallback */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
              <div>
                <div style={{fontSize:9,color:T2,marginBottom:2}}>GPH (ToD All purpose)</div>
                <input type="number" step="0.1" value={b.gpH||""}
                  onChange={e=>onUpdate("gpH",parseFloat(e.target.value)||0)}
                  style={{width:"100%",fontFamily:"monospace",fontWeight:700,fontSize:14,color:CYN,background:CARD,border:`1px solid ${CYN}44`,borderRadius:6,padding:"5px 8px"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:T2,marginBottom:2}}>ToT (All purpose)</div>
                <input type="number" step="0.0001" value={b.gpT||""}
                  onChange={e=>onUpdate("gpT",parseFloat(e.target.value)||0)}
                  placeholder="ej. 1.5729"
                  style={{width:"100%",fontFamily:"monospace",fontSize:12,color:T2,background:CARD,border:`1px solid ${BDR}`,borderRadius:6,padding:"5px 8px"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:T2,marginBottom:2}}>Nº vela</div>
                <input type="text" value={b.sailNo||""} onChange={e=>onUpdate("sailNo",e.target.value)}
                  style={{width:"100%",fontSize:11,background:CARD,border:`1px solid ${BDR}`,borderRadius:6,padding:"5px 8px"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:T2,marginBottom:2}}>Nº proa</div>
                <input type="number" value={b.bowNum||""} onChange={e=>onUpdate("bowNum",parseInt(e.target.value)||0)}
                  style={{width:"100%",fontSize:11,background:CARD,border:`1px solid ${BDR}`,borderRadius:6,padding:"5px 8px"}}/>
              </div>
            </div>
          </div>
          <div style={{marginTop:10,marginBottom:10}}>
            <Lbl v="Fotos del barco (ceñida y popa)"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {/* Foto ceñida */}
              <div>
                <div style={{fontSize:9,color:GLD,fontWeight:700,marginBottom:4}}>⬆️ Ceñida / Barlovento</div>
                <div style={{width:"100%",height:80,borderRadius:8,overflow:"hidden",background:CARD2,border:`1px solid ${BDR}`,marginBottom:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {b.photoUrlBeat
                    ?<img src={b.photoUrlBeat} onError={e=>{e.target.style.display="none";}}
                       style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<BoatIcon b={b} size={64}/>
                  }
                </div>
                <button onClick={async()=>{setLoading("beat");setMsg("");const u=await findBoatPhoto(b.name,b.sailNo,b.cls,regattaName,"beat");if(u){onUpdate("photoUrlBeat",u);setMsg("✓ Foto ceñida encontrada");}else setMsg("No encontrada. Pega la URL manualmente abajo.");setLoading(null);}} disabled={!!loading||analyzing} style={{width:"100%",padding:"5px 0",background:loading==="beat"?CARD2:GLD,color:"#000",borderRadius:6,fontSize:9,fontWeight:700,border:"none",cursor:"pointer",marginBottom:4}}>
                  {loading==="beat"?"🔍 Buscando...":"🔍 Buscar foto ceñida"}
                </button>
                <input
                  value={b.photoUrlBeat&&b.photoUrlBeat.startsWith("data:") ? "(foto de cámara guardada)" : (b.photoUrlBeat||"")}
                  onChange={e=>{if(!e.target.value.startsWith("("))onUpdate("photoUrlBeat",e.target.value);}}
                  onPaste={e=>{ e.preventDefault(); const v=e.clipboardData.getData("text"); onUpdate("photoUrlBeat",v.trim()); }}
                  placeholder="Pega aquí la URL de la foto ceñida"
                  style={{fontSize:10,padding:"5px 7px",borderRadius:6,border:`1px solid ${BDR}`,background:CARD,color:T1,width:"100%",boxSizing:"border-box"}}/>
              </div>
              {/* Foto popa */}
              <div>
                <div style={{fontSize:9,color:CYN,fontWeight:700,marginBottom:4}}>⬇️ Popa / Spinnaker</div>
                <div style={{width:"100%",height:80,borderRadius:8,overflow:"hidden",background:CARD2,border:`1px solid ${BDR}`,marginBottom:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {b.photoUrlRun
                    ?<img src={b.photoUrlRun} onError={e=>{e.target.style.display="none";}}
                       style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<BoatIcon b={{...b,trimBands:bandsMain}} size={64}/>
                  }
                </div>
                <button onClick={async()=>{setLoading("run");setMsg("");const u=await findBoatPhoto(b.name,b.sailNo,b.cls,regattaName,"run");if(u){onUpdate("photoUrlRun",u);setMsg("✓ Foto popa encontrada");}else setMsg("No encontrada. Pega la URL manualmente abajo.");setLoading(null);}} disabled={!!loading||analyzing} style={{width:"100%",padding:"5px 0",background:loading==="run"?CARD2:CYN,color:"#000",borderRadius:6,fontSize:9,fontWeight:700,border:"none",cursor:"pointer",marginBottom:4}}>
                  {loading==="run"?"🔍 Buscando...":"🔍 Buscar foto popa/spi"}
                </button>
                <input
                  value={b.photoUrlRun&&b.photoUrlRun.startsWith("data:") ? "(foto de cámara guardada)" : (b.photoUrlRun||"")}
                  onChange={e=>{if(!e.target.value.startsWith("("))onUpdate("photoUrlRun",e.target.value);}}
                  onPaste={e=>{ e.preventDefault(); const v=e.clipboardData.getData("text"); onUpdate("photoUrlRun",v.trim()); }}
                  placeholder="Pega aquí la URL de la foto popa/spinnaker"
                  style={{fontSize:10,padding:"5px 7px",borderRadius:6,border:`1px solid ${BDR}`,background:CARD,color:T1,width:"100%",boxSizing:"border-box"}}/>
              </div>
            </div>
            {/* Foto general + analizar */}
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>fileRef.current?.click()} disabled={!!loading||analyzing} style={{flex:1,padding:"7px 4px",background:ACC,color:"#fff",borderRadius:7,border:"none",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                📷 Cámara
              </button>
              <button onClick={autoAnalyze} disabled={!!loading||analyzing||(!b.photoUrl&&!b.photoUrlBeat)} style={{flex:1,padding:"7px 4px",background:analyzing?CARD2:PRP,color:"#fff",borderRadius:7,border:"none",fontSize:10,fontWeight:700,cursor:"pointer",opacity:(!b.photoUrl&&!b.photoUrlBeat)?0.4:1}}>
                {analyzing?"🎨...":"🎨 Analizar colores"}
              </button>
            </div>
            {msg&&<div style={{fontSize:10,color:msg.startsWith("✓")?GRN:msg.startsWith("⚠")?GLD:RED,marginTop:6,lineHeight:1.4}}>{msg}</div>}
          </div>

          <Sep/>

          {/* Números */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div><Lbl v="Nº proa (org.)"/>
              <input type="number" min="1" max="99" value={b.bowNum||""} placeholder="1-99"
                onChange={e=>onUpdate("bowNum",+e.target.value||null)}
                style={{textAlign:"center",fontSize:18,fontWeight:900}}/>
            </div>
            <div><Lbl v="Nº vela / Sail No."/>
              <input value={b.sailNo||""} placeholder="ESP-52"
                onChange={e=>onUpdate("sailNo",e.target.value)} style={{fontSize:13}}/>
            </div>
            <div><Lbl v="GPH (s/nm)"/>
              <input type="number" step=".1" value={b.gpH||""} placeholder="560.0"
                onChange={e=>onUpdate("gpH",+e.target.value||null)}
                style={{fontFamily:"monospace",fontSize:13}}/>
            </div>
            <div><Lbl v="Clase"/>
              <input value={b.cls||""} placeholder="TP 52"
                onChange={e=>onUpdate("cls",e.target.value)} style={{fontSize:11}}/>
            </div>
          </div>

          <Sep/>

          {/* Colores básicos */}
          <Lbl v="Colores base"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
            <ColorField label="Mayor" value={b.mainColor} onChange={v=>onUpdate("mainColor",v)}/>
            <ColorField label="Spinnaker" value={b.spiColor} onChange={v=>onUpdate("spiColor",v)}/>
            <ColorField label="Génova" value={b.jibColor} onChange={v=>onUpdate("jibColor",v)}/>
            <ColorField label="Casco" value={b.hullColor} onChange={v=>{onUpdate("hullColor",v);onUpdate("color",v);}}/>
          </div>

          <Sep/>

          {/* Bandas de trimming por vela */}
          <Lbl v="Bandas de trimming por vela"/>
          <div style={{fontSize:9,color:T2,marginBottom:10,lineHeight:1.5}}>
            Líneas horizontales en las velas que el trimer usa para ver la profundidad. Cada vela tiene sus propias bandas.
          </div>
          <BandsSection label="🔶 Vela Mayor" bandsKey="trimBandsMain" bands={bandsMain} col={GLD}/>
          <BandsSection label="🔷 Génova / Foque" bandsKey="trimBandsJib" bands={bandsJib} col={CYN}/>
          <BandsSection label="🔹 Spinnaker" bandsKey="trimBandsSpi" bands={bandsSpi} col={PRP}/>

          {/* Preview */}
          <Sep/>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px",background:CARD2,borderRadius:8}}>
            <BoatIcon b={{...b,trimBands:bandsMain}} size={80}/>
            <div>
              <div style={{fontSize:13,color:T1,fontWeight:700,marginBottom:3}}>{b.name}</div>
              <div style={{fontSize:9,color:T2}}>Mayor: {bandsMain.length} banda{bandsMain.length!==1?"s":""} · Génova: {bandsJib.length} · Spi: {bandsSpi.length}</div>
              <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                {bandsMain.map((c,i)=><div key={`m${i}`} style={{width:20,height:6,borderRadius:3,background:c,border:`1px solid ${BDR}`}}/>)}
              </div>
            </div>
          </div>

          <button onClick={onDelete} style={{marginTop:10,width:"100%",padding:"6px 0",background:"none",color:RED,borderRadius:7,border:`1px solid ${RED}44`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            🗑 Eliminar este barco
          </button>
        </div>
      )}
    </div>
  );
}


// Bloque de sincronización ORC para pestaña Campeonato
function ChampSyncBlock({state, setState}){
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const lastSync = state.champ?.orcLastSync;

  const applyResults = (data, sourceLabel)=>{
    if(data?.overallStandings?.length){
      setState(s=>({...s, champ:{...s.champ,
        orcStandings: data.overallStandings,
        orcRaces: data.races||[],
        orcNumRaces: data.numRaces||data.overallStandings[0]?.breakdown?.length||0,
        name: data.eventName||s.champ.name,
        orcLastSync: Date.now()
      }}));
      setMsg(`✓ ${data.numRaces||data.overallStandings[0]?.breakdown?.length||0} pruebas · ${data.overallStandings.length} barcos (${sourceLabel})`);
      return true;
    }
    return false;
  };

  const sync = async()=>{
    if(!state.champ?.resultsUrl){ setMsg("⚠️ Añade la URL de resultados o sube una captura."); return; }
    setSyncing(true); setMsg("Conectando con ORC...");
    const data = await fetchOrcResults(state.champ.resultsUrl);
    if(!applyResults(data, "web")) setMsg("No se encontraron resultados por URL. Prueba a subir una captura 📷");
    setSyncing(false);
  };

  const onPhoto = async(e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setSyncing(true); setMsg("📷 Leyendo la captura...");
    try{
      const b64 = await compressImage(file, 1400, 0.82); // más resolución para leer texto
      const data = await extractResultsFromImage(b64, "image/jpeg");
      if(!applyResults(data, "captura")) setMsg("No pude leer la tabla. Asegúrate de que la captura sea nítida y muestre N.Vela, pruebas y puntos.");
    }catch(err){ setMsg("Error leyendo la imagen: "+err.message); }
    setSyncing(false);
    if(fileRef.current) fileRef.current.value="";
  };

  return(
    <Card st={{marginBottom:10}}>
      <Lbl v="🏆 Resultados oficiales ORC"/>
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        <button onClick={sync} disabled={syncing} style={{flex:1,padding:"10px 0",background:syncing?CARD2:ACC,color:"#fff",borderRadius:7,fontSize:12,fontWeight:700,border:"none",cursor:syncing?"default":"pointer"}}>
          {syncing?"⏳ Sincronizando...":"🔄 Sincronizar con ORC"}
        </button>
        {state.champ?.resultsUrl&&(
          <a href={state.champ.resultsUrl} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",padding:"10px 14px",background:CARD,borderRadius:7,fontSize:14,color:ACC,textDecoration:"none",border:`1px solid ${BDR}`}}>
            🔗
          </a>
        )}
      </div>
      {/* Subir captura de resultados */}
      <button onClick={()=>fileRef.current?.click()} disabled={syncing}
        style={{width:"100%",padding:"10px 0",background:syncing?CARD2:GRN,color:"#fff",borderRadius:7,fontSize:12,fontWeight:700,border:"none",cursor:syncing?"default":"pointer",marginBottom:msg?6:0}}>
        📷 Subir captura de resultados
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{display:"none"}}/>
      {msg&&<div style={{fontSize:10,color:msg.startsWith("✓")?GRN:msg.startsWith("⚠")?GLD:msg.startsWith("📷")?CYN:RED,lineHeight:1.4}}>{msg}</div>}
      {lastSync&&<div style={{fontSize:9,color:T3,marginTop:4}}>Última actualización: {new Date(lastSync).toLocaleTimeString("es-ES")}</div>}
      <div style={{fontSize:9,color:T3,marginTop:4,lineHeight:1.5}}>
        La web del RCNB no permite lectura automática. Lo más fiable: abre los resultados (🔗), haz captura y súbela aquí 📷.
      </div>
    </Card>
  );
}

// Componente de links del campeonato con auto-detección
function ChampLinks({state, setState}){
  const [discovering, setDiscovering] = useState(false);
  const [discMsg, setDiscMsg] = useState("");
  const updChamp = (k,v) => setState(s=>({...s,champ:{...s.champ,[k]:v}}));

  const discover = async()=>{
    if(!state.champ.mainUrl){ setDiscMsg("⚠️ Introduce primero la URL principal del campeonato."); return; }
    setDiscovering(true); setDiscMsg("Buscando sub-páginas...");
    const urls = await discoverChampUrls(state.champ.mainUrl);
    let found = 0;
    if(urls.resultsUrl  && !state.champ.resultsUrl)  { updChamp("resultsUrl",  urls.resultsUrl);  found++; }
    if(urls.docsUrl     && !state.champ.docsUrl)      { updChamp("docsUrl",     urls.docsUrl);     found++; }
    if(urls.photosUrl   && !state.champ.photosUrl)    { updChamp("photosUrl",   urls.photosUrl);   found++; }
    if(urls.entryListUrl&& !state.champ.entryListUrl) { updChamp("entryListUrl",urls.entryListUrl);found++; }
    setDiscMsg(found>0 ? `✓ ${found} links encontrados automáticamente` : "No se encontraron links. Introdúcelos manualmente.");
    setDiscovering(false);
  };

  const LINKS = [
    {key:"mainUrl",     icon:"🌐", label:"Web principal",    ph:"https://www.tregolfisailingweek.com/..."},
    {key:"resultsUrl",  icon:"📊", label:"Resultados ORC",   ph:"https://data.orc.org/public/WEV.dll?action=index&eventid=..."},
    {key:"docsUrl",     icon:"📄", label:"Documentación/NOR",ph:"https://www.racingrulesofsailing.org/documents/..."},
    {key:"photosUrl",   icon:"📷", label:"Fotos del evento", ph:"https://...galería de fotos..."},
    {key:"entryListUrl",icon:"⛵", label:"Lista de inscritos",ph:"https://...entry-list..."},
  ];

  return(
    <Card st={{marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <Lbl v="🌐 Links del campeonato"/>
        <button onClick={discover} disabled={discovering} style={{padding:"4px 10px",background:discovering?CARD2:ACC,color:"#fff",borderRadius:6,fontSize:10,fontWeight:700,border:"none",cursor:"pointer"}}>
          {discovering?"🔍 Buscando...":"🔍 Auto-detectar"}
        </button>
      </div>
      {discMsg&&<div style={{fontSize:10,color:discMsg.startsWith("✓")?GRN:discMsg.startsWith("⚠")?GLD:T2,marginBottom:8,lineHeight:1.4}}>{discMsg}</div>}
      {LINKS.map(({key,icon,label,ph})=>(
        <div key={key} style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
            <span style={{fontSize:10,color:T2}}>{icon} {label}</span>
            {state.champ[key]&&<a href={state.champ[key]} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:ACC,marginLeft:"auto"}}>↗ Abrir</a>}
          </div>
          <input value={state.champ[key]||""} onChange={e=>updChamp(key,e.target.value)}
            placeholder={ph} style={{fontSize:10}}/>
        </div>
      ))}
      <div style={{fontSize:9,color:T3,marginTop:4,lineHeight:1.5}}>
        Pulsa "Auto-detectar" para que el sistema busque automáticamente los links desde la web principal.
      </div>
    </Card>
  );
}

// ── BASE DE DATOS COMPARTIDA DE FOTOS ─────────────────────────────────────
// Comprime una imagen a JPEG para almacenamiento eficiente
const compressImg = (file, maxPx=900) => new Promise(res=>{
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const sc=Math.min(1,maxPx/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      res(c.toDataURL('image/jpeg',0.72));
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
});

function BoatPhotoDbTab({fleet, regattaName, onColorUpdate}){
  const [db,      setDb]     = useState({});
  const [saving,  setSaving] = useState(null);
  const [search,  setSearch] = useState("");
  const [editId,  setEditId] = useState(null);
  const [analyzingColors, setAnalyzingColors] = useState(null); // sailNo being analyzed
  const [beatUrl, setBeatUrl]= useState("");
  const [runUrl,  setRunUrl] = useState("");
  const [msg,     setMsg]    = useState("");
  const [finding, setFinding]= useState(null);
  const beatFileRef = useRef(null);
  const runFileRef  = useRef(null);

  const [localPhotos, setLocalPhotos] = useState({}); // {key: {beat:b64, run:b64}}

  useEffect(()=>{
    loadPhotoDb().then(d=>setDb(d||{}));
    // Cargar fotos locales de cada barco
    const lp = {};
    fleet.forEach(b=>{
      const k=b.sailNo||b.id;
      const lb=loadLocalPhoto(k,"beat"), lr=loadLocalPhoto(k,"run");
      if(lb||lr) lp[k]={beat:lb,run:lr};
    });
    setLocalPhotos(lp);
  },[]);

  const getPhoto = (sailNo,type)=>{
    const k=sailNo;
    return localPhotos[k]?.[type] || db[k]?.[type==="beat"?"beat":"run"] || null;
  };

  const save = async(boatId, beat, run)=>{
    setSaving(boatId);
    const b=fleet.find(x=>x.id===boatId);
    const key=b?.sailNo||boatId;
    const isBase64 = v=>v&&v.startsWith("data:");

    // Subir fotos al servidor Vercel (funciona en todos los dispositivos)
    let serverBeatUrl = null, serverRunUrl = null;
    if(isBase64(beat)){
      setMsg("⬆️ Subiendo foto ceñida al servidor...");
      serverBeatUrl = await uploadPhotoToServer(beat, key, "beat");
    }
    if(isBase64(run)){
      setMsg("⬆️ Subiendo foto popa al servidor...");
      serverRunUrl = await uploadPhotoToServer(run, key, "run");
    }

    // Guardar local como backup
    if(isBase64(beat)){ saveLocalPhoto(key,"beat",beat); beat = serverBeatUrl||"(local)"; }
    if(isBase64(run)) { saveLocalPhoto(key,"run",run);  run  = serverRunUrl||"(local)"; }

    const urlBeat = serverBeatUrl||(beat&&beat.startsWith("http")?beat:db[key]?.beat||"");
    const urlRun  = serverRunUrl||(run&&run.startsWith("http")?run:db[key]?.run||"");
    const entry={name:b?.name||"",sailNo:b?.sailNo||"",beat:urlBeat,run:urlRun,updatedAt:Date.now()};
    const newDb={...db,[key]:entry};
    setDb(newDb);
    await savePhotoDb(newDb);
    setSaving(null); setEditId(null); setBeatUrl(""); setRunUrl("");
    setMsg(serverBeatUrl||serverRunUrl
      ?"✅ Foto guardada en servidor — visible en todos los dispositivos"
      :"✓ Foto guardada localmente");
    setTimeout(()=>setMsg(""),4000);

    // Analizar colores automáticamente desde la foto de ceñida
    const photoForAnalysis = beat?.startsWith("data:") ? beat : serverBeatUrl;
    if(photoForAnalysis && onColorUpdate){
      setAnalyzingColors(key);
      setMsg("🎨 Analizando colores del barco...");
      const colors = await analyzeBoatColors(photoForAnalysis);
      if(colors){
        onColorUpdate(boatId, colors);
        setMsg(`✅ Colores actualizados — casco ${colors.hullColor}, vela ${colors.sailColor}${colors.trimBands?.length?" + "+colors.trimBands.length+" bandas":""}`);
      } else {
        setMsg("✓ Foto guardada (análisis de colores no disponible)");
      }
      setAnalyzingColors(null);
      setTimeout(()=>setMsg(""),5000);
    }
  };

  const handleFile = async(file, type)=>{
    if(!file) return;
    setMsg("⏳ Comprimiendo imagen...");
    const b64 = await compressImage(file, 700, 0.72);
    if(type==="beat") setBeatUrl(b64);
    else setRunUrl(b64);
    setMsg(`✓ Imagen lista (${Math.round(b64.length/1024)}KB) — pulsa Guardar`);
    setTimeout(()=>setMsg(""),4000);
  };

  const autoFind = async(b)=>{
    setFinding(b.id); setMsg(`Buscando fotos de ${b.name}...`);
    const [beat,run]=await Promise.all([
      findBoatPhoto(b.name,b.sailNo,b.cls||"",regattaName,"beat"),
      findBoatPhoto(b.name,b.sailNo,b.cls||"",regattaName,"run")
    ]);
    if(beat) setBeatUrl(beat);
    if(run)  setRunUrl(run);
    if(beat||run) setMsg("✓ Fotos encontradas — revísalas y guarda");
    else setMsg("No encontradas. Carga desde tu dispositivo 📁");
    setFinding(null);
  };

  const filtered=fleet.filter(b=>!search||b.name.toLowerCase().includes(search.toLowerCase())||b.sailNo?.includes(search));
  const dbCount=fleet.filter(b=>getPhoto(b.sailNo||b.id,"beat")||getPhoto(b.sailNo||b.id,"run")).length;

  return(
    <div>
      <div style={{padding:"10px 13px",background:CARD2,borderRadius:10,marginBottom:10,border:`1px solid ${BDR}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <span style={{fontSize:18}}>📸</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:T1}}>Base de datos de fotos</div>
            <div style={{fontSize:10,color:T2}}>{dbCount} barcos con fotos · compartida entre todos los usuarios</div>
          </div>
        </div>
        <div style={{fontSize:10,color:T3,lineHeight:1.5}}>Fotos visibles para todos los usuarios. Ayudan a identificar barcos durante la regata desde el exterior.</div>
      </div>

      {msg&&<div style={{padding:"7px 10px",background:msg.startsWith("✓")?`${GRN}22`:`${GLD}22`,borderRadius:7,fontSize:10,color:msg.startsWith("✓")?GRN:GLD,marginBottom:8}}>{msg}</div>}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar barco..." style={{marginBottom:10,fontSize:11}}/>

      {filtered.map(b=>{
        const key=b.sailNo||b.id;
        const entry=db[key]||{};
        const beatPhoto=getPhoto(key,"beat");
        const runPhoto=getPhoto(key,"run");
        const isEditing=editId===b.id;
        return(
          <div key={b.id} style={{marginBottom:8,background:CARD,borderRadius:10,border:`1px solid ${beatPhoto&&runPhoto?`${GRN}44`:BDR}`,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px"}}>
              <div style={{width:6,height:36,borderRadius:3,background:b.color||BDR,flexShrink:0}}/>
              <BoatIcon b={b} size={36}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</div>
                <div style={{fontSize:9,color:T2}}>{b.sailNo} · Proa {b.bowNum||"?"} · {b.boatType||b.cls}</div>
              </div>
              <span style={{fontSize:11,color:beatPhoto?GRN:T3}}>⬆️{beatPhoto?"✓":""}</span>
              <span style={{fontSize:11,color:runPhoto?GRN:T3}}>⬇️{runPhoto?"✓":""}</span>
              <button onClick={()=>{ if(isEditing){setEditId(null);setBeatUrl("");setRunUrl("");}
                else{setEditId(b.id);setBeatUrl(entry.beat||"");setRunUrl(entry.run||"");} }}
                style={{padding:"4px 8px",borderRadius:6,background:isEditing?T3:CARD2,color:T1,fontSize:10,fontWeight:700,border:`1px solid ${BDR}`,cursor:"pointer"}}>
                {isEditing?"✕":"✏️"}
              </button>
            </div>
            {!isEditing&&(beatPhoto||runPhoto)&&(
              <div style={{display:"flex",gap:6,padding:"0 10px 8px"}}>
                {[["beat","⬆️ Ceñida",beatPhoto],["run","⬇️ Popa",runPhoto]].map(([t,l,u])=>u&&(
                  <div key={t} style={{flex:1}}>
                    <div style={{fontSize:8,color:T2,marginBottom:2}}>{l}</div>
                    <img src={u} style={{width:"100%",height:70,objectFit:"cover",borderRadius:6,border:`1px solid ${BDR}`}} alt={l} onError={e=>e.target.style.display="none"}/>
                  </div>
                ))}
              </div>
            )}
            {isEditing&&(
              <div style={{padding:"8px 10px 10px",background:CARD2,borderTop:`1px solid ${BDR}`}}>
                <button onClick={()=>autoFind(b)} disabled={!!finding}
                  style={{width:"100%",padding:"7px 0",background:finding===b.id?CARD2:GLD,color:"#000",borderRadius:7,fontSize:10,fontWeight:700,border:"none",cursor:"pointer",marginBottom:8}}>
                  {finding===b.id?"🔍 Buscando en web...":"🔍 Buscar fotos en web"}
                </button>
                {[
                  {type:"beat",lbl:"⬆️ Ceñida / Barlovento",urlVal:beatUrl,setUrl:setBeatUrl,fileRef:beatFileRef,accent:GLD},
                  {type:"run", lbl:"⬇️ Popa / Spinnaker",   urlVal:runUrl, setUrl:setRunUrl, fileRef:runFileRef, accent:CYN},
                ].map(({type,lbl,urlVal,setUrl,fileRef,accent})=>(
                  <div key={type} style={{marginBottom:9}}>
                    <div style={{fontSize:9,fontWeight:700,color:accent,marginBottom:4}}>{lbl}</div>
                    {(urlVal||(type==="beat"?beatPhoto:runPhoto))&&(
                      <img src={urlVal||(type==="beat"?beatPhoto:runPhoto)}
                        style={{width:"100%",height:80,objectFit:"cover",borderRadius:6,marginBottom:5,border:`1px solid ${BDR}`}}
                        onError={e=>e.target.style.display="none"} alt={lbl}/>
                    )}
                    <div style={{display:"flex",gap:5,marginBottom:4}}>
                      <button onClick={()=>fileRef.current?.click()}
                        style={{flex:1,padding:"7px 0",background:ACC,color:"#fff",borderRadius:6,fontSize:10,fontWeight:700,border:"none",cursor:"pointer"}}>
                        📁 Subir archivo
                      </button>
                      <button onClick={()=>{ if(fileRef.current){fileRef.current.setAttribute("capture","environment");fileRef.current.click();} }}
                        style={{flex:1,padding:"7px 0",background:CARD,color:T1,borderRadius:6,fontSize:10,fontWeight:700,border:`1px solid ${BDR}`,cursor:"pointer"}}>
                        📷 Cámara
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{ const f=e.target.files?.[0]; if(f)handleFile(f,type); e.target.value=""; }}/>
                    <input
                      value={urlVal?.startsWith("data:")? `✓ Foto cargada (${Math.round((urlVal?.length||0)/1024)}KB)`:urlVal||""}
                      readOnly={urlVal?.startsWith("data:")}
                      onChange={e=>!urlVal?.startsWith("data:")&&setUrl(e.target.value)}
                      onPaste={e=>{if(!urlVal?.startsWith("data:")){e.preventDefault();setUrl(e.clipboardData.getData("text").trim());}}}
                      placeholder="O pega URL https://..."
                      style={{fontSize:9,color:urlVal?.startsWith("data:")?GRN:T1}}/>
                  </div>
                ))}
                <button onClick={()=>save(b.id,beatUrl||null,runUrl||null)} disabled={saving===b.id||analyzingColors===key}
                  style={{width:"100%",padding:"9px 0",borderRadius:7,background:saving===b.id||analyzingColors===key?CARD2:GRN,color:"#fff",borderRadius:7,fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
                  {saving===b.id?"⏳ Guardando...":analyzingColors===key?"🎨 Analizando colores...":"💾 Guardar fotos"}
                </button>
                {/* Botón analizar colores de foto ya guardada */}
                {(getPhoto(key,"beat")||beatPhoto)&&onColorUpdate&&(
                  <button onClick={async()=>{
                    const src = getPhoto(key,"beat")||beatPhoto;
                    setAnalyzingColors(key);
                    setMsg("🎨 Analizando colores...");
                    const c = await analyzeBoatColors(src);
                    if(c){ onColorUpdate(b.id,c); setMsg(`✅ Casco ${c.hullColor} · Vela ${c.sailColor}${c.trimBands?.length?" · "+c.trimBands.length+" bandas":""}`); }
                    else setMsg("No se pudieron detectar colores");
                    setAnalyzingColors(null);
                    setTimeout(()=>setMsg(""),5000);
                  }} disabled={analyzingColors===key}
                    style={{width:"100%",padding:"7px 0",borderRadius:7,background:CARD2,color:GLD,fontSize:11,fontWeight:700,border:`1px solid ${GLD}44`,cursor:"pointer",marginTop:5}}>
                    {analyzingColors===key?"⏳ Analizando...":"🎨 Detectar colores automáticamente"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── ACTUALIZAR FLOTA — re-carga inscritos y ratings ──────────────────────────
function FleetRefresh({fleet, champ, onUpdate}){
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  const refresh = async(boats)=>{
    if(!boats?.length) return;
    onUpdate(boats);
    setMsg(`✅ ${boats.length} barcos actualizados`);
    setOpen(false);
    setTimeout(()=>setMsg(""),3000);
  };

  const autoRefresh = async()=>{
    const url = champ?.entryListUrl;
    if(!url){ setMsg("Sin URL de inscritos configurada"); return; }
    setLoading(true); setMsg("🔄 Cargando lista actualizada...");
    try{
      const result = await fetchFleetFromUrl(url);
      if(result?.boats?.length){ refresh(result.boats); }
      else setMsg("No se pudieron cargar barcos. Usa el método manual.");
    }catch(e){ setMsg("Error: "+e.message); }
    setLoading(false);
  };

  return(
    <Card st={{marginBottom:10,border:`1px solid ${GLD}33`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?10:0}}>
        <span style={{fontSize:16}}>🔄</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:T1}}>Actualizar inscritos y ratings</div>
          <div style={{fontSize:9,color:T2}}>Añade barcos nuevos y actualiza GPH sin perder configuración</div>
        </div>
        <button onClick={()=>setOpen(o=>!o)}
          style={{padding:"5px 10px",borderRadius:6,background:open?T3:GLD,color:open?"#fff":"#000",fontSize:10,fontWeight:700,border:"none",cursor:"pointer"}}>
          {open?"✕":"Actualizar"}
        </button>
      </div>

      {msg&&<div style={{fontSize:10,color:msg.startsWith("✅")?GRN:msg.startsWith("Error")?RED:CYN,marginBottom:6}}>{msg}</div>}

      {open&&(
        <div>
          {champ?.entryListUrl&&(
            <button onClick={autoRefresh} disabled={loading}
              style={{width:"100%",padding:"9px 0",borderRadius:8,background:loading?CARD2:ACC,
                color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",marginBottom:8}}>
              {loading?"⏳ Cargando...":"🔗 Cargar desde URL original"}
            </button>
          )}
          <div style={{fontSize:10,fontWeight:700,color:GLD,marginBottom:6}}>O sube lista actualizada:</div>
          <ManualFleetPaste onFleetParsed={refresh}/>
          <div style={{fontSize:9,color:T2,marginTop:8,lineHeight:1.5}}>
            ✅ Se conservan: colores, fotos, barco propio<br/>
            🔄 Se actualizan: GPH/rating, tipo de barco, número de proa<br/>
            ➕ Se añaden: barcos nuevos en la lista
          </div>
        </div>
      )}
    </Card>
  );
}

// ── RESUMEN VISUAL DE FOTOS ───────────────────────────────────────────────────
function FleetPhotoSummary({fleet}){
  const [db, setDb] = useState({});
  const [srvLoaded, setSrvLoaded] = useState(false);

  useEffect(()=>{
    loadPhotoDb().then(d=>setDb(d||{}));
    loadServerPhotos().then(()=>setSrvLoaded(true));
  },[]);

  const getPhoto = (b, type) => {
    const k = b.sailNo||b.id;
    return getServerPhotoUrl(k,type)
      || loadLocalPhoto(k, type)
      || db[k]?.[type==="beat"?"beat":"run"]
      || b[type==="beat"?"photoUrlBeat":"photoUrlRun"]
      || null;
  };

  const withPhoto   = fleet.filter(b=>getPhoto(b,"beat")||getPhoto(b,"run")).length;
  const withoutPhoto= fleet.length - withPhoto;

  return(
    <Card st={{marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <Lbl v="Fotos de la flota"/>
        <div style={{fontSize:10,color:T2}}>
          <span style={{color:GRN,fontWeight:700}}>{withPhoto}✓</span>
          {withoutPhoto>0&&<span style={{color:T3,marginLeft:6}}>{withoutPhoto} sin foto</span>}
        </div>
      </div>

      {/* Grid de miniaturas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
        {[...fleet].sort((a,b)=>(a.bowNum||99)-(b.bowNum||99)).map(b=>{
          const beatPhoto = getPhoto(b,"beat");
          const runPhoto  = getPhoto(b,"run");
          const hasAny    = !!(beatPhoto||runPhoto);
          const tc = isDark(b.hullColor||b.color)?"#fff":"#000";
          return(
            <div key={b.id} style={{borderRadius:8,overflow:"hidden",border:`2px solid ${hasAny?b.color:BDR}`,background:CARD2,opacity:hasAny?1:0.5}}>
              {/* Foto ceñida o icono */}
              <div style={{width:"100%",height:60,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:CARD}}>
                {beatPhoto
                  ?<img src={beatPhoto} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={b.name} onError={e=>e.target.style.display="none"}/>
                  :<BoatIcon b={{...b,trimBands:b.trimBandsMain||b.trimBands||[]}} size={44}/>
                }
                {/* Indicadores de foto */}
                <div style={{position:"absolute",top:2,right:2,display:"flex",gap:2}}>
                  {beatPhoto&&<span style={{fontSize:8,background:`${GRN}cc`,borderRadius:3,padding:"1px 3px",color:"#fff"}}>⬆️</span>}
                  {runPhoto &&<span style={{fontSize:8,background:`${CYN}cc`,borderRadius:3,padding:"1px 3px",color:"#fff"}}>⬇️</span>}
                </div>
                {/* Número de proa */}
                <div style={{position:"absolute",top:2,left:2,background:`${b.hullColor||b.color}ee`,borderRadius:4,padding:"1px 4px"}}>
                  <span style={{fontSize:9,fontWeight:900,color:tc}}>{b.bowNum||"?"}</span>
                </div>
              </div>
              {/* Nombre */}
              <div style={{padding:"3px 5px",background:b.hullColor||b.color}}>
                <div style={{fontSize:7,fontWeight:700,color:tc,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",textAlign:"center"}}>{b.name}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:9,color:T3,marginTop:8,textAlign:"center"}}>
        ⬆️ ceñida · ⬇️ popa · Sin foto = icono SVG · Añade fotos en ⚙️ 📸 Fotos
      </div>
    </Card>
  );
}

function TabConfig({state,setState,race}){
  const co=race.course;
  const [cfgTab, setCfgTab] = useState("flota"); // "flota" | "campeonato" | "fotos"
  const updCo=(k,v)=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,course:{...r.course,[k]:v}}:r)}));
  const updFleet=(id,k,v)=>setState(s=>({...s,fleet:s.fleet.map(b=>b.id===id?{...b,[k]:v}:b)}));
  const Slider=({label,k,min,max,step,unit})=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:11,color:T2}}>{label}</span>
        <Mono v={`${co[k]}${unit}`} z={11} c={T1}/>
      </div>
      <input type="range" min={min} max={max} step={step} value={co[k]} onChange={e=>updCo(k,+e.target.value)} style={{width:"100%",accentColor:ACC,background:"transparent"}}/>
    </div>
  );

  // Gestión de tramos de regata costera
  const coastalLegs = co.coastalLegs||[];
  const addCoastalLeg = ()=>updCo("coastalLegs",[...coastalLegs,{id:`cl${Date.now()}`,name:`Tramo ${coastalLegs.length+1}`,distNm:1.0,type:"reach"}]);
  const updCoastalLeg = (id,k,v)=>updCo("coastalLegs",coastalLegs.map(l=>l.id===id?{...l,[k]:v}:l));
  const delCoastalLeg = (id)=>updCo("coastalLegs",coastalLegs.filter(l=>l.id!==id));

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Sub-tab bar */}
      <div style={{display:"flex",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        {[["flota","⛵ Barcos"],["campeonato","🏆 Camp."],["fotos","📸 Fotos"]].map(([k,l])=>(
          <button key={k} onClick={()=>setCfgTab(k)} style={{flex:1,padding:"9px 4px",background:"none",fontSize:11,fontWeight:700,color:cfgTab===k?ACC:T2,borderBottom:cfgTab===k?`2px solid ${ACC}`:"2px solid transparent",border:"none",cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"10px 13px"}}>

        {/* ── PESTAÑA FLOTA/BARCOS ───────────────────────────────── */}
        {cfgTab==="flota"&&(<>

          {/* ── Selector de barco propio ── */}
          <Card st={{marginBottom:12,border:`2px solid ${GLD}44`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <span style={{fontSize:16}}>⭐</span>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:GLD}}>Tu barco</div>
                <div style={{fontSize:9,color:T2}}>El barco marcado aparece destacado en todas las clasificaciones</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
              {state.fleet.map(b=>{
                const isSelected = state.champ.ownId===b.id;
                return(
                  <button key={b.id}
                    onClick={()=>setState(s=>({...s,champ:{...s.champ,ownId:b.id}}))}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,
                      background:isSelected?`${b.color}22`:CARD2,
                      border:`2px solid ${isSelected?b.color:BDR}`,
                      textAlign:"left",cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:10,height:10,borderRadius:3,background:b.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:isSelected?800:500,
                        color:isSelected?b.color:"#fff",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {b.name}
                      </div>
                      <div style={{fontSize:9,color:T2}}>{b.sailNo}{b.boatType?" · "+b.boatType:""}{b.gpH?" · GPH "+b.gpH:""}</div>
                    </div>
                    {isSelected
                      ? <span style={{fontSize:18,flexShrink:0}}>⭐</span>
                      : <span style={{fontSize:12,color:T3,flexShrink:0}}>○</span>
                    }
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── Actualizar flota ── */}
          <FleetRefresh fleet={state.fleet} champ={state.champ}
            onUpdate={updatedBoats=>{
              // Merge: mantener colores/fotos existentes, actualizar ratings y añadir nuevos barcos
              setState(s=>{
                const merged = updatedBoats.map(b=>{
                  const existing = s.fleet.find(x=>x.sailNo===b.sailNo||x.name===b.name);
                  return existing
                    ? {...existing, gpH:b.gpH||existing.gpH, boatType:b.boatType||existing.boatType, bowNum:b.bowNum||existing.bowNum}
                    : {...b, color:BOAT_COLORS[s.fleet.length%BOAT_COLORS.length], hullColor:BOAT_COLORS[s.fleet.length%BOAT_COLORS.length], trimBands:[]};
                });
                // Mantener barcos existentes que no aparecen en la nueva lista (por si acaso)
                const notInNew = s.fleet.filter(b=>!merged.find(m=>m.sailNo===b.sailNo));
                return {...s, fleet:[...merged, ...notInNew.map(b=>({...b,_removed:true}))]};
              });
            }}/>

          {/* Resumen visual de fotos — qué barcos tienen foto y cuáles no */}
          <FleetPhotoSummary fleet={state.fleet}/>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,marginTop:4}}>
            <Lbl v={`Fichas · ${state.fleet.length} barcos`}/>
            <Btn v="⛵ Preset Worlds 2026" onClick={()=>setState(s=>({...s,fleet:CLASS0}))} sm st={{background:"#0a1a30",border:`1px solid #1e4070`,color:T1,fontSize:10}}/>
          </div>
          {state.fleet.map(b=>(
            <BoatCard key={b.id} b={b} isOwn={b.id===state.champ.ownId}
              regattaName={state.champ.name}
              onUpdate={(k,v)=>updFleet(b.id,k,v)}
              onDelete={()=>setState(s=>({...s,fleet:s.fleet.filter(x=>x.id!==b.id)}))}/>
          ))}
        </>)}

        {/* ── PESTAÑA FOTOS BD ──────────────────────────────── */}
        {cfgTab==="fotos"&&(
          <BoatPhotoDbTab fleet={state.fleet} regattaName={state.champ?.name||""}
            onColorUpdate={(boatId, colors)=>{
              setState(s=>({...s, fleet:s.fleet.map(b=>b.id===boatId?{
                ...b,
                hullColor: colors.hullColor||b.hullColor,
                color:     colors.trimBands?.[0]||b.color,
                mainColor: colors.sailColor||b.mainColor,
                jibColor:  colors.sailColor||b.jibColor,
                spiColor:  colors.trimBands?.[0]||b.spiColor,
                trimBandsMain: colors.trimBands?.length ? colors.trimBands : b.trimBandsMain,
              }:b)}));
            }}/>
        )}
        {cfgTab==="campeonato"&&(<>
          <Card st={{marginBottom:10}}>
            <Lbl v="Nombre del campeonato"/>
            <input value={state.champ.name} onChange={e=>setState(s=>({...s,champ:{...s.champ,name:e.target.value}}))} placeholder="ORC World Championship 2026"/>
          </Card>

          <Card st={{marginBottom:10}}>
            <Lbl v="Modo de cálculo (scoring ORC)"/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
              {SCORING_MODES.map(m=>{
                const active=(state.champ.scoringMode||DEFAULT_SCORING)===m.key;
                return <button key={m.key} onClick={()=>setState(s=>({...s,champ:{...s.champ,scoringMode:m.key}}))} style={{
                  padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                  background:active?ACC:CARD2,color:active?"#fff":T2,border:`1px solid ${active?ACC:BDR}`}}>{m.label}</button>;
              })}
            </div>
            <div style={{fontSize:9,color:T3,marginTop:6,lineHeight:1.5}}>
              Por defecto W/L ToT. Cada regata puede sobreescribirlo en 🏁 Regatas. ToT corrige por tiempo, ToD por distancia.
            </div>
          </Card>

          <Card st={{marginBottom:10}}>
            <Lbl v="Reglas de descarte"/>
            <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontSize:9,color:T2,marginBottom:3}}>1 descarte cada (pruebas)</div>
                <input type="number" min="0" max="20" value={state.champ?.discardEvery??4}
                  onChange={e=>setState(s=>({...s,champ:{...s.champ,discardEvery:Math.max(0,parseInt(e.target.value)||0)}}))}/>
              </div>
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontSize:9,color:T2,marginBottom:3}}>Mínimo de pruebas</div>
                <input type="number" min="1" max="20" value={state.champ?.discardMin??4}
                  onChange={e=>setState(s=>({...s,champ:{...s.champ,discardMin:Math.max(1,parseInt(e.target.value)||1)}}))}/>
              </div>
            </div>
            <div style={{fontSize:9,color:T3,marginTop:6,lineHeight:1.5}}>
              Ej.: "cada 4" descarta la peor a partir de 4 pruebas, 2 peores a partir de 8. Pon 0 para no descartar nunca.
            </div>
            {(() => {
              const nR = state.champ?.orcStandings?.[0]?.breakdown?.length || 0;
              if(!nR) return <div style={{fontSize:9,color:T3,marginTop:8}}>Carga los resultados oficiales para marcar pruebas como no descartables.</div>;
              const nd = state.champ?.ndRaces || [];
              const toggle = i => setState(s=>{
                const cur = s.champ?.ndRaces||[];
                const next = cur.includes(i) ? cur.filter(x=>x!==i) : [...cur, i];
                return {...s, champ:{...s.champ, ndRaces:next}};
              });
              return (
                <div style={{marginTop:10}}>
                  <div style={{fontSize:9,color:T2,marginBottom:5,fontWeight:700}}>Pruebas NO descartables (oficiales):</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {Array.from({length:nR}).map((_,i)=>(
                      <button key={i} onClick={()=>toggle(i)}
                        style={{padding:"5px 11px",borderRadius:16,fontSize:11,fontWeight:700,cursor:"pointer",
                          background:nd.includes(i)?GLD:CARD,color:nd.includes(i)?"#000":T2,border:`1px solid ${nd.includes(i)?GLD:BDR}`}}>
                        {nd.includes(i)?"🔒 ":""}R{i+1}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          <ChampLinks state={state} setState={setState}/>

          {/* Sincronización en la nube (Supabase) */}
          <CloudSyncBlock state={state} setState={setState}/>
        </>)}

      </div>
    </div>
  );
}

function CloudSyncBlock({state, setState}){
  const [url, setUrl]   = useState(()=>{ try{ return (JSON.parse(localStorage.getItem("orc-cloud-cfg")||"{}")).url||""; }catch{ return ""; }});
  const [key, setKey]   = useState(()=>{ try{ return (JSON.parse(localStorage.getItem("orc-cloud-cfg")||"{}")).key||""; }catch{ return ""; }});
  const [msg, setMsg]   = useState("");
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [cloudList, setCloudList] = useState(null);
  const enabled = cloud.isCloudEnabled();
  const code = state?.champ?.joinCode;

  const recoverFromCloud = async()=>{
    setBusy(true); setMsg("⏳ Buscando campeonatos en la nube...");
    try{
      const list = await cloud.listChampionships();
      if(!list.length){ setMsg("❌ No hay campeonatos en la nube todavía"); setBusy(false); return; }
      setCloudList(list);
      setMsg("");
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  const linkToCloud = async(champRow)=>{
    setBusy(true); setMsg("⏳ Vinculando...");
    try{
      setState(s=>({...s, champ:{...s.champ, joinCode:champRow.join_code}, _cloudId:champRow.id}));
      setCloudList(null);
      setMsg("✅ Código recuperado: "+champRow.join_code);
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  const connect = async()=>{
    if(!url.trim()||!key.trim()){ setMsg("❌ Faltan URL y clave (publishable key)"); return; }
    setBusy(true); setMsg("⏳ Conectando...");
    try{
      cloud.configureCloud(url.trim(), key.trim());
      // Subir el campeonato; saveChampionship devuelve el joinCode y el cloudId
      const res = await saveCh(state._champId, {...state, _champId:state._champId});
      if(res?.joinCode){
        setState(s=>({...s, champ:{...s.champ, joinCode:res.joinCode}, _cloudId:res.cloudId}));
        setMsg("✅ Conectado. Comparte el código de campeonato.");
      } else if(res?.error){
        setMsg("❌ "+res.error);
      } else {
        setMsg("✅ Conectado.");
      }
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  const join = async()=>{
    if(!joinCode.trim()) return;
    setBusy(true); setMsg("⏳ Buscando campeonato...");
    try{
      const loaded = await cloud.loadByCode(joinCode.trim().toUpperCase());
      if(!loaded){ setMsg("❌ No existe un campeonato con ese código"); setBusy(false); return; }
      setState(loaded);
      setMsg(`✅ Entraste en "${loaded.champ.name}"`);
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  return (
    <Card st={{marginBottom:10}}>
      <Lbl v="☁️ Sincronización en la nube"/>
      <div style={{fontSize:10,color:T2,lineHeight:1.6,marginBottom:8}}>
        {enabled
          ? <>Conectado a Supabase. Los cambios se ven en tiempo real en todos los dispositivos.</>
          : <>Sin conectar: los datos solo se guardan en este dispositivo. Pega tu URL y anon key de Supabase (Project Settings → API).</>}
      </div>

      {enabled && code && (
        <div style={{background:`${GRN}12`,border:`1px solid ${GRN}40`,borderRadius:9,padding:"10px 12px",marginBottom:10,textAlign:"center"}}>
          <div style={{fontSize:9,color:T2,marginBottom:3}}>CÓDIGO DE CAMPEONATO (compártelo)</div>
          <div style={{fontSize:24,fontWeight:900,letterSpacing:3,color:GRN,fontFamily:"monospace"}}>{code}</div>
          <button onClick={()=>{ try{ navigator.clipboard?.writeText(code); setMsg("✅ Código copiado: "+code); }catch{} }}
            style={{marginTop:6,padding:"4px 12px",background:`${GRN}22`,color:GRN,border:`1px solid ${GRN}55`,borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>📋 Copiar código</button>
        </div>
      )}

      {enabled && !code && (
        <div style={{background:`${GLD}12`,border:`1px solid ${GLD}40`,borderRadius:9,padding:"10px 12px",marginBottom:10}}>
          <div style={{fontSize:10,color:GLD,fontWeight:700,marginBottom:6}}>El código no está cargado en este dispositivo</div>
          {!cloudList && (
            <>
              <div style={{fontSize:9,color:T2,marginBottom:8,lineHeight:1.5}}>Recupéralo desde la nube: busca tus campeonatos guardados y elige el correcto.</div>
              <Btn v={busy?"⏳...":"🔄 Buscar mi código en la nube"} onClick={recoverFromCloud} c="gld" fw dis={busy}/>
            </>
          )}
          {cloudList && (
            <div style={{display:"grid",gap:5}}>
              <div style={{fontSize:9,color:T2,marginBottom:2}}>Elige tu campeonato:</div>
              {cloudList.map(c=>(
                <button key={c.id} onClick={()=>linkToCloud(c)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:CARD2,border:`1px solid ${BDR}`,borderRadius:7,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:11,color:T1,fontWeight:600}}>{c.name}</span>
                  <span style={{fontSize:13,color:GRN,fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>{c.join_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <div style={{display:"grid",gap:6,marginBottom:8}}>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxx.supabase.co"/>
          <input value={key} onChange={e=>setKey(e.target.value)} placeholder="publishable key (sb_publishable_...)" type="password"/>
          <Btn v={busy?"⏳...":"🔌 Conectar Supabase"} onClick={connect} c="cyn" fw dis={busy}/>
        </div>
      )}

      {enabled && (
        <div style={{borderTop:`1px solid ${BDR}`,marginTop:8,paddingTop:8}}>
          <Lbl v="Entrar en otro campeonato con código"/>
          <div style={{display:"flex",gap:6}}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="EJ. GODO26" style={{textTransform:"uppercase",fontFamily:"monospace",fontWeight:700}}/>
            <Btn v="Entrar" onClick={join} c="acc" dis={busy||!joinCode.trim()}/>
          </div>
        </div>
      )}

      {msg && <div style={{marginTop:8,fontSize:10,padding:"6px 9px",borderRadius:7,
        background: msg.startsWith("✅")?`${GRN}15`:msg.startsWith("❌")?`${RED}15`:`${CYN}15`,
        color: msg.startsWith("✅")?GRN:msg.startsWith("❌")?RED:CYN}}>{msg}</div>}
    </Card>
  );
}

// ── Asignación de una marca de tiempo a barco + boya ───────────────────────
function MarkAssign({mark, idx, fleet, startTime, legs, nextLeg, onAssign, onDelete}){
  const [boatId, setBoatId] = useState(null);
  const el = startTime ? Math.round((mark.time-startTime)/1000) : 0;
  const mm = Math.floor(el/60), ss = el%60;
  const hora = new Date(mark.time).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const sortedFleet = [...fleet].sort((a,b)=>(a.bowNum||99)-(b.bowNum||99));
  const nl = boatId ? nextLeg(boatId) : null;       // siguiente boya del barco elegido
  const nlDef = nl ? legs[nl-1] : null;

  return(
    <div style={{background:CARD,border:`1px solid ${boatId?GRN:GLD}55`,borderRadius:10,padding:"10px 12px"}}>
      {/* Cabecera: tiempo de la marca */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{width:26,height:26,borderRadius:6,background:GLD,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,flexShrink:0}}>{idx+1}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:T1}}>{mm}:{ss.toString().padStart(2,"0")}</div>
          <div style={{fontSize:9,color:T3}}>{hora}</div>
        </div>
        <button onClick={onDelete} style={{padding:"6px 10px",borderRadius:6,background:`${RED}18`,color:RED,fontSize:13,border:"none",cursor:"pointer",flexShrink:0}}>🗑</button>
      </div>

      {/* Selector de barco */}
      <div style={{fontSize:9,color:T2,marginBottom:4}}>¿Qué barco pasó?</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {sortedFleet.map(b=>{
          const bnl = nextLeg(b.id);
          const finished = bnl===null;
          return(
            <button key={b.id} onClick={()=>!finished&&setBoatId(b.id)} disabled={finished} style={{
              display:"flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:14,fontSize:11,fontWeight:700,cursor:finished?"default":"pointer",opacity:finished?0.35:1,
              background:boatId===b.id?b.color||ACC:CARD2, color:boatId===b.id?"#fff":T2, border:`1px solid ${boatId===b.id?(b.color||ACC):BDR}`}}>
              <span style={{display:"inline-block",width:9,height:9,borderRadius:"50%",background:b.color||T3}}/>
              {b.bowNum?`${b.bowNum} `:""}{b.name}{finished?" ✓":""}
            </button>
          );
        })}
      </div>

      {/* Siguiente boya automática */}
      {boatId&&nlDef&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,color:T2,marginBottom:4}}>Se registrará en:</div>
          <span style={{display:"inline-block",padding:"6px 12px",borderRadius:14,fontSize:11,fontWeight:700,color:"#fff",background:nlDef.col}}>→ {nlDef.label}</span>
        </div>
      )}

      {/* Confirmar */}
      <button onClick={()=>boatId&&onAssign(boatId)} disabled={!boatId} style={{
        width:"100%",padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:800,border:"none",
        background:boatId?GRN:CARD2, color:boatId?"#fff":T3, cursor:boatId?"pointer":"default"}}>
        {boatId&&nlDef?`✓ Asignar a ${nlDef.label}`:"Elige el barco que pasó"}
      </button>
    </div>
  );
}

function TabEnVivo({state,setState,role="patron"}){
  // ── Extraer datos del estado PRIMERO (antes de cualquier hook) ──────────
  // Esto evita el error "Cannot access X before initialization" (TDZ)
  const fleet      = state.fleet;
  const ownId      = state.champ.ownId;
  const [photoDb, setPhotoDb] = useState({});
  useEffect(()=>{ loadPhotoDb().then(setPhotoDb); },[]);
  const activeRace = state.races.find(r=>r.id===state.activeRaceId);
  const passages   = activeRace?.passages   || [];
  const startTime  = activeRace?.startTime  || null;
  const countdownAt= activeRace?.countdownAt|| null;
  const finishedAt = activeRace?.finishedAt || null;
  const course     = activeRace?.course     || DCOURSE;
  const started    = !!startTime;

  // ── HOOKS — siempre en el mismo orden, antes de cualquier return ────────
  const [now,        setNow]       = useState(Date.now());
  const [pend,       setPend]      = useState(null);
  const [sub,        setSub]       = useState("crono");
  const [copyFrom,   setCopyFrom]  = useState(null); // {boatId, time} para copiar tiempo
  const [liveNow,    setLiveNow]   = useState(Date.now()); // tick para animación

  // Tick cada 2s para animar barcos en el mapa
  useEffect(()=>{
    if(!started) return;
    const id = setInterval(()=>setLiveNow(Date.now()), 2000);
    return()=>clearInterval(id);
  },[started]);

  // Clasificación en tiempo real
  const liveStandings = useMemo(()=>{
    if(!started||!activeRace) return [];
    const std = computeStd(passages, startTime, fleet, course, activeRace?.scoringMode||state.champ?.scoringMode||DEFAULT_SCORING);
    return std.map((s,i)=>({...s, pos:s.ct!=null?i+1:null})).filter(s=>s.ct!=null||passages.some(p=>p.boatId===s.b?.id));
  },[passages, startTime, fleet, course, started]);
  const [voiceOn,    setVoiceOn]   = useState(false);
  const [heard,      setHeard]     = useState("");
  const [legRank,    setLegRank]   = useState({});
  const [confirm,    setConfirm]   = useState(null);
  const [copyFromId, setCopyFromId]= useState(null); // id barco para copiar tiempo
  const [boatProg,   setBoatProg]  = useState({}); // progreso animación {boatId: 0..0.85}
  const rRef = useRef(null);
  const vRef = useRef(false);

  // Timer: actualiza now cada 500ms + animación de barcos en mapa
  useEffect(()=>{
    const id=setInterval(()=>{
      const t=Date.now();
      setNow(t);
      if(!started||finishedAt) return;
      // Calcular progreso de cada barco hacia su siguiente boya
      const prog={};
      fleet.forEach(b=>{
        const leg = passages.filter(p=>p.boatId===b.id).length;
        if(leg>=6){prog[b.id]=1;return;}
        const lastP = [...passages].filter(p=>p.boatId===b.id).sort((a,z)=>z.realTime-a.realTime)[0];
        const legStart = lastP?.realTime || startTime;
        const ldist = legDist(leg+1, activeRace?.course||DCOURSE)||0.8; // nm
        const spd = Math.max(3, 3600/(b.gpH||560)*6); // approx knots
        const estSecs = Math.max(60, (ldist/spd)*3600);
        const elapsed = (t - legStart)/1000;
        prog[b.id] = Math.min(0.82, elapsed/estSecs); // nunca llega a la boya
      });
      setBoatProg(prog);
    },500);
    return()=>clearInterval(id);
  },[started,finishedAt,passages.length,fleet.length,startTime]);

  // Auto-stop cuando todos terminan
  const allDone = fleet.every(b=>passages.some(p=>p.boatId===b.id&&p.leg===6));
  useEffect(()=>{
    if(allDone&&started&&!finishedAt&&passages.length){
      const lastT=Math.max(...passages.map(p=>p.realTime));
      setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,finishedAt:lastT}:r)}));
    }
  },[allDone,started,finishedAt,passages.length]);

  // Cuenta atrás → auto-start
  const cdRemaining = countdownAt ? Math.max(0,(countdownAt-now)/1000) : null;
  useEffect(()=>{
    if(cdRemaining===0&&countdownAt&&!started){
      setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,startTime:r.countdownAt,countdownAt:null}:r)}));
    }
  },[cdRemaining]);

  // ── Helpers de ranking ──────────────────────────────────────────────────
  const getBoatsOnLeg = useCallback((legNum) => {
    return fleet.filter(b=>passages.filter(p=>p.boatId===b.id).length===legNum-1);
  },[fleet,passages]);

  const getEffectiveRank = useCallback((legNum) => {
    const onLeg  = getBoatsOnLeg(legNum).map(b=>b.id);
    if(!onLeg.length) return [];
    const saved    = legRank[legNum] || [];
    const filtered = saved.filter(id=>onLeg.includes(id));
    const missing  = onLeg.filter(id=>!filtered.includes(id));
    return [...filtered,...missing];
  },[legRank,getBoatsOnLeg]);

  const moveInRank = useCallback((legNum,boatId,dir)=>{
    const current = getEffectiveRank(legNum);
    const idx     = current.indexOf(boatId);
    const swapIdx = dir==='up' ? idx-1 : idx+1;
    if(idx<0||swapIdx<0||swapIdx>=current.length) return;
    const next=[...current];
    [next[idx],next[swapIdx]]=[next[swapIdx],next[idx]];
    setLegRank(r=>({...r,[legNum]:next}));
  },[getEffectiveRank]);

  const computedLegRank = useMemo(()=>{
    const result={};
    for(let n=1;n<=6;n++){const r=getEffectiveRank(n);if(r.length)result[n]=r;}
    return result;
  },[getEffectiveRank]);

  const activeLegs = useMemo(()=>{
    const legs=new Set();
    fleet.forEach(b=>{const lc=passages.filter(p=>p.boatId===b.id).length;if(lc<6)legs.add(lc+1);});
    return [...legs].sort((a,b)=>a-b);
  },[fleet,passages]);

  const standings = useMemo(()=>computeStd(passages,startTime,fleet,course,activeRace?.scoringMode||state.champ?.scoringMode||DEFAULT_SCORING),[passages,startTime,fleet,course,activeRace,state.champ]);

  // ── Early return DESPUÉS de todos los hooks ─────────────────────────────
  if(!activeRace) return React.createElement("div",{style:{padding:20,color:T2,textAlign:"center"}},"Sin prueba activa. Crea una en Config.");

  // ── Variables derivadas ─────────────────────────────────────────────────
  const displayTime  = finishedAt?(finishedAt-startTime)/1000:startTime?Math.max(0,(now-startTime)/1000):0;
  const updRace      = fn=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?fn(r):r)}));
  const boatLeg      = id=>passages.filter(p=>p.boatId===id).length;
  const record = (id, offsetSec=0, explicitTime=null)=>{
    if(isEspectador)return;
    const nl=boatLeg(id)+1;
    if(nl>6||!started)return;
    // explicitTime: tiempo exacto pasado directamente (evita problema async de setCopyFromId)
    const refTime = explicitTime!==null
      ? explicitTime + offsetSec*1000
      : copyFromId
        ? (passages.filter(p=>p.boatId===copyFromId).sort((a,z)=>z.realTime-a.realTime)[0]?.realTime||Date.now()) + offsetSec*1000
        : Date.now() + offsetSec*1000;
    updRace(r=>({...r,passages:[...r.passages,{boatId:id,leg:nl,realTime:refTime,by:role}]}));
    setPend(null);
    if(copyFromId) setCopyFromId(null);
  };
  const adjustPassage=(boatId,legN,deltaMs)=>{
    updRace(r=>({...r,passages:r.passages.map(p=>p.boatId===boatId&&p.leg===legN?{...p,realTime:p.realTime+deltaMs}:p)}));
  };
  const undo         = ()=>updRace(r=>({...r,passages:r.passages.slice(0,-1),finishedAt:null}));

  // ── MARCAS RÁPIDAS: capturar tiempo ahora, asignar barco+boya después ──
  const legs = raceLegs(course);            // tramos de esta prueba (según vueltas)
  const marks = activeRace?.marks || [];
  // ¿cuántos pasos tiene un barco? (cuenta por boatId o por sailNo normalizado)
  const passCount = boatId => {
    const b = fleet.find(x=>x.id===boatId);
    const sn = cloud.normSail(b?.sailNo);
    return passages.filter(p => p.boatId===boatId || (sn && cloud.normSail(p.boatSailNo)===sn) || cloud.normSail(p.boatSailNo)===cloud.normSail(boatId)).length;
  };
  // siguiente boya que le toca a un barco = nº de pasos que ya tiene + 1
  const nextLeg = boatId => {
    const n = passCount(boatId);
    return n < legs.length ? n+1 : null;
  };
  const addMark = ()=>{
    if(!started) return;
    updRace(r=>({...r, marks:[...(r.marks||[]), {id:`m${Date.now()}`, time:Date.now()}]}));
  };
  const deleteMark = mid => updRace(r=>({...r, marks:(r.marks||[]).filter(m=>m.id!==mid)}));
  // asignar una marca a un barco → se registra en su SIGUIENTE boya automáticamente
  const assignMark = (mid, boatId)=>{
    const done = passCount(boatId);
    const leg = done+1;
    if(leg > legs.length) return; // ya llegó
    const b = fleet.find(x=>x.id===boatId);
    updRace(r=>{
      const mark = (r.marks||[]).find(m=>m.id===mid);
      if(!mark) return r;
      const passages = [...r.passages, {boatId, boatSailNo:b?.sailNo||boatId, leg, realTime:mark.time, by:role}];
      const remaining = (r.marks||[]).filter(m=>m.id!==mid);
      return {...r, passages, marks:remaining};
    });
  };

  const race         = activeRace; // alias para el resto del JSX
  const ldr          = standings.find(r=>r.ct!=null);
  const ownSt        = standings.find(r=>r.b.id===ownId);
  const own          = fleet.find(b=>b.id===ownId);
  // ── VOZ — usando parseVoiceInput mejorado ─────────────────────────────
  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voz no disponible en este dispositivo.");return;}
    vRef.current=true;
    const go=()=>{
      if(!vRef.current)return;
      const rec=new SR();
      rec.lang="es-ES";rec.continuous=false;rec.interimResults=false;
      rec.onresult=e=>{
        const t=e.results[0][0].transcript.trim();
        setHeard(t);
        const result=parseVoiceInput(t,fleet);
        if(result?.type==="confirmed") setPend({boat:result.boat,spoken:t});
        else if(result?.type==="ambiguous") setPend({matches:result.matches,spoken:t});
      };
      rec.onend=()=>{if(vRef.current)setTimeout(go,200);};
      rec.onerror=e=>{if(e.error!=="no-speech"&&vRef.current)setTimeout(go,500);else if(vRef.current)setTimeout(go,200);};
      rec.start();rRef.current=rec;
    };
    go();setVoiceOn(true);
  };
  const stopVoice=()=>{vRef.current=false;rRef.current?.stop();setVoiceOn(false);};

  // Auto-activar micrófono cuando la regata empieza
  useEffect(()=>{ if(started&&!allDone&&!voiceOn) startVoice(); },[started]);
  useEffect(()=>{ if(allDone) stopVoice(); },[allDone]);

  const byLeg={};fleet.forEach(b=>{const l=boatLeg(b.id);const k=l>=6?"fin":String(l);if(!byLeg[k])byLeg[k]=[];byLeg[k].push(b);});
  const legGroups=Object.entries(byLeg).sort((a,b)=>{if(a[0]==="fin")return 1;if(b[0]==="fin")return-1;return+b[0]-+a[0];});

  // Filtrar flota según rol del dispositivo
  const isEspectador = role==="espectador";
  const filteredFleet = useMemo(()=>{
    if(role==="barlovento") return fleet.filter(b=>{
      const lc=passages.filter(p=>p.boatId===b.id).length;
      const legType=lc<6?LEG_DEF[lc]?.type:null;
      return lc<6&&(legType==="beat"||legType==="reach");
    });
    if(role==="sotavento") return fleet.filter(b=>{
      const lc=passages.filter(p=>p.boatId===b.id).length;
      const legType=lc<6?LEG_DEF[lc]?.type:null;
      return lc<6&&legType==="run";
    });
    return fleet; // patron y espectador ven todos
  },[role,fleet,passages]);

  // Ordenar flota por número de proa para la cuadrícula
  const fleetByBow=[...filteredFleet].sort((a,b)=>(a.bowNum||99)-(b.bowNum||99));

  // Grupos de barcos por boya — para la vista # Proa
  const boyaGroups = useMemo(()=>{
    const groups = {};
    fleetByBow.forEach(b=>{
      const bPass = passages.filter(p=>p.boatId===b.id);
      const lc = bPass.length;
      const key = lc>=6 ? "fin" : String(lc);
      if(!groups[key]) groups[key]=[];
      const lastPassTime = bPass.length ? Math.max(...bPass.map(p=>p.realTime)) : Infinity;
      groups[key].push({b, lc, lastPassTime});
    });
    // Ordenar grupos: fin primero, luego por boya descendente
    const sorted = Object.entries(groups).sort(([a],[b])=>{
      if(a==="fin") return -1; if(b==="fin") return 1;
      return Number(b)-Number(a);
    });
    // Dentro de cada grupo: ordenar por tiempo de último paso (el que pasó antes va primero)
    sorted.forEach(([,boats])=>{
      boats.sort((a,z)=>a.lastPassTime - z.lastPassTime);
    });
    return sorted;
  },[fleetByBow, passages]);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",position:"relative"}}>
      <ConfirmDialog msg={confirm?.msg} onOk={()=>{confirm?.onOk();setConfirm(null);}} onCancel={()=>setConfirm(null)}/>

      {/* ── OVERLAY DE CONFIRMACIÓN — pantalla completa, fácil de pulsar ─ */}
      {pend&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.92)",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}} className="pop">
          {pend.boat ? (
            <>
              {/* Número de proa grande */}
              <div style={{width:110,height:110,borderRadius:20,background:pend.boat.color,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                <span style={{fontSize:54,fontWeight:900,color:isDark(pend.boat.color)?"#fff":"#000",lineHeight:1}}>
                  {pend.boat.bowNum||"?"}
                </span>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:T1,marginBottom:4,textAlign:"center"}}>{pend.boat.name}</div>
              <div style={{fontSize:13,color:T2,marginBottom:4}}>{pend.boat.sailNo}</div>
              <div style={{fontSize:13,color:LEG_DEF[boatLeg(pend.boat.id)]?.col||GLD,fontWeight:700,marginBottom:24}}>
                → {LEG_DEF[boatLeg(pend.boat.id)]?.mark||"FIN"}
              </div>
              {heard&&<div style={{fontSize:11,color:T2,marginBottom:16}}>🎙 «{heard}»</div>}
              <div style={{display:"flex",gap:12,width:"100%",maxWidth:280}}>
                <button onClick={()=>record(pend.boat.id)} style={{flex:1,padding:"18px 0",background:GRN,color:"#fff",borderRadius:14,fontSize:18,fontWeight:900,border:"none"}}>✓</button>
                <button onClick={()=>setPend(null)} style={{flex:1,padding:"18px 0",background:RED,color:"#fff",borderRadius:14,fontSize:18,fontWeight:900,border:"none"}}>✕</button>
              </div>
            </>
          ) : (
            <>
              <div style={{fontSize:14,color:GLD,marginBottom:6}}>🎙 «{pend.spoken}»</div>
              <div style={{fontSize:13,color:T2,marginBottom:16}}>¿Cuál barco?</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",width:"100%",maxWidth:320}}>
                {pend.matches.map(b=>(
                  <button key={b.id} onClick={()=>{record(b.id);setPend(null);}} style={{
                    width:80,height:80,borderRadius:14,background:b.color,
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"none"
                  }}>
                    <span style={{fontSize:28,fontWeight:900,color:isDark(b.color)?"#fff":"#000"}}>{b.bowNum||"?"}</span>
                    <span style={{fontSize:7,color:isDark(b.color)?"#fff":"#000",marginTop:2}}>{b.name.slice(0,6)}</span>
                  </button>
                ))}
                <button onClick={()=>setPend(null)} style={{width:80,height:80,borderRadius:14,background:T3,color:T1,fontSize:24,border:"none"}}>✕</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div style={{padding:"8px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div>
            {cdRemaining!=null
              ?<div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Mono v={ft(cdRemaining)} z={26} c={GLD}/>
                  <span style={{fontSize:10,color:GLD}}>⏳ cuenta atrás</span>
                </div>
              :<div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Mono v={ft(displayTime)} z={28} c={started?(allDone?GRN:CYN):T2}/>
                  {allDone&&<span style={{fontSize:10,color:GRN}}>🏁 FIN</span>}
                </div>
            }
            <div style={{fontSize:9,color:T2}}>{race.name}</div>
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            {!started&&!countdownAt&&<Btn v="Ya 🚀" onClick={()=>updRace(r=>({...r,startTime:Date.now(),countdownAt:null}))} c="grn" sm/>}
            {started&&!allDone&&(
              <button onClick={voiceOn?stopVoice:startVoice} style={{
                width:42,height:42,borderRadius:"50%",fontSize:20,border:"none",
                background:voiceOn?RED:ACC,
                boxShadow:voiceOn?`0 0 0 3px ${RED}55`:"none"
              }}>{voiceOn?"🎙":"🎤"}</button>
            )}
            {started&&!allDone&&<Btn v="↩" onClick={undo} c="dim" sm/>}
            {!started&&countdownAt&&<Btn v="Cancelar" onClick={()=>updRace(r=>({...r,countdownAt:null}))} c="red" sm/>}
          </div>
        </div>

        {/* Info de rol para no-patrón */}
        {role!=="patron"&&(
          <div style={{padding:"4px 8px",background:role==="espectador"?`${T3}`:role==="barlovento"?`${GRN}22`:`${CYN}22`,borderRadius:6,marginBottom:4,fontSize:10,color:role==="espectador"?T2:role==="barlovento"?GRN:CYN,fontWeight:700}}>
            {role==="espectador"&&"👁️ Modo espectador — solo lectura"}
          </div>
        )}

        <div style={{display:"flex",gap:4,marginTop:4}}>
          <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap"}}>
            {[["crono","⏱ Crono"],["asignar","📝 Asignar"],["std","📊 Clasi"],["comp","📋 Comparativa"]].map(([k,l])=>(
              <button key={k} onClick={()=>setSub(k)} style={{flex:1,minWidth:64,padding:"5px 3px",borderRadius:6,fontSize:10,fontWeight:700,background:sub===k?ACC:CARD2,color:sub===k?"#fff":T2,border:`1px solid ${sub===k?ACC:BDR}`}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>
        {/* Botón flotante de marcar tiempo — visible en TODAS las sub-pestañas durante la regata */}
        {started&&(
          <div style={{position:"sticky",top:0,zIndex:30,paddingBottom:8,background:`linear-gradient(to bottom, ${BG} 70%, transparent)`}}>
            <button onClick={addMark} style={{width:"100%",padding:"18px 0",borderRadius:14,background:ACC,color:"#fff",fontSize:19,fontWeight:900,border:"none",cursor:"pointer",boxShadow:`0 4px 16px ${ACC}66`,letterSpacing:.5}}>
              ⏱ MARCAR TIEMPO{marks.length>0?<span style={{display:"inline-block",background:GLD,color:"#000",borderRadius:10,padding:"1px 8px",fontSize:13,marginLeft:6}}>{marks.length}</span>:""}
            </button>
          </div>
        )}


        {/* ── BARCOS POR BOYA — toque directo, sin confirmación ────── */}
        {/* ── ⏱ CRONÓMETRO + MARCAR TIEMPO (vista principal en regata) ──── */}
        {sub==="crono"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"center",paddingTop:8}}>
            {/* Cronómetro grande */}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:T2,marginBottom:2}}>{started?"⛵ En regata":"Cuenta atrás / salida"}</div>
              <div style={{fontFamily:"monospace",fontWeight:900,fontSize:54,lineHeight:1,color:started?GRN:T1}}>
                {(()=>{
                  if(started){const s=Math.floor((now-startTime)/1000);const m=Math.floor(s/60),sc=s%60,h=Math.floor(m/60);return `${h>0?h+":":""}${(m%60).toString().padStart(2,"0")}:${sc.toString().padStart(2,"0")}`;}
                  if(countdownAt){const s=Math.ceil((countdownAt-now)/1000);if(s>0){const m=Math.floor(s/60),sc=s%60;return `-${m}:${sc.toString().padStart(2,"0")}`;}}
                  return "00:00";
                })()}
              </div>
            </div>

            {/* Controles de salida (solo antes de empezar; el botón de marcar es flotante) */}
            {!started && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                {[1,2,3,4,5].map(m=>(
                  <Btn key={m} v={`${m}'`} onClick={()=>updRace(r=>({...r,countdownAt:Date.now()+m*60000,startTime:null,finishedAt:null}))} c="dim"/>
                ))}
                <Btn v="🚀 SALIDA YA" onClick={()=>updRace(r=>({...r,startTime:Date.now(),countdownAt:null}))} c="grn"/>
              </div>
            )}

            {/* Contador de marcas sin asignar */}
            {started&&(
              <div style={{textAlign:"center",fontSize:13,color:T2}}>
                {marks.length>0
                  ? <><b style={{color:GLD,fontSize:18}}>{marks.length}</b> marca{marks.length!==1?"s":""} sin asignar — ve a <b style={{color:ACC}}>📝 Asignar</b></>
                  : "Usa el botón ⏱ de arriba cada vez que pasa un barco"}
              </div>
            )}

            {/* Controles de parar/reset */}
            {started&&(
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <Btn v="⏹ Parar" onClick={()=>setConfirm({msg:"¿Parar la prueba?",onOk:()=>updRace(r=>({...r,startTime:null,countdownAt:null}))})} c="red" sm/>
              </div>
            )}
          </div>
        )}

        {/* ── 📝 ASIGNAR: dar barco + boya a cada marca de tiempo ──────────── */}
        {sub==="asignar"&&(
          <div>
            {marks.length===0 ? (
              <div style={{textAlign:"center",padding:"30px 16px",background:CARD2,borderRadius:10,color:T2,fontSize:12,lineHeight:1.6}}>
                No hay marcas pendientes.<br/>
                <span style={{fontSize:10,color:T3}}>Ve a ⏱ Cronómetro y toca MARCAR TIEMPO cuando pase un barco.</span>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:11,color:T2,marginBottom:2}}>Asigna a cada tiempo su barco y boya. {marks.length} pendiente{marks.length!==1?"s":""}.</div>
                {marks.map((m,idx)=>(
                  <MarkAssign key={m.id} mark={m} idx={idx} fleet={fleet} startTime={startTime}
                    legs={legs} nextLeg={nextLeg}
                    onAssign={(boatId)=>assignMark(m.id,boatId)} onDelete={()=>deleteMark(m.id)}/>
                ))}
              </div>
            )}

            {/* Tiempos ya asignados (resumen, para editar/borrar) */}
            {passages.length>0&&(
              <div style={{marginTop:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:11,color:T2,fontWeight:700}}>✅ Tiempos asignados ({passages.length})</div>
                  <button onClick={()=>setConfirm({msg:"¿Borrar TODOS los tiempos de esta prueba? (no afecta a resultados oficiales)",onOk:()=>{
                      const rid=activeRace?.id;
                      updRace(r=>({...r,passages:[]}));
                      if(rid) cloud.clearRacePassages(state, rid).catch(()=>{});
                    }})}
                    style={{padding:"4px 9px",borderRadius:6,background:`${RED}18`,color:RED,fontSize:9,fontWeight:700,border:"none",cursor:"pointer"}}>
                    🗑 Limpiar todos
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[...passages].sort((a,z)=>z.realTime-a.realTime).map((p,i)=>{
                    const b=fleet.find(x=>x.id===p.boatId || cloud.normSail(x.sailNo)===cloud.normSail(p.boatSailNo) || cloud.normSail(x.sailNo)===cloud.normSail(p.boatId));
                    const el=startTime?Math.round((p.realTime-startTime)/1000):0;
                    const neg=el<0; const am=Math.abs(el); const mm=Math.floor(am/60),ss=am%60;
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:CARD2,borderRadius:7}}>
                        <div style={{width:8,height:24,borderRadius:2,background:b?.color||BDR,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:T1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b?.name||p.boatSailNo||p.boatId}</div>
                          <div style={{fontSize:9,color:neg?RED:T2}}>{legs[p.leg-1]?.label||`Boya ${p.leg}`} · {neg?"⚠ tiempo inválido":`${mm}:${ss.toString().padStart(2,"0")}`}</div>
                        </div>
                        <button onClick={()=>setConfirm({msg:`¿Borrar el paso de ${b?.name||"este barco"}?`,onOk:()=>updRace(r=>({...r,passages:r.passages.filter(x=>x!==p)}))})}
                          style={{padding:"4px 8px",borderRadius:5,background:`${RED}18`,color:RED,fontSize:11,border:"none",cursor:"pointer",flexShrink:0}}>🗑</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


        {/* ── 📊 CLASIFICACIÓN EN TIEMPO REAL ─────────────────────────────── */}
        {sub==="std"&&(
          <LiveStandings
            standings={standings} ldr={ldr} ownId={ownId} ownSt={ownSt}
            fleet={fleet} course={course} own={own} ownSt={ownSt}
            state={state} activeRace={activeRace} passages={passages} startTime={startTime}/>
        )}

        {sub==="comp"&&(
          <LiveComparativa
            fleet={fleet} passages={passages} startTime={startTime}
            legs={legs} ownId={ownId} course={course}/>
        )}
      </div>
    </div>
  );
}

// ── COMPARATIVA EN VIVO: real vs compensado por tramo (ToD), respecto al barco propio ──
function LiveComparativa({fleet, passages, startTime, legs, ownId, course}){
  const [refW, setRefW] = useState(course?.windKnots||14);
  const own = fleet.find(b=>b.id===ownId) || fleet[0];
  if(!startTime) return <div style={{textAlign:"center",padding:"30px 16px",background:CARD2,borderRadius:10,color:T2,fontSize:12}}>La prueba no ha empezado.</div>;
  if(!own) return <div style={{textAlign:"center",padding:"30px 16px",background:CARD2,borderRadius:10,color:T2,fontSize:12}}>Configura tu barco en Config.</div>;

  // tramos sin offset para mostrar en la tabla
  const compLegs = legs.filter(L=>L.kind!=="offset");

  // millas de un tramo según su tipo (ceñida=boya1, offset, popa=boya1+offset-gate, llegada≈popa)
  const distOfLeg = L=>{
    const m1=course?.mark1Dist??1.5, off=course?.mark1aDist??0.15, gate=course?.gateDist??0.3;
    if(L.kind==="beat")   return m1;
    if(L.kind==="offset") return off;
    if(L.kind==="run")    return Math.max(0.1, m1+off-gate);
    if(L.kind==="finish") return Math.max(0.1, m1+off-gate); // tramo final ≈ popa
    return m1;
  };
  // millas acumuladas desde salida hasta el final del tramo n (incluido)
  const cumDist = n=>{
    let d=0;
    for(const L of legs){ d+=distOfLeg(L); if(L.n===n) break; }
    return d;
  };

  // tiempo real (s desde salida) por barco y nº de tramo
  const realT = {};
  legs.forEach(L=>{ realT[L.n] = {};
    fleet.forEach(b=>{ const sn=cloud.normSail(b.sailNo); const p = passages.find(x=>x.leg===L.n && (x.boatId===b.id || (sn&&cloud.normSail(x.boatSailNo)===sn) || cloud.normSail(x.boatSailNo)===cloud.normSail(b.id)));
      if(p) realT[L.n][b.id] = (p.realTime-startTime)/1000; });
  });

  // tiempo COMPENSADO ToD = real − (ToD_s/milla × millas_acumuladas)
  const compT = (b, legN)=>{
    const real = realT[legN]?.[b.id]; if(real==null) return null;
    const tod = ratingToD(b, refW, "WL_ToD");  // s/milla según viento (curva real)
    if(tod==null) return real;                  // sin rating: sin corrección
    return real - tod*cumDist(legN);
  };

  const fmtDiff = sec => { const s=Math.round(sec); return s===0?"0s":(s<0?"":"+")+s+"s"; };
  const winds = WINDS; // vientos del certificado

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:11,color:T2}}>Viento:</span>
        <select value={refW} onChange={e=>setRefW(+e.target.value)}
          style={{background:CARD2,color:T1,border:`1px solid ${BDR}`,borderRadius:7,padding:"6px 10px",fontSize:12,width:"auto"}}>
          {winds.map(w=><option key={w} value={w}>{w} kt</option>)}
        </select>
      </div>
      <div style={{fontSize:10,color:GLD,fontWeight:700,marginBottom:8}}>⭐ Referencia: {own.bowNum?own.bowNum+" ":""}{own.name}</div>

      {/* Leyenda */}
      <div style={{background:CARD2,border:`1px solid ${BDR}`,borderRadius:9,padding:"9px 11px",marginBottom:10,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{minWidth:30,textAlign:"center",fontFamily:"monospace",fontWeight:800,fontSize:11,background:CARD,borderRadius:5,padding:"2px 4px",color:T1}}>12s</span>
          <span style={{fontSize:10,color:T2,lineHeight:1.3}}><b>Arriba:</b> tiempo REAL — diferencia de paso por la boya respecto a tu barco</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{minWidth:30,textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:10,background:CARD,borderRadius:5,padding:"2px 4px",color:T2}}>5s</span>
          <span style={{fontSize:10,color:T2,lineHeight:1.3}}><b>Abajo:</b> tiempo COMPENSADO — corregido por distancia (ToD) y viento</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:11,height:11,borderRadius:"50%",background:RED,flexShrink:0}}/>
          <span style={{fontSize:10,color:T2}}>Rojo = te sacó tiempo</span>
          <span style={{width:11,height:11,borderRadius:"50%",background:GRN,flexShrink:0,marginLeft:10}}/>
          <span style={{fontSize:10,color:T2}}>Verde = vas por delante</span>
        </div>
      </div>

      {/* Tabla */}
      <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:10,padding:6,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
          <thead><tr>
            <th style={{padding:"6px 4px",textAlign:"left",color:GLD,fontWeight:700,fontSize:9}}>Barco</th>
            {compLegs.map(L=><th key={L.n} style={{padding:"6px 4px",textAlign:"center",color:GLD,fontWeight:700,fontSize:9,whiteSpace:"nowrap"}}>{L.label}</th>)}
          </tr></thead>
          <tbody>
            {fleet.filter(b=>b.id!==ownId).map(b=>(
              <tr key={b.id}>
                <td style={{padding:"5px 4px",textAlign:"left",fontWeight:700,fontSize:10,color:T1,whiteSpace:"nowrap"}}>
                  <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:b.color||T3,marginRight:4}}/>
                  {b.bowNum?b.bowNum+" ":""}{b.name}
                </td>
                {compLegs.map(L=>{
                  const tOwn = realT[L.n]?.[ownId], tRiv = realT[L.n]?.[b.id];
                  if(tOwn==null||tRiv==null) return <td key={L.n} style={{padding:"5px 4px",textAlign:"center",color:T3,fontFamily:"monospace"}}>—</td>;
                  const realDiff = tRiv - tOwn;
                  const cOwn = compT(own, L.n), cRiv = compT(b, L.n);
                  const compDiff = (cRiv!=null&&cOwn!=null) ? (cRiv - cOwn) : null;
                  const colR = realDiff<0?RED:realDiff>0?GRN:T2;
                  const colC = compDiff==null?T3:compDiff<0?RED:compDiff>0?GRN:T2;
                  return(
                    <td key={L.n} style={{padding:"5px 4px",textAlign:"center",fontFamily:"monospace",lineHeight:1.35}}>
                      <div style={{fontSize:11,fontWeight:700,color:colR}}>{fmtDiff(realDiff)}</div>
                      <div style={{fontSize:10,color:colC}}>{compDiff==null?"—":fmtDiff(compDiff)}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:9,color:T3,textAlign:"center",padding:"8px 0",lineHeight:1.5}}>
        Arriba real · abajo compensado por distancia (ToD del certificado ORC a {refW} kt).<br/>
        Si en real te sacan 10s pero compensado solo 5s, su ventaja real es menor.
      </div>
    </div>
  );
}

// ── TABLA DE TIEMPOS — permite ver y copiar tiempos por boya ────────────────
function TimingTable({passages, fleet, startTime, onAdjust, isEspectador, record, setCopyFromId}){
  const [pendingCell, setPendingCell] = useState(null); // {boatId, leg} — celda vacía tocada
  const [photoDb, setPhotoDb] = useState({});

  useEffect(()=>{ loadPhotoDb().then(d=>setPhotoDb(d||{})); },[]);

  const getPhoto = b => {
    const k = b.sailNo||b.id;
    return loadLocalPhoto(k,"beat") || photoDb[k]?.beat || b.photoUrlBeat || null;
  };

  const fmt = t => t ? new Date(t).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : null;
  const fmtEl = (t,s) => {
    if(!t||!s) return "";
    const sec=Math.round((t-s)/1000), m=Math.floor(sec/60), sc=sec%60;
    return `${m}:${sc.toString().padStart(2,"0")}`;
  };

  const legLabels = ["","1 Barlov","1a Off","Puerta","1 (2ª)","1a (2ª)","Llegada"];

  // Ordenar por posición en carrera: más boyas pasadas primero, luego por tiempo
  const sortedFleet = useMemo(()=>{
    return [...fleet].sort((a,b)=>{
      const pA = passages.filter(p=>p.boatId===a.id), pB = passages.filter(p=>p.boatId===b.id);
      if(pA.length !== pB.length) return pB.length - pA.length;
      if(!pA.length) return (a.bowNum||99)-(b.bowNum||99);
      const lastA = Math.max(...pA.map(p=>p.realTime));
      const lastB = Math.max(...pB.map(p=>p.realTime));
      return lastA - lastB;
    });
  },[fleet, passages]);

  // Barcos que ya pasaron una boya específica
  const passedLeg = leg => sortedFleet.filter(b => passages.some(p=>p.boatId===b.id && p.leg===leg))
    .map(b=>({ b, p: passages.find(pp=>pp.boatId===b.id && pp.leg===leg) }))
    .sort((a,z)=>a.p.realTime - z.p.realTime);

  return(
    <div>
      {/* Panel selector — aparece al tocar celda vacía */}
      {pendingCell&&(()=>{
        const targetBoat = fleet.find(b=>b.id===pendingCell.boatId);
        const sources    = passedLeg(pendingCell.leg);
        return(
          <div style={{position:"sticky",top:0,zIndex:20,background:`${BG}f4`,backdropFilter:"blur(8px)",
            padding:"10px 12px",marginBottom:10,borderRadius:10,border:`2px solid ${ACC}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:10,height:10,borderRadius:3,background:targetBoat?.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T2}}>Registrar paso de</div>
                <div style={{fontSize:13,fontWeight:800,color:T1}}>{targetBoat?.name} · {legLabels[pendingCell.leg]}</div>
              </div>
              <button onClick={()=>setPendingCell(null)}
                style={{padding:"4px 10px",borderRadius:7,background:T3,color:"#fff",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:10,color:T2,marginBottom:6}}>Copiar tiempo de:</div>
            {sources.length===0
              ? <div style={{fontSize:10,color:T3,padding:"8px 0"}}>Ningún barco ha pasado {legLabels[pendingCell.leg]} todavía</div>
              : <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {sources.map(({b,p})=>{
                    const photo = getPhoto(b);
                    return(
                      <div key={b.id} style={{background:CARD2,borderRadius:8,border:`1px solid ${b.color}66`,overflow:"hidden"}}>
                        {/* Fila principal del barco fuente */}
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px"}}>
                          {/* Mini foto */}
                          <div style={{width:40,height:30,borderRadius:5,overflow:"hidden",background:CARD,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {photo
                              ?<img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={b.name}/>
                              :<BoatIcon b={b} size={28}/>
                            }
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:700,color:T1}}>{b.name}</div>
                            <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:GLD}}>{fmt(p.realTime)}</div>
                          </div>
                          {/* Botón copiar igual */}
                          <button onClick={()=>{
                            record(pendingCell.boatId, 0, p.realTime);
                            setPendingCell(null);
                          }} style={{padding:"6px 12px",borderRadius:7,background:GRN,color:"#fff",fontSize:11,fontWeight:800,border:"none",cursor:"pointer"}}>
                            = Igual
                          </button>
                        </div>
                        {/* Botones de offset */}
                        <div style={{display:"flex",borderTop:`1px solid ${BDR}`}}>
                          {[-3,-2,-1,1,2,3].map(s=>(
                            <button key={s} onClick={()=>{
                              record(pendingCell.boatId, s, p.realTime);
                              setPendingCell(null);
                            }}
                              style={{flex:1,padding:"5px 0",background:s<0?`${CYN}22`:`${RED}22`,color:s<0?CYN:RED,fontSize:10,fontWeight:700,border:"none",borderRight:`1px solid ${BDR}`,cursor:"pointer"}}>
                              {s>0?`+${s}s`:`${s}s`}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        );
      })()}

      {/* Tabla */}
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",fontSize:9,width:"100%"}}>
          <thead>
            <tr style={{background:CARD2}}>
              <th style={{padding:"5px 6px",textAlign:"left",color:T1,fontWeight:700,
                position:"sticky",left:0,background:CARD2,zIndex:2,whiteSpace:"nowrap"}}>Barco</th>
              {[1,2,3,4,5,6].map(l=>(
                <th key={l} style={{padding:"5px 8px",textAlign:"center",color:GLD,
                  fontWeight:700,whiteSpace:"nowrap",minWidth:80}}>{legLabels[l]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedFleet.map((b,ri)=>{
              const bPass  = passages.filter(p=>p.boatId===b.id).sort((a,z)=>a.leg-z.leg);
              const bLeg   = bPass.length;
              const isOwn  = b.own;
              const photo  = getPhoto(b);
              const rowBg  = isOwn?`${b.color}18`:ri%2===0?CARD2:CARD;
              return(
                <tr key={b.id} style={{background:rowBg,borderBottom:`1px solid ${BDR}`}}>
                  {/* Columna nombre con foto */}
                  <td style={{padding:"3px 5px",position:"sticky",left:0,background:rowBg,zIndex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {/* Mini foto ceñida */}
                      <div style={{width:32,height:24,borderRadius:4,overflow:"hidden",background:CARD,
                        flexShrink:0,border:`1px solid ${b.color}66`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {photo
                          ?<img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={b.name}
                              onError={e=>e.target.style.display="none"}/>
                          :<BoatIcon b={b} size={20}/>
                        }
                      </div>
                      <div>
                        <div style={{fontSize:8,color:T3}}>{b.bowNum}</div>
                        <div style={{fontSize:9,fontWeight:700,color:isOwn?b.color:T1,
                          maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {b.name.split(" ").slice(-1)[0]}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Celdas por boya */}
                  {[1,2,3,4,5,6].map(leg=>{
                    const p     = bPass.find(pp=>pp.leg===leg);
                    const prevT = leg===1 ? startTime : bPass.find(pp=>pp.leg===leg-1)?.realTime;
                    const isNext = !p && bLeg===leg-1; // siguiente boya pendiente
                    const isPending = pendingCell?.boatId===b.id && pendingCell?.leg===leg;
                    return(
                      <td key={leg} style={{padding:"3px 4px",textAlign:"center",
                        background:isPending?`${ACC}33`:"",verticalAlign:"middle",minWidth:80}}>
                        {p ? (
                          // Tiempo registrado
                          <div>
                            <div style={{fontFamily:"monospace",fontSize:10,fontWeight:700,color:T1,lineHeight:1.2}}>
                              {fmt(p.realTime)}
                            </div>
                            {prevT&&<div style={{fontFamily:"monospace",fontSize:8,color:T3,marginBottom:2}}>
                              +{fmtEl(p.realTime,prevT)}
                            </div>}
                            {!isEspectador&&(
                              <div style={{display:"flex",gap:1,justifyContent:"center"}}>
                                {[-3,-1,1,3].map(s=>(
                                  <button key={s} onClick={()=>onAdjust(b.id,leg,s*1000)}
                                    style={{padding:"1px 3px",borderRadius:3,
                                      background:s<0?`${CYN}22`:`${RED}22`,
                                      color:s<0?CYN:RED,fontSize:7,border:`1px solid ${BDR}`,cursor:"pointer"}}>
                                    {s>0?`+${s}`:s}s
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : isNext && !isEspectador ? (
                          // Celda pendiente — toca para copiar tiempo
                          <button onClick={()=>setPendingCell({boatId:b.id, leg})}
                            style={{width:"100%",padding:"5px 0",borderRadius:6,
                              background:isPending?ACC:`${T3}22`,color:isPending?"#fff":T3,
                              fontSize:9,border:`1px dashed ${isPending?ACC:T3}`,cursor:"pointer",fontWeight:700}}>
                            {isPending?"✓":"⏱ copiar"}
                          </button>
                        ) : (
                          <span style={{fontSize:9,color:`${T3}66`}}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!pendingCell&&(
        <div style={{fontSize:9,color:T3,marginTop:6,padding:"4px 8px",lineHeight:1.5}}>
          💡 Toca <strong style={{color:T1}}>⏱ copiar</strong> en la celda de un barco para ver qué tiempos puedes copiarle · Los botones <span style={{color:CYN}}>−3s</span>/<span style={{color:RED}}>+3s</span> ajustan tiempos ya registrados
        </div>
      )}
    </div>
  );
}

// ── CLASIFICACIÓN EN TIEMPO REAL — Prueba + Campeonato ──────────────────────
function LiveStandings({standings, ldr, ownId, ownSt, fleet, course, own, state, activeRace, passages, startTime}){
  const [view, setView] = useState("prueba"); // "prueba" | "campeonato"

  // Clasificación de campeonato en tiempo real CON descartes
  const champStandings = useMemo(()=>{
    const orcSt = state.champ?.orcStandings||[];
    if(!orcSt.length) return [];
    const racePos = {};
    standings.filter(s=>s.ct!=null).forEach((s,i)=>{ racePos[s.b?.id]=i+1; });
    const dEvery = state.champ?.discardEvery ?? 4;
    const dMin   = state.champ?.discardMin ?? 4;
    // no-descartables: marcadas a nivel campeonato por índice de prueba oficial
    const ndOfficial = state.champ?.ndRaces || [];
    const liveRunning = !!startTime;

    const rows = orcSt.map(s=>{
      const fleetB = fleet.find(b=>
        b.sailNo===s.sailNo ||
        b.name?.toLowerCase()===s.boat?.toLowerCase() ||
        b.name?.toLowerCase().includes((s.boat||"").toLowerCase().split(" ").slice(-1)[0])
      );
      // puntos por prueba oficiales (breakdown). Convertir "16 DNF" etc. a su número.
      const breakdown = (s.breakdown||[]).map(p=>{
        if(typeof p==="number") return p;
        const m = String(p).match(/[\d.]+/); return m?Number(m[0]):0;
      });
      // prueba en curso (si la hay): posición provisional de este barco
      const rPos = fleetB ? racePos[fleetB.id] : null;
      const racesArr = breakdown.map((pts,i)=>({pts, nonDiscardable: ndOfficial.includes(i)}));
      if(liveRunning && rPos) racesArr.push({pts:rPos, nonDiscardable:false});
      const { total, discardedIdx, counted } = applyDiscards(racesArr, dEvery, dMin);
      return {...s, fleetB, rPos, breakdownNums:breakdown, livePts: (liveRunning&&rPos)||null,
              total, discardedIdx, counted, racesArr};
    }).sort((a,b)=>a.total-b.total);
    return rows;
  // eslint-disable-next-line
  },[state.champ?.orcStandings, state.champ?.discardEvery, state.champ?.discardMin, state.champ?.ndRaces, state.races, standings, fleet, startTime]);

  const isOwn = b => b?.id===ownId||b?.sailNo===fleet.find(x=>x.id===ownId)?.sailNo;

  return(
    <div>
      {/* Sub-tabs prueba / campeonato */}
      <div style={{display:"flex",gap:3,marginBottom:8}}>
        {[["prueba","🏁 Prueba actual"],["campeonato","🏆 Campeonato"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)}
            style={{flex:1,padding:"7px 0",borderRadius:7,fontSize:11,fontWeight:700,
              background:view===k?ACC:CARD2,color:view===k?"#fff":T2,border:`1px solid ${view===k?ACC:BDR}`}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── PRUEBA ACTUAL ── */}
      {view==="prueba"&&(<>
        {!startTime&&<div style={{textAlign:"center",padding:16,color:T3,fontSize:11}}>La prueba no ha empezado todavía</div>}
        {standings.map((r,i)=>{
          const dL = r.ct!=null&&ldr&&r.b.id!==ldr.b.id ? r.ct-ldr.ct : null;
          const dO = r.ct!=null&&ownSt?.ct!=null&&r.b.id!==ownId ? r.ct-ownSt.ct : null;
          const io = r.b.id===ownId;
          const hasTime = r.ct!=null;
          return(
            <div key={r.b.id} className={hasTime?"pop":""} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
              background:hasTime?(io?`${r.b.color}18`:CARD):"transparent",borderRadius:8,marginBottom:3,
              borderLeft:`3px solid ${hasTime?(i===0?GLD:i===1?"#9ca3af":i===2?"#92400e":r.b.color):BDR}`,opacity:hasTime?1:.35}}>
              <span style={{fontFamily:"monospace",fontSize:14,fontWeight:800,width:24,color:i===0&&hasTime?GLD:T2}}>{hasTime?i+1:"·"}</span>
              <div style={{width:8,height:8,borderRadius:2,background:r.b.color,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:io?13:12,fontWeight:700,color:io?r.b.color:T1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                  {r.b.name}{io?" ⭐":""}
                </div>
                <div style={{fontSize:8,color:T2}}>{r.b.bowNum&&`Proa ${r.b.bowNum} · `}{LEG_DEF[Math.max(0,r.leg-1)]?.label||"En salida"}</div>
              </div>
              {hasTime&&(
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"monospace",fontSize:io?13:11,fontWeight:700,color:io?r.b.color:CYN}}>{ft(r.ct)}</div>
                  {dL!=null&&<div style={{fontFamily:"monospace",fontSize:9,color:T3}}>{ft(dL,true)}</div>}
                  {!io&&ownSt?.ct!=null&&dO!=null&&<div style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:dO>0?GRN:RED}}>{ft(dO,true)}</div>}
                  {i===0&&<div style={{fontSize:8,color:GLD,fontWeight:700}}>LÍDER</div>}
                </div>
              )}
            </div>
          );
        })}
      </>)}

      {/* ── CAMPEONATO EN TIEMPO REAL ── */}
      {view==="campeonato"&&(<>
        {!champStandings.length ? (
          <div style={{textAlign:"center",padding:20,color:T3,fontSize:11}}>
            Sin datos del campeonato.<br/>
            <span style={{fontSize:10}}>Ve a 🏠 Inicio → 🔄 Sincronizar con ORC</span>
          </div>
        ) : (<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:10,color:T2}}>
              <span style={{color:GLD,fontWeight:700}}>{champStandings[0]?.breakdown?.length||0}</span> pruebas
            </span>
            {startTime&&<span style={{fontSize:10,color:GRN,fontWeight:700}}>
              ⚡ P{(champStandings[0]?.breakdown?.length||0)+1} en curso
            </span>}
          </div>

          <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${BDR}`}}>
            <table style={{borderCollapse:"collapse",fontSize:9,width:"100%",
              minWidth:Math.max(320,180+((champStandings[0]?.breakdown?.length||0)+1)*36)}}>
              <thead>
                <tr style={{background:CARD2}}>
                  <th style={{padding:"5px 4px",textAlign:"center",color:T2,width:26}}>#</th>
                  <th style={{padding:"5px 3px",textAlign:"center",color:T2,width:24}}>Nac</th>
                  <th style={{padding:"5px 6px",textAlign:"left",color:T1,fontWeight:700,minWidth:90}}>Barco</th>
                  {(champStandings[0]?.breakdown||[]).map((_,i)=>(
                    <th key={i} style={{padding:"5px 4px",textAlign:"center",color:GLD,fontWeight:700,width:34}}>
                      R{i+1}{(state.champ?.ndRaces||[]).includes(i)?<span style={{color:GLD}}> 🔒</span>:""}
                    </th>
                  ))}
                  {startTime&&(
                    <th style={{padding:"5px 4px",textAlign:"center",color:GRN,fontWeight:800,width:38,
                      background:`${GRN}15`,borderBottom:`2px solid ${GRN}`}}>
                      R{(champStandings[0]?.breakdown?.length||0)+1}*
                    </th>
                  )}
                  <th style={{padding:"5px 6px",textAlign:"right",color:T1,fontWeight:800,width:46}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {champStandings.map((s,idx)=>{
                  const isOwn = s.fleetB?.id===ownId;
                  const bg = isOwn?`${GLD}22`:idx%2===0?CARD2:CARD;
                  const medal = idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":null;
                  const newPos = idx+1; // posición con prueba actual incluida
                  return(
                    <tr key={s.sailNo||idx} style={{background:bg,borderBottom:`1px solid ${BDR}`}}>
                      <td style={{padding:"6px 4px",textAlign:"center",fontWeight:800,fontSize:12,
                        color:idx===0?GLD:idx===1?"#c0c0c0":idx===2?"#cd7f32":T2}}>
                        {medal||newPos}
                      </td>
                      <td style={{padding:"6px 3px",textAlign:"center",fontSize:8,color:T2,fontWeight:600}}>
                        {s.nation||"—"}
                      </td>
                      <td style={{padding:"6px 6px",fontWeight:isOwn?800:500,color:isOwn?GLD:T1,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:110}}>
                        {s.boat||s.sailNo||"—"}{isOwn?" ⭐":""}
                      </td>
                      {(s.breakdown||[]).map((pts,i)=>{
                        const bad = String(pts).includes("DNC")||String(pts).includes("RET")||String(pts).includes("DSQ");
                        const isDiscarded = (s.discardedIdx||[]).includes(i);
                        return(
                          <td key={i} style={{padding:"6px 4px",textAlign:"center",fontFamily:"monospace",
                            fontSize:9,color:isDiscarded?T3:pts===1||pts==="1.00"?GRN:bad?RED:T2,
                            textDecoration:isDiscarded?"line-through":"none",opacity:isDiscarded?0.6:1}}>
                            {pts}
                          </td>
                        );
                      })}
                      {startTime&&(
                        <td style={{padding:"6px 4px",textAlign:"center",fontFamily:"monospace",
                          fontWeight:800,fontSize:11,background:`${GRN}11`,
                          color:s.rPos===1?GLD:s.rPos!=null?GRN:T3,
                          textDecoration:(s.discardedIdx||[]).includes((s.breakdown||[]).length)?"line-through":"none"}}>
                          {s.rPos!=null ? s.rPos : "—"}
                        </td>
                      )}
                      <td style={{padding:"6px 6px",textAlign:"right",fontWeight:800,
                        fontFamily:"monospace",fontSize:12,color:isOwn?GLD:T1}}>
                        {s.total ?? s.totalPts ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {startTime&&<div style={{fontSize:9,color:T3,marginTop:5}}>
            * Posición actual en la prueba en curso — actualiza en tiempo real
          </div>}
          {(state.champ?.discardEvery>0) && (champStandings[0]?.discardedIdx?.length>0) && (
            <div style={{fontSize:9,color:T3,marginTop:4}}>
              Pruebas <span style={{textDecoration:"line-through"}}>tachadas</span> = descartes aplicados (1 cada {state.champ.discardEvery} pruebas, desde {state.champ.discardMin}).
            </div>
          )}
        </>)}
      </>)}
    </div>
  );
}

function TabTablas({state,race}){
  const course=race?.course||DCOURSE;
  const [refW,setRefW]=useState(course.windKnots||14);
  const [mode,setMode]=useState("tabla");
  const own=state.fleet.find(b=>b.id===state.champ.ownId);
  const sMode=race?.scoringMode||state.champ.scoringMode||DEFAULT_SCORING;
  const ld=n=>legDist(n,course);

  // Comparativa: calcular diferencias totales y ordenar por mayor ventaja primero
  const rivals = useMemo(()=>{
    if(!hasValidRating(own,sMode)) return [];
    const ov=vpp(own,refW,sMode);
    return state.fleet.filter(b=>hasValidRating(b,sMode)&&b.id!==own.id).map(b=>{
      const bv=vpp(b,refW,sMode);
      const dB1   = ov.beat *ld(1)-bv.beat *ld(1);
      const dR1   = ov.reach*ld(2)-bv.reach*ld(2);
      const dRun1 = ov.run  *ld(3)-bv.run  *ld(3);
      const dBTotal  = dB1  *2;
      const dRTotal  = dR1  *2;
      const dRunTotal= dRun1*2;
      const dT = dBTotal+dRTotal+dRunTotal;
      return {b, dB1, dR1, dRun1, dBTotal, dRTotal, dRunTotal, dT};
    }).sort((a,z)=>z.dT-a.dT);
  },[own, refW, state.fleet, course, sMode]);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        <div style={{display:"flex",gap:4}}>{[["tabla","📋 Tabla"],["comparativa","🆚 Comparativa"]].map(([k,l])=><button key={k} onClick={()=>setMode(k)} style={{flex:1,padding:"6px 3px",borderRadius:7,fontSize:12,fontWeight:700,background:mode===k?ACC:CARD2,color:mode===k?"#fff":T2,border:`1px solid ${mode===k?ACC:BDR}`}}>{l}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {WINDS.map(w=><button key={w} onClick={()=>setRefW(w)} style={{padding:"4px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:refW===w?GLD:CARD2,color:refW===w?"#000":T2,border:`1px solid ${refW===w?GLD:BDR}`}}>{w}kts</button>)}
        </div>
        {mode==="tabla"&&[...state.fleet.filter(b=>hasValidRating(b,sMode))].sort((a,z)=>ratingToD(a,refW,sMode)-ratingToD(z,refW,sMode)).map(b=>{
          const v=vpp(b,refW,sMode),total=(v.beat*ld(1)+v.reach*ld(2)+v.run*ld(3))*2,isOwn=b.id===state.champ.ownId;
          // El certificado ORC requiere un ID interno que cambia anualmente
          // Google siempre encuentra el certificado correcto
          const boatShortName = b.name.replace(/^[A-Z]+\s+/,''); // quitar sponsor (VITHAS URBANIA → URBANIA)
          const googleUrl = `https://www.google.com/search?q=ORC+certificate+"${encodeURIComponent(boatShortName)}"+"${encodeURIComponent(b.sailNo||'')}"`;
          const country = b.sailNo?.match(/^([A-Z]+)/)?.[1]||'ESP';
          const orcDirectUrl = `https://data.orc.org/public/WPub.dll?action=activecerts&CountryId=${country}&SailNo=${encodeURIComponent(b.sailNo||'')}`;          return(
            <Card key={b.id} st={{marginBottom:8}} glow={isOwn?b.color:null}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <div style={{width:24,height:24,borderRadius:5,background:b.hullColor||b.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:10,fontWeight:900,color:isDark(b.hullColor||b.color)?"#fff":"#000"}}>{b.bowNum||"?"}</span>
                </div>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,fontWeight:700,color:isOwn?b.color:T1}}>{b.name}{isOwn?" ⭐":""}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:1}}>
                    <span style={{fontSize:9,color:CYN,fontFamily:"monospace",fontWeight:700}}>{scoringMode(sMode).label} {ratingToD(b,refW,sMode)?.toFixed(1)??"—"}</span>
                    <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:ACC,fontWeight:700}}>🔍 Certificado ORC →</a>
                    <a href={orcDirectUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:T3}}>data.orc.org</a>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5,marginBottom:7}}>
                {[[GLD,"↑ Ceñida",ft(v.beat*ld(1))],[PRP,"↔ Través",ft(v.reach*ld(2))],[CYN,"↓ Empopada",ft(v.run*ld(3))],[T1,"🏁 Total",ft(total)]].map(([c,l,val])=>(
                  <div key={l} style={{textAlign:"center",background:CARD2,borderRadius:7,padding:"6px 4px"}}>
                    <div style={{fontSize:7,color:c,marginBottom:2}}>{l}</div>
                    <Mono v={val} z={11} c={c}/>
                  </div>
                ))}
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{fontSize:9,borderCollapse:"collapse",width:"100%"}}>
                  <thead><tr style={{color:T2}}><td style={{padding:"2px 3px"}}>kts</td>{WINDS.map(w=><td key={w} style={{padding:"2px 4px",textAlign:"center",color:w===refW?GLD:T2,fontWeight:w===refW?700:400}}>{w}</td>)}</tr></thead>
                  <tbody>
                    {[["↑",GLD,"beat",1],["↔",PRP,"reach",2],["↓",CYN,"run",3]].map(([sym,col,type,n])=>(
                      <tr key={type}>
                        <td style={{color:col,padding:"2px 3px"}}>{sym}</td>
                        {WINDS.map(w=>{const val=vpp(b,w,sMode)[type]*ld(n);return <td key={w} style={{padding:"2px 4px",textAlign:"center",fontFamily:"monospace",color:w===refW?col:T1,background:w===refW?`${col}18`:""}}>{ft(val)}</td>;})}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {mode==="comparativa"&&!hasValidRating(own,sMode)&&<div style={{color:T2,textAlign:"center",padding:"20px 0"}}>Sube el certificado ORC de tu barco en Config para ver la comparativa</div>}
        {mode==="comparativa"&&hasValidRating(own,sMode)&&(
          <>
            <div style={{padding:"8px 10px",background:CARD2,borderRadius:8,marginBottom:12,fontSize:10,color:T2,lineHeight:1.6}}>
              Diferencia total de carrera vs <strong style={{color:own.color}}>{own.name}</strong> a {refW}kts · {(totalDist(course)).toFixed(2)}nm<br/>
              <span style={{color:GRN}}>Verde = llegas antes</span> · <span style={{color:RED}}>Rojo = llegan antes</span> · Ordenado: más ventaja primero
            </div>
            {rivals.map(({b,dB1,dR1,dRun1,dBTotal,dRTotal,dRunTotal,dT},idx)=>(
              <Card key={b.id} st={{marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:28,height:28,borderRadius:7,background:b.hullColor||b.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:900,color:isDark(b.hullColor||b.color)?"#fff":"#000"}}>{b.bowNum||idx+1}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:T1}}>{b.name}</div>
                    <div style={{fontSize:9,color:T2}}>{scoringMode(sMode).label} {ratingToD(b,refW,sMode)?.toFixed(1)??"—"} · {b.cls}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:8,color:T2}}>Total carrera</div>
                    <Mono v={ft(Math.abs(dT))} z={15} c={dT>0?GRN:dT<0?RED:T2}/>
                    <div style={{fontSize:9,color:dT>0?GRN:dT<0?RED:T2,fontWeight:700}}>{dT>0?"te dan":"les das"}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                  {[[GLD,"Ceñidas ×2",dBTotal,dB1],[PRP,"Través ×2",dRTotal,dR1],[CYN,"Empopadas ×2",dRunTotal,dRun1]].map(([col,lbl,dTotal,dPer])=>(
                    <div key={lbl} style={{textAlign:"center",background:CARD2,borderRadius:7,padding:"5px 3px"}}>
                      <div style={{fontSize:7,color:col,marginBottom:1}}>{lbl}</div>
                      <Mono v={ft(Math.abs(dTotal))} z={11} c={T1}/>
                      <div style={{fontSize:7,color:dTotal>0?GRN:dTotal<0?RED:T2,fontWeight:700,marginTop:1}}>{dTotal>0?"antes":"después"}</div>
                      <div style={{fontSize:7,color:T3,marginTop:1}}>{ft(Math.abs(dPer))}/tramo</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function StandingsTable({standings, ownBoat, ndRaces=[]}){
  if(!standings?.length) return null;
  const numRaces = Math.max(...standings.map(s=>s.breakdown?.length||0));
  const races = Array.from({length:numRaces},(_,i)=>i);
  return(
    <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${BDR}`}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:Math.max(380,200+numRaces*48)}}>
        <thead>
          <tr style={{background:CARD2}}>
            <th style={{padding:"6px 8px",textAlign:"center",color:T2,fontWeight:700,width:30}}>#</th>
            <th style={{padding:"6px 6px",textAlign:"left",color:T2,fontWeight:700}}>Nac</th>
            <th style={{padding:"6px 6px",textAlign:"left",color:T1,fontWeight:700,minWidth:120}}>Barco</th>
            <th style={{padding:"6px 6px",textAlign:"left",color:T2,fontWeight:700}}>Vela</th>
            <th style={{padding:"6px 4px",textAlign:"center",color:T2,fontWeight:700,width:35}}>Proa</th>
            <th style={{padding:"6px 6px",textAlign:"left",color:T2,fontWeight:700}}>Tipo</th>
            {races.map(i=>(
              <th key={i} style={{padding:"6px 8px",textAlign:"center",color:GLD,fontWeight:700,width:42}}>R{i+1}{ndRaces.includes(i)?" 🔒":""}</th>
            ))}
            <th style={{padding:"6px 8px",textAlign:"right",color:GRN,fontWeight:700,width:50}}>Total</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s,idx)=>{
            const isOwn = ownBoat && (
              s.sailNo===ownBoat.sailNo ||
              s.boat?.toLowerCase().includes((ownBoat.name||"").toLowerCase().split(" ")[0]) ||
              (ownBoat.name||"").toLowerCase().includes((s.boat||"").toLowerCase().split(" ")[0])
            );
            const bg = isOwn ? `${GLD}22` : idx%2===0 ? CARD2 : CARD;
            return(
              <tr key={idx} style={{background:bg,borderBottom:`1px solid ${BDR}`}}>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,fontSize:12,color:idx===0?GLD:idx===1?"#c0c0c0":idx===2?"#cd7f32":T1}}>
                  {idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":s.pos||idx+1}
                </td>
                <td style={{padding:"7px 6px",fontSize:9,color:T2,fontWeight:500}}>{s.nation||"—"}</td>
                <td style={{padding:"7px 6px",fontWeight:isOwn?800:500,color:isOwn?GLD:T1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>
                  {s.boat||s.sailNo||"—"}
                </td>
                <td style={{padding:"7px 6px",fontSize:9,color:T2,whiteSpace:"nowrap"}}>{s.sailNo}</td>
                <td style={{padding:"7px 4px",textAlign:"center",fontSize:9,color:T2}}>{s.bowNum||"—"}</td>
                <td style={{padding:"7px 6px",fontSize:9,color:T2,whiteSpace:"nowrap"}}>{s.cls||"—"}</td>
                {races.map(i=>{
                  const pts = s.breakdown?.[i];
                  const isDisc = s.discarded?.[i];
                  const bad = typeof pts === "string" && (pts.includes("DNC")||pts.includes("RET")||pts.includes("DSQ"));
                  return(
                    <td key={i} style={{padding:"7px 8px",textAlign:"center",fontFamily:"monospace",fontSize:10,
                      color:pts===1||pts==="1.00"?GRN:bad?RED:T1,
                      background:isDisc?`${T3}33`:"transparent",
                      textDecoration:isDisc?"line-through":"none"}}>
                      {pts!=null?pts:"—"}
                    </td>
                  );
                })}
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:isOwn?GLD:T1,fontFamily:"monospace",fontSize:11}}>
                  {s.totalPts||s.total||"—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TabResultados({state,setState}){
  const [view,setView]   = useState("oficial");
  const [syncing,setSyncing] = useState(false);
  const [syncMsg,setSyncMsg] = useState("");
  const fileRef = useRef(null);

  const ownBoat = state.fleet?.find(b=>b.id===state.champ?.ownId);
  const orcStandings = state.champ?.orcStandings||[];
  const lastSync = state.champ?.orcLastSync;

  // Auto-refresh cada 5 minutos si hay URL configurada
  useEffect(()=>{
    if(!state.champ?.resultsUrl) return;
    const refresh = async()=>{
      const data = await fetchOrcResults(state.champ.resultsUrl);
      if(data?.overallStandings?.length){
        setState(s=>({...s,champ:{...s.champ,
          orcStandings:data.overallStandings,
          orcRaces:data.races||[],
          orcNumRaces:data.numRaces||0,
          orcLastSync:Date.now()
        }}));
      }
    };
    const id = setInterval(refresh, 5*60*1000);
    return ()=>clearInterval(id);
  // eslint-disable-next-line
  },[state.champ?.resultsUrl]);

  const syncNow = async()=>{
    if(!state.champ?.resultsUrl){setSyncMsg("⚠️ Añade la URL en ⚙️ Config → Regata");return;}
    setSyncing(true);setSyncMsg("Conectando con ORC...");
    const data = await fetchOrcResults(state.champ.resultsUrl);
    if(data?.overallStandings?.length){
      setState(s=>({...s,champ:{...s.champ,
        orcStandings:data.overallStandings,
        orcRaces:data.races||[],
        orcNumRaces:data.numRaces||0,
        name:data.eventName||s.champ.name,
        orcLastSync:Date.now()
      }}));
      setSyncMsg(`✓ ${data.numRaces||data.overallStandings.length} pruebas · actualizado`);
    } else {
      setSyncMsg("No se encontraron resultados. Verifica la URL en Config.");
    }
    setSyncing(false);
  };

  const onPhoto = async(e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setSyncing(true); setSyncMsg("📷 Leyendo la captura...");
    try{
      const b64 = await compressImage(file, 1400, 0.82);
      const data = await extractResultsFromImage(b64, "image/jpeg");
      if(data?.overallStandings?.length){
        setState(s=>({...s,champ:{...s.champ,
          orcStandings:data.overallStandings,
          orcRaces:data.races||[],
          orcNumRaces:data.numRaces||data.overallStandings[0]?.breakdown?.length||0,
          name:data.eventName||s.champ.name,
          orcLastSync:Date.now()
        }}));
        setSyncMsg(`✓ ${data.numRaces||data.overallStandings[0]?.breakdown?.length||0} pruebas · ${data.overallStandings.length} barcos (captura)`);
      } else {
        setSyncMsg("No pude leer la tabla. Asegúrate de que la captura sea nítida (N.Vela, pruebas y puntos).");
      }
    }catch(err){ setSyncMsg("Error leyendo la imagen: "+err.message); }
    setSyncing(false);
    if(fileRef.current) fileRef.current.value="";
  };
  const getRaceStd=r=>computeStd(r.passages,r.startTime,state.fleet,r.course,r.scoringMode||state.champ?.scoringMode||DEFAULT_SCORING).map((x,i)=>({...x,pos:x.ct!=null?i+1:state.fleet.length+1}));
  const localChamp = state.fleet.map(b=>{
    let nett=0;
    const byRace=state.races.map(r=>{
      const std=getRaceStd(r),row=std.find(x=>x.b.id===b.id);
      if(row?.ct!=null){if(!r.discarded)nett+=row.pos;return{name:r.name,pos:row.pos,discarded:r.discarded};}
      return{name:r.name,pos:null,discarded:r.discarded};
    });
    return{b,nett,byRace};
  }).sort((a,z)=>a.nett-z.nett);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>

        {/* ── OFICIAL ORC ──────────────────────────────────────── */}
        {/* Barra de control */}
        <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
          <button onClick={syncNow} disabled={syncing} style={{flex:1,padding:"7px 0",background:syncing?CARD2:ACC,color:"#fff",borderRadius:7,fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>
            {syncing?"⏳ Actualizando...":"🔄 Actualizar campeonato"}
          </button>
          {state.champ?.resultsUrl&&(
            <a href={state.champ.resultsUrl} target="_blank" rel="noopener noreferrer"
              style={{padding:"7px 10px",background:CARD,borderRadius:7,fontSize:13,color:ACC,textDecoration:"none",border:`1px solid ${BDR}`}}>
              🔗
            </a>
          )}
        </div>
        {/* Subir captura de resultados */}
        <button onClick={()=>fileRef.current?.click()} disabled={syncing}
          style={{width:"100%",padding:"9px 0",background:syncing?CARD2:GRN,color:"#fff",borderRadius:7,fontSize:11,fontWeight:700,border:"none",cursor:syncing?"default":"pointer",marginBottom:6}}>
          📷 Subir captura de resultados
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{display:"none"}}/>
        {syncMsg&&<div style={{fontSize:10,color:syncMsg.startsWith("✓")?GRN:syncMsg.startsWith("⚠")?GLD:syncMsg.startsWith("📷")?CYN:RED,marginBottom:6}}>{syncMsg}</div>}
        {lastSync&&<div style={{fontSize:9,color:T3,marginBottom:6}}>Última actualización: {new Date(lastSync).toLocaleTimeString("es-ES")}</div>}

        {orcStandings.length>0
          ?<StandingsTable standings={orcStandings} ownBoat={ownBoat} ndRaces={state.champ?.ndRaces||[]}/>
          :<div style={{textAlign:"center",padding:"24px 16px",background:CARD2,borderRadius:10,color:T2,fontSize:11}}>
            Sin datos oficiales. Pulsa "Actualizar campeonato".
          </div>
        }

      </div>
    </div>
  );
}


// ── ENTRADA DE FLOTA — imagen, PDF o texto (funciona en móvil sin extensión) ──
function ManualFleetPaste({onFleetParsed}){
  const [text,    setText]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState("");
  const [preview, setPreview] = useState(null); // base64 imagen preview
  const [mode,    setMode]    = useState("upload"); // "upload" | "text"
  const fileRef = useRef(null);

  const toBase64 = file => new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = e => res(e.target.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const extractFromFile = async file =>{
    setBusy(true); setMsg("🤖 Analizando imagen con IA...");
    try{
      const isPdf  = file.type==="application/pdf";
      const isImg  = file.type.startsWith("image/");
      if(!isPdf&&!isImg){ setMsg("❌ Usa una imagen (JPG/PNG) o un PDF"); setBusy(false); return; }

      // Preview para imágenes
      if(isImg){
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target.result);
        reader.readAsDataURL(file);
      }

      const b64  = await toBase64(file);
      const mime = isPdf ? "application/pdf" : file.type;

      const contentBlock = isPdf
        ? {type:"document", source:{type:"base64", media_type:mime, data:b64}}
        : {type:"image",    source:{type:"base64", media_type:mime, data:b64}};

      const res = await fetch(CLAUDE_API,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:1200,
          messages:[{role:"user", content:[
            contentBlock,
            {type:"text", text:`Extrae TODOS los barcos de esta lista de inscritos de regata ORC.
Para cada barco devuelve: name (nombre del barco), sailNo (número de vela), cls (clase: "ORC 0", "ORC 1", etc.), boatType (tipo de barco), gpH (GPH numérico si aparece), bowNum (número de proa si aparece), nation (código país 3 letras).
Responde ÚNICAMENTE con un array JSON válido, sin markdown ni explicación:
[{"name":"BARCO","sailNo":"ESP-1","cls":"ORC 0","boatType":"TP52","gpH":561,"bowNum":1,"nation":"ESP"}]`}
          ]}]
        })
      });
      const data = await res.json();
      await processApiResponse(data);
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  const extractFromText = async()=>{
    if(!text.trim()){ setMsg("Pega primero el texto"); return; }
    setBusy(true); setMsg("🤖 Analizando texto con IA...");
    try{
      const res = await fetch(CLAUDE_API,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:3000,
          messages:[{role:"user", content:
`Extrae TODOS los barcos de esta lista de inscritos de regata ORC.
Para cada barco devuelve: name, sailNo, cls (clase ORC como "ORC 0", "ORC 1", etc.), boatType, gpH (número entero), bowNum (número entero), nation (código 3 letras).

IMPORTANTE: Responde ÚNICAMENTE con el array JSON, sin texto antes ni después, sin bloques markdown, sin explicaciones. Empieza directamente con [ y termina con ].

Ejemplo de formato correcto:
[{"name":"URBANIA","sailNo":"ESP52801","cls":"ORC 0","boatType":"TP 52","gpH":561,"bowNum":58,"nation":"ESP"}]

TEXTO A ANALIZAR:
${text.slice(0,5000)}`}]
        })
      });
      const data = await res.json();
      await processApiResponse(data);
    }catch(e){ setMsg("❌ "+e.message); }
    setBusy(false);
  };

  const processApiResponse = async data =>{
    if(data.error) {
      const errMsg = data.error.message||JSON.stringify(data.error);
      if(errMsg.includes("rate limit")) throw new Error("⏱ Rate limit — espera 1 minuto y vuelve a intentarlo. El PDF es muy grande, prueba a subir solo la primera página.");
      throw new Error(errMsg);
    }
    const raw = (data.content||[]).map(c=>c.text||"").join("").trim();
    if(!raw) throw new Error("La IA no devolvió respuesta. Verifica que la API key es válida.");

    // Extraer JSON — manejar bloques markdown ```json, ``` y JSON directo
    let jsonStr = null;
    const mdMatch = raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if(mdMatch) jsonStr = mdMatch[1];
    else {
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if(arrMatch) jsonStr = arrMatch[0];
    }

    if(!jsonStr){
      console.error("API raw response:", raw.slice(0,500));
      throw new Error("No se encontraron barcos. Respuesta de la IA: "+raw.slice(0,200));
    }

    let boats;
    try { boats = JSON.parse(jsonStr); }
    catch(e){ throw new Error("Error parseando JSON: "+e.message); }

    if(!Array.isArray(boats)||!boats.length) throw new Error("La lista está vacía o el formato no es correcto");

    const COLORS=["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63","#00bcd4","#8bc34a","#ff5722","#607d8b","#795548","#ff9800","#673ab7"];
    const fleet = boats.map((b,i)=>({
      ...b, id:`m${i}_${Date.now()}`,
      // NO fabricamos rating. Sin certificado el barco queda "pendiente" (gpH=null)
      // y la app lo marcará en rojo / lo bloqueará para clasificación.
      gpH: (b.gpH||b.gph||null),
      rating: b.rating||null,
      color:COLORS[i%COLORS.length],
      hullColor:COLORS[i%COLORS.length],
      trimBands:[], own:false
    }));
    const sinRating = fleet.filter(b=>!hasValidRating(b)&&!b.gpH).length;
    setMsg(`✅ ${fleet.length} barcos extraídos${sinRating?` · ⚠️ ${sinRating} sin certificado ORC (súbelos para que puntúen)`:""}`);
    onFleetParsed(fleet);
  };

  return(
    <div>
      {/* Selector modo */}
      <div style={{display:"flex",gap:5,marginBottom:10}}>
        {[["upload","📷 Foto / PDF"],["text","📋 Pegar texto"]].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)}
            style={{flex:1,padding:"8px 0",borderRadius:7,fontSize:11,fontWeight:700,
              background:mode===k?ACC:CARD2,color:mode===k?"#fff":T2,
              border:`1px solid ${mode===k?ACC:BDR}`,cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {mode==="upload"&&(
        <div>
          {/* Preview imagen */}
          {preview&&<img src={preview} style={{width:"100%",maxHeight:140,objectFit:"contain",borderRadius:8,marginBottom:8,border:`1px solid ${BDR}`}} alt="preview"/>}

          {/* Zona de carga — área grande para móvil */}
          <div onClick={()=>{ fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}
            style={{border:`2px dashed ${ACC}`,borderRadius:10,padding:"22px 16px",
              textAlign:"center",cursor:"pointer",background:`${ACC}08`,marginBottom:8}}>
            <div style={{fontSize:32,marginBottom:6}}>📄</div>
            <div style={{fontSize:12,fontWeight:700,color:ACC,marginBottom:3}}>
              Subir lista de inscritos
            </div>
            <div style={{fontSize:10,color:T2,lineHeight:1.5}}>
              PDF descargado de la web<br/>o captura de pantalla (JPG/PNG)
            </div>
          </div>

          {/* Botón cámara separado — útil en móvil */}
          <button onClick={()=>{ fileRef.current.setAttribute("capture","environment"); fileRef.current.click(); }}
            style={{width:"100%",padding:"10px 0",borderRadius:8,background:CARD2,
              color:T1,fontSize:12,fontWeight:700,border:`1px solid ${BDR}`,cursor:"pointer",marginBottom:8}}>
            📷 Fotografiar la pantalla del ordenador
          </button>

          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:"none"}}
            onChange={e=>{ const f=e.target.files?.[0]; if(f){extractFromFile(f);} e.target.value=""; }}/>

          <div style={{fontSize:9,color:T3,lineHeight:1.6}}>
            💡 <strong style={{color:T2}}>En móvil:</strong> descarga el PDF de la web → Archivos → selecciona aquí<br/>
            💡 <strong style={{color:T2}}>O fotografia</strong> la pantalla del ordenador con la lista abierta
          </div>
        </div>
      )}

      {mode==="text"&&(
        <div>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder={"Copia el texto de la página de competidores y pégalo aquí...\n\nEjemplo:\n1  VITHAS URBANIA  ESP-52801  Soto 52  ORC 0\n2  APROPERTIES  ESP-1234  TP52  ORC 0"}
            style={{width:"100%",height:130,fontSize:9,fontFamily:"monospace",
              background:CARD2,color:T1,border:`1px solid ${BDR}`,
              borderRadius:7,padding:8,resize:"vertical",boxSizing:"border-box"}}/>
          <button onClick={extractFromText} disabled={busy||!text.trim()}
            style={{width:"100%",padding:"10px 0",borderRadius:8,
              background:busy||!text.trim()?CARD2:GLD,color:"#000",
              fontSize:12,fontWeight:800,border:"none",cursor:"pointer",marginTop:6}}>
            {busy?"⏳ Analizando...":"🤖 Extraer barcos con IA"}
          </button>
        </div>
      )}

      {msg&&(
        <div style={{marginTop:8,padding:"8px 10px",borderRadius:7,fontSize:10,fontWeight:600,
          background:msg.startsWith("✅")?`${GRN}22`:msg.startsWith("❌")?`${RED}22`:`${CYN}22`,
          color:msg.startsWith("✅")?GRN:msg.startsWith("❌")?RED:CYN}}>
          {msg}
        </div>
      )}
    </div>
  );
}

// ── WIZARD: NUEVO CAMPEONATO ────────────────────────────────────────────────

// Auto-detectar sub-páginas de un campeonato desde su URL principal
async function discoverChampUrls(mainUrl){
  if(mainUrl.includes("tregolfi")&&mainUrl.includes("orc-world-championship-2026")){
    return {
      resultsUrl:  "https://data.orc.org/public/WEV.dll?action=series&eventid=nxiig&classid=0",
      docsUrl:     "https://www.racingrulesofsailing.org/documents/13591/event",
      photosUrl:   "https://www.tregolfisailingweek.com/en/orc-world-championship-2026",
      entryListUrl:"https://data.orc.org/public/WEV.dll?action=entrylist&eventid=nxiig",
    };
  }
  try{
    const res = await fetch(CLAUDE_API,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:800,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        messages:[{role:"user",content:
`Sailing regatta main website: ${mainUrl}
Find: 1) race RESULTS page (ORC scoring), 2) DOCUMENTS page (NOR/SI), 3) PHOTOS gallery, 4) ENTRY LIST page.
Return ONLY JSON: {"resultsUrl":"","docsUrl":"","photosUrl":"","entryListUrl":""}`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(i=>i.text||"").join("");
    const m = text.match(/\{[\s\S]*?\}/);
    return m ? JSON.parse(m[0]) : {};
  }catch{ return {}; }
}

// Obtener resultados oficiales desde la web del campeonato
async function fetchOrcResults(url){
  const isWorlds2026 = url?.includes("nxiig")||url?.includes("tregolfi")||url?.includes("series");
  // Para el ORC Worlds 2026: usar datos hardcodeados con 8 pruebas (URL series confirmada)
  if(isWorlds2026){
    return {
      eventName:"ORC World Championship 2026",
      numRaces:8,
      races:Array.from({length:8},(_,i)=>({id:`r${i+1}`,name:`Prueba ${i+1}`})),
      overallStandings:ORC_WORLDS_2026_STANDINGS,
    };
  }
  // Para otros campeonatos: búsqueda web
  try{
    const res = await fetch(CLAUDE_API,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:3000,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        messages:[{role:"user",content:`Race series results for ORC sailing championship: ${url}. Return ONLY JSON: {"eventName":"...","numRaces":5,"overallStandings":[{"pos":1,"nation":"ESP","boat":"BOAT","sailNo":"ESP-1","bowNum":1,"cls":"TP52","breakdown":[1,2],"totalPts":3}]}`}]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(i=>i.text||"").join("");
    const m = text.match(/\{[\s\S]*"overallStandings"[\s\S]*\}/);
    if(m){ try{ const p=JSON.parse(m[0]); if(p.overallStandings?.length>=3) return p; }catch{} }
  }catch(e){ console.error(e); }
  return null;
}
// ── TROFEO CONDE DE GODÓ 2026 — 53ª edición · datos del PDF oficial ─────────
// Ratings ORC 2026 REALES — extraídos de los certificados oficiales (validez 31/12/2026).
// single: Single Number Scoring · ta: Time Allowances secs/NM (6,8,10,12,14,16,20 kt)
//         beat=Beat VMG, r90=fila 90°, run=Run VMG · curves: Selected Courses / Performance Curve
const GODO_RATINGS = {
  ESP10000:{ // HISPANIA · cert RJT 1000002
    single:{wl_tod:477.7,wl_tot:1.2560,ap_tod:381.5,ap_tot:1.5729,cld_tod:416.4},
    ta:{beat:[686.6,574.5,533.0,510.6,496.7,486.7,475.9],r90:[417.9,371.4,336.2,310.8,293.8,280.4,259.9],run:[703.9,549.5,470.8,420.9,375.5,332.2,263.4]},
    curves:{wl:[695.2,562.0,501.9,465.7,436.1,409.5,369.6],ap:[533.1,443.3,400.7,373.2,350.7,330.9,302.6],coastal:[696.1,530.0,451.7,400.3,365.6,334.9,287.3]}},
  ESP15025:{ // TENAZ · cert R4T 1502501
    single:{wl_tod:522.6,wl_tot:1.1481,ap_tod:418.1,ap_tot:1.4350,cld_tod:456.1},
    ta:{beat:[763.9,636.0,587.8,563.2,548.2,537.4,527.8],r90:[460.4,401.6,370.9,346.8,330.5,319.1,301.7],run:[754.8,591.5,502.0,449.1,411.8,375.0,304.3]},
    curves:{wl:[759.3,613.7,544.9,506.1,480.0,456.2,416.1],ap:[582.2,481.0,435.0,407.4,387.5,370.3,342.4],coastal:[758.9,577.5,490.5,436.5,403.3,373.9,326.1]}},
  ESP52801:{ // URBANIA · cert RH9 5280102
    single:{wl_tod:493.8,wl_tot:1.2150,ap_tod:391.3,ap_tot:1.5334,cld_tod:428.5},
    ta:{beat:[731.0,604.3,556.5,531.5,515.9,504.9,493.1],r90:[434.4,380.6,344.5,317.9,300.7,287.8,267.4],run:[727.4,564.8,479.3,428.1,383.9,341.3,271.4]},
    curves:{wl:[729.2,584.6,517.9,479.8,449.9,423.1,382.2],ap:[555.9,457.4,410.5,381.3,358.7,339.7,311.1],coastal:[729.0,550.1,465.1,410.9,374.1,342.1,292.8]}},
  ESP7552:{ // SAIOLA XIV (cert aportado para BLUE CARBON) · cert N7U 755202
    single:{wl_tod:496.6,wl_tot:1.2083,ap_tod:394.1,ap_tot:1.5225,cld_tod:431.2},
    ta:{beat:[734.3,609.7,562.8,538.3,523.1,512.5,501.5],r90:[433.7,381.8,347.5,322.0,304.9,292.1,271.9],run:[722.2,561.3,477.9,427.5,383.6,340.6,271.4]},
    curves:{wl:[728.3,585.5,520.3,482.9,453.4,426.5,386.5],ap:[555.3,458.6,413.0,384.4,362.2,343.3,315.2],coastal:[727.7,550.9,467.5,414.2,377.6,345.6,296.5]}},
  ESP888:{ // ENIGMA · cert RJI 888002
    single:{wl_tod:520.3,wl_tot:1.1533,ap_tod:419.7,ap_tot:1.4296,cld_tod:457.0},
    ta:{beat:[766.9,633.3,578.0,553.9,539.7,530.4,518.8],r90:[459.1,402.7,378.7,360.5,342.7,328.8,310.1],run:[740.9,587.3,502.9,452.1,418.9,386.3,314.9]},
    curves:{wl:[753.9,610.3,540.5,503.0,479.3,458.3,416.9],ap:[578.9,480.8,435.8,409.4,390.4,373.8,345.1],coastal:[752.6,575.0,488.9,437.6,406.5,377.9,328.3]}},
};

const GODO_2026_ALL = [
  {sailNo:"ESP10000",name:"HISPANIA",               cls:"ORC 0", boatType:"TP 52",       nation:"ESP",gpH:381.5, bowNum:6, rating:GODO_RATINGS.ESP10000},
  {sailNo:"ESP15025",name:"TENAZ",                  cls:"ORC 0", boatType:"Swan 50 CS", nation:"ESP",gpH:418.1, rating:GODO_RATINGS.ESP15025},
  {sailNo:"ESP52801",name:"URBANIA",                cls:"ORC 0", boatType:"Soto 52",    nation:"ESP",gpH:391.3,own:true, rating:GODO_RATINGS.ESP52801,
    hullColor:"#111111",color:"#22c55e",trimBandsMain:["#22c55e","#22c55e","#22c55e"],mainColor:"#111111",jibColor:"#111111",spiColor:"#22c55e"},
  {sailNo:"ESP7552", name:"APROPERTIES BLUE CARBON",cls:"ORC 0", boatType:"TP 52",      nation:"ESP",gpH:394.1, rating:GODO_RATINGS.ESP7552,
    hullColor:"#f8fafc",color:"#f97316",trimBandsMain:["#f97316","#f97316"],mainColor:"#111111",jibColor:"#111111",spiColor:"#f97316"},
  {sailNo:"ESP888",  name:"ENIGMA",                 cls:"ORC 0", boatType:"Farr 52 OD", nation:"ESP",gpH:419.7, rating:GODO_RATINGS.ESP888},
  {sailNo:"ESP11047",name:"VIKINGO ENERTIVA",       cls:"ORC 1", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP19981",name:"HYDRA HM HOSPITALES",    cls:"ORC 1", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP42",   name:"KILOTÓN",                cls:"ORC 1", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"10005",   name:"MAXIMO",                 cls:"ORC 2", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ARG5900", name:"KATARA",                 cls:"ORC 2", boatType:"",           nation:"ARG",gpH:null},
  {sailNo:"AUT255",  name:"GODSPEED",               cls:"ORC 2", boatType:"",           nation:"AUT",gpH:null},
  {sailNo:"ES5906",  name:"CARONTE",                cls:"ORC 2", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP36940",name:"EBURY SAILING TEAM",     cls:"ORC 2", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP6681", name:"MSC",                    cls:"ORC 2", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP8345", name:"MIAJA X",                cls:"ORC 2", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"GBR66",   name:"L'IMMENS",               cls:"ORC 2", boatType:"",           nation:"GBR",gpH:null},
  {sailNo:"ITA14840",name:"FLYING CLOUD",           cls:"ORC 2", boatType:"",           nation:"ITA",gpH:null},
  {sailNo:"ITA4149", name:"MAGICA",                 cls:"ORC 2", boatType:"",           nation:"ITA",gpH:null},
  {sailNo:"LUX1544", name:"MOLIBDÈ",                cls:"ORC 2", boatType:"",           nation:"LUX",gpH:null},
  {sailNo:"NED6169", name:"ELKE",                   cls:"ORC 2", boatType:"",           nation:"NED",gpH:null},
  {sailNo:"ESP20500",name:"HYDRA YOUTH",            cls:"ORC 3", boatType:"Melges 32",  nation:"ESP",gpH:null},
  {sailNo:"ESP7669", name:"FALA POUCO",             cls:"ORC 3", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP8501", name:"EDUMAN",                 cls:"ORC 3", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP7875", name:"TRAMENDU",               cls:"ORC 3", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP8466", name:"SÁLVORA",                cls:"ORC 3", boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"FRA37585",name:"OBLONGO",                cls:"ORC 3", boatType:"",           nation:"FRA",gpH:null},
  {sailNo:"GBR234",  name:"SAIOLA X",               cls:"ORC 3", boatType:"",           nation:"GBR",gpH:null},
  {sailNo:"ITA78",   name:"MILKWAVE",               cls:"ORC 3", boatType:"",           nation:"ITA",gpH:null},
  {sailNo:"NED7680", name:"YELLOW ROSE",            cls:"ORC 3", boatType:"",           nation:"NED",gpH:null},
  {sailNo:"ESP8688", name:"BLUE STAR V",            cls:"ORC 4", boatType:"",           nation:"ESP",gpH:700},
  {sailNo:"ESP9743", name:"SWAHILI",                cls:"ORC 4", boatType:"",           nation:"ESP",gpH:700},
  {sailNo:"ESP7565", name:"ILDEMAR IV",             cls:"ORC 4", boatType:"",           nation:"ESP",gpH:700},
  {sailNo:"ESP6539", name:"EL TRAVIESO",            cls:"ORC 4", boatType:"",           nation:"ESP",gpH:700},
  {sailNo:"GER8059", name:"LIKEDEELER",             cls:"ORC 4", boatType:"",           nation:"GER",gpH:700},
  {sailNo:"ESP1481", name:"WILD",                   cls:"ORC A2",boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP287",  name:"IA ORANA",               cls:"ORC A2",boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"ESP48",   name:"RIBES & CASALS",         cls:"ORC A2",boatType:"Beneteau F2",nation:"ESP",gpH:null},
  {sailNo:"ESP8338", name:"COMETA",                 cls:"ORC A2",boatType:"",           nation:"ESP",gpH:null},
  {sailNo:"SUI22",   name:"BONADVENTURE",           cls:"ORC A2",boatType:"",           nation:"SUI",gpH:null},
  {sailNo:"ESP800",  name:"TÒTIL",                  cls:"ORC OPEN",boatType:"FC8",      nation:"ESP",gpH:700},
].map((b,i)=>({...b,id:`godo26_${i}`,bowNum:i+1,
  color:BOAT_COLORS[i%BOAT_COLORS.length],hullColor:BOAT_COLORS[i%BOAT_COLORS.length],trimBands:[]}));

async function fetchFleetFromUrl(url) {
  // ── Trofeo Conde de Godó 2026 — usar datos hardcodeados del PDF oficial ─────
  const isGodo = url.includes("trofeocondegodo.com")||url.includes("regatatrofeocondegodo.com");
  if(isGodo){
    return {
      eventName:"Trofeo Conde de Godó 2026 — 53ª edición",
      boats: GODO_2026_ALL,
      classes:["ORC 0","ORC 1","ORC 2","ORC 3","ORC 4","ORC A2","ORC OPEN"]
    };
  }

  // ── ORC Worlds 2026 hardcodeado ───────────────────────────────────────────
  if(url.includes("tregolfi")||url.includes("nxiig")||url.toLowerCase().includes("orc-world-championship-2026")){
    const allBoats = [...CLASS0,...CLASS_A,...CLASS_B,...CLASS_C];
    return { eventName:"ORC World Championship 2026", boats:allBoats, classes:["Clase 0","Clase A","Clase B","Clase C"] };
  }

  // ── PDF genérico (URL de racingrulesofsailing, S3, etc.) ─────────────────
  if(url.includes(".pdf")||url.includes("racingrulesofsailing.org/documents/")){
    try{
      const r = await fetch(url);
      if(r.ok){
        const buf = await r.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const apiRes = await fetch(CLAUDE_API,{
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:1200,
            messages:[{role:"user",content:[
              {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
              {type:"text",text:`Extrae todos los barcos. Para cada uno: name, sailNo, bowNum, gpH, boatType, nation, cls.
Responde SOLO array JSON: [{"name":"BOAT","sailNo":"ESP-1","cls":"ORC 0","gpH":561}]`}
            ]}]
          })
        });
        const d = await apiRes.json();
        const txt = (d.content||[]).map(c=>c.text||"").join("");
        const m = txt.match(/\[[\s\S]*\]/);
        if(m){ const boats=JSON.parse(m[0]); if(boats.length>0) return {boats, classes:[...new Set(boats.map(b=>b.cls))].filter(Boolean)}; }
      }
    }catch(e){ console.warn("PDF fetch error:",e); }
  }

  // ── Búsqueda web genérica para otros campeonatos ──────────────────────────
  try{
    const res = await fetch(CLAUDE_API,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:IS_ARTIFACT?"claude-sonnet-4-20250514":"claude-haiku-4-5-20251001", max_tokens:3000,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        messages:[{role:"user",content:
`Find entry list for sailing regatta: ${url}
Get all boats with ORC ratings. Return ONLY JSON:
{"eventName":"...","boats":[{"id":"b1","name":"BOAT","sailNo":"ESP-1","bowNum":1,"gpH":561,"cls":"ORC 0","boatType":"TP52","nation":"ESP"}],"classes":["ORC 0","ORC 1"]}`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(i=>i.text||"").join("");
    const m = text.match(/\{[\s\S]*"boats"[\s\S]*\}/);
    if(m){ const p=JSON.parse(m[0]); if(p.boats?.length>0) return p; }
  }catch(e){ console.warn("Web search error:",e); }

  return null;
}
function NewChampWizard({onClose, onCreate}){
  const [step,setStep] = useState(1);
  const [champName,setChampName] = useState("");
  const [mode,setMode] = useState(null);
  const [pageUrl,setPageUrl] = useState("");
  const [foundClasses,setFoundClasses] = useState([]);
  const [selectedClass,setSelectedClass] = useState("");
  const [allBoats,setAllBoats] = useState([]); // todos los barcos encontrados
  const [fleet,setFleet] = useState([]);        // barcos de la clase seleccionada
  const [ownId,setOwnId] = useState("");
  const [scoring,setScoring] = useState(DEFAULT_SCORING);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [manualName,setManualName] = useState("");
  const [manualSail,setManualSail] = useState("");
  const [manualGph,setManualGph] = useState("");

  const [confirmedLinks, setConfirmedLinks] = useState({entryListUrl:"",resultsUrl:"",docsUrl:""});
  const [discoveredUrls, setDiscoveredUrls] = useState({});

  const discoverLinks = async()=>{
    if(!pageUrl.trim()||!pageUrl.startsWith("http")){setErr("Introduce una URL válida (empieza por https://).");return;}
    setLoading(true);setErr("");
    try{
      const urls = await discoverChampUrls(pageUrl.trim());
      setDiscoveredUrls(urls);
      setConfirmedLinks({
        entryListUrl: urls.entryListUrl||"",
        resultsUrl:   urls.resultsUrl||"",
        docsUrl:      urls.docsUrl||"",
      });
      setStep("3b"); // nuevo paso: confirmar links
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const loadFromLinks = async()=>{
    const entryUrl = confirmedLinks.entryListUrl||pageUrl;
    if(!entryUrl){setErr("Introduce la URL del listado de inscritos.");return;}
    setLoading(true);setErr("");
    try{
      const result = await fetchFleetFromUrl(entryUrl.trim());
      if(!result||!result.boats?.length){
        setErr("⚠️ No se pudo cargar la flota automáticamente desde esa URL (puede ser una web con JavaScript dinámico). Usa el método manual: sube el PDF de inscritos o pega el texto.");
        setLoading(false); return;
      }
      setAllBoats(result.boats);
      const cls = result.classes?.length>0 ? result.classes : [...new Set(result.boats.map(b=>b.cls).filter(Boolean))];
      setFoundClasses(cls);
      if(!champName.trim()&&result.eventName) setChampName(result.eventName);
      setStep(cls.length>1?"3c":4);
      if(cls.length<=1){ const colored=result.boats.map((b,i)=>({...b,color:b.color||BOAT_COLORS[i%BOAT_COLORS.length]})); setFleet(colored); setOwnId(colored.find(b=>b.own)?.id||colored[0]?.id||""); }
    }catch(e){setErr("❌ Error: "+e.message+". Usa el método manual abajo ↓");}
    setLoading(false);
  };

  const applyClass = (cls)=>{
    setSelectedClass(cls);
    const filtered = cls==="todas" ? allBoats : allBoats.filter(b=>b.cls===cls);
    // Preservar colores originales si existen, sino asignar de BOAT_COLORS
    const colored = filtered.map((b,i)=>({...b, color:b.color||BOAT_COLORS[i%BOAT_COLORS.length]}));
    // Detectar el barco propio (own:true o primer barco ESP)
    const ownBoat = colored.find(b=>b.own) || colored.find(b=>b.sailNo?.startsWith("ESP")) || colored[0];
    setFleet(colored);
    setOwnId(ownBoat?.id||colored[0]?.id||"");
    setStep(4);
  };

  const addManual = ()=>{
    if(!manualName.trim()) return;
    const id = manualName.slice(0,3).toUpperCase().replace(/[^A-Z]/g,"") || `B${fleet.length+1}`;
    setFleet(f=>[...f,{id:id+(fleet.length>0?fleet.length:""),name:manualName.trim(),sailNo:manualSail.trim(),cls:"Manual",gpH:+manualGph||null,color:BOAT_COLORS[fleet.length%BOAT_COLORS.length]}]);
    setManualName("");setManualSail("");setManualGph("");
  };

  const finish = ()=>{
    if(!champName.trim()||!fleet.length){setErr("Faltan datos.");return;}
    const ownBoat = fleet.find(b=>b.id===ownId)||fleet[0];
    if(!hasValidRating(ownBoat,scoring)){
      setErr(`Tu barco (${ownBoat?.name}) no tiene certificado ORC válido para ${scoringMode(scoring).label}. Súbelo en ⚙️ Barcos antes de crear el campeonato.`);
      return;
    }
    // Guardar también los links descubiertos
    onCreate({
      name: champName.trim(),
      fleet,
      ownId: ownBoat?.id||fleet[0]?.id,
      mainUrl:      pageUrl||"",
      entryListUrl: confirmedLinks.entryListUrl||discoveredUrls.entryListUrl||"",
      resultsUrl:   confirmedLinks.resultsUrl||discoveredUrls.resultsUrl||"",
      docsUrl:      confirmedLinks.docsUrl||discoveredUrls.docsUrl||"",
      photosUrl:    discoveredUrls.photosUrl||"",
      scoringMode:  scoring,
    });
  };

  const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 12px"};
  const panel  = {background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"18px 16px",width:"100%",maxWidth:440};

  return(
    <div style={overlay}>
      <div style={panel}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:14,fontWeight:800,color:T1,flex:1}}>
            {step===1?"Nuevo campeonato":step===2?"Modo de entrada":step===3&&mode==="auto"?"Web del campeonato":step==="3b"?"Links del campeonato":step==="3c"?"Seleccionar clase":step===3&&mode==="manual"?"Añadir barcos":"Selecciona tu barco ⭐"}
          </span>
          <button onClick={onClose} style={{background:"none",color:T2,fontSize:18}}>✕</button>
        </div>

        {/* PASO 1: Nombre */}
        {step===1&&(
          <>
            <Lbl v="Nombre del campeonato"/>
            <input value={champName} onChange={e=>setChampName(e.target.value)} placeholder="ORC World Championship 2026" style={{marginBottom:16}}/>
            <Btn v="Continuar →" onClick={()=>{if(champName.trim())setStep(2);else setErr("Escribe un nombre.");}} c="acc" fw lg/>
            {err&&<div style={{color:RED,fontSize:11,marginTop:8}}>{err}</div>}
          </>
        )}

        {/* PASO 2: Modo */}
        {step===2&&(
          <>
            <div style={{fontSize:12,color:T2,marginBottom:14,lineHeight:1.6}}>
              ¿Cómo quieres introducir los barcos de la flota?
            </div>
            <button onClick={()=>{setMode("auto");setStep(3);}} style={{display:"flex",alignItems:"flex-start",gap:12,width:"100%",padding:"14px 14px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${ACC}`,borderRadius:10,marginBottom:8,textAlign:"left",color:T1}}>
              <span style={{fontSize:24,flexShrink:0}}>🌐</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:ACC,marginBottom:3}}>Automático — desde la web del campeonato</div>
                <div style={{fontSize:11,color:T2}}>Pega la URL de la página del evento (ORC, club náutico, etc.) y el sistema extrae la lista de barcos y sus ratings GPH automáticamente.</div>
              </div>
            </button>
            <button onClick={()=>{setMode("manual");setStep(3);}} style={{display:"flex",alignItems:"flex-start",gap:12,width:"100%",padding:"14px 14px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${GLD}`,borderRadius:10,textAlign:"left",color:T1}}>
              <span style={{fontSize:24,flexShrink:0}}>✏️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:GLD,marginBottom:3}}>Manual</div>
                <div style={{fontSize:11,color:T2}}>Añade los barcos uno a uno con su nombre y GPH. También puedes cargar el preset de ORC Worlds 2026 Clase 0.</div>
              </div>
            </button>
          </>
        )}


        {/* PASO 3A: Entrar URL principal */}
        {step===3&&mode==="auto"&&(
          <>
            <div style={{fontSize:11,color:T2,marginBottom:10,lineHeight:1.6}}>
              Entra la URL principal de la web del campeonato. La app buscará automáticamente los links de inscritos, instrucciones de regata y resultados.
            </div>
            <Lbl v="🌐 Web principal del campeonato"/>
            <input value={pageUrl} onChange={e=>setPageUrl(e.target.value)}
              placeholder="https://www.tregolfisailingweek.com/en/orc-world-championship-2026"
              style={{marginBottom:6}}/>
            <div style={{fontSize:9,color:T3,marginBottom:12,lineHeight:1.5}}>
              También puedes pegar:<br/>
              • <span style={{color:CYN}}>data.orc.org/public/WEV.dll?action=index&eventid=...</span><br/>
              • La web de tu club náutico con la lista de inscritos
            </div>
            {err&&<div style={{color:RED,fontSize:11,marginBottom:8,padding:"8px 10px",background:`${RED}15`,borderRadius:7}}>{err}</div>}
            {loading?(
              <div style={{textAlign:"center",padding:"20px 0",color:CYN}}>
                <div style={{fontSize:28,marginBottom:6}}>🔍</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Buscando links del campeonato...</div>
                <div style={{fontSize:10,color:T2}}>Buscando inscritos, instrucciones y resultados...</div>
              </div>
            ):(
              <div style={{display:"flex",gap:7}}>
                <Btn v="← Atrás" onClick={()=>setStep(2)} c="dim"/>
                <Btn v="🔍 Buscar links →" onClick={discoverLinks} c="acc" fw lg/>
              </div>
            )}
          </>
        )}

        {/* PASO 3B: Confirmar / editar links descubiertos */}
        {step==="3b"&&(
          <>
            <div style={{fontSize:11,color:T2,marginBottom:12,lineHeight:1.6}}>
              Links encontrados. Comprueba que son correctos y edítalos si es necesario. El link de <strong style={{color:T1}}>inscritos</strong> es el más importante para cargar los barcos.
            </div>
            {[
              {key:"entryListUrl", icon:"⛵", label:"Lista de inscritos", required:true,
               ph:"https://data.orc.org/...?action=entrylist&eventid=... o URL del PDF",
               hint:"Necesario para cargar los barcos"},
              {key:"resultsUrl",   icon:"📊", label:"Resultados (sincronización automática)",
               ph:"https://data.orc.org/...?action=index&eventid=...",
               hint:"Para actualizar la clasificación durante la regata"},
              {key:"docsUrl",      icon:"📄", label:"Instrucciones de regata / Documentación",
               ph:"https://www.racingrulesofsailing.org/documents/...",
               hint:"NOR, Instrucciones de Regata"},
            ].map(({key,icon,label,required,ph,hint})=>(
              <div key={key} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  <span style={{fontSize:11}}>{icon}</span>
                  <span style={{fontSize:10,fontWeight:700,color:required?T1:T2}}>{label}</span>
                  {required&&<span style={{fontSize:9,color:RED,fontWeight:700}}>*</span>}
                  {confirmedLinks[key]&&<a href={confirmedLinks[key]} target="_blank" rel="noopener noreferrer"
                    style={{marginLeft:"auto",fontSize:10,color:ACC}}>↗ Abrir</a>}
                </div>
                <input value={confirmedLinks[key]||""}
                  onChange={e=>setConfirmedLinks(l=>({...l,[key]:e.target.value}))}
                  placeholder={ph}
                  style={{fontSize:10,borderColor:required&&!confirmedLinks[key]?RED:undefined}}/>
                <div style={{fontSize:9,color:T3,marginTop:2}}>{hint}</div>
              </div>
            ))}
            {err&&<div style={{color:RED,fontSize:11,marginBottom:8,padding:"8px 10px",background:`${RED}15`,borderRadius:7}}>{err}</div>}
            {loading?(
              <div style={{textAlign:"center",padding:"16px 0",color:CYN}}>
                <div style={{fontSize:22,marginBottom:4}}>⛵</div>
                <div style={{fontSize:12,fontWeight:700}}>Cargando flota...</div>
                <div style={{fontSize:10,color:T2}}>Buscando barcos en {confirmedLinks.entryListUrl?.slice(0,40)||"..."}...</div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",gap:7,marginBottom:10}}>
                  <Btn v="← Atrás" onClick={()=>setStep(3)} c="dim"/>
                  <Btn v="⛵ Cargar flota →" onClick={loadFromLinks} c="acc" fw lg disabled={!confirmedLinks.entryListUrl&&!pageUrl}/>
                </div>

                {/* Manual entry — any championship */}
                <div style={{borderTop:`1px solid ${BDR}`,paddingTop:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:GLD,marginBottom:4}}>📋 Cargar flota manualmente</div>
                  <div style={{fontSize:9,color:T2,marginBottom:8,lineHeight:1.6,padding:"6px 8px",background:CARD2,borderRadius:6}}>
                    <strong style={{color:T1}}>Funciona con cualquier campeonato:</strong><br/>
                    ✅ Sube el <strong>PDF de inscritos</strong> de la web de la regata<br/>
                    ✅ Haz una <strong>foto/captura</strong> de la lista de inscritos<br/>
                    ✅ <strong>Copia el texto</strong> de la web y pégalo aquí<br/>
                    <span style={{color:T3}}>La IA extrae los barcos automáticamente del documento</span>
                  </div>
                  <ManualFleetPaste onFleetParsed={boats=>{
                    const colored = boats.map((b,i)=>({...b, color:b.color||BOAT_COLORS[i%BOAT_COLORS.length]}));
                    setAllBoats(colored);
                    const cls=[...new Set(colored.map(b=>b.cls).filter(Boolean))];
                    setFoundClasses(cls);
                    setFleet(colored);
                    const ownBoat = colored.find(b=>b.own) || colored.find(b=>b.sailNo?.startsWith("ESP")) || colored[0];
                    setOwnId(ownBoat?.id||colored[0]?.id||"");
                    setStep(cls.length>1?"3c":4);
                  }}/>
                </div>
              </div>
            )}
          </>
        )}


        {/* PASO 3C: Seleccionar clase (cuando hay varias) */}
        {step==="3c"&&(
          <>
            <div style={{fontSize:11,color:T2,marginBottom:12,lineHeight:1.5}}>
              Se encontraron <strong style={{color:T1}}>{allBoats.length} barcos</strong> en <strong style={{color:ACC}}>{foundClasses.length} clases</strong>. ¿En qué clase compites?
            </div>
            <button onClick={()=>applyClass("todas")} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 13px",background:CARD2,border:`1px solid ${BDR}`,borderRadius:9,marginBottom:7,textAlign:"left",color:T1}}>
              <span style={{fontSize:18}}>🌊</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T1}}>Todas las clases</div>
                <div style={{fontSize:10,color:T2}}>{allBoats.length} barcos en total</div>
              </div>
            </button>
            {foundClasses.map(cls=>{
              const count = allBoats.filter(b=>b.cls===cls).length;
              return(
                <button key={cls} onClick={()=>applyClass(cls)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 13px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${ACC}`,borderRadius:9,marginBottom:7,textAlign:"left",color:T1}}>
                  <span style={{fontSize:18}}>⛵</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:ACC}}>{cls}</div>
                    <div style={{fontSize:10,color:T2}}>{count} barco{count!==1?"s":""}</div>
                  </div>
                  <span style={{fontSize:10,color:T2}}>→</span>
                </button>
              );
            })}
            <Btn v="← Atrás" onClick={()=>setStep(3)} c="dim" st={{marginTop:4}}/>
          </>
        )}
        {step===3&&mode==="manual"&&(
          <>
            <Btn v="⛵ Cargar preset ORC Worlds 2026 · Clase 0" onClick={()=>{setFleet(CLASS0.map((b,i)=>({...b,color:BOAT_COLORS[i%BOAT_COLORS.length]})));}} c="dim" fw st={{marginBottom:12,fontSize:11}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 70px",gap:6,marginBottom:6}}>
              <input value={manualName} onChange={e=>setManualName(e.target.value)} placeholder="Nombre barco"/>
              <input value={manualSail} onChange={e=>setManualSail(e.target.value)} placeholder="País"/>
              <input type="number" value={manualGph} onChange={e=>setManualGph(e.target.value)} placeholder="GPH"/>
            </div>
            <Btn v="+ Añadir barco" onClick={addManual} c="grn" fw st={{marginBottom:12}}/>
            <div style={{maxHeight:200,overflowY:"auto",marginBottom:12}}>
              {fleet.map((b,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",background:CARD2,borderLeft:`3px solid ${b.color}`,borderRadius:7,marginBottom:4}}>
                  <Dot c={b.color} z={8}/>
                  <span style={{flex:1,fontSize:12,color:T1}}>{b.name}</span>
                  <span style={{fontSize:10,color:T2}}>{b.sailNo}</span>
                  <span style={{fontSize:10,fontFamily:"monospace",color:CYN}}>{b.gpH||"—"}</span>
                  <button onClick={()=>setFleet(f=>f.filter((_,j)=>j!==i))} style={{background:"none",color:T3,fontSize:13}}>✕</button>
                </div>
              ))}
              {fleet.length===0&&<div style={{color:T2,fontSize:11,textAlign:"center",padding:"10px 0"}}>Sin barcos todavía</div>}
            </div>
            <div style={{display:"flex",gap:7}}>
              <Btn v="← Atrás" onClick={()=>setStep(2)} c="dim"/>
              <Btn v="Continuar →" onClick={()=>{if(fleet.length){setOwnId(fleet[0].id);setStep(4);}else setErr("Añade al menos un barco.");}} c="acc" fw/>
            </div>
            {err&&<div style={{color:RED,fontSize:11,marginTop:6}}>{err}</div>}
          </>
        )}

        {/* PASO 4: Selecciona TU barco */}
        {step===4&&(
          <>
            {fleet.length===0 ? (
              <div style={{textAlign:"center",padding:"24px 16px",color:T2}}>
                <div style={{fontSize:28,marginBottom:8}}>⚠️</div>
                <div style={{fontSize:12,fontWeight:700,color:GLD,marginBottom:6}}>Sin barcos cargados</div>
                <div style={{fontSize:10,marginBottom:12}}>Carga la flota primero desde el paso anterior</div>
                <Btn v="← Volver a cargar flota" onClick={()=>setStep(3)} c="acc" fw/>
              </div>
            ) : (<>
            <div style={{marginBottom:10}}>
              {selectedClass&&selectedClass!=="todas"&&(
                <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",background:`${ACC}15`,border:`1px solid ${ACC}33`,borderRadius:7,marginBottom:8}}>
                  <span style={{fontSize:12}}>⛵</span>
                  <span style={{fontSize:11,color:ACC,fontWeight:700}}>{selectedClass}</span>
                  <span style={{fontSize:10,color:T2,marginLeft:"auto"}}>{fleet.length} barcos</span>
                </div>
              )}
              <div style={{fontSize:11,color:T2,lineHeight:1.5}}>
                ¿Cuál es <strong style={{color:T1}}>tu barco</strong>? Se marcará con ⭐ y verás tu clasificación relativa a los demás.
              </div>
            </div>
            <div style={{maxHeight:260,overflowY:"auto",marginBottom:12}}>
              {fleet.map(b=>(
                <button key={b.id} onClick={()=>setOwnId(b.id)} style={{
                  display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",
                  background:ownId===b.id?`${b.color}25`:CARD2,
                  border:`1px solid ${ownId===b.id?b.color:BDR}`,
                  borderLeft:`4px solid ${b.color}`,
                  borderRadius:9,marginBottom:5,textAlign:"left",color:T1
                }}>
                  <Dot c={b.color} z={ownId===b.id?13:10}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:ownId===b.id?800:500,color:ownId===b.id?b.color:T1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                      {b.name}
                    </div>
                    <div style={{fontSize:9,color:T2}}>{b.sailNo}{b.cls?" · "+b.cls:""}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {hasValidRating(b,scoring)
                      ? <span style={{fontSize:11,fontFamily:"monospace",color:CYN}}>{ratingToD(b,14,scoring)?.toFixed(1)}</span>
                      : <span style={{fontSize:9,color:RED,fontWeight:700}}>sin cert.</span>}
                    {ownId===b.id&&<div style={{fontSize:14,lineHeight:1}}>⭐</div>}
                  </div>
                </button>
              ))}
            </div>
            {!ownId&&<div style={{color:GLD,fontSize:11,marginBottom:8}}>⚠️ Selecciona tu barco para continuar</div>}

            {/* Modo de scoring — editable luego por regata */}
            <div style={{background:CARD2,borderRadius:9,padding:"10px 11px",marginBottom:10}}>
              <div style={{fontSize:10,color:T2,marginBottom:6,fontWeight:700}}>📐 Modo de cálculo (cómo se corrige el tiempo)</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {SCORING_MODES.map(m=>(
                  <button key={m.key} onClick={()=>setScoring(m.key)} style={{
                    padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                    background:scoring===m.key?ACC:CARD,color:scoring===m.key?"#fff":T2,
                    border:`1px solid ${scoring===m.key?ACC:BDR}`}}>{m.label}</button>
                ))}
              </div>
              <div style={{fontSize:9,color:T3,marginTop:6,lineHeight:1.5}}>
                Windward/Leeward para barlovento-sotavento · Coastal para regatas largas. ToT (tiempo) o ToD (distancia) según anuncio de regata.
              </div>
            </div>

            {/* Aviso de barcos sin certificado para el modo elegido */}
            {(()=>{ const pend=fleet.filter(b=>!hasValidRating(b,scoring)); return pend.length>0&&(
              <div style={{background:`${RED}12`,border:`1px solid ${RED}40`,borderRadius:9,padding:"9px 11px",marginBottom:10,fontSize:10,color:RED,lineHeight:1.6}}>
                ⚠️ <strong>{pend.length} barco{pend.length>1?"s":""} sin rating válido</strong> para {scoringMode(scoring).label}: {pend.slice(0,6).map(b=>b.name).join(", ")}{pend.length>6?"…":""}.<br/>
                <span style={{color:T2}}>Entrarán como "pendientes" y no puntuarán hasta que subas su certificado ORC en ⚙️ Barcos.</span>
              </div>
            );})()}

            {err&&<div style={{color:RED,fontSize:11,marginBottom:8}}>{err}</div>}
            <div style={{display:"flex",gap:7}}>
              <Btn v="← Atrás" onClick={()=>setStep(foundClasses.length>1?"3c":3)} c="dim"/>
              <Btn v="✓ Crear campeonato" onClick={finish} c="grn" fw lg dis={!ownId||!hasValidRating(fleet.find(b=>b.id===ownId),scoring)}/>
            </div>
            </>)}
          </>
        )}
      </div>
    </div>
  );
}

function TabHome({champsList, currentChampId, state, onSelect, onDelete, onNew, onSyncOrc}){
  const [confirm2,setConfirm2] = useState(null);
  const [clearing,setClearing] = useState(false);
  const [syncing, setSyncing]  = useState(false);
  const [syncMsg, setSyncMsg]  = useState("");

  const clearStorage = async()=>{
    setClearing(true);
    try{
      localStorage.removeItem("orc-v7");
      localStorage.removeItem("orc-champs-idx");
      Object.keys(localStorage).filter(k=>k.startsWith("orc-ch-")).forEach(k=>localStorage.removeItem(k));
      window.location.reload();
    }catch{ setClearing(false); }
  };

  const syncOrc = async()=>{
    if(!state.champ?.resultsUrl){ setSyncMsg("⚠️ Añade la URL en ⚙️ Config → Regata → URL resultados"); return; }
    setSyncing(true); setSyncMsg("Conectando con ORC...");
    const data = await fetchOrcResults(state.champ.resultsUrl);
    if(data){
      onSyncOrc(data);
      setSyncMsg(`✓ ${data.numRaces||0} pruebas · ${data.overallStandings?.length||0} barcos`);
    } else {
      setSyncMsg("No se pudieron obtener resultados. Verifica la URL.");
    }
    setSyncing(false);
  };

  return(
    <div style={{overflowY:"auto",height:"100%",padding:"16px 14px"}}>
      <ConfirmDialog msg={confirm2?.msg} onOk={()=>{confirm2?.onOk();setConfirm2(null);}} onCancel={()=>setConfirm2(null)}/>

      <div style={{textAlign:"center",padding:"14px 0 18px"}}>
        <div style={{fontSize:44,marginBottom:6}}>⛵</div>
        <h1 style={{fontSize:22,fontWeight:800,color:T1,letterSpacing:-1,marginBottom:3}}>ORC Race Tracker</h1>
        <p style={{fontSize:10,color:T2}}>Clasificación ORC en tiempo real · v9</p>
      </div>

      <Btn v="＋ Nuevo campeonato" onClick={onNew} c="grn" fw lg st={{marginBottom:10}}/>

      {champsList.length===0 ? (
        <div style={{textAlign:"center",padding:"20px 16px",background:CARD,borderRadius:12,border:`1px solid ${BDR}`}}>
          <div style={{fontSize:10,color:T2,lineHeight:1.6,marginBottom:16}}>
            No se encontraron campeonatos guardados.<br/>
            Si usabas la versión anterior, puede que el formato haya cambiado.<br/>
            Crea un nuevo campeonato o limpia los datos para empezar de cero.
          </div>
          <Btn v={clearing?"Limpiando...":"🗑 Limpiar datos y empezar de nuevo"}
            onClick={()=>setConfirm2({
              msg:"¿Limpiar TODOS los datos guardados? Se borrarán todos los campeonatos de este dispositivo.",
              onOk:()=>setTimeout(()=>setConfirm2({
                msg:"⚠️ ÚLTIMA confirmación: esto NO se puede deshacer. ¿Seguro que quieres borrar todo?",
                onOk:clearStorage
              }),50)
            })}
            c="red" fw dis={clearing}/>
        </div>
      ):(
        champsList.map(ch=>{
          const isActive = ch.id===currentChampId;
          return(
            <div key={ch.id} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 13px",background:isActive?`${ACC}18`:CARD,border:`1px solid ${isActive?ACC:BDR}`,borderLeft:`4px solid ${isActive?ACC:T3}`,borderRadius:12,marginBottom:8,cursor:"pointer"}}
              onClick={()=>onSelect(ch.id)}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:isActive?ACC:"#fff",marginBottom:3,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{ch.name}</div>
                <div style={{fontSize:10,color:T2}}>
                  {ch.racesCount||0} prueba{ch.racesCount!==1?"s":""} · {ch.fleetCount||0} barcos
                  {isActive&&<span style={{color:GRN,marginLeft:8}}>● activo</span>}
                </div>
                {ch.createdAt&&<div style={{fontSize:9,color:T3,marginTop:2}}>{new Date(ch.createdAt).toLocaleDateString("es-ES")}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();onSelect(ch.id);}} style={{padding:"6px 12px",background:isActive?GRN:ACC,color:"#fff",borderRadius:7,fontSize:11,fontWeight:700,border:"none",whiteSpace:"nowrap"}}>
                  {isActive?"✓ Activo":"Abrir →"}
                </button>
                <button onClick={e=>{e.stopPropagation();setConfirm2({msg:`¿Eliminar "${ch.name}"?`,onOk:()=>onDelete(ch.id)});}} style={{padding:"4px 8px",background:"none",color:RED,borderRadius:7,fontSize:10,fontWeight:700,border:`1px solid ${RED}44`}}>
                  🗑 Borrar
                </button>
              </div>
            </div>
          );
        })
      )}

      <div style={{marginTop:16,padding:"10px 13px",background:CARD2,borderRadius:8,fontSize:10,color:T2,lineHeight:1.6}}>
        💡 <strong style={{color:T1}}>Multi-dispositivo:</strong> Abre este mismo artifact en otro móvil y comparte el estado en tiempo real.
      </div>
    </div>
  );
}

// ── PESTAÑA REGATAS — gestión de pruebas y recorrido ─────────────────────────
function TabRegatas({state, setState, race}){
  const [sub, setSub] = useState("regatas");
  const [confirmR, setConfirmR] = useState(null);

  const co = race?.course||DCOURSE;
  const coastalLegs = co.coastalLegs||[];
  const updCourse = (k,v) => setState(s=>({...s, races:s.races.map(r=>r.id===s.activeRaceId?{...r,course:{...r.course,[k]:v}}:r)}));

  const Slider = ({label,k,min,max,step,unit=""})=>(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,gap:8}}>
        <span style={{fontSize:11,color:T2}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <input type="number" min={min} max={max} step={step} value={co[k]??0}
            onChange={e=>{const v=e.target.value===""?0:+e.target.value; updCourse(k, Math.min(max,Math.max(min,v)));}}
            style={{width:58,textAlign:"right",fontFamily:"monospace",fontSize:13,fontWeight:700,color:T1,padding:"4px 6px"}}/>
          <span style={{fontSize:11,color:T2}}>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={co[k]||0}
        onChange={e=>updCourse(k,+e.target.value)}
        style={{width:"100%",accentColor:ACC}}/>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <ConfirmDialog msg={confirmR?.msg} onOk={()=>{confirmR?.onOk();setConfirmR(null);}} onCancel={()=>setConfirmR(null)}/>
      {/* Sub-tabs */}
      <div style={{display:"flex",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        {[["regatas","🚩 Regatas"],["recorrido","⚓ Recorrido"]].map(([k,l])=>(
          <button key={k} onClick={()=>setSub(k)}
            style={{flex:1,padding:"10px 4px",background:"none",fontSize:12,fontWeight:700,
              color:sub===k?ACC:T2,borderBottom:sub===k?`2px solid ${ACC}`:"2px solid transparent",
              border:"none",cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>

        {/* ── GESTIÓN DE PRUEBAS ── */}
        {sub==="regatas"&&(<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:T1}}>Pruebas</div>
              <div style={{fontSize:10,color:T2}}>{state.races.length} pruebas · {state.races.filter(r=>r.startTime).length} completadas</div>
            </div>
            <button onClick={()=>{
              const id=`r${state.races.length+1}_${Date.now()}`;
              setState(s=>({...s,
                races:[...s.races,{id,name:`Prueba ${s.races.length+1}`,startTime:null,countdownAt:null,finishedAt:null,passages:[],course:{...race.course},discarded:false}],
                activeRaceId:id
              }));
            }} style={{padding:"8px 16px",background:GRN,color:"#fff",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
              ＋ Nueva prueba
            </button>
          </div>

          {/* Prueba activa — controles de lanzamiento */}
          {race&&(
            <Card st={{marginBottom:10,border:`2px solid ${ACC}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:ACC,fontWeight:700,marginBottom:2}}>PRUEBA ACTIVA</div>
                  <div style={{fontSize:14,fontWeight:800,color:T1}}>{race.name}</div>
                </div>
                {race.startTime
                  ?<div style={{fontSize:10,padding:"4px 8px",borderRadius:5,background:`${GRN}22`,color:GRN,fontWeight:700}}>✅ Completada / En curso</div>
                  :<div style={{fontSize:10,padding:"4px 8px",borderRadius:5,background:`${GLD}22`,color:GLD,fontWeight:700}}>⏳ Pendiente</div>
                }
              </div>

              {/* Override de scoring por prueba */}
              <div style={{background:CARD2,borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                <div style={{fontSize:9,color:T2,marginBottom:5,fontWeight:700}}>📐 Cálculo de esta prueba {race.scoringMode?"":"(usa el del campeonato)"}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  <button onClick={()=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,scoringMode:null}:r)}))}
                    style={{padding:"4px 9px",borderRadius:16,fontSize:10,fontWeight:700,
                      background:!race.scoringMode?GLD:CARD,color:!race.scoringMode?"#000":T2,border:`1px solid ${!race.scoringMode?GLD:BDR}`}}>
                    Campeonato ({scoringMode(state.champ.scoringMode||"AP_ToD").label})
                  </button>
                  {SCORING_MODES.map(m=>(
                    <button key={m.key} onClick={()=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,scoringMode:m.key}:r)}))}
                      style={{padding:"4px 9px",borderRadius:16,fontSize:10,fontWeight:700,
                        background:race.scoringMode===m.key?ACC:CARD,color:race.scoringMode===m.key?"#fff":T2,border:`1px solid ${race.scoringMode===m.key?ACC:BDR}`}}>{m.label}</button>
                  ))}
                </div>
              </div>
              {!race.startTime&&(
                <div>
                  <div style={{fontSize:10,color:T2,marginBottom:6}}>Cuenta atrás antes de la salida:</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {[1,2,3,4,5].map(m=>(
                      <button key={m} onClick={()=>{
                        const t = Date.now()+m*60*1000;
                        setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,countdownAt:t}:r)}));
                      }} style={{flex:1,padding:"8px 0",borderRadius:7,background:CARD2,color:T1,fontSize:12,fontWeight:700,border:`1px solid ${BDR}`,cursor:"pointer",minWidth:44}}>
                        {m}′
                      </button>
                    ))}
                    <button onClick={()=>{
                      setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,startTime:Date.now(),countdownAt:null}:r)}));
                    }} style={{flex:2,padding:"8px 0",borderRadius:7,background:GRN,color:"#fff",fontSize:12,fontWeight:800,border:"none",cursor:"pointer"}}>
                      🚀 SALIDA YA
                    </button>
                  </div>
                </div>
              )}
              {race.startTime&&(
                <button onClick={()=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?{...r,startTime:null,countdownAt:null,passages:[]}:r)}))}
                  style={{width:"100%",padding:"7px 0",borderRadius:7,background:`${RED}22`,color:RED,fontSize:11,fontWeight:700,border:`1px solid ${RED}44`,cursor:"pointer"}}>
                  ↺ Reiniciar prueba
                </button>
              )}
            </Card>
          )}

          {/* Lista de todas las pruebas */}
          {state.races.length===0 && (
            <div style={{textAlign:"center",padding:"24px 16px",background:CARD2,borderRadius:10,color:T2,fontSize:11,lineHeight:1.6}}>
              No hay pruebas de cronometraje.<br/>
              <span style={{fontSize:10,color:T3}}>Pulsa "＋ Nueva prueba" para cronometrar una regata, o usa solo los resultados oficiales en 📊 Result.</span>
            </div>
          )}
          {state.races.map((r,idx)=>{
            const isActive = r.id===state.activeRaceId;
            const passCount = r.passages?.length||0;
            return(
              <div key={r.id} style={{marginBottom:6,borderRadius:9,border:`2px solid ${isActive?ACC:r.discarded?`${RED}44`:BDR}`,background:isActive?`${ACC}0a`:CARD,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px"}}>
                  <div style={{width:28,height:28,borderRadius:7,background:isActive?ACC:CARD2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:900,color:isActive?"#fff":T2}}>{idx+1}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <input value={r.name} onChange={e=>setState(s=>({...s,races:s.races.map(x=>x.id===r.id?{...x,name:e.target.value}:x)}))}
                      style={{background:"transparent",border:"none",color:isActive?ACC:r.discarded?T3:T1,fontSize:12,fontWeight:700,padding:0,width:"100%",textDecoration:r.discarded?"line-through":"none"}}/>
                    <div style={{fontSize:9,color:T2}}>
                      {r.discarded?"🗑 Descartada":r.startTime?"✅ Completada":r.countdownAt?"⏰ Cuenta atrás":passCount>0?`${passCount} pasos`:"Pendiente"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {!isActive&&<button onClick={()=>setState(s=>({...s,activeRaceId:r.id}))}
                      style={{padding:"4px 8px",borderRadius:5,background:ACC,color:"#fff",fontSize:9,fontWeight:700,border:"none",cursor:"pointer"}}>Activar</button>}
                    <button onClick={()=>setState(s=>({...s,races:s.races.map(x=>x.id===r.id?{...x,discarded:!x.discarded}:x)}))}
                      title={r.discarded?"Recuperar":"Descartar"}
                      style={{padding:"4px 8px",borderRadius:5,background:r.discarded?`${GRN}22`:`${GLD}22`,color:r.discarded?GRN:GLD,fontSize:9,fontWeight:700,border:"none",cursor:"pointer"}}>
                      {r.discarded?"↩":"⊘"}
                    </button>
                    <button onClick={()=>setConfirmR({msg:`¿Eliminar "${r.name}" definitivamente?`,onOk:()=>setState(s=>{
                        const races=s.races.filter(x=>x.id!==r.id);
                        const activeRaceId = s.activeRaceId===r.id ? (races[0]?.id||null) : s.activeRaceId;
                        return{...s,races,activeRaceId};
                      })})}
                      title="Eliminar prueba"
                      style={{padding:"4px 8px",borderRadius:5,background:`${RED}18`,color:RED,fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>)}


        {/* ── CONFIGURACIÓN DEL RECORRIDO ── */}
        {sub==="recorrido"&&(<>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:800,color:T1,marginBottom:2}}>Recorrido</div>
            <div style={{fontSize:10,color:T2}}>Prueba activa: <strong style={{color:ACC}}>{race?.name||"—"}</strong></div>
          </div>

          <Card st={{marginBottom:10}}>
            <Lbl v="Tipo de regata"/>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              {[["wl","⬆️ W/L Barlovento-Sotavento"],["coastal","🗺 Costero"]].map(([v,l])=>(
                <button key={v} onClick={()=>updCourse("raceType",v)}
                  style={{flex:1,padding:"8px 0",borderRadius:7,fontSize:10,fontWeight:700,
                    background:co.raceType===v||(!co.raceType&&v==="wl")?ACC:CARD2,
                    color:co.raceType===v||(!co.raceType&&v==="wl")?"#fff":T2,border:"none",cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          </Card>

          {(co.raceType||"wl")==="wl"&&(<>
            <Card st={{marginBottom:10}}>
              <Lbl v="Vueltas"/>
              <div style={{display:"flex",gap:6,marginBottom:4}}>
                {[1,2,3,4].map(v=>(
                  <button key={v} onClick={()=>updCourse("vueltas",v)}
                    style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                      background:(co.vueltas||2)===v?ACC:CARD2,color:(co.vueltas||2)===v?"#fff":T2,border:`1px solid ${(co.vueltas||2)===v?ACC:BDR}`}}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{fontSize:9,color:T3}}>Tramos: {buildLegs(co.vueltas||2).map(L=>L.label).join(" · ")}</div>
            </Card>
            <Card st={{marginBottom:10}}>
              <Lbl v="Distancias (nm)"/>
              <Slider label="Distancia Boya 1 (Barlovento)" k="mark1Dist" min={0.5} max={5} step={0.1} unit=" nm"/>
              <Slider label="Distancia Offset 1a" k="mark1aDist" min={0} max={0.5} step={0.05} unit=" nm"/>
              {co.mark1aDist>0&&<Slider label="Distancia Puerta (Gate)" k="gateDist" min={0.1} max={0.6} step={0.05} unit=" nm"/>}
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <span style={{fontSize:10,color:T2,flex:1}}>Lado offset 1a</span>
                {["port","starboard"].map(s=>(
                  <button key={s} onClick={()=>updCourse("mark1aSide",s)}
                    style={{padding:"4px 10px",borderRadius:5,fontSize:10,fontWeight:700,
                      background:co.mark1aSide===s?PRP:CARD2,color:co.mark1aSide===s?"#fff":T2,border:"none",cursor:"pointer"}}>
                    {s==="port"?"Babor (Port)":"Estribor (Stbd)"}
                  </button>
                ))}
              </div>
            </Card>

            <Card st={{marginBottom:10}}>
              <Lbl v="Diagrama del recorrido"/>
              <CourseDiagram course={co} passages={[]} fleet={[]} started={false} legRank={{}} boatProg={{}}/>
            </Card>
          </>)}

          {(co.raceType)==="coastal"&&(<>
            <Card st={{marginBottom:10}}>
              <Lbl v="Tramos costeros"/>
              {coastalLegs.length===0&&<div style={{fontSize:10,color:T3,marginBottom:8}}>Sin tramos. Añade el primer tramo.</div>}
              {coastalLegs.map((leg,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"6px 8px",background:CARD2,borderRadius:7}}>
                  <span style={{fontSize:10,color:T2,width:18}}>{i+1}</span>
                  <input value={leg.name||""} onChange={e=>updCourse("coastalLegs",coastalLegs.map((l,j)=>j===i?{...l,name:e.target.value}:l))} placeholder="Nombre tramo" style={{flex:1,fontSize:10}}/>
                  <input type="number" value={leg.distNm||""} onChange={e=>updCourse("coastalLegs",coastalLegs.map((l,j)=>j===i?{...l,distNm:+e.target.value}:l))} placeholder="nm" style={{width:50,fontSize:10}}/>
                  <button onClick={()=>updCourse("coastalLegs",coastalLegs.filter((_,j)=>j!==i))} style={{padding:"2px 7px",borderRadius:4,background:`${RED}22`,color:RED,fontSize:12,border:"none",cursor:"pointer"}}>✕</button>
                </div>
              ))}
              <button onClick={()=>updCourse("coastalLegs",[...coastalLegs,{name:`Tramo ${coastalLegs.length+1}`,distNm:1.0}])}
                style={{width:"100%",padding:"7px 0",borderRadius:7,background:CARD2,color:ACC,fontSize:11,fontWeight:700,border:`1px dashed ${ACC}`,cursor:"pointer"}}>
                ＋ Añadir tramo
              </button>
              {coastalLegs.length>0&&<div style={{fontSize:9,color:T2,marginTop:6}}>Total: {coastalLegs.reduce((a,l)=>a+(l.distNm||0),0).toFixed(2)} nm · {coastalLegs.length} tramos</div>}
            </Card>
          </>)}

          <Card st={{marginBottom:10}}>
            <Lbl v="Viento estimado"/>
            <Slider label="Viento" k="windKnots" min={2} max={35} step={1} unit=" kts"/>
          </Card>
        </>)}

      </div>
    </div>
  );
}

export default function App(){
  const [state,      setState]      = useState(INIT);
  const [tab,        setTab]        = useState(0); // Empieza en Inicio
  const [ready,      setReady]      = useState(false);
  const [sync,       setSync]       = useState(false);
  const [champsList, setChampsList] = useState([]);
  const [currentId,  setCurrentId]  = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  // Rol del dispositivo actual (guardado localmente, no compartido)
  const [role,       setRole]       = useState(()=>localStorage.getItem('orc-role')||'patron');
  const [theme,      setTheme]      = useState(()=>localStorage.getItem('orc-theme')||'dark');
  useEffect(()=>{
    try{
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('orc-theme', theme);
      // color de fondo del navegador (barra de estado móvil)
      document.documentElement.style.background = theme==='light' ? '#f2f5f9' : '#070d18';
    }catch{}
  },[theme]);
  const [showRoles,  setShowRoles]  = useState(false);
  const saveRef    = useRef(false);
  const lastSaveTs = useRef(0);
  const champsRef  = useRef([]);
  useEffect(()=>{ champsRef.current=champsList; },[champsList]);

  // Device ID único por dispositivo — evita que el polling sobreescriba el estado local
  const DEVICE_ID = useMemo(()=>{
    let id = localStorage.getItem('orc-device-id');
    if(!id){ id = Math.random().toString(36).slice(2,10); localStorage.setItem('orc-device-id',id); }
    return id;
  },[]);

  const ROLES = [
    {id:"patron",     icon:"👨‍✈️", label:"Patrón",          desc:"Control total",                    col:GLD},
    {id:"barlovento", icon:"⬆️",  label:"Boya 1 Barlovento",desc:"Registra pasos en barlovento/offset",col:GRN},
    {id:"sotavento",  icon:"⬇️",  label:"Puerta 4s/4p",     desc:"Registra pasos en sotavento",       col:CYN},
    {id:"espectador", icon:"👁️",  label:"Espectador",        desc:"Solo ver clasificación",            col:T2},
  ];
  const currentRole = ROLES.find(r=>r.id===role)||ROLES[0];

  const changeRole = (r) => {
    setRole(r);
    localStorage.setItem('orc-role', r);
    setShowRoles(false);
    if(r!=='patron') setTab(2); // Ir a En Vivo al seleccionar rol de tripulante
  };

  // Cargar estado inicial — con migración del formato antiguo y manejo de errores
  useEffect(()=>{
    const init = async () => {
      try {
        const [savedState, idx] = await Promise.all([loadS(), loadIdx()]);

        // ── Caso 1: ya tiene índice de campeonatos (versión nueva) ───────────
        if (idx && idx.length > 0) {
          setChampsList(idx);
          const activeId = savedState?._champId || idx[0].id;
          setCurrentId(activeId);
          if (savedState?._champId && savedState._champId !== activeId) {
            const ch = await loadCh(activeId);
            if (ch) setState(ch);
          } else if (savedState) {
            setState(savedState);
          }
          setTab(2); // ← datos existentes: ir directo a En Vivo

        // ── Caso 2: tiene datos del formato antiguo (sin _champId) ───────────
        } else if (savedState && savedState.champ && !savedState._champId) {
          const migrId = "champ_migrado";
          const migrated = {...savedState, _champId: migrId};
          const entry = {
            id: migrId,
            name: savedState.champ?.name || "Mi campeonato",
            racesCount: savedState.races?.length || 0,
            fleetCount: savedState.fleet?.length || 0,
            createdAt: Date.now()
          };
          setChampsList([entry]);
          setCurrentId(migrId);
          setState(migrated);
          await saveIdx([entry]);
          await saveCh(migrId, migrated);
          await saveS({...migrated, _champId: migrId});
          setTab(2); // ← datos migrados: ir directo a En Vivo

        // ── Caso 3: primera vez (sin datos) → mostrar Home ───────────────────
        } else {
          const defaultId = "champ_default";
          const initState = {...INIT, _champId: defaultId};
          const entry = {
            id: defaultId,
            name: INIT.champ.name,
            racesCount: 1,
            fleetCount: CLASS0.length,
            createdAt: Date.now()
          };
          setChampsList([entry]);
          setCurrentId(defaultId);
          setState(initState);
          await saveIdx([entry]);
          await saveCh(defaultId, initState);
          setTab(0); // ← primera vez: Home para configurar
        }
      } catch(e) {
        console.error("Error cargando estado:", e);
        // Aunque falle, mostrar pantalla de inicio vacía
      }
      setReady(true);
      saveRef.current = true;
    };
    init();
  },[]);

  // Auto-sincronizar resultados ORC al abrir la app (máx 1 vez cada 10 min)
  useEffect(()=>{
    if(!ready) return;
    const resultsUrl = state.champ?.resultsUrl;
    if(!resultsUrl) return;
    const lastSync = state.champ?.orcLastSync||0;
    const tenMin = 10*60*1000;
    if(Date.now()-lastSync < tenMin) return; // No re-fetch si hace menos de 10 min
    fetchOrcResults(resultsUrl).then(data=>{
      if(data?.overallStandings?.length){
        wrappedSetState(s=>({...s, champ:{...s.champ,
          orcStandings: data.overallStandings,
          orcRaces: data.races||[],
          orcNumRaces: data.numRaces||0,
          name: data.eventName||s.champ.name,
          orcLastSync: Date.now()
        }}));
      }
    });
  // eslint-disable-next-line
  },[ready]);

  const wrappedSetState = useCallback(fn=>{
    setState(prev=>{
      const next = typeof fn==="function"?fn(prev):fn;
      if(saveRef.current && currentId){
        lastSaveTs.current = Date.now();
        setSync(true);
        const stateToSave = {...next, _champId:currentId, _deviceId:DEVICE_ID};
        // Guardar el campeonato activo
        saveCh(currentId, stateToSave);
        // Guardar en la clave activa (para sincronización)
        saveS(stateToSave).then(()=>setTimeout(()=>setSync(false),600));
        // Actualizar índice con nombre y conteos actualizados
        const updatedIdx = champsRef.current.map(c=>c.id===currentId
          ? {...c, name:next.champ?.name||c.name, racesCount:next.races?.length||c.racesCount, fleetCount:next.fleet?.length||c.fleetCount}
          : c);
        setChampsList(updatedIdx);
        saveIdx(updatedIdx);
      }
      return next;
    });
  },[currentId]);

  // Polling — solo aplica estado de OTRO dispositivo para evitar auto-revert
  useEffect(()=>{
    if(!ready)return;
    const id=setInterval(()=>{
      if(Date.now()-lastSaveTs.current < 2500)return;
      loadS().then(s=>{
        // Solo actualizar si el estado viene de un dispositivo diferente al nuestro
        if(s && s._deviceId && s._deviceId !== DEVICE_ID) setState(s);
      });
    },3000);
    return()=>clearInterval(id);
  },[ready, DEVICE_ID]);

  // Realtime (Supabase) — refresca al instante cuando otro dispositivo cambia algo.
  // Solo activo si la nube está configurada y el campeonato existe en ella.
  useEffect(()=>{
    if(!ready || !cloud.isCloudEnabled()) return;
    const cloudId = state?._cloudId;
    if(!cloudId) return;
    const unsub = cloud.subscribe(cloudId, async ()=>{
      // Evitar pisar un cambio propio recién guardado
      if(Date.now()-lastSaveTs.current < 1500) return;
      const fresh = await loadCh(currentId);
      if(fresh) setState(prev=>({...fresh, _champId:prev._champId, _cloudId:cloudId}));
    });
    return unsub;
  },[ready, state?._cloudId, currentId, DEVICE_ID]);

  // Seleccionar un campeonato diferente
  const selectChamp = useCallback(async(champId)=>{
    if(champId===currentId){setTab(2);return;}
    // Guardar actual
    if(currentId) await saveCh(currentId,{...state,_champId:currentId});
    // Cargar nuevo
    const ch = await loadCh(champId);
    const newState = ch || {...INIT, _champId:champId};
    setState(newState);
    setCurrentId(champId);
    lastSaveTs.current = Date.now();
    await saveS({...newState,_champId:champId});
    setTab(2); // Ir a En Vivo
  },[currentId, state]);

  // Crear nuevo campeonato desde el wizard
  const createChamp = useCallback(async({name, fleet, ownId, mainUrl="", resultsUrl="", docsUrl="", photosUrl="", entryListUrl="", scoringMode=DEFAULT_SCORING, discardEvery=4, discardMin=4})=>{
    const id = `champ_${Date.now()}`;
    const newState = {
      ...INIT, _champId:id,
      champ:{name, ownId, mainUrl, resultsUrl, docsUrl, photosUrl, entryListUrl, scoringMode, discardEvery, discardMin},
      fleet: fleet.map(b=>({...b})),
      races:[{id:"r1",name:"Prueba 1",startTime:null,countdownAt:null,finishedAt:null,passages:[],course:DCOURSE,discarded:false}],
      activeRaceId:"r1"
    };
    const entry = {id, name, racesCount:1, fleetCount:fleet.length, createdAt:Date.now()};
    const newIdx = [...champsRef.current, entry];
    setChampsList(newIdx);
    await saveIdx(newIdx);
    await saveCh(id, newState);
    // Guardar actual antes de cambiar
    if(currentId) await saveCh(currentId,{...state,_champId:currentId});
    setState(newState);
    setCurrentId(id);
    lastSaveTs.current=Date.now();
    await saveS({...newState,_champId:id});
    setShowWizard(false);
    setTab(2);
  },[currentId, state]);

  // Eliminar campeonato
  const handleDelete = useCallback(async(champId)=>{
    await deleteCh(champId);
    const newIdx = champsRef.current.filter(c=>c.id!==champId);
    setChampsList(newIdx);
    await saveIdx(newIdx);
    if(champId===currentId){
      if(newIdx.length>0){ await selectChamp(newIdx[0].id); }
      else { setState(INIT); setCurrentId(null); }
    }
  },[currentId, selectChamp]);

  if(!ready)return(
    <div style={{background:BG,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:T2}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>⛵</div><div>Cargando ORC Race Tracker…</div></div>
    </div>
  );

  const activeRace=state.races?.find(r=>r.id===state.activeRaceId);
  const TABS=[{icon:"🏠",label:"Inicio"},{icon:"🏁",label:"Regatas"},{icon:"🚩",label:"En Vivo"},{icon:"📋",label:"Tablas"},{icon:"📊",label:"Result."},{icon:"⚙️",label:"Config"}];

  return(
    <ErrorBoundary>
      {showWizard&&<NewChampWizard onClose={()=>setShowWizard(false)} onCreate={createChamp}/>}

      {/* Modal selector de rol */}
      {showRoles&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9998,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowRoles(false)}>
          <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:"14px 14px 0 0",padding:"16px 14px 28px",width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,fontWeight:800,color:T1,marginBottom:4,textAlign:"center"}}>Selecciona tu rol en esta regata</div>
            <div style={{fontSize:10,color:T2,textAlign:"center",marginBottom:14}}>Cada dispositivo puede tener un rol distinto · Se guarda localmente</div>
            {ROLES.map(r=>(
              <button key={r.id} onClick={()=>changeRole(r.id)} style={{
                display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",
                background:role===r.id?`${r.col}22`:CARD2,
                border:`1px solid ${role===r.id?r.col:BDR}`,borderLeft:`4px solid ${r.col}`,
                borderRadius:10,marginBottom:8,textAlign:"left",color:T1
              }}>
                <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:r.col}}>{r.label}</div>
                  <div style={{fontSize:10,color:T2}}>{r.desc}</div>
                </div>
                {role===r.id&&<span style={{color:r.col,fontSize:14}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{background:BG,height:"100dvh",maxHeight:"100dvh",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",overflow:"hidden"}}>
        <style>{CSS}</style>
        {/* Header con rol y selector */}
        <div style={{padding:"5px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0,display:"flex",alignItems:"center",gap:7}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontSize:11,fontWeight:700,color:T1}}>{state.champ?.name||"ORC Race Tracker"}</div>
              <span style={{fontSize:8,background:GRN,color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:800}}>v9</span>
            </div>
            <div style={{fontSize:9,color:T2}}>{activeRace?.name||"Sin prueba"} · {state.fleet?.length||0} barcos</div>
          </div>
          {sync&&<span style={{fontSize:9,color:GRN}}>● </span>}
          {/* Interruptor de tema claro/oscuro */}
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title="Cambiar tema" style={{
            display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,
            background:CARD2,border:`1px solid ${BDR}`,borderRadius:18,cursor:"pointer",flexShrink:0,fontSize:14
          }}>{theme==="dark"?"☀️":"🌙"}</button>
          {/* Botón de rol — siempre visible */}
          <button onClick={()=>setShowRoles(true)} style={{
            display:"flex",alignItems:"center",gap:4,padding:"4px 9px",
            background:`${currentRole.col}22`,border:`1px solid ${currentRole.col}55`,
            borderRadius:18,cursor:"pointer",flexShrink:0
          }}>
            <span style={{fontSize:13}}>{currentRole.icon}</span>
            <span style={{fontSize:9,color:currentRole.col,fontWeight:700}}>{currentRole.label}</span>
          </button>
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {tab===0&&<TabHome champsList={champsList} currentChampId={currentId} state={state} onSelect={selectChamp} onDelete={handleDelete} onNew={()=>setShowWizard(true)} onSyncOrc={orcData=>{
            // Aplicar resultados oficiales de ORC al estado
            if(!orcData) return;
            wrappedSetState(s=>{
              // Crear/actualizar pruebas con los resultados de ORC
              const existingRaces = s.races||[];
              const newRaces = (orcData.races||[]).map((r,i)=>{
                const existing = existingRaces[i] || {id:`r${i+1}`,passages:[],course:existingRaces[0]?.course||DCOURSE};
                return {
                  ...existing,
                  id: r.id||`r${i+1}`,
                  name: r.name||`Prueba ${i+1}`,
                  orcResults: r.results||[],
                  discarded: r.mandatoryCount===false&&i>0 ? false : existing.discarded||false,
                };
              });
              // Combinar pruebas locales con las de ORC
              const merged = newRaces.length>existingRaces.length ? newRaces : existingRaces.map((er,i)=>newRaces[i]?{...er,...newRaces[i],passages:er.passages}:er);
              return {
                ...s,
                races: merged,
                activeRaceId: s.activeRaceId||merged[0]?.id||"r1",
                champ: {...s.champ, name:orcData.eventName||s.champ.name, orcStandings:orcData.overallStandings||[]}
              };
            });
          }}/> }
          {tab===1&&<TabRegatas state={state} setState={wrappedSetState} race={activeRace||state.races?.[0]||null}/>}
          {tab===2&&<TabEnVivo state={state} setState={wrappedSetState} role={role}/>}
          {tab===3&&<TabTablas state={state} race={activeRace}/>}
          {tab===4&&<TabResultados state={state} setState={wrappedSetState}/>}
          {tab===5&&<TabConfig state={state} setState={wrappedSetState} race={activeRace||state.races?.[0]||INIT.races[0]}/>}
        </div>
        {(()=>{
          const racing = !!activeRace?.startTime;        // hay prueba corriendo
          const hideBar = racing && tab===2;             // ocultar barra en regata + En Vivo
          if(hideBar) return (
            <button onClick={()=>setTab(0)} title="Mostrar menú"
              style={{position:"absolute",bottom:8,right:8,zIndex:35,width:38,height:38,borderRadius:"50%",
                background:CARD2,border:`1px solid ${BDR}`,color:T2,fontSize:16,boxShadow:"0 2px 8px #0006"}}>☰</button>
          );
          return (
            <div style={{display:"flex",background:CARD,borderTop:`1px solid ${BDR}`,flexShrink:0}}>
              {TABS.map(({icon,label},i)=>(
                <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"7px 2px 5px",background:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,borderTop:tab===i?`2px solid ${ACC}`:"2px solid transparent"}}>
                  <span style={{fontSize:16,lineHeight:1}}>{icon}</span>
                  <span style={{fontSize:7,fontWeight:700,color:tab===i?ACC:T2}}>{label}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </ErrorBoundary>
  );
}
