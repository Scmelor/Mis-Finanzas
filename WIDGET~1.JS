// ============================================================
//  WIDGET "Mis Finanzas" para Scriptable (iPhone / iPad)
//  Dibuja tu gráfica de torta con lo que te queda LIBRE en el centro.
//
//  👉 SOLO tienes que cambiar EMAIL y PASSWORD por los tuyos
//     (los mismos con los que entras a la app). Se quedan
//     guardados solo en tu teléfono, dentro de Scriptable.
// ============================================================

const EMAIL    = "PON_AQUI_TU_CORREO";
const PASSWORD = "PON_AQUI_TU_CONTRASENA";

// Datos de tu proyecto Firebase (ya vienen puestos):
const API_KEY = "AIzaSyCUb_OBbs-8YST9n0WsGIn85rQrdCuZQm0";
const DB_URL  = "https://mis-finanzas-347f1-default-rtdb.firebaseio.com";

// Colores (mismos de la app)
const COL = { Hogar:"#e89cb6", Personales:"#b39ddb", Ahorro:"#8fcdb4", Deuda:"#f0a07e", Libre:"#d8cfe0" };
const BG  = "#faf5fc";
const TEXT= "#6a5a7a";
const MUTED="#9b8bae";
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmt(n){n=Math.round(n||0);let s=Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");return (n<0?"-$":"$")+s;}
function todayKey(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function keyTitle(k){const[y,m]=k.split("-");return MONTHS[(+m)-1]+" "+y;}
function monthsBetween(a,b){const[ya,ma]=a.split("-").map(Number),[yb,mb]=b.split("-").map(Number);return (yb-ya)*12+(mb-ma);}
function invRate(ea){return Math.pow(1+ea/100,1/12)-1;}
function invIncomeFor(db,key){let t=0;(db.investments||[]).forEach(inv=>{const k=monthsBetween(inv.start,key);if(k>=0&&k<inv.months){const im=invRate(inv.ea);t+=inv.principal*Math.pow(1+im,k)*im;}});return t;}

async function firebaseLogin(){
  const r=new Request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`);
  r.method="POST";
  r.headers={"Content-Type":"application/json"};
  r.body=JSON.stringify({email:EMAIL,password:PASSWORD,returnSecureToken:true});
  const res=await r.loadJSON();
  if(!res.idToken) throw new Error(res.error?res.error.message:"Login falló");
  return {token:res.idToken,uid:res.localId};
}
async function loadData(){
  const {token,uid}=await firebaseLogin();
  const r=new Request(`${DB_URL}/users/${uid}.json?auth=${token}`);
  return await r.loadJSON();
}

function computeMonth(db){
  const key=todayKey();
  const m=(db&&db.months&&db.months[key])||null;
  if(!m) return {key,empty:true};
  const inv=invIncomeFor(db,key);
  const income=(m.incomes||[]).reduce((a,x)=>a+x.amt,0)+inv;
  const hogar=(m.hogar||[]).reduce((a,x)=>a+x.amt,0);
  const pers=(m.pers||[]).reduce((a,x)=>a+x.amt,0);
  const libre=income-(hogar+pers+(m.ahorro||0)+(m.deuda||0));
  const segs=[["Hogar",hogar],["Personales",pers],["Ahorro",m.ahorro||0],["Deuda",m.deuda||0]].filter(s=>s[1]>0);
  if(libre>0) segs.push(["Libre",libre]);
  return {key,income,libre,segs,empty:income<=0&&segs.length===0};
}

// ---- dibujo del donut ----
function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return new Point(cx+r*Math.cos(a),cy+r*Math.sin(a));}
function drawImage(data){
  const W=500,H=500,cx=250,cy=205,R=150,hole=72;
  const dc=new DrawContext();
  dc.size=new Size(W,H);
  dc.opaque=false;
  dc.respectScreenScale=true;
  // fondo
  dc.setFillColor(new Color(BG));
  dc.fillRect(new Rect(0,0,W,H));
  // título
  dc.setTextColor(new Color(TEXT));
  dc.setFont(Font.boldSystemFont(30));
  dc.setTextAlignedCenter();
  dc.drawTextInRect(keyTitle(data.key),new Rect(0,14,W,40));

  if(data.empty){
    dc.setTextColor(new Color(MUTED));
    dc.setFont(Font.systemFont(24));
    dc.drawTextInRect("Sin datos de este mes 🍃",new Rect(0,230,W,40));
    return dc.getImage();
  }

  const total=data.segs.reduce((a,s)=>a+s[1],0);
  let ang=0;
  data.segs.forEach(s=>{
    const frac=s[1]/total, a1=ang+frac*360;
    const p=new Path();
    p.move(new Point(cx,cy));
    const steps=Math.max(2,Math.ceil((a1-ang)/4));
    for(let i=0;i<=steps;i++){const a=ang+(a1-ang)*i/steps;p.addLine(polar(cx,cy,R,a));}
    p.closeSubpath();
    dc.setFillColor(new Color(COL[s[0]]||"#cccccc"));
    dc.addPath(p); dc.fillPath();
    // % dentro
    if(frac>0.05){
      const mid=ang+frac*180, pt=polar(cx,cy,R*0.62,mid);
      dc.setTextColor(new Color("#ffffff"));
      dc.setFont(Font.boldSystemFont(24));
      dc.setTextAlignedCenter();
      dc.drawTextInRect(Math.round(s[1]/data.income*100)+"%",new Rect(pt.x-40,pt.y-16,80,32));
    }
    ang=a1;
  });
  // hueco (donut)
  dc.setFillColor(new Color(BG));
  dc.fillEllipse(new Rect(cx-hole,cy-hole,hole*2,hole*2));
  // libre en el centro
  dc.setTextColor(new Color(MUTED));
  dc.setFont(Font.systemFont(20));
  dc.setTextAlignedCenter();
  dc.drawTextInRect("Libre",new Rect(cx-hole,cy-34,hole*2,24));
  dc.setTextColor(new Color(data.libre>=0?"#3f9a6a":"#d96a72"));
  dc.setFont(Font.boldSystemFont(28));
  dc.drawTextInRect(fmt(data.libre),new Rect(cx-110,cy-4,220,34));

  // leyenda abajo
  let ly=372;
  dc.setTextAlignedLeft();
  data.segs.forEach(s=>{
    dc.setFillColor(new Color(COL[s[0]]||"#ccc"));
    dc.fillEllipse(new Rect(60,ly+4,16,16));
    dc.setTextColor(new Color(TEXT));
    dc.setFont(Font.systemFont(20));
    dc.drawTextInRect(s[0],new Rect(86,ly,200,26));
    dc.setTextColor(new Color(MUTED));
    dc.setTextAlignedRight();
    dc.drawTextInRect(fmt(s[1]),new Rect(240,ly,200,26));
    dc.setTextAlignedLeft();
    ly+=25;
  });
  return dc.getImage();
}

// ---- armar el widget ----
async function build(){
  const w=new ListWidget();
  w.backgroundColor=new Color(BG);
  try{
    const db=await loadData();
    const data=computeMonth(db);
    const img=drawImage(data);
    w.backgroundImage=img;
  }catch(e){
    w.addSpacer();
    const t=w.addText("No se pudo cargar 🌷");
    t.textColor=new Color(TEXT); t.font=Font.boldSystemFont(16); t.centerAlignText();
    const t2=w.addText(String(e.message||e));
    t2.textColor=new Color(MUTED); t2.font=Font.systemFont(11); t2.centerAlignText();
    w.addSpacer();
  }
  return w;
}

const widget=await build();
if(config.runsInWidget){
  Script.setWidget(widget);
}else{
  await widget.presentSmall();
}
Script.complete();
