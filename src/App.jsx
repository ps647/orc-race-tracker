import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── ERROR BOUNDARY — muestra el error real en lugar de pantalla en blanco ──
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e.message || String(e) }; }
  componentDidCatch(e, info) { console.error("ORC Tracker error:", e, info); }
  render() {
    if (this.state.err) {
      const clearAll = async () => {
        try {
          await window.storage.delete("orc-v7", true);
          await window.storage.delete("orc-champs-idx", true);
        } catch{}
        this.setState({ err: null });
      };
      return React.createElement("div", {
        style: { padding:20, background:BG, minHeight:"100vh", color:"#fff", fontFamily:"system-ui" }
      },
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
const saveS=async(s)=>{try{await window.storage.set(SK,JSON.stringify(s),true);}catch(e){}};
const loadS=async()=>{try{const r=await window.storage.get(SK,true);return r?JSON.parse(r.value):null;}catch(e){return null;}};

const CLASS0=[
  {id:"SS",name:"SUMMER STORM",    sailNo:"USA-52",  bowNum:1,  cls:"TP 52",          gpH:556, color:"#ef4444", hullColor:"#ef4444", mainColor:"#ffffff", spiColor:"#ef4444", jibColor:"#ffffff"},
  {id:"VD",name:"VUDU",            sailNo:"MLT-52",  bowNum:2,  cls:"TP 52",          gpH:558, color:"#06b6d4", hullColor:"#06b6d4", mainColor:"#ffffff", spiColor:"#06b6d4", jibColor:"#ffffff"},
  {id:"XI",name:"XIO",             sailNo:"ITA-52",  bowNum:3,  cls:"TP 52",          gpH:557, color:"#f59e0b", hullColor:"#f59e0b", mainColor:"#ffffff", spiColor:"#f59e0b", jibColor:"#ffffff"},
  {id:"AB",name:"ARKAS BLUE MOON", sailNo:"TUR-52",  bowNum:4,  cls:"TP 52",          gpH:560, color:"#3b82f6", hullColor:"#1d4ed8", mainColor:"#ffffff", spiColor:"#3b82f6", jibColor:"#ffffff"},
  {id:"RB",name:"RED BANDIT",      sailNo:"GER-52",  bowNum:5,  cls:"TP 52",          gpH:558, color:"#dc2626", hullColor:"#111111", mainColor:"#ffffff", spiColor:"#dc2626", jibColor:"#ffffff"},
  {id:"MU",name:"MUSICA",          sailNo:"SUI-52",  bowNum:6,  cls:"TP 52",          gpH:562, color:"#8b5cf6", hullColor:"#8b5cf6", mainColor:"#ffffff", spiColor:"#8b5cf6", jibColor:"#ffffff"},
  {id:"SL",name:"SPIRIT LORINA",   sailNo:"FRA-52",  bowNum:7,  cls:"TP 52",          gpH:560, color:"#10b981", hullColor:"#10b981", mainColor:"#ffffff", spiColor:"#10b981", jibColor:"#ffffff"},
  {id:"UR",name:"URBANIA",         sailNo:"ESP-52",  bowNum:8,  cls:"TP 52",          gpH:561, color:"#fbbf24", hullColor:"#fbbf24", mainColor:"#ffffff", spiColor:"#fbbf24", jibColor:"#ffffff", own:true},
  {id:"DJ",name:"DJANGO WR",       sailNo:"ITA2-51", bowNum:9,  cls:"WALLYROCKET 51", gpH:534, color:"#f97316", hullColor:"#f97316", mainColor:"#ffffff", spiColor:"#f97316", jibColor:"#ffffff"},
  {id:"RN",name:"ROCKETNIKKA",     sailNo:"ITA3-51", bowNum:10, cls:"WALLYROCKET 51", gpH:537, color:"#e879f9", hullColor:"#e879f9", mainColor:"#ffffff", spiColor:"#e879f9", jibColor:"#ffffff"},
  {id:"KI",name:"KILARA",          sailNo:"SUI2-51", bowNum:11, cls:"WALLYROCKET 51", gpH:535, color:"#34d399", hullColor:"#34d399", mainColor:"#ffffff", spiColor:"#34d399", jibColor:"#ffffff"},
];

// Números en español para reconocimiento de voz
const NUM_ES={
  "uno":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,
  "siete":7,"ocho":8,"nueve":9,"diez":10,"once":11,
  "doce":12,"trece":13,"catorce":14,"quince":15,"dieciséis":16,
  "uno":1,"barco uno":1,"número uno":1,"barco dos":2,"número dos":2,
  "barco tres":3,"barco cuatro":4,"barco cinco":5,"barco seis":6,
  "barco siete":7,"barco ocho":8,"barco nueve":9,"barco diez":10,
};

// Interpretar entrada de voz → barco
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
const DCOURSE={mark1Dist:1.5,mark1aDist:0.15,gateDist:0.3,mark1aSide:"port",windKnots:14,countdownMin:5};
const INIT={champ:{name:"ORC World Championship 2026",ownId:"UR"},fleet:CLASS0,races:[{id:"r1",name:"Prueba 1",startTime:null,countdownAt:null,finishedAt:null,passages:[],course:DCOURSE,discarded:false}],activeRaceId:"r1"};
const LEG_DEF=[
  {n:1,mark:"Boya 1",   type:"beat", label:"Ceñida 1",    col:"#d97706"},
  {n:2,mark:"Offset 1a",type:"reach",label:"Través 1",    col:"#7c3aed"},
  {n:3,mark:"Puerta",   type:"run",  label:"Empopada 1",  col:"#0891b2"},
  {n:4,mark:"Boya 1",   type:"beat", label:"Ceñida 2",    col:"#d97706"},
  {n:5,mark:"Offset 1a",type:"reach",label:"Través 2",    col:"#7c3aed"},
  {n:6,mark:"Llegada",  type:"run",  label:"Empopada→Fin",col:"#0891b2"},
];

const BG="#070d18",CARD="#0d1826",CARD2="#111f2e",BDR="#1a3050";
const T1="#e8eef4",T2="#5a7a96",T3="#1e3a5f";
const ACC="#2563eb",GRN="#059669",RED="#dc2626",GLD="#d97706",CYN="#0891b2",PRP="#7c3aed";
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body,#root{background:${BG};color:${T1};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;height:100vh;overflow:hidden}input,select{width:100%;color:${T1};background:${CARD2};border:1px solid ${BDR};border-radius:8px;padding:8px 10px;font-size:13px;outline:none}input:focus,select:focus{border-color:${ACC}}button{cursor:pointer;border:none;outline:none}button:active{transform:scale(.95)}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${BDR}}@keyframes pop{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}.pop{animation:pop .18s ease}`;

function ft(s,plus=false){if(s==null||isNaN(s))return"--:--";const g=s<0?"-":(plus&&s>0?"+":"");const a=Math.abs(Math.round(s));const h=Math.floor(a/3600),m=Math.floor((a%3600)/60),sc=a%60;return h>0?`${g}${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`:`${g}${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;}
function vpp(gpH,tws){const bi=[1.27,1.14,1.07,1.03,1.01,1.00,.99],ri=[1.30,1.19,1.10,1.05,1.02,1.00,.99],i=WINDS.indexOf(tws);if(i<0)return{beat:gpH,reach:+(gpH*.97).toFixed(1),run:gpH};return{beat:+(gpH*bi[i]).toFixed(1),reach:+(gpH*(.97+(bi[i]-.97)*.3)).toFixed(1),run:+(gpH*ri[i]).toFixed(1)};}
function legDist(n,c){const r=Math.max(0.1,+(c.mark1Dist+c.mark1aDist-c.gateDist).toFixed(3));return[c.mark1Dist,c.mark1aDist,r,c.mark1Dist,c.mark1aDist,r][n-1]||c.mark1Dist;}
function totalDist(c){return Array.from({length:6},(_,i)=>legDist(i+1,c)).reduce((a,b)=>a+b,0);}
function computeStd(passages,startTime,fleet,course){return fleet.map(b=>{const done=passages.filter(p=>p.boatId===b.id).sort((a,z)=>z.leg-a.leg);if(!done.length||!startTime)return{b,ct:null,el:null,leg:0};const last=done[0],el=(last.realTime-startTime)/1000,dist=Array.from({length:last.leg},(_,i)=>legDist(i+1,course)).reduce((a,x)=>a+x,0);return{b,ct:b.gpH?el-b.gpH*dist:null,el,leg:last.leg};}).sort((a,z)=>a.ct!=null&&z.ct!=null?a.ct-z.ct:a.ct!=null?-1:z.ct!=null?1:0);}

const Dot=({c,z=10})=>React.createElement("span",{style:{display:"inline-block",width:z,height:z,borderRadius:"50%",background:c,flexShrink:0}});
const Mono=({v,z=13,c=CYN})=>React.createElement("span",{style:{fontFamily:"monospace",fontSize:z,fontWeight:700,color:c}},v);
const Lbl=({v})=>React.createElement("div",{style:{fontSize:9,color:T2,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}},v);
const Sep=()=>React.createElement("div",{style:{borderTop:`1px solid ${BDR}`,margin:"8px 0"}});

function Btn({v,onClick,c="acc",fw,lg,sm,dis,st={}}){
  const cols={acc:ACC,grn:GRN,red:RED,gld:GLD,cyn:CYN,dim:T3,prp:PRP};
  return React.createElement("button",{onClick,disabled:dis,style:{padding:lg?"12px 20px":sm?"5px 10px":"9px 15px",background:dis?CARD2:(cols[c]||ACC),color:dis?T2:"#fff",borderRadius:8,fontSize:lg?15:sm?11:13,fontWeight:700,width:fw?"100%":"auto",opacity:dis?.5:1,...st}},v);
}
function Card({children,st={},glow}){
  return React.createElement("div",{style:{background:CARD,border:`1px solid ${glow||BDR}`,borderLeft:glow?`3px solid ${glow}`:"",borderRadius:10,padding:"10px 13px",...st}},children);
}

// Icono visual del barco con sus colores reales
function BoatIcon({b,size=52}){
  const hull = b.hullColor||b.color||"#555";
  const main = b.mainColor||"#fff";
  const spi  = b.spiColor ||b.color||"#fff";
  const jib  = b.jibColor ||"#fff";
  return(
    <svg width={size} height={size} viewBox="0 0 52 52" style={{display:"block",flexShrink:0}}>
      {/* Casco */}
      <path d="M8,38 L44,38 L40,46 L12,46 Z" fill={hull} stroke="#00000033" strokeWidth="1"/>
      {/* Vela mayor */}
      <path d="M26,4 L26,37 L8,37 Z" fill={main} stroke="#33333355" strokeWidth=".7"/>
      {/* Génova */}
      <path d="M26,12 L26,37 L38,37 Z" fill={jib} stroke="#33333344" strokeWidth=".7"/>
      {/* Spinnaker (semicírculo) */}
      <path d="M14,20 Q26,8 38,20 L26,37 Z" fill={spi} opacity=".75" stroke="#33333333" strokeWidth=".5"/>
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

// Buscar foto del barco via API
async function findBoatPhoto(name, sailNo, cls){
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:400,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        messages:[{role:"user",content:
          `Search for a photo of the sailing yacht "${name}" ${sailNo} (${cls}) racing. I need a direct URL to an image file (ending in .jpg, .jpeg, .png or .webp). Search sailing photo sites, yacht club sites, regatta results. Return ONLY the direct image URL, nothing else.`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(i=>i.text||"").join("");
    const m = text.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?/i);
    return m ? m[0] : null;
  }catch{return null;}
}


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

function CourseDiagram({course,passages,fleet,started,onTap,legRank={}}){
  const W=380,H=310;
  const m1={x:252,y:62},m1a={x:88,y:62},g4s={x:128,y:193},g4p={x:178,y:193};
  const stPos={x:165,y:278},fin={x:272,y:278},flagX=78,cmX=165;

  const bpos=fleet.map((b,idx)=>{
    const lc=passages.filter(p=>p.boatId===b.id).length;
    // Antes de largar: todos en línea de salida
    const atStart = !started;
    let progress = 0.5;
    if (!atStart && lc<6) {
      const legNum = lc+1;
      const rank = legRank[legNum];
      if (rank && rank.length>1) {
        const pos = rank.indexOf(b.id);
        if (pos>=0) {
          // Líder cerca de la boya (0.80), último lejos (0.20)
          progress = 0.80 - (pos/(rank.length-1))*0.60;
        }
      } else if (lc===0) {
        // Leg 1: sin ranking → cerca de la salida, no a mitad de ceñida
        progress = 0.15;
      } else {
        // Recién pasado una boya → cerca del inicio del nuevo tramo
        progress = 0.20;
      }
    }
    return {b, lc, atStart, ...boatMapPos(lc, idx, fleet.length, progress, atStart)};
  });
  const lines=[
    {x1:stPos.x,y1:stPos.y,x2:m1.x,    y2:m1.y,  col:GLD,d:"8,5"},
    {x1:m1.x,   y1:m1.y,  x2:m1a.x,   y2:m1a.y, col:PRP,d:"6,4"},
    {x1:m1a.x,  y1:m1a.y, x2:g4s.x,   y2:g4s.y, col:CYN,d:"6,5"},
    {x1:g4p.x,  y1:g4p.y, x2:m1.x-5,  y2:m1.y,  col:GLD,d:"8,5"},
    {x1:m1.x-5, y1:m1.y,  x2:m1a.x-5, y2:m1a.y, col:PRP,d:"6,4"},
    {x1:m1a.x-5,y1:m1a.y, x2:fin.x,   y2:fin.y, col:CYN,d:"6,5"},
  ];
  const Mark=({x,y,label,col,side="right"})=>(
    <g>
      <polygon points={`${x},${y+13} ${x-11},${y-2} ${x+11},${y-2}`} fill={col} opacity={.9}/>
      <text x={side==="left"?x-25:x+14} y={y+5} fontSize={11} fill={T1} fontWeight="700">{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",maxHeight:310}}>
      {/* Viento */}
      <text x={10} y={20} fontSize={10} fill={T2}>Viento</text>
      <line x1={22} y1={26} x2={22} y2={60} stroke={T2} strokeWidth={2}/>
      <polygon points="22,66 17,56 27,56" fill={T2}/>
      {/* Líneas recorrido */}
      {lines.map((l,i)=><line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.col} strokeWidth={2.2} strokeDasharray={l.d} opacity={.6}/>)}
      {/* Boyas */}
      <Mark x={m1.x}  y={m1.y}  label="1 Barlvto" col={GLD}/>
      <Mark x={m1a.x} y={m1a.y} label="1a Offset"  col={PRP} side="left"/>
      <Mark x={g4s.x} y={g4s.y} label="4s"          col={CYN} side="left"/>
      <Mark x={g4p.x} y={g4p.y} label="4p"          col={CYN}/>
      {/* Salida */}
      <rect x={cmX-9} y={stPos.y-9} width={18} height={18} rx={3} fill="#556" stroke="#999" strokeWidth={1.5}/>
      <line x1={flagX} y1={stPos.y} x2={cmX} y2={stPos.y} stroke="#3b82f6" strokeWidth={3}/>
      <rect x={flagX-6} y={stPos.y-18} width={12} height={14} fill="#e67e22" rx={1}/>
      <line x1={flagX} y1={stPos.y-18} x2={flagX} y2={stPos.y} stroke="#666" strokeWidth={1.5}/>
      <text x={flagX-10} y={stPos.y+16} fontSize={10} fill={T2}>Salida</text>
      {/* Meta */}
      <line x1={cmX} y1={fin.y} x2={fin.x} y2={fin.y} stroke="#3b82f6" strokeWidth={3}/>
      <circle cx={fin.x} cy={fin.y} r={8} fill="none" stroke="#888" strokeWidth={2}/>
      <text x={fin.x-10} y={fin.y+16} fontSize={10} fill={T2}>Meta</text>
      {/* Total */}
      <text x={6} y={H-4} fontSize={10} fill={T2}>{`Total: ${totalDist(course).toFixed(2)}nm`}</text>
      {/* BARCOS — radio 20, fácilmente tapeables en móvil */}
      {bpos.map(({b,lc,x,y})=>{
        const canTap=started&&lc<6;
        const nextMark=lc<6?LEG_DEF[lc]?.mark:"FIN";
        const legCol=lc<6?LEG_DEF[lc]?.col||GLD:GRN;
        return(
          <g key={b.id}>
            {/* Círculo visible */}
            <circle cx={x} cy={y} r={20} fill={b.color}
              stroke={lc>=6?"#fff":canTap?"#fff":"#333"}
              strokeWidth={lc>=6?3:canTap?2:1} opacity={.95}/>
            <text x={x} y={y+4} fontSize={8} fill="#000" textAnchor="middle" fontWeight="800">
              {b.name.slice(0,4)}
            </text>
            {lc>=6&&<text x={x} y={y-25} fontSize={12} fill={GRN} textAnchor="middle">✓</text>}
            {canTap&&<text x={x} y={y+34} fontSize={8} fill={legCol} textAnchor="middle">→{nextMark}</text>}
            {/* Área táctil ÚLTIMA = encima en z-order SVG → funciona en móvil */}
            <circle cx={x} cy={y} r={30} fill="transparent"
              onClick={()=>canTap&&onTap&&onTap(b.id)}
              style={{cursor:canTap?"pointer":"default"}}/>
          </g>
        );
      })}
    </svg>
  );
}

// ── FICHA DE BARCO ────────────────────────────────────────────────────────
function BoatCard({b, isOwn, onUpdate, onDelete}){
  const [open,   setOpen]   = useState(false);
  const [loading,setLoading]= useState(false);
  const [imgErr, setImgErr] = useState(false);

  const searchPhoto = async()=>{
    setLoading(true); setImgErr(false);
    const url = await findBoatPhoto(b.name, b.sailNo, b.cls);
    if(url) onUpdate("photoUrl", url);
    else setImgErr(true);
    setLoading(false);
  };

  const textColor = b.hullColor ? (isDark(b.hullColor)?"#fff":"#000") : "#fff";

  return(
    <div style={{background:CARD,border:`1px solid ${open?b.color:BDR}`,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
      {/* Cabecera siempre visible */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}
        onClick={()=>setOpen(o=>!o)}>
        {/* Icono visual del barco */}
        <div style={{flexShrink:0}}>
          {b.photoUrl&&!imgErr
            ?<img src={b.photoUrl} onError={()=>setImgErr(true)}
               style={{width:52,height:52,objectFit:"cover",borderRadius:8,border:`1px solid ${BDR}`}}/>
            :<BoatIcon b={b} size={52}/>
          }
        </div>
        {/* Info básica */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <div style={{width:28,height:28,borderRadius:6,background:b.hullColor||b.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:900,color:textColor}}>{b.bowNum||"?"}</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:isOwn?b.color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
              {b.name}{isOwn?" ⭐":""}
            </div>
          </div>
          <div style={{fontSize:9,color:T2}}>{b.sailNo} · {b.cls}</div>
          {/* Mini colores de velas */}
          <div style={{display:"flex",gap:3,marginTop:4}}>
            {[["M",b.mainColor||"#fff"],["E",b.spiColor||b.color],["G",b.jibColor||"#fff"],["C",b.hullColor||b.color]].map(([l,c])=>(
              <div key={l} style={{width:18,height:18,borderRadius:4,background:c,border:`1px solid #ffffff33`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:7,color:isDark(c)?"#fff":"#000",fontWeight:700}}>{l}</span>
              </div>
            ))}
            {b.gpH&&<span style={{fontSize:9,color:CYN,marginLeft:4,fontFamily:"monospace"}}>{b.gpH}</span>}
          </div>
        </div>
        <span style={{color:T2,fontSize:14,flexShrink:0}}>{open?"▲":"▼"}</span>
      </div>

      {/* Detalles expandibles */}
      {open&&(
        <div style={{padding:"0 12px 12px",borderTop:`1px solid ${BDR}`}}>

          {/* Foto */}
          <div style={{marginTop:10,marginBottom:10}}>
            <Lbl v="Foto del barco"/>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <input value={b.photoUrl||""} onChange={e=>onUpdate("photoUrl",e.target.value)}
                  placeholder="https://... (URL de la foto)"
                  style={{marginBottom:6,fontSize:11}}/>
                <button onClick={searchPhoto} disabled={loading} style={{
                  width:"100%",padding:"7px 0",background:loading?CARD2:ACC,color:"#fff",
                  borderRadius:7,border:"none",fontSize:11,fontWeight:700,cursor:loading?"default":"pointer"
                }}>{loading?"🔍 Buscando foto...":"🔍 Buscar foto en internet"}</button>
                {imgErr&&<div style={{fontSize:9,color:RED,marginTop:4}}>No se encontró foto. Puedes pegar una URL manualmente.</div>}
              </div>
              {b.photoUrl&&!imgErr&&(
                <img src={b.photoUrl} onError={()=>setImgErr(true)}
                  style={{width:80,height:64,objectFit:"cover",borderRadius:8,border:`1px solid ${BDR}`,flexShrink:0}}/>
              )}
            </div>
          </div>

          <Sep/>

          {/* Números */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <Lbl v="Nº proa (organización)"/>
              <input type="number" min="1" max="99" value={b.bowNum||""} placeholder="1-99"
                onChange={e=>onUpdate("bowNum",+e.target.value||null)}
                style={{textAlign:"center",fontSize:16,fontWeight:900}}/>
            </div>
            <div>
              <Lbl v="Nº vela / Sail No."/>
              <input value={b.sailNo||""} placeholder="ESP-52"
                onChange={e=>onUpdate("sailNo",e.target.value)}
                style={{fontSize:13}}/>
            </div>
            <div>
              <Lbl v="GPH (s/nm)"/>
              <input type="number" step=".1" value={b.gpH||""} placeholder="560.0"
                onChange={e=>onUpdate("gpH",+e.target.value||null)}
                style={{fontFamily:"monospace",fontSize:13}}/>
            </div>
            <div>
              <Lbl v="Clase"/>
              <input value={b.cls||""} placeholder="TP 52"
                onChange={e=>onUpdate("cls",e.target.value)}
                style={{fontSize:11}}/>
            </div>
          </div>

          <Sep/>

          {/* Colores */}
          <Lbl v="Colores de velas y casco"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            <ColorField label="Mayor" value={b.mainColor} onChange={v=>onUpdate("mainColor",v)}/>
            <ColorField label="Spinnaker" value={b.spiColor} onChange={v=>onUpdate("spiColor",v)}/>
            <ColorField label="Génova" value={b.jibColor} onChange={v=>onUpdate("jibColor",v)}/>
            <ColorField label="Casco" value={b.hullColor} onChange={v=>{onUpdate("hullColor",v);onUpdate("color",v);}}/>
          </div>

          {/* Preview */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10,padding:"10px 12px",background:CARD2,borderRadius:8}}>
            <BoatIcon b={b} size={64}/>
            <div>
              <div style={{fontSize:11,color:T1,fontWeight:700,marginBottom:2}}>{b.name}</div>
              <div style={{fontSize:9,color:T2}}>Vista previa de colores</div>
              <div style={{fontSize:9,color:T2,marginTop:2}}>M={b.mainColor||"—"} E={b.spiColor||"—"}</div>
            </div>
          </div>

          {/* Eliminar */}
          <button onClick={onDelete} style={{marginTop:10,width:"100%",padding:"6px 0",background:"none",color:RED,borderRadius:7,border:`1px solid ${RED}44`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            🗑 Eliminar este barco
          </button>
        </div>
      )}
    </div>
  );
}

function TabConfig({state,setState,race}){
  const co=race.course;
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
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"10px 13px"}}>
      <Card st={{marginBottom:10}}>
        <Lbl v="Campeonato"/>
        <input value={state.champ.name} onChange={e=>setState(s=>({...s,champ:{...s.champ,name:e.target.value}}))} placeholder="Nombre"/>
      </Card>
      <Card st={{marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
          <Lbl v={`Pruebas (${state.races.length})`}/>
          <button onClick={()=>{const id="r"+(state.races.length+1);setState(s=>({...s,races:[...s.races,{id,name:`Prueba ${s.races.length+1}`,startTime:null,countdownAt:null,finishedAt:null,passages:[],course:{...race.course},discarded:false}],activeRaceId:id}));}} style={{marginLeft:"auto",padding:"3px 9px",background:GRN,color:"#fff",borderRadius:6,fontSize:11,fontWeight:700}}>+ Añadir</button>
        </div>
        {state.races.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
            <div onClick={()=>setState(s=>({...s,activeRaceId:r.id}))} style={{flex:1,display:"flex",alignItems:"center",gap:7,padding:"6px 9px",background:state.activeRaceId===r.id?`${ACC}22`:CARD2,border:`1px solid ${state.activeRaceId===r.id?ACC:BDR}`,borderRadius:7,cursor:"pointer"}}>
              <input value={r.name} onClick={e=>e.stopPropagation()} onChange={e=>setState(s=>({...s,races:s.races.map(x=>x.id===r.id?{...x,name:e.target.value}:x)}))} style={{background:"transparent",border:"none",color:state.activeRaceId===r.id?ACC:T1,fontSize:12,fontWeight:700,padding:0,flex:1}}/>
              <span style={{fontSize:9,color:r.discarded?RED:r.startTime?GRN:T2}}>{r.discarded?"DESC":r.startTime?"OK":"—"}</span>
            </div>
            <button onClick={()=>setState(s=>({...s,races:s.races.map(x=>x.id===r.id?{...x,discarded:!x.discarded}:x)}))} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:r.discarded?RED:T3,color:"#fff"}}>{r.discarded?"↩ Rest.":"🗑 Desc."}</button>
          </div>
        ))}
        <div style={{fontSize:9,color:T2,marginTop:4}}>💡 "Desc." = descartada del campeonato (no cuenta en puntos)</div>
      </Card>
      <Card st={{marginBottom:10}}>
        <Lbl v="Posición de boyas"/>
        <Slider label="Distancia Boya 1 (nm)" k="mark1Dist" min={0.3} max={5} step={0.1} unit=" nm"/>
        <Slider label="Distancia Offset 1a desde Boya 1" k="mark1aDist" min={0.05} max={0.5} step={0.05} unit=" nm"/>
        <div style={{marginBottom:10}}>
          <span style={{fontSize:11,color:T2}}>Lado del offset</span>
          <div style={{display:"flex",gap:6,marginTop:5}}>
            {["port","starboard"].map(s=><button key={s} onClick={()=>updCo("mark1aSide",s)} style={{flex:1,padding:"6px 4px",borderRadius:7,fontSize:11,fontWeight:700,background:co.mark1aSide===s?PRP:CARD2,color:co.mark1aSide===s?"#fff":T2,border:`1px solid ${co.mark1aSide===s?PRP:BDR}`}}>{s==="port"?"Babor":"Estribor"}</button>)}
          </div>
        </div>
        <Slider label="Distancia puerta desde salida" k="gateDist" min={0} max={1} step={0.05} unit=" nm"/>
      </Card>
      <Card st={{marginBottom:10}}>
        <Lbl v="Viento y cuenta atrás"/>
        <Slider label="Viento estimado" k="windKnots" min={2} max={35} step={1} unit=" kts"/>
        <Slider label="Minutos cuenta atrás" k="countdownMin" min={1} max={10} step={1} unit=" min"/>
      </Card>
      <Card st={{marginBottom:10}}>
        <Lbl v="Diagrama del recorrido"/>
        <CourseDiagram course={co} passages={race.passages} fleet={state.fleet} started={false}/>
      </Card>
      <Card st={{marginBottom:10}}>
        <Lbl v="Tu barco ⭐"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {state.fleet.map(b=>(
            <button key={b.id} onClick={()=>setState(s=>({...s,champ:{...s.champ,ownId:b.id}}))}
              style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:state.champ.ownId===b.id?b.color:CARD2,color:state.champ.ownId===b.id?"#000":T2,border:`1px solid ${state.champ.ownId===b.id?b.color:BDR}`}}>
              <Dot c={b.color} z={8}/>{b.name}
            </button>
          ))}
        </div>
      </Card>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <Lbl v={`Fichas de barcos · ${state.fleet.length} barcos`}/>
        <Btn v="⛵ Preset Worlds 2026" onClick={()=>setState(s=>({...s,fleet:CLASS0}))} sm st={{background:"#0a1a30",border:`1px solid #1e4070`,color:T1,fontSize:10}}/>
      </div>
      {state.fleet.map(b=>(
        <BoatCard key={b.id} b={b} isOwn={b.id===state.champ.ownId}
          onUpdate={(k,v)=>updFleet(b.id,k,v)}
          onDelete={()=>setState(s=>({...s,fleet:s.fleet.filter(x=>x.id!==b.id)}))}/>
      ))}
    </div>
  );
}

