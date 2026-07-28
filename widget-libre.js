// ============================================================
//  WIDGET "Libre del mes" para Scriptable (iPhone / iPad)
//  Muestra en grande cuánto te queda LIBRE este mes.
//
//  👉 SOLO cambia EMAIL y PASSWORD por los tuyos (los mismos
//     de la app). Se guardan solo en tu teléfono.
// ============================================================

const EMAIL    = "PON_AQUI_TU_CORREO";
const PASSWORD = "PON_AQUI_TU_CONTRASENA";

const API_KEY = "AIzaSyCUb_OBbs-8YST9n0WsGIn85rQrdCuZQm0";
const DB_URL  = "https://mis-finanzas-347f1-default-rtdb.firebaseio.com";

const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmt(n){n=Math.round(n||0);let s=Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");return (n<0?"-$":"$")+s;}
function todayKey(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function keyTitle(k){const[y,m]=k.split("-");return MONTHS[(+m)-1]+" "+y;}
function monthsBetween(a,b){const[ya,ma]=a.split("-").map(Number),[yb,mb]=b.split("-").map(Number);return (yb-ya)*12+(mb-ma);}
function invRate(ea){return Math.pow(1+ea/100,1/12)-1;}
function invIncomeFor(db,key){let t=0;(db.investments||[]).forEach(inv=>{const k=monthsBetween(inv.start,key);if(k>=0&&k<inv.months){const im=invRate(inv.ea);t+=inv.principal*Math.pow(1+im,k)*im;}});return t;}

async function firebaseLogin(){
  const r=new Request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`);
  r.method="POST"; r.headers={"Content-Type":"application/json"};
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
  const gastos=hogar+pers+(m.ahorro||0)+(m.deuda||0);
  return {key,income,gastos,libre:income-gastos,empty:false};
}

async function build(){
  const w=new ListWidget();
  const g=new LinearGradient();
  g.colors=[new Color("#f7d6e8"),new Color("#dcd0f2"),new Color("#cfe0f2")];
  g.locations=[0,0.5,1];
  w.backgroundGradient=g;
  w.setPadding(18,18,18,18);
  try{
    const data=computeMonth(await loadData());
    const title=w.addText(data.empty?"Mis Finanzas":keyTitle(data.key));
    title.font=Font.semiboldSystemFont(13); title.textColor=new Color("#7a6a8a");
    w.addSpacer(6);
    if(data.empty){
      const t=w.addText("Sin datos de este mes 🍃");
      t.font=Font.systemFont(15); t.textColor=new Color("#6a5a7a");
    }else{
      const lab=w.addText("Te queda libre");
      lab.font=Font.systemFont(13); lab.textColor=new Color("#8a7a9a");
      w.addSpacer(2);
      const big=w.addText(fmt(data.libre));
      big.font=Font.boldSystemFont(34);
      big.textColor=new Color(data.libre>=0?"#2f8a5e":"#c0495a");
      big.minimumScaleFactor=0.5;
      w.addSpacer(8);
      const sub=w.addText("Ingresos "+fmt(data.income));
      sub.font=Font.systemFont(12); sub.textColor=new Color("#6a5a7a");
      const sub2=w.addText("Gastado "+fmt(data.gastos));
      sub2.font=Font.systemFont(12); sub2.textColor=new Color("#8a7a9a");
    }
    w.addSpacer();
  }catch(e){
    const t=w.addText("No se pudo cargar 🌷");
    t.font=Font.boldSystemFont(15); t.textColor=new Color("#6a5a7a");
    const t2=w.addText(String(e.message||e));
    t2.font=Font.systemFont(11); t2.textColor=new Color("#8a7a9a");
  }
  return w;
}

const widget=await build();
if(config.runsInWidget){ Script.setWidget(widget); }
else{ await widget.presentSmall(); }
Script.complete();