function TabEnVivo({state,setState}){
  // ── Extraer datos del estado PRIMERO (antes de cualquier hook) ──────────
  // Esto evita el error "Cannot access X before initialization" (TDZ)
  const fleet      = state.fleet;
  const ownId      = state.champ.ownId;
  const activeRace = state.races.find(r=>r.id===state.activeRaceId);
  const passages   = activeRace?.passages   || [];
  const startTime  = activeRace?.startTime  || null;
  const countdownAt= activeRace?.countdownAt|| null;
  const finishedAt = activeRace?.finishedAt || null;
  const course     = activeRace?.course     || DCOURSE;
  const started    = !!startTime;

  // ── HOOKS — siempre en el mismo orden, antes de cualquier return ────────
  const [now,     setNow]    = useState(Date.now());
  const [pend,    setPend]   = useState(null);
  const [sub,     setSub]    = useState("map");
  const [voiceOn, setVoiceOn]= useState(false);
  const [heard,   setHeard]  = useState("");
  const [legRank, setLegRank]= useState({});
  const [confirm, setConfirm]= useState(null); // {msg, onOk}
  const rRef = useRef(null);
  const vRef = useRef(false);

  // Timer: actualizar 'now' cada 500ms
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(id);},[]);

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

  const standings = useMemo(()=>computeStd(passages,startTime,fleet,course),[passages,startTime,fleet,course]);

  // ── Early return DESPUÉS de todos los hooks ─────────────────────────────
  if(!activeRace) return React.createElement("div",{style:{padding:20,color:T2,textAlign:"center"}},"Sin prueba activa. Crea una en Config.");

  // ── Variables derivadas ─────────────────────────────────────────────────
  const displayTime  = finishedAt?(finishedAt-startTime)/1000:startTime?Math.max(0,(now-startTime)/1000):0;
  const updRace      = fn=>setState(s=>({...s,races:s.races.map(r=>r.id===s.activeRaceId?fn(r):r)}));
  const boatLeg      = id=>passages.filter(p=>p.boatId===id).length;
  const record       = id=>{const nl=boatLeg(id)+1;if(nl>6||!started)return;updRace(r=>({...r,passages:[...r.passages,{boatId:id,leg:nl,realTime:Date.now()}]}));setPend(null);};
  const undo         = ()=>updRace(r=>({...r,passages:r.passages.slice(0,-1),finishedAt:null}));
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

  // Ordenar flota por número de proa para la cuadrícula
  const fleetByBow=[...fleet].sort((a,b)=>(a.bowNum||99)-(b.bowNum||99));

  // Determinar color de fondo del botón según luminancia (texto negro o blanco)
  const isDark=c=>{const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return(r*299+g*587+b*114)/1000<128;};

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
              <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:4,textAlign:"center"}}>{pend.boat.name}</div>
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
            {!started&&!countdownAt&&(<><Btn v={`⏱ ${course.countdownMin}m`} onClick={()=>updRace(r=>({...r,countdownAt:Date.now()+r.course.countdownMin*60000}))} c="gld" lg/><Btn v="Ya 🚀" onClick={()=>updRace(r=>({...r,startTime:Date.now(),countdownAt:null}))} c="grn" sm/></>)}
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

        {/* Estado del micrófono */}
        {started&&!allDone&&(
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:voiceOn?"#001a00":CARD2,borderRadius:6,marginBottom:4,border:`1px solid ${voiceOn?GRN:T3}`}}>
            <span style={{fontSize:11}}>{voiceOn?"🎙":"🎤"}</span>
            <span style={{flex:1,fontSize:10,color:voiceOn?GRN:T2}}>
              {voiceOn ? (heard?`«${heard}»`:"Escuchando... di el número de proa") : "Voz desactivada"}
            </span>
            <span style={{fontSize:9,color:T2}}>di "siete" o "7"</span>
          </div>
        )}

        {!started&&!countdownAt&&(<div style={{display:"flex",gap:5,marginBottom:4}}>{[[1,"Hace 1m"],[2,"Hace 2m"],[5,"Hace 5m"]].map(([m,l])=><Btn key={m} v={l} onClick={()=>updRace(r=>({...r,startTime:Date.now()-m*60000}))} sm c="dim"/>)}</div>)}

        <div style={{display:"flex",gap:4,marginTop:4}}>
          <div style={{display:"flex",gap:4,flex:1}}>
            {[["boya","# Proa"],["map","🗺 Mapa"],["std","📊 Clas."]].map(([k,l])=>(
              <button key={k} onClick={()=>setSub(k)} style={{flex:1,padding:"5px 3px",borderRadius:6,fontSize:11,fontWeight:700,background:sub===k?ACC:CARD2,color:sub===k?"#fff":T2,border:`1px solid ${sub===k?ACC:BDR}`}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginTop:4}}>
          {started&&<Btn v="⏹ Parar" onClick={()=>setConfirm({msg:"¿Parar la prueba?",onOk:()=>updRace(r=>({...r,startTime:null,countdownAt:null}))})} c="red" sm/>}
          <Btn v="↺ Reset" onClick={()=>setConfirm({msg:"¿Reiniciar? Se borran todos los pasos.",onOk:()=>updRace(r=>({...r,startTime:null,countdownAt:null,finishedAt:null,passages:[]}))})} c="dim" sm/>
          <Btn v="🗑" onClick={()=>setConfirm({msg:`¿Eliminar "${race.name}"?`,onOk:()=>setState(s=>{const rem=s.races.filter(r=>r.id!==s.activeRaceId);return{...s,races:rem.length?rem:[{id:"r1",name:"Prueba 1",startTime:null,countdownAt:null,finishedAt:null,passages:[],course:s.races[0]?.course||DCOURSE,discarded:false}],activeRaceId:rem[0]?.id||"r1"};})})} c="dim" sm st={{color:RED}}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>

        {/* ── CUADRÍCULA DE NÚMEROS DE PROA — interfaz principal ────── */}
        {sub==="boya"&&(
          <>
            {!started&&<div style={{fontSize:10,color:T2,marginBottom:8,textAlign:"center"}}>Inicia la regata con ⏱ o 🚀 · Pulsa el número de proa al pasar la boya</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {fleetByBow.map(b=>{
                const lc=boatLeg(b.id);
                const done=lc>=6;
                const nd=done?null:LEG_DEF[lc];
                const textColor=isDark(b.color)?"#fff":"#000";
                const canRec=started&&!done&&!allDone;
                return(
                  <button key={b.id} onClick={()=>canRec&&setPend({boat:b})} style={{
                    height:96,borderRadius:14,
                    background:done?`${b.color}40`:b.color,
                    border:done?`2px solid ${b.color}44`:"none",
                    display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",
                    gap:2,
                    opacity:started||done?1:.55,
                    cursor:canRec?"pointer":"default",
                    position:"relative"
                  }}>
                    {done&&<div style={{position:"absolute",top:5,right:8,fontSize:14}}>✓</div>}
                    <span style={{fontSize:36,fontWeight:900,color:done?b.color:textColor,lineHeight:1}}>
                      {b.bowNum||"?"}
                    </span>
                    <span style={{fontSize:8,color:done?b.color:textColor,opacity:.85,maxWidth:"90%",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",textAlign:"center"}}>
                      {b.name}
                    </span>
                    {nd&&started&&!done&&(
                      <span style={{fontSize:7,color:textColor,opacity:.7}}>→{nd.mark}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:10,padding:"8px 10px",background:CARD2,borderRadius:8,fontSize:9,color:T2,lineHeight:1.6}}>
              💡 <strong style={{color:T1}}>Con voz:</strong> Di el número de proa ("siete", "4") o el nombre del barco.<br/>
              El micrófono se activa automáticamente al largar.
            </div>
          </>
        )}

        {/* ── MAPA ───────────────────────────────────────────────────── */}
        {sub==="map"&&(
          <>
            {/* MAPA — barcos en salida si no ha empezado, o en su posición del tramo */}
            <Card st={{marginBottom:6,padding:0,overflow:"hidden"}}>
              <CourseDiagram
                course={course} passages={passages} fleet={fleet}
                started={started} onTap={id=>setPend({boat:fleet.find(b=>b.id===id)})} legRank={computedLegRank}/>
            </Card>

            {/* POSICIONES EN RUTA — aparece solo cuando la regata está en curso */}
            {started && !allDone && activeLegs.length>0 && (
              <Card st={{marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
                  <Lbl v="Posiciones en ruta"/>
                  <span style={{marginLeft:"auto",fontSize:9,color:T2}}>
                    Ajusta el orden mientras navegan → el mapa se actualiza
                  </span>
                </div>

                {activeLegs.map(legNum => {
                  const legDef = LEG_DEF[legNum-1];
                  const rank = getEffectiveRank(legNum);
                  if (!rank.length) return null;
                  return (
                    <div key={legNum} style={{marginBottom:10}}>
                      {/* Cabecera del tramo */}
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"4px 0"}}>
                        <div style={{width:3,height:18,background:legDef?.col||GLD,borderRadius:2,flexShrink:0}}/>
                        <span style={{fontSize:11,fontWeight:700,color:legDef?.col||GLD}}>
                          {legDef?.label} → {legDef?.mark}
                        </span>
                        <span style={{fontSize:9,color:T2,marginLeft:4}}>({rank.length} barcos)</span>
                      </div>

                      {/* Lista ordenada con flechas */}
                      {rank.map((id, pos) => {
                        const b = fleet.find(x=>x.id===id);
                        if (!b) return null;
                        const isOwn = id===ownId;
                        const isFirst = pos===0;
                        const isLast  = pos===rank.length-1;
                        return (
                          <div key={id} style={{
                            display:"flex", alignItems:"center", gap:8,
                            padding:"6px 9px", marginBottom:4,
                            background: isOwn ? `${b.color}18` : CARD2,
                            border: `1px solid ${isOwn ? b.color : BDR}`,
                            borderLeft: `3px solid ${b.color}`,
                            borderRadius:8
                          }}>
                            {/* Posición */}
                            <span style={{fontSize:12,fontWeight:800,color:isFirst?GLD:T2,width:22,flexShrink:0}}>
                              {pos+1}°
                            </span>
                            <Dot c={b.color} z={9}/>
                            <span style={{flex:1,fontSize:12,fontWeight:isOwn?700:400,color:isOwn?b.color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                              {b.name}{isOwn?" ⭐":""}
                            </span>
                            {/* Botones reordenar */}
                            <div style={{display:"flex",gap:3,flexShrink:0}}>
                              <button
                                onClick={() => moveInRank(legNum, id, 'up')}
                                disabled={isFirst}
                                style={{width:30,height:30,borderRadius:6,background:isFirst?CARD2:`${GLD}33`,color:isFirst?T3:GLD,fontSize:14,fontWeight:700,border:`1px solid ${isFirst?T3:GLD}`}}>
                                ↑
                              </button>
                              <button
                                onClick={() => moveInRank(legNum, id, 'down')}
                                disabled={isLast}
                                style={{width:30,height:30,borderRadius:6,background:isLast?CARD2:`${CYN}33`,color:isLast?T3:CYN,fontSize:14,fontWeight:700,border:`1px solid ${isLast?T3:CYN}`}}>
                                ↓
                              </button>
                            </div>
                            {/* Botón "ha pasado la boya" */}
                            <button
                              onClick={() => record(id)}
                              style={{padding:"4px 9px",background:`${legDef?.col||GLD}22`,border:`1px solid ${legDef?.col||GLD}`,borderRadius:15,color:legDef?.col||GLD,fontSize:10,fontWeight:700,flexShrink:0}}>
                              Boya ✓
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div style={{fontSize:9,color:T2,lineHeight:1.5,padding:"6px 0 0"}}>
                  💡 <strong style={{color:T1}}>Cómo usar:</strong> Durante la ceñida o la popa, ajusta el orden
                  con ↑↓ según veas a los barcos. El mapa los muestra escalonados.
                  Cuando un barco pasa la boya, pulsa <strong style={{color:GLD}}>Boya ✓</strong>.
                </div>
              </Card>
            )}

            {/* Lista compacta si no hay regata activa */}
            {(!started || allDone) && (
              <div style={{marginTop:6}}>
                <Lbl v="Flota"/>
                {fleet.map(b => {
                  const lc=boatLeg(b.id);
                  return (
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                      <Dot c={b.color} z={8}/>
                      <span style={{fontSize:12,fontWeight:b.id===ownId?700:400,color:b.id===ownId?b.color:"#fff",flex:1}}>
                        {b.name}{b.id===ownId?" ⭐":""}
                      </span>
                      <span style={{fontSize:10,color:lc>=6?GRN:T2}}>{lc>=6?"✓ FIN":"Salida"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {sub==="boats"&&(
          <>
            <div style={{fontSize:10,color:T2,marginBottom:6}}>{started&&!allDone?"Pulsa el barco al pasar la boya":!started?"Pulsa ⏱ o 🚀 para iniciar":"🏁 Todos han terminado"}</div>
            {legGroups.map(([lk,boats])=>{
              const done=lk==="fin",ln=+lk,nd=done?null:LEG_DEF[ln];
              // Ordenar según ranking si existe
              const legNum=ln+1;
              const rank=getEffectiveRank(legNum);
              const sortedBoats=rank.length>0
                ?[...boats].sort((a,b)=>{const ia=rank.indexOf(a.id),ib=rank.indexOf(b.id);return(ia<0?99:ia)-(ib<0?99:ib);})
                :boats;
              return(
                <div key={lk} style={{marginBottom:8}}>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:.6,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
                    <div style={{flex:1,borderTop:`1px solid ${done?GRN+"33":BDR}`}}/>
                    <span style={{color:done?GRN:nd?.col||GLD}}>{done?"✓ FIN":`→ ${nd?.mark} (${nd?.label})`}</span>
                    <div style={{flex:1,borderTop:`1px solid ${done?GRN+"33":BDR}`}}/>
                  </div>
                  {/* Lista compacta ordenada por ranking */}
                  {sortedBoats.map((b,pos)=>{
                    const isOwn=b.id===ownId,canRec=started&&!done&&!allDone;
                    return(
                      <button key={b.id} onClick={()=>canRec&&record(b.id)} style={{
                        display:"flex",alignItems:"center",gap:8,width:"100%",
                        padding:"7px 10px",marginBottom:4,
                        background:isOwn?`${b.color}18`:CARD2,
                        border:`1px solid ${isOwn?b.color:BDR}`,
                        borderLeft:`3px solid ${b.color}`,
                        borderRadius:8,textAlign:"left",
                        opacity:done?.5:started?1:.5,cursor:canRec?"pointer":"default"
                      }}>
                        {/* Posición en el tramo */}
                        {!done&&rank.length>0&&<span style={{fontSize:11,fontWeight:800,color:pos===0?GLD:T2,width:20,flexShrink:0}}>{pos+1}°</span>}
                        <Dot c={b.color} z={isOwn?10:8}/>
                        <span style={{flex:1,fontSize:isOwn?13:12,fontWeight:isOwn?700:400,color:isOwn?b.color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                          {b.name}{isOwn?" ⭐":""}
                        </span>
                        <span style={{fontSize:9,color:T2,flexShrink:0}}>{b.sailNo}</span>
                        {canRec&&<span style={{fontSize:10,color:nd?.col||GLD,fontWeight:700,flexShrink:0,marginLeft:4}}>✓</span>}
                        {done&&<span style={{fontSize:10,color:GRN,flexShrink:0}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
        {sub==="std"&&(
          <>
            <Card st={{marginBottom:8,padding:"8px 10px"}}>
              <Lbl v="Leyenda"/>
              <div style={{fontSize:10,lineHeight:1.8}}>
                <Mono v="00:00" z={10} c={CYN}/> <span style={{color:T2}}>Tiempo Compensado</span><br/>
                <Mono v="+00:00" z={10} c={T2}/> <span style={{color:T2}}>vs líder</span><br/>
                <Mono v="+00:00" z={10} c={GRN}/> <span style={{color:T2}}>vs Urbania: </span><span style={{color:GRN}}>verde=ganamos</span>/<span style={{color:RED}}>rojo=perdemos</span>
              </div>
            </Card>
            {standings.map((r,i)=>{
              const dL=r.ct!=null&&ldr&&r.b.id!==ldr.b.id?r.ct-ldr.ct:null;
              const dO=r.ct!=null&&ownSt?.ct!=null&&r.b.id!==ownId?r.ct-ownSt.ct:null;
              const isO=r.b.id===ownId;
              return(
                <div key={r.b.id} className={r.ct?"pop":""} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",background:r.ct?(isO?`${r.b.color}0e`:CARD):"transparent",borderRadius:8,marginBottom:4,borderLeft:`3px solid ${r.ct?(i===0?GLD:i===1?"#9ca3af":i===2?"#92400e":r.b.color):BDR}`,opacity:r.ct?1:.3}}>
                  <span style={{fontFamily:"monospace",fontSize:13,fontWeight:800,width:20,color:i===0&&r.ct?GLD:T2}}>{r.ct?i+1:"·"}</span>
                  <Dot c={r.b.color} z={isO?11:8}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:isO?13:12,fontWeight:700,color:isO?r.b.color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{r.b.name}{isO?" ⭐":""}</div>
                    <div style={{fontSize:9,color:T2}}>{LEG_DEF[r.leg-1]?.label||"En salida"}</div>
                  </div>
                  {r.ct!=null&&(
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <Mono v={ft(r.ct)} z={isO?13:11} c={isO?r.b.color:CYN}/>
                      {dL!=null&&<div style={{fontSize:9,color:T2,fontFamily:"monospace"}}>{ft(dL,true)}</div>}
                      {!isO&&ownSt&&dO!=null&&<div style={{fontSize:9,fontFamily:"monospace",fontWeight:700,color:dO>0?GRN:RED}}>{ft(dO,true)}</div>}
                      {i===0&&<div style={{fontSize:8,color:GLD}}>LÍDER</div>}
                    </div>
                  )}
                </div>
              );
            })}
            {own?.gpH&&ownSt&&(<><Sep/>
              <Lbl v="Tiempo a dar"/>
              {fleet.filter(b=>b.gpH&&b.id!==ownId).map(b=>{const dist=Array.from({length:Math.max(ownSt.leg,1)},(_,i)=>legDist(i+1,course)).reduce((a,x)=>a+x,0);const d=(b.gpH-own.gpH)*dist;return(<div key={b.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}><Dot c={b.color} z={7}/><span style={{flex:1,fontSize:11,color:T2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{b.name}</span><Mono v={d>0?`${ft(d)} antes`:`${ft(Math.abs(d))} después`} z={9} c={d>0?GRN:RED}/></div>);})}
            </>)}
          </>
        )}
      </div>
    </div>
  );
}

function TabTablas({state,race}){
  const course=race?.course||DCOURSE;
  const [refW,setRefW]=useState(course.windKnots||14);
  const [mode,setMode]=useState("tabla");
  const own=state.fleet.find(b=>b.id===state.champ.ownId);
  const ld=n=>legDist(n,course);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        <div style={{display:"flex",gap:4}}>{[["tabla","📋 Tabla"],["comparativa","🆚 Comparativa"]].map(([k,l])=><button key={k} onClick={()=>setMode(k)} style={{flex:1,padding:"6px 3px",borderRadius:7,fontSize:12,fontWeight:700,background:mode===k?ACC:CARD2,color:mode===k?"#fff":T2,border:`1px solid ${mode===k?ACC:BDR}`}}>{l}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {WINDS.map(w=><button key={w} onClick={()=>setRefW(w)} style={{padding:"4px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:refW===w?GLD:CARD2,color:refW===w?"#000":T2,border:`1px solid ${refW===w?GLD:BDR}`}}>{w}kts</button>)}
        </div>
        {mode==="tabla"&&state.fleet.filter(b=>b.gpH).map(b=>{
          const v=vpp(b.gpH,refW),total=(v.beat*ld(1)+v.reach*ld(2)+v.run*ld(3))*2,isOwn=b.id===state.champ.ownId;
          return(
            <Card key={b.id} st={{marginBottom:8}} glow={isOwn?b.color:null}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <Dot c={b.color} z={10}/>
                <span style={{fontSize:12,fontWeight:700,color:isOwn?b.color:"#fff"}}>{b.name}{isOwn?" ⭐":""}</span>
                <span style={{marginLeft:"auto",fontSize:10,color:T2}}>GPH {b.gpH}</span>
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
                        {WINDS.map(w=>{const val=vpp(b.gpH,w)[type]*ld(n);return <td key={w} style={{padding:"2px 4px",textAlign:"center",fontFamily:"monospace",color:w===refW?col:T1,background:w===refW?`${col}18`:""}}>{ft(val)}</td>;})}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {mode==="comparativa"&&!own?.gpH&&<div style={{color:T2,textAlign:"center",padding:"20px 0"}}>Asigna GPH a tu barco en Config</div>}
        {mode==="comparativa"&&own?.gpH&&(
          <>
            <div style={{fontSize:10,color:T2,marginBottom:12}}>Diferencia por tramo vs <strong style={{color:own.color}}>{own.name}</strong> a {refW}kts. <span style={{color:GRN}}>Verde=llegas antes</span> · <span style={{color:RED}}>Rojo=llegan antes</span></div>
            {state.fleet.filter(b=>b.gpH&&b.id!==own.id).map(b=>{
              const ov=vpp(own.gpH,refW),bv=vpp(b.gpH,refW);
              const dB=ov.beat*ld(1)-bv.beat*ld(1),dR=ov.reach*ld(2)-bv.reach*ld(2),dRun=ov.run*ld(3)-bv.run*ld(3),dT=(dB+dR+dRun)*2;
              return(
                <Card key={b.id} st={{marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <Dot c={b.color} z={10}/>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{b.name}</div><div style={{fontSize:9,color:T2}}>GPH {b.gpH} · {b.cls}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:8,color:T2}}>Dif. total</div><Mono v={ft(dT,true)} z={14} c={dT>0?GRN:dT<0?RED:T2}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    {[[GLD,"Ceñida",dB],[PRP,"Través",dR],[CYN,"Empopada",dRun]].map(([col,lbl,d])=>(
                      <div key={lbl} style={{textAlign:"center",background:CARD2,borderRadius:7,padding:"5px 3px"}}>
                        <div style={{fontSize:7,color:col,marginBottom:2}}>{lbl}</div>
                        <Mono v={ft(Math.abs(d))} z={10} c={T1}/>
                        <div style={{fontSize:8,fontFamily:"monospace",color:d>0?GRN:d<0?RED:T2,fontWeight:700}}>{d>0?"antes":"después"}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function TabResultados({state,setState}){
  const [view,setView]=useState("race");
  const [editId,setEditId]=useState(null);
  const getRaceStd=r=>{const std=computeStd(r.passages,r.startTime,state.fleet,r.course);return std.map((x,i)=>({...x,pos:x.ct!=null?i+1:state.fleet.length+1}));};
  const activeRace=state.races.find(r=>r.id===state.activeRaceId);
  const curStd=activeRace?getRaceStd(activeRace):[];
  const ldr=curStd.find(r=>r.ct!=null);
  const M=["🥇","🥈","🥉"];
  const champPts=state.fleet.map(b=>{let total=0;const byRace=state.races.map(r=>{const std=getRaceStd(r),row=std.find(x=>x.b.id===b.id);if(row?.ct!=null){if(!r.discarded)total+=row.pos;return{name:r.name,pos:row.pos,ct:row.ct,discarded:r.discarded};}return{name:r.name,pos:null,ct:null,discarded:r.discarded};});return{b,total,byRace};}).sort((a,z)=>a.total-z.total);
  const editRace=editId?state.races.find(r=>r.id===editId):null;
  const delPassage=(raceId,idx)=>setState(s=>({...s,races:s.races.map(r=>r.id===raceId?{...r,passages:r.passages.filter((_,i)=>i!==idx),finishedAt:null}:r)}));
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0}}>
        <div style={{display:"flex",gap:4}}>{[["race","Esta prueba"],["champ","Campeonato"],["legs","Tramos"],["edit","✎ Editar"]].map(([k,l])=><button key={k} onClick={()=>setView(k)} style={{flex:1,padding:"5px 2px",borderRadius:7,fontSize:10,fontWeight:700,background:view===k?ACC:CARD2,color:view===k?"#fff":T2,border:`1px solid ${view===k?ACC:BDR}`}}>{l}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        {view==="race"&&activeRace&&(
          <>
            <div style={{fontSize:12,fontWeight:700,color:ACC,marginBottom:8}}>{activeRace.name}</div>
            {curStd.map((r,i)=>{const d=r.ct!=null&&ldr&&r.b.id!==ldr.b.id?r.ct-ldr.ct:null,isO=r.b.id===state.champ.ownId;return(
              <Card key={r.b.id} st={{marginBottom:6,opacity:r.ct?1:.4}} glow={isO?r.b.color:null}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,width:26}}>{r.ct?M[i]||(i+1)+"°":"—"}</span>
                  <Dot c={r.b.color} z={10}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:isO?r.b.color:"#fff"}}>{r.b.name}{isO?" ⭐":""}</div></div>
                </div>
                {r.ct!=null&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8,paddingTop:8,borderTop:`1px solid ${BDR}`}}>
                    {[["Real",ft(r.el),"#9ca3af"],["Comp.",ft(r.ct),CYN],["vs Líder",d?ft(d,true):"LÍDER",d?T2:GRN]].map(([k,v,c])=>(
                      <div key={k}><div style={{fontSize:8,color:T2,textTransform:"uppercase"}}>{k}</div><Mono v={v} z={11} c={c}/></div>
                    ))}
                  </div>
                )}
              </Card>
            );})}
          </>
        )}
        {view==="champ"&&(
          <>
            <div style={{fontSize:12,fontWeight:700,color:ACC,marginBottom:8}}>{state.champ.name}</div>
            {champPts.map((r,i)=>{const isO=r.b.id===state.champ.ownId;return(
              <Card key={r.b.id} st={{marginBottom:6}} glow={isO?r.b.color:null}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,width:24}}>{M[i]||(i+1)+"°"}</span><Dot c={r.b.color} z={10}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:isO?r.b.color:"#fff"}}>{r.b.name}{isO?" ⭐":""}</div>
                    <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                      {r.byRace.map(rr=><span key={rr.name} style={{fontSize:9,padding:"1px 6px",borderRadius:20,background:rr.discarded?`${RED}22`:CARD2,color:rr.ct?(rr.discarded?RED:T1):T2,textDecoration:rr.discarded?"line-through":"none"}}>{rr.name}: {rr.ct?rr.pos+"°":"—"}</span>)}
                    </div>
                  </div>
                  <Mono v={r.total>0?r.total+" pts":"—"} z={14} c={isO?r.b.color:T1}/>
                </div>
              </Card>
            );})}
            <div style={{fontSize:9,color:T2,marginTop:8}}>Low Point · Las pruebas "DESC" no cuentan.</div>
          </>
        )}
        {view==="legs"&&activeRace?.startTime&&LEG_DEF.map(ld=>{
          const {passages,startTime,course}=activeRace;
          const boats=state.fleet.map(b=>{const p=passages.find(x=>x.boatId===b.id&&x.leg===ld.n),prev=passages.find(x=>x.boatId===b.id&&x.leg===ld.n-1);if(!p)return null;const el=(p.realTime-startTime)/1000,elPrev=prev?(prev.realTime-startTime)/1000:0,legET=el-elPrev,d=legDist(ld.n,course),ct=b.gpH?el-b.gpH*Array.from({length:ld.n},(_,i)=>legDist(i+1,course)).reduce((a,x)=>a+x,0):null;return{b,legET,snm:+(legET/d).toFixed(1),ct};}).filter(Boolean).sort((a,z)=>a.ct!=null&&z.ct!=null?a.ct-z.ct:1);
          return(
            <Card key={ld.n} st={{marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:ld.col,flex:1}}>{ld.label} · {legDist(ld.n,activeRace.course).toFixed(2)}nm</span>
              </div>
              {boats.length===0?<div style={{fontSize:10,color:T2}}>Sin datos</div>:boats.map((r,i)=>{const isO=r.b.id===state.champ.ownId;return(<div key={r.b.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,padding:"3px 5px",background:isO?`${r.b.color}0e`:"transparent",borderRadius:5}}>
                <span style={{fontSize:11,width:16,color:i===0?GLD:T2,fontWeight:700}}>{i+1}</span><Dot c={r.b.color} z={7}/>
                <span style={{flex:1,fontSize:11,color:isO?r.b.color:"#fff",fontWeight:isO?700:400,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{r.b.name}</span>
                <div style={{textAlign:"right"}}><Mono v={ft(r.legET)} z={10} c={T1}/><div style={{fontSize:8,color:T2,fontFamily:"monospace"}}>{r.snm} s/nm</div></div>
              </div>);})}
            </Card>
          );
        })}
        {view==="edit"&&(
          <>
            <Lbl v="Seleccionar prueba para editar"/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {state.races.map(r=><button key={r.id} onClick={()=>setEditId(r.id)} style={{padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:700,background:editId===r.id?ACC:CARD2,color:editId===r.id?"#fff":T2,border:`1px solid ${editId===r.id?ACC:BDR}`}}>{r.name}</button>)}
            </div>
            {editRace&&(
              <>
                <div style={{fontSize:11,color:T2,marginBottom:8}}>{editRace.passages.length} pasos · Pulsa ✕ para borrar</div>
                {editRace.passages.length===0&&<div style={{color:T2,fontSize:12}}>Sin pasos registrados.</div>}
                {[...editRace.passages].map((p,origIdx)=>{const boat=state.fleet.find(b=>b.id===p.boatId),legDef=LEG_DEF[p.leg-1],et=editRace.startTime?(p.realTime-editRace.startTime)/1000:null;return(
                  <div key={origIdx} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:CARD,border:`1px solid ${BDR}`,borderLeft:`3px solid ${boat?.color||BDR}`,borderRadius:8,marginBottom:5}}>
                    <Dot c={boat?.color||T3} z={9}/>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{boat?.name||p.boatId}</div><div style={{fontSize:10,color:legDef?.col||T2}}>{legDef?.label} · {et!=null?ft(et):"—"}</div></div>
                    <button onClick={()=>delPassage(editRace.id,origIdx)} style={{background:RED,color:"#fff",borderRadius:6,padding:"4px 9px",fontSize:12,fontWeight:700}}>✕</button>
                  </div>
                );})}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ── ALMACENAMIENTO MÚLTIPLES CAMPEONATOS ───────────────────────────────────
const SK_IDX  = "orc-champs-idx";
const saveIdx   = async(v)=>{ try{await window.storage.set(SK_IDX,JSON.stringify(v),true);}catch{} };
const loadIdx   = async()=>{ try{const r=await window.storage.get(SK_IDX,true);return r?JSON.parse(r.value):[];}catch{return[];} };
const saveCh    = async(id,v)=>{ try{await window.storage.set(`orc-ch-${id}`,JSON.stringify(v),true);}catch{} };
const loadCh    = async(id)=>{ try{const r=await window.storage.get(`orc-ch-${id}`,true);return r?JSON.parse(r.value):null;}catch{return null;} };
const deleteCh  = async(id)=>{ try{await window.storage.delete(`orc-ch-${id}`,true);}catch{} };

const BOAT_COLORS=["#ef4444","#06b6d4","#f59e0b","#3b82f6","#dc2626","#8b5cf6","#10b981","#fbbf24","#f97316","#e879f9","#34d399","#60a5fa","#fb923c","#a78bfa","#4ade80"];

// Lee la URL, entiende el evento y busca en internet la lista completa con ratings GPH
async function fetchFleetFromUrl(url) {
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:4000,
      tools:[{type:"web_search_20250305",name:"web_search"}],
      messages:[{role:"user",content:
        `You are helping set up a sailing race tracker app.

STEP 1 - Fetch this URL to understand the event: ${url}

STEP 2 - Based on what you find, search the web for the COMPLETE entry list of boats, their sail numbers, classes and ORC GPH ratings. Search terms to try:
- "[event name] entry list GPH"
- "[event name] inscriptions ORC"  
- "[event name] participants ratings"
- data.orc.org for this event

STEP 3 - Return ONLY this JSON (no markdown, no explanation):
{
  "eventName": "Full official event name",
  "classes": ["Class 0", "IRC 1"],
  "boats": [
    {"id":"UR","name":"URBANIA","sailNo":"ESP","cls":"Class 0","gpH":561.0},
    {"id":"SS","name":"SUMMER STORM","sailNo":"USA","cls":"Class 0","gpH":556.0}
  ]
}

Rules:
- id: 2-4 uppercase letters from boat name
- name: UPPERCASE
- cls: exact class name, must match one of the classes array
- gpH: decimal number or null
- Include ALL boats from ALL classes found`
      }]
    })
  });
  const data = await res.json();
  const text = (data.content||[]).map(i=>i.text||"").join("\n");
  // Try to parse the structured response
  const m = text.match(/\{[\s\S]*"boats"[\s\S]*\}/);
  if(m){
    try{
      const parsed = JSON.parse(m[0]);
      const boats = (parsed.boats||[]).map((b,i)=>({
        id:     b.id     || `B${String(i+1).padStart(2,"0")}`,
        name:   (b.name  || `Barco ${i+1}`).toUpperCase(),
        sailNo: b.sailNo || "",
        cls:    b.cls    || "",
        gpH:    typeof b.gpH==="number" ? b.gpH : null,
        color:  BOAT_COLORS[i%BOAT_COLORS.length]
      }));
      const classes = parsed.classes?.length
        ? parsed.classes
        : [...new Set(boats.map(b=>b.cls).filter(Boolean))];
      return { eventName: parsed.eventName||"", classes, boats };
    }catch{}
  }
  // Fallback: try plain array
  const arr = text.match(/\[[\s\S]*?\]/);
  if(arr){
    const boats = JSON.parse(arr[0]).map((b,i)=>({
      id:b.id||`B${i+1}`,name:(b.name||`Barco ${i+1}`).toUpperCase(),
      sailNo:b.sailNo||"",cls:b.cls||"",
      gpH:typeof b.gpH==="number"?b.gpH:null,
      color:BOAT_COLORS[i%BOAT_COLORS.length]
    }));
    const classes = [...new Set(boats.map(b=>b.cls).filter(Boolean))];
    return { eventName:"", classes, boats };
  }
  throw new Error("No se pudo extraer la información. Comprueba que la URL sea accesible y muestre la lista de participantes.");
}

// ── WIZARD: NUEVO CAMPEONATO ────────────────────────────────────────────────
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
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [manualName,setManualName] = useState("");
  const [manualSail,setManualSail] = useState("");
  const [manualGph,setManualGph] = useState("");

  const loadFromUrl = async()=>{
    if(!pageUrl.trim()||!pageUrl.startsWith("http")){setErr("Introduce una URL válida (empieza por https://).");return;}
    setLoading(true);setErr("");
    try{
      const result = await fetchFleetFromUrl(pageUrl.trim());
      setAllBoats(result.boats);
      setFoundClasses(result.classes);
      // Si el nombre del campeonato está vacío, rellenar con el encontrado
      if(!champName.trim()&&result.eventName) setChampName(result.eventName);
      if(result.classes.length===1){
        // Solo una clase: seleccionar automáticamente y pasar a barcos
        const cls=result.classes[0];
        setSelectedClass(cls);
        const filtered=result.boats.filter(b=>!b.cls||b.cls===cls||result.classes.length===1);
        const colored=filtered.map((b,i)=>({...b,color:BOAT_COLORS[i%BOAT_COLORS.length]}));
        setFleet(colored);
        setOwnId(colored[0]?.id||"");
        setStep(4);
      } else {
        // Varias clases: mostrar selector
        setStep("3c");
      }
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const applyClass = (cls)=>{
    setSelectedClass(cls);
    const filtered = cls==="todas"
      ? allBoats
      : allBoats.filter(b=>b.cls===cls);
    const colored = filtered.map((b,i)=>({...b,color:BOAT_COLORS[i%BOAT_COLORS.length]}));
    setFleet(colored);
    setOwnId(colored[0]?.id||"");
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
    onCreate({name:champName.trim(), fleet, ownId:ownBoat?.id||fleet[0]?.id});
  };

  const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 12px"};
  const panel  = {background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:"18px 16px",width:"100%",maxWidth:440};

  return(
    <div style={overlay}>
      <div style={panel}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>
            {step===1?"Nuevo campeonato":step===2?"Modo de entrada":step===3&&mode==="auto"?"Cargar desde web":step==="3c"?"Seleccionar clase":step===3&&mode==="manual"?"Añadir barcos":"Selecciona tu barco ⭐"}
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
            <button onClick={()=>{setMode("auto");setStep(3);}} style={{display:"flex",alignItems:"flex-start",gap:12,width:"100%",padding:"14px 14px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${ACC}`,borderRadius:10,marginBottom:8,textAlign:"left",color:"#fff"}}>
              <span style={{fontSize:24,flexShrink:0}}>🌐</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:ACC,marginBottom:3}}>Automático — desde la web del campeonato</div>
                <div style={{fontSize:11,color:T2}}>Pega la URL de la página del evento (ORC, club náutico, etc.) y el sistema extrae la lista de barcos y sus ratings GPH automáticamente.</div>
              </div>
            </button>
            <button onClick={()=>{setMode("manual");setStep(3);}} style={{display:"flex",alignItems:"flex-start",gap:12,width:"100%",padding:"14px 14px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${GLD}`,borderRadius:10,textAlign:"left",color:"#fff"}}>
              <span style={{fontSize:24,flexShrink:0}}>✏️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:GLD,marginBottom:3}}>Manual</div>
                <div style={{fontSize:11,color:T2}}>Añade los barcos uno a uno con su nombre y GPH. También puedes cargar el preset de ORC Worlds 2026 Clase 0.</div>
              </div>
            </button>
          </>
        )}

        {/* PASO 3A: Cargar desde URL */}
        {step===3&&mode==="auto"&&(
          <>
            <div style={{fontSize:11,color:T2,marginBottom:12,lineHeight:1.6}}>
              Pega la URL de la página del campeonato. Puede ser la web oficial del evento, la página de ORC, o cualquier página que muestre la lista de participantes con sus ratings.
            </div>
            <Lbl v="URL de la página del campeonato"/>
            <input
              value={pageUrl}
              onChange={e=>setPageUrl(e.target.value)}
              placeholder="https://data.orc.org/public/... o web del evento"
              style={{marginBottom:8}}
            />
            <div style={{fontSize:10,color:T2,marginBottom:12,lineHeight:1.5}}>
              💡 Ejemplos válidos:<br/>
              • <span style={{color:CYN}}>data.orc.org/public/WEV.dll?action=index&eventid=...</span><br/>
              • <span style={{color:CYN}}>www.tregolfisailingweek.com/en/entry-list</span><br/>
              • La web de tu club náutico con la lista de inscritos
            </div>
            {err&&<div style={{color:RED,fontSize:11,marginBottom:8,lineHeight:1.4,padding:"8px 10px",background:`${RED}15`,borderRadius:7}}>{err}</div>}
            {loading?(
              <div style={{textAlign:"center",padding:"24px 0",color:CYN}}>
                <div style={{fontSize:24,marginBottom:8}}>🔍</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Leyendo la página...</div>
                <div style={{fontSize:10,color:T2}}>Esto puede tardar 10-20 segundos</div>
              </div>
            ):(
              <div style={{display:"flex",gap:7}}>
                <Btn v="← Atrás" onClick={()=>setStep(2)} c="dim"/>
                <Btn v="🌐 Cargar flota" onClick={loadFromUrl} c="acc" fw lg/>
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
            <button onClick={()=>applyClass("todas")} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 13px",background:CARD2,border:`1px solid ${BDR}`,borderRadius:9,marginBottom:7,textAlign:"left",color:"#fff"}}>
              <span style={{fontSize:18}}>🌊</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T1}}>Todas las clases</div>
                <div style={{fontSize:10,color:T2}}>{allBoats.length} barcos en total</div>
              </div>
            </button>
            {foundClasses.map(cls=>{
              const count = allBoats.filter(b=>b.cls===cls).length;
              return(
                <button key={cls} onClick={()=>applyClass(cls)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 13px",background:CARD2,border:`1px solid ${BDR}`,borderLeft:`3px solid ${ACC}`,borderRadius:9,marginBottom:7,textAlign:"left",color:"#fff"}}>
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
                  <span style={{flex:1,fontSize:12,color:"#fff"}}>{b.name}</span>
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
                  borderRadius:9,marginBottom:5,textAlign:"left",color:"#fff"
                }}>
                  <Dot c={b.color} z={ownId===b.id?13:10}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:ownId===b.id?800:500,color:ownId===b.id?b.color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                      {b.name}
                    </div>
                    <div style={{fontSize:9,color:T2}}>{b.sailNo}{b.cls?" · "+b.cls:""}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {b.gpH
                      ? <span style={{fontSize:11,fontFamily:"monospace",color:CYN}}>{b.gpH}</span>
                      : <span style={{fontSize:9,color:T3}}>GPH —</span>}
                    {ownId===b.id&&<div style={{fontSize:14,lineHeight:1}}>⭐</div>}
                  </div>
                </button>
              ))}
            </div>
            {!ownId&&<div style={{color:GLD,fontSize:11,marginBottom:8}}>⚠️ Selecciona tu barco para continuar</div>}
            {err&&<div style={{color:RED,fontSize:11,marginBottom:8}}>{err}</div>}
            <div style={{display:"flex",gap:7}}>
              <Btn v="← Atrás" onClick={()=>setStep(foundClasses.length>1?"3c":3)} c="dim"/>
              <Btn v="✓ Crear campeonato" onClick={finish} c="grn" fw lg dis={!ownId}/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabHome({champsList, currentChampId, state, onSelect, onDelete, onNew}){
  const [confirm2,setConfirm2] = useState(null);
  const [clearing,setClearing] = useState(false);

  const clearStorage = async()=>{
    setClearing(true);
    try{
      await window.storage.delete("orc-v7",true);
      await window.storage.delete("orc-champs-idx",true);
      window.location.reload();
    }catch{ setClearing(false); }
  };

  return(
    <div style={{overflowY:"auto",height:"100%",padding:"16px 14px"}}>
      <ConfirmDialog msg={confirm2?.msg} onOk={()=>{confirm2?.onOk();setConfirm2(null);}} onCancel={()=>setConfirm2(null)}/>

      {/* Hero */}
      <div style={{textAlign:"center",padding:"16px 0 22px"}}>
        <div style={{fontSize:48,marginBottom:8}}>⛵</div>
        <h1 style={{fontSize:24,fontWeight:800,color:"#fff",letterSpacing:-1,marginBottom:4}}>ORC Race Tracker</h1>
        <p style={{fontSize:11,color:T2}}>Clasificación ORC en tiempo real · Multi-dispositivo</p>
      </div>

      <Btn v="＋ Nuevo campeonato" onClick={onNew} c="grn" fw lg st={{marginBottom:16}}/>

      {champsList.length===0 ? (
        <div style={{textAlign:"center",padding:"20px 16px",background:CARD,borderRadius:12,border:`1px solid ${BDR}`}}>
          <div style={{fontSize:10,color:T2,lineHeight:1.6,marginBottom:16}}>
            No se encontraron campeonatos guardados.<br/>
            Si usabas la versión anterior, puede que el formato haya cambiado.<br/>
            Crea un nuevo campeonato o limpia los datos para empezar de cero.
          </div>
          <Btn v={clearing?"Limpiando...":"🗑 Limpiar datos y empezar de nuevo"}
            onClick={()=>setConfirm2({msg:"¿Limpiar todos los datos guardados? Esta acción no se puede deshacer.",onOk:clearStorage})}
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

export default function App(){
  const [state,      setState]      = useState(INIT);
  const [tab,        setTab]        = useState(0); // Empieza en Inicio
  const [ready,      setReady]      = useState(false);
  const [sync,       setSync]       = useState(false);
  const [champsList, setChampsList] = useState([]);
  const [currentId,  setCurrentId]  = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const saveRef    = useRef(false);
  const lastSaveTs = useRef(0);
  const champsRef  = useRef([]);
  useEffect(()=>{ champsRef.current=champsList; },[champsList]);

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

  const wrappedSetState = useCallback(fn=>{
    setState(prev=>{
      const next = typeof fn==="function"?fn(prev):fn;
      if(saveRef.current && currentId){
        lastSaveTs.current = Date.now();
        setSync(true);
        const stateToSave = {...next, _champId:currentId};
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

  // Polling (con cooldown anti-race-condition)
  useEffect(()=>{
    if(!ready)return;
    const id=setInterval(()=>{
      if(Date.now()-lastSaveTs.current < 2500)return;
      loadS().then(s=>{ if(s)setState(s); });
    },3000);
    return()=>clearInterval(id);
  },[ready]);

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
  const createChamp = useCallback(async({name, fleet, ownId})=>{
    const id = `champ_${Date.now()}`;
    const newState = {
      ...INIT, _champId:id,
      champ:{name, ownId},
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
  const TABS=[{icon:"🏠",label:"Inicio"},{icon:"⚙️",label:"Config"},{icon:"🚩",label:"En Vivo"},{icon:"📋",label:"Tablas"},{icon:"📊",label:"Result."}];

  return(
    <ErrorBoundary>
      {showWizard&&<NewChampWizard onClose={()=>setShowWizard(false)} onCreate={createChamp}/>}
      <div style={{background:BG,height:"100vh",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
        <style>{CSS}</style>
        <div style={{padding:"5px 12px",background:CARD,borderBottom:`1px solid ${BDR}`,flexShrink:0,display:"flex",alignItems:"center",gap:7}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{state.champ?.name||"ORC Race Tracker"}</div>
              <span style={{fontSize:8,background:GRN,color:"#000",borderRadius:4,padding:"1px 5px",fontWeight:800}}>v8</span>
            </div>
            <div style={{fontSize:9,color:T2}}>{activeRace?.name||"Sin prueba"} · {state.fleet?.length||0} barcos</div>
          </div>
          {sync&&<span style={{fontSize:9,color:GRN}}>● guardando</span>}
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {tab===0&&<TabHome champsList={champsList} currentChampId={currentId} state={state} onSelect={selectChamp} onDelete={handleDelete} onNew={()=>setShowWizard(true)}/>}
          {tab===1&&<TabConfig state={state} setState={wrappedSetState} race={activeRace||state.races?.[0]||INIT.races[0]}/>}
          {tab===2&&<TabEnVivo state={state} setState={wrappedSetState}/>}
          {tab===3&&<TabTablas state={state} race={activeRace}/>}
          {tab===4&&<TabResultados state={state} setState={wrappedSetState}/>}
        </div>
        <div style={{display:"flex",background:CARD,borderTop:`1px solid ${BDR}`,flexShrink:0}}>
          {TABS.map(({icon,label},i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"7px 2px 5px",background:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,borderTop:tab===i?`2px solid ${ACC}`:"2px solid transparent"}}>
              <span style={{fontSize:16,lineHeight:1}}>{icon}</span>
              <span style={{fontSize:7,fontWeight:700,color:tab===i?ACC:T2}}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
