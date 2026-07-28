
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCUb_OBbs-8YST9n0WsGIn85rQrdCuZQm0",
  authDomain: "mis-finanzas-347f1.firebaseapp.com",
  databaseURL: "https://mis-finanzas-347f1-default-rtdb.firebaseio.com",
  projectId: "mis-finanzas-347f1",
  storageBucket: "mis-finanzas-347f1.firebasestorage.app",
  messagingSenderId: "9482169301",
  appId: "1:9482169301:web:b92eeee12f1e3cca6cab5c"
};

const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const $=id=>document.getElementById(id);
const fmt=n=>'$'+Math.round(n||0).toLocaleString('es-CO');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssVar=n=>getComputedStyle(document.body).getPropertyValue(n).trim();

let DB={months:{},fixedTemplate:[],investments:[]};
let viewKey=todayKey();
let cloud=false, uid=null, applyingRemote=false, signupMode=false, currentView='fin';

function todayKey(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
function keyTitle(k){const[y,m]=k.split('-');return MONTHS[(+m)-1]+' '+y;}
function shiftKey(k,d){let[y,m]=k.split('-').map(Number);m+=d;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}return y+'-'+String(m).padStart(2,'0');}
function monthsBetween(a,b){const[ya,ma]=a.split('-').map(Number),[yb,mb]=b.split('-').map(Number);return (yb-ya)*12+(mb-ma);}

/* ---- temas ---- */
function applyTheme(t){
  document.body.classList.remove('theme-neutro','theme-masculino');
  if(t==='neutro')document.body.classList.add('theme-neutro');
  else if(t==='masculino')document.body.classList.add('theme-masculino');
  try{localStorage.setItem('theme',t);}catch(e){}
  document.querySelectorAll('.thm').forEach(b=>b.classList.toggle('active',b.dataset.theme===t));
  document.querySelectorAll('.theme-opt').forEach(o=>o.classList.toggle('active',o.dataset.theme===t));
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',cssVar('--card')||'#e7ddf7');
  if($('root')&&$('root').style.display!=='none'&&$('pie'))renderAll();
}
$('theme-btn').onclick=e=>{e.stopPropagation();$('theme-pop').classList.toggle('open');};
$('theme-pop').onclick=e=>e.stopPropagation();
document.addEventListener('click',()=>$('theme-pop').classList.remove('open'));
document.querySelectorAll('.theme-opt').forEach(o=>o.onclick=()=>{applyTheme(o.dataset.theme);$('theme-pop').classList.remove('open');});

/* ---- inversiones (cálculo) ---- */
function invMonthlyRate(ea){return Math.pow(1+ea/100,1/12)-1;}
function invIncomeFor(key){
  let total=0;
  (DB.investments||[]).forEach(inv=>{
    const t=monthsBetween(inv.start,key);
    if(t>=0 && t<inv.months){const im=invMonthlyRate(inv.ea);total+=inv.principal*Math.pow(1+im,t)*im;}
  });
  return total;
}

function blankMonth(){return{incomes:[],hogar:DB.fixedTemplate.map(t=>({name:t.name,amt:t.amt,paid:false})),pLimit:0,pers:[],ahorro:0,debts:(DB.debtTemplate||[]).map(d=>({bank:d.bank,amt:0,dueDay:d.dueDay,paid:false}))};}
function debtsSum(s){return (s.debts||[]).reduce((a,x)=>a+x.amt,0);}
function libreOf(key){const s=DB.months[key];if(!s)return 0;const inc=(s.incomes||[]).reduce((a,x)=>a+x.amt,0)+invIncomeFor(key);const hog=(s.hogar||[]).reduce((a,x)=>a+x.amt,0);const per=(s.pers||[]).reduce((a,x)=>a+x.amt,0);return inc-(hog+per+(s.ahorro||0)+debtsSum(s));}
function ensureMonth(k){
  if(!DB.months[k]){
    const m=blankMonth();
    const pk=shiftKey(k,-1);
    if(DB.months[pk]){const lib=libreOf(pk);if(lib>0)m.incomes.push({name:'Sobrante mes anterior',amt:Math.round(lib)});}
    DB.months[k]=m;
  }
  return DB.months[k];
}
const M=()=>ensureMonth(viewKey);

function normMonth(m){
  if(!m)return blankMonth();
  if(!Array.isArray(m.incomes))m.incomes=(typeof m.income==='number'&&m.income>0)?[{name:'Ingreso',amt:m.income}]:[];
  delete m.income;
  if(!Array.isArray(m.debts))m.debts=(typeof m.deuda==='number'&&m.deuda>0)?[{bank:'Tarjeta',amt:m.deuda,dueDay:null}]:[];
  delete m.deuda;
  m.debts=m.debts.map(d=>({bank:d.bank||'Tarjeta',amt:d.amt||0,dueDay:(d.dueDay!==undefined?d.dueDay:null),paid:!!d.paid}));
  m.hogar=m.hogar||[];m.pers=m.pers||[];m.pLimit=m.pLimit||0;m.ahorro=m.ahorro||0;
  return m;
}
function normDB(){
  if(!DB||typeof DB!=='object')DB={months:{},fixedTemplate:[],investments:[],debtTemplate:[]};
  DB.months=DB.months||{};DB.fixedTemplate=DB.fixedTemplate||[];DB.investments=DB.investments||[];DB.debtTemplate=DB.debtTemplate||[];
  for(const k in DB.months)DB.months[k]=normMonth(DB.months[k]);
}

/* ---- storage + migración ---- */
function loadLocal(){
  try{
    const v3=localStorage.getItem('finanzasV3');
    if(v3){DB=JSON.parse(v3);}
    else{const v2=localStorage.getItem('finanzasV2');if(v2){DB=migrateV2(JSON.parse(v2));}}
  }catch(e){DB={months:{},fixedTemplate:[],investments:[]};}
  normDB();
  viewKey=localStorage.getItem('viewKeyV3')||todayKey();
  ensureMonth(viewKey);
}
function migrateV2(old){
  const months={};
  for(const y in (old.archive||{}))for(const mn in old.archive[y]){const idx=MONTHS.indexOf(mn);if(idx<0)continue;months[y+'-'+String(idx+1).padStart(2,'0')]=normMonth(old.archive[y][mn]);}
  if(old.current)months[todayKey()]=normMonth(old.current);
  return {months,fixedTemplate:old.fixedTemplate||[],investments:[],debtTemplate:[]};
}
function persist(){
  try{localStorage.setItem('finanzasV3',JSON.stringify(DB));localStorage.setItem('viewKeyV3',viewKey);}catch(e){}
  if(cloud&&uid&&!applyingRemote){firebase.database().ref('users/'+uid).set(DB).catch(()=>{});}
}

/* ---- cálculos mes ---- */
const incomeStored=()=>M().incomes.reduce((s,x)=>s+x.amt,0);
const hogarTotal=()=>M().hogar.reduce((s,x)=>s+x.amt,0);
const hogarPaid=()=>M().hogar.filter(x=>x.paid).reduce((s,x)=>s+x.amt,0);
const persSpent=()=>M().pers.reduce((s,x)=>s+x.amt,0);
const deudaTotal=()=>debtsSum(M());
const syncTemplate=()=>{DB.fixedTemplate=M().hogar.map(x=>({name:x.name,amt:x.amt}));};
const syncDebtTemplate=()=>{DB.debtTemplate=M().debts.map(d=>({bank:d.bank,dueDay:d.dueDay}));};

/* ---- render finanzas ---- */
function renderAll(){$('mtitle').textContent=keyTitle(viewKey);render();renderInvList();}
function render(){
  const c=M(), invInc=invIncomeFor(viewKey), income=incomeStored()+invInc;
  const allocated=hogarTotal()+persSpent()+c.ahorro+deudaTotal();
  const libre=income-allocated;
  $('s-ing').textContent=fmt(income);
  $('s-hog').textContent=fmt(hogarTotal());
  $('s-per').textContent=fmt(persSpent());
  $('s-aho').textContent=fmt(c.ahorro);
  const sl=$('s-libre');sl.textContent=fmt(libre);sl.className='val '+(libre>=0?'pos':'neg');

  const il=$('ing-list');
  let ih=(!c.incomes.length&&invInc<=0)?'<div class="empty">Agrega tus fuentes de ingreso 🌼</div>':'';
  ih+=c.incomes.map((x,i)=>`<div class="item ing-i"><span class="nm">${esc(x.name)}</span><span class="amt">${fmt(x.amt)}</span><button class="del" data-idel="${i}">✕</button></div>`).join('');
  if(invInc>0)ih+=`<div class="item auto"><span class="nm">📈 Rendimiento inversiones <small style="color:var(--soft);font-weight:600">(automático)</small></span><span class="amt" style="color:var(--verde)">${fmt(invInc)}</span></div>`;
  il.innerHTML=ih;
  il.querySelectorAll('[data-idel]').forEach(b=>b.onclick=()=>{c.incomes.splice(+b.dataset.idel,1);persist();render();});

  const hl=$('hogar-list');
  hl.innerHTML=c.hogar.map((x,i)=>`<div class="item ${x.paid?'paid':''}" data-i="${i}"><span class="check">${x.paid?'✓':''}</span><span class="nm">${esc(x.name)}</span><span class="amt">${fmt(x.amt)}</span><button class="del" data-del="${i}">✕</button></div>`).join('');
  hl.querySelectorAll('.item').forEach(el=>el.onclick=e=>{if(e.target.dataset.del!==undefined)return;c.hogar[+el.dataset.i].paid=!c.hogar[+el.dataset.i].paid;persist();render();});
  hl.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();c.hogar.splice(+b.dataset.del,1);syncTemplate();persist();render();});
  const pend=hogarTotal()-hogarPaid(), nPend=c.hogar.filter(x=>!x.paid).length;
  $('hogar-note').innerHTML=c.hogar.length?`Pagado <b>${fmt(hogarPaid())}</b> · Faltan <b>${nPend}</b> por pagar: <b style="color:var(--rojo)">${fmt(pend)}</b>`:'Agrega tus gastos fijos. Toca cada uno cuando lo pagues. 🌷';

  const spent=persSpent(), freeP=c.pLimit-spent;
  $('p-bar').style.width=(c.pLimit>0?Math.min(100,spent/c.pLimit*100):0)+'%';
  $('p-bar').style.background=freeP<0?'linear-gradient(90deg,var(--rojo),var(--deuda))':'';
  const pl=$('pers-list');
  pl.innerHTML=c.pers.length?c.pers.map((x,i)=>`<div class="item pers-i"><span class="nm">${esc(x.name)}</span><span class="amt">${fmt(x.amt)}</span><button class="del" data-pdel="${i}">✕</button></div>`).join(''):'';
  pl.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>{c.pers.splice(+b.dataset.pdel,1);persist();render();});
  $('p-note').innerHTML=c.pLimit>0?(freeP>=0?`Gastado <b>${fmt(spent)}</b> · Te queda libre <b style="color:var(--verde)">${fmt(freeP)}</b>`:`Gastado <b>${fmt(spent)}</b> · Te pasaste por <b style="color:var(--rojo)">${fmt(-freeP)}</b>`):'Define un límite y registra tus gastos del día a día.';

  const reco=income*0.20;
  $('aho-reco').innerHTML=`💡 Recomendado (20% de tus ingresos): <b>${fmt(reco)}</b>`;
  $('aho-note').innerHTML=income>0&&c.ahorro>0?(c.ahorro>=reco?`✅ Vas <b>${Math.round(c.ahorro/income*100)}%</b>, ¡por encima del 20%! 🌱`:`Vas en <b>${Math.round(c.ahorro/income*100)}%</b>. Te faltan <b>${fmt(reco-c.ahorro)}</b> para el 20%.`):'';
  const dl=$('deuda-list');
  dl.innerHTML=c.debts.length?c.debts.map((d,i)=>`<div class="item debt ${d.paid?'paid':''}" data-di="${i}" style="background:var(--deuda-bg)"><span class="check">${d.paid?'✓':''}</span><span class="nm">💳 ${esc(d.bank)}${d.dueDay?` <small style="color:var(--soft);font-weight:600">· día ${d.dueDay}</small>`:''}</span><input class="d-amt-inline" type="number" inputmode="numeric" min="0" data-damt="${i}" value="${d.amt||''}" placeholder="valor"><button class="del" data-ddel="${i}">✕</button></div>`).join(''):'<div class="empty">Sin deudas registradas 🌿</div>';
  dl.querySelectorAll('.item').forEach(el=>el.onclick=e=>{if(e.target.dataset.ddel!==undefined||e.target.dataset.damt!==undefined)return;const i=+el.dataset.di;c.debts[i].paid=!c.debts[i].paid;persist();render();});
  dl.querySelectorAll('[data-damt]').forEach(inp=>inp.oninput=()=>{c.debts[+inp.dataset.damt].amt=+inp.value||0;persist();renderTotals();});
  dl.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=e=>{e.stopPropagation();c.debts.splice(+b.dataset.ddel,1);syncDebtTemplate();persist();render();});
  const dPaid=c.debts.filter(d=>d.paid).reduce((a,x)=>a+x.amt,0), dPend=c.debts.filter(d=>!d.paid).length;
  $('deuda-note').innerHTML=c.debts.length?`Total: <b style="color:var(--rojo)">${fmt(deudaTotal())}</b> · Pagado <b style="color:var(--verde)">${fmt(dPaid)}</b> · Faltan <b>${dPend}</b> por pagar`:'';

  $('p-limit').value=c.pLimit||'';$('ahorro').value=c.ahorro||'';
  drawPie(c,income,libre);
}

/* actualiza totales/torta sin reconstruir las listas (para escribir el valor sin perder el foco) */
function renderTotals(){
  const c=M(), income=incomeStored()+invIncomeFor(viewKey);
  const libre=income-(hogarTotal()+persSpent()+c.ahorro+deudaTotal());
  $('s-ing').textContent=fmt(income);$('s-hog').textContent=fmt(hogarTotal());$('s-per').textContent=fmt(persSpent());$('s-aho').textContent=fmt(c.ahorro);
  const sl=$('s-libre');sl.textContent=fmt(libre);sl.className='val '+(libre>=0?'pos':'neg');
  const dPaid=c.debts.filter(d=>d.paid).reduce((a,x)=>a+x.amt,0), dPend=c.debts.filter(d=>!d.paid).length;
  $('deuda-note').innerHTML=c.debts.length?`Total: <b style="color:var(--rojo)">${fmt(deudaTotal())}</b> · Pagado <b style="color:var(--verde)">${fmt(dPaid)}</b> · Faltan <b>${dPend}</b> por pagar`:'';
  drawPie(c,income,libre);
}

/* ---- torta ---- */
function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];}
function slicePath(cx,cy,r,a0,a1){const[x0,y0]=polar(cx,cy,r,a0),[x1,y1]=polar(cx,cy,r,a1);const big=(a1-a0)>180?1:0;return`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${big} 1 ${x1},${y1} Z`;}
function drawPie(c,income,libre){
  const svg=$('pie'),leg=$('legend'),cx=120,cy=120,r=95;
  const cardC=cssVar('--card');
  const segs=[{k:'hogar',lab:'Hogar',v:hogarTotal()},{k:'pers',lab:'Personales',v:persSpent()},{k:'aho',lab:'Ahorro',v:c.ahorro},{k:'deuda',lab:'Deuda',v:deudaTotal()}].filter(s=>s.v>0);
  if(libre>0)segs.push({k:'libre',lab:'Libre',v:libre});
  const totalSeg=segs.reduce((s,x)=>s+x.v,0);
  svg.innerHTML='';leg.innerHTML='';
  if(totalSeg<=0){svg.innerHTML=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cssVar('--panel')}"/><text x="${cx}" y="${cy}" text-anchor="middle" dy=".3em" fill="${cssVar('--muted')}" font-size="13">Sin datos aún</text>`;leg.innerHTML='<div style="color:var(--muted)">Ingresa tus valores 🍃</div>';$('pie-note').textContent='';return;}
  const denom=income>0?income:totalSeg;let ang=0;
  segs.forEach(s=>{
    const frac=s.v/totalSeg,a1=ang+frac*360,mid=ang+frac*180;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',slicePath(cx,cy,r,ang,a1));p.setAttribute('fill',cssVar('--'+s.k));p.setAttribute('stroke',cardC);p.setAttribute('stroke-width','2');svg.appendChild(p);
    const pct=Math.round(s.v/denom*100);
    if(frac>0.05){const[ix,iy]=polar(cx,cy,r*0.62,mid);const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',ix);t.setAttribute('y',iy);t.setAttribute('text-anchor','middle');t.setAttribute('dy','.35em');t.setAttribute('fill','#ffffff');t.setAttribute('font-size','13');t.setAttribute('font-weight','800');t.textContent=pct+'%';svg.appendChild(t);}
    ang=a1;
    leg.innerHTML+=`<div><span class="sw" style="background:var(--${s.k})"></span>${s.lab} · ${pct}% <b>${fmt(s.v)}</b></div>`;
  });
  const hole=document.createElementNS('http://www.w3.org/2000/svg','circle');hole.setAttribute('cx',cx);hole.setAttribute('cy',cy);hole.setAttribute('r',r*0.45);hole.setAttribute('fill',cardC);svg.appendChild(hole);
  const ct=document.createElementNS('http://www.w3.org/2000/svg','text');ct.setAttribute('x',cx);ct.setAttribute('y',cy-6);ct.setAttribute('text-anchor','middle');ct.setAttribute('fill',cssVar('--soft'));ct.setAttribute('font-size','11');ct.textContent='Ingresos';svg.appendChild(ct);
  const cv=document.createElementNS('http://www.w3.org/2000/svg','text');cv.setAttribute('x',cx);cv.setAttribute('y',cy+12);cv.setAttribute('text-anchor','middle');cv.setAttribute('fill',cssVar('--ink'));cv.setAttribute('font-size','13');cv.setAttribute('font-weight','800');cv.textContent=fmt(income);svg.appendChild(cv);
  $('pie-note').innerHTML=libre<0?`⚠️ Tus gastos superan tus ingresos por <b style="color:var(--rojo)">${fmt(-libre)}</b>.`:'';
}

/* ---- inversiones (UI) ---- */
function invParams(){return {P:+$('inv-amt').value||0, ea:+$('inv-ea').value||0, n:Math.max(0,Math.floor(+$('inv-months').value||0))};}
function renderInvCalc(){
  const {P,ea,n}=invParams(), box=$('inv-result');
  if(P<=0||ea<=0||n<=0){box.innerHTML='<div style="color:var(--muted)">Ingresa valor, % E.A. y plazo para ver la proyección 🌱</div>';return;}
  const im=invMonthlyRate(ea), FV=P*Math.pow(1+im,n), gain=FV-P;
  let rows='',bal=P;
  for(let t=0;t<n;t++){const interes=bal*im;bal+=interes;rows+=`<tr><td>Mes ${t+1}</td><td>${fmt(interes)}</td><td>${fmt(bal)}</td></tr>`;}
  box.innerHTML=`<div style="font-size:.85rem;color:var(--soft)">Tasa mensual equivalente: <b>${(im*100).toFixed(3)}%</b></div>
    <div style="margin-top:8px;font-size:.85rem">Ganancia total en ${n} ${n==1?'mes':'meses'}:</div>
    <div class="inv-big">${fmt(gain)}</div>
    <div style="font-size:.85rem">Valor final: <b>${fmt(FV)}</b> (invertiste ${fmt(P)})</div>
    <div class="inv-scroll"><table class="inv-tbl"><thead><tr><th>Mes</th><th>Interés</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderInvList(){
  const box=$('inv-list');if(!box)return;
  if(!DB.investments.length){box.innerHTML='<div class="empty">Aún no has agregado inversiones 🍃</div>';return;}
  box.innerHTML=DB.investments.map(inv=>{
    const im=invMonthlyRate(inv.ea), FV=inv.principal*Math.pow(1+im,inv.months), gain=FV-inv.principal;
    const endKey=shiftKey(inv.start,inv.months-1);
    const done=Math.min(inv.months,Math.max(0,monthsBetween(inv.start,viewKey)+1));
    const activa=monthsBetween(inv.start,viewKey)>=0 && monthsBetween(inv.start,viewKey)<inv.months;
    return `<div class="item inv-i" style="align-items:flex-start">
      <span class="nm">💼 ${esc(inv.name)}<br><small style="color:var(--soft);font-weight:600">${fmt(inv.principal)} · ${inv.ea}% E.A. · ${inv.months} meses<br>${keyTitle(inv.start)} → ${keyTitle(endKey)} · ${activa?('mes '+done+' de '+inv.months):'finalizada'}</small></span>
      <span class="amt" style="color:var(--verde)">+${fmt(gain)}</span>
      <button class="del" data-invdel="${inv.id}">✕</button></div>`;
  }).join('');
  box.querySelectorAll('[data-invdel]').forEach(b=>b.onclick=()=>{if(confirm('¿Quitar esta inversión? Dejará de sumar rendimiento en tus finanzas.')){DB.investments=DB.investments.filter(i=>String(i.id)!==String(b.dataset.invdel));persist();renderInvList();render();}});
}
['inv-amt','inv-ea','inv-months'].forEach(id=>$(id).oninput=renderInvCalc);
$('inv-add').onclick=()=>{
  const {P,ea,n}=invParams();
  if(P<=0||ea<=0||n<=0){alert('Completa valor, % E.A. y plazo 🌷');return;}
  DB.investments.push({id:Date.now(),name:$('inv-name').value.trim()||'Inversión',principal:P,ea,months:n,start:viewKey});
  $('inv-name').value='';$('inv-amt').value='';$('inv-ea').value='';$('inv-months').value='';
  renderInvCalc();renderInvList();persist();render();
  alert('✅ Inversión agregada. Su rendimiento se sumará mes a mes en tus finanzas, desde '+keyTitle(viewKey)+'.');
};

/* ---- pestañas ---- */
function showView(v){
  currentView=v;
  $('view-fin').style.display=v==='fin'?'':'none';
  $('view-inv').style.display=v==='inv'?'':'none';
  $('tab-fin').classList.toggle('active',v==='fin');
  $('tab-inv').classList.toggle('active',v==='inv');
  if(v==='inv'){renderInvCalc();renderInvList();}
}
$('tab-fin').onclick=()=>showView('fin');
$('tab-inv').onclick=()=>showView('inv');

/* ---- navegación meses ---- */
function goTo(k,dir){
  viewKey=k;ensureMonth(k);persist();
  const app=$('app');app.classList.remove('slideL','slideR');void app.offsetWidth;app.classList.add(dir==='next'?'slideL':'slideR');
  renderAll();
}
$('prevM').onclick=()=>goTo(shiftKey(viewKey,-1),'prev');
$('nextM').onclick=()=>goTo(shiftKey(viewKey,1),'next');
let tsx=null,tsy=null;const appEl=$('app');
appEl.addEventListener('touchstart',e=>{tsx=e.changedTouches[0].clientX;tsy=e.changedTouches[0].clientY;},{passive:true});
appEl.addEventListener('touchend',e=>{if(tsx===null)return;const dx=e.changedTouches[0].clientX-tsx,dy=e.changedTouches[0].clientY-tsy;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0)goTo(shiftKey(viewKey,1),'next');else goTo(shiftKey(viewKey,-1),'prev');}tsx=null;},{passive:true});

/* ---- inputs finanzas ---- */
$('p-limit').oninput=e=>{M().pLimit=+e.target.value||0;persist();render();};
$('ahorro').oninput=e=>{M().ahorro=+e.target.value||0;persist();render();};
$('d-add').onclick=()=>{
  const bank=$('d-bank').value.trim(),amt=+$('d-amt').value,day=Math.min(31,Math.max(1,Math.floor(+$('d-day').value||0)))||null;
  if(!bank||!amt||amt<=0){alert('Escribe el banco y un valor válido 🌷');return;}
  M().debts.push({bank,amt,dueDay:day,paid:false});
  $('d-bank').value='';$('d-amt').value='';$('d-day').value='';
  syncDebtTemplate();persist();render();$('d-bank').focus();
};
$('d-amt').onkeydown=e=>{if(e.key==='Enter')$('d-day').focus();};
$('d-day').onkeydown=e=>{if(e.key==='Enter')$('d-add').click();};
$('d-ics').onclick=()=>{
  const withDay=M().debts.filter(d=>d.dueDay);
  if(!withDay.length){alert('Agrega al menos una tarjeta con día de pago para crear los recordatorios 🌷');return;}
  const icsEsc=s=>String(s).replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
  const pad=n=>String(n).padStart(2,'0');
  const now=new Date();
  const stamp=now.getUTCFullYear()+pad(now.getUTCMonth()+1)+pad(now.getUTCDate())+'T'+pad(now.getUTCHours())+pad(now.getUTCMinutes())+pad(now.getUTCSeconds())+'Z';
  let ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mis Finanzas//ES\r\nCALSCALE:GREGORIAN\r\n';
  withDay.forEach((d,i)=>{
    const startDay=Math.min(28,d.dueDay); // primer evento en un día que existe en todos los meses
    const ymd=now.getFullYear()+pad(now.getMonth()+1)+pad(startDay);
    ics+='BEGIN:VEVENT\r\n';
    ics+='UID:misfinanzas-'+now.getTime()+'-'+i+'@misfinanzas\r\n';
    ics+='DTSTAMP:'+stamp+'\r\n';
    ics+='DTSTART:'+ymd+'T080000\r\n';   // 8:00 a.m. hora local
    ics+='DTEND:'+ymd+'T083000\r\n';
    ics+='RRULE:FREQ=MONTHLY;BYMONTHDAY='+d.dueDay+'\r\n';
    ics+='SUMMARY:💳 Pago '+icsEsc(d.bank)+'\r\n';
    ics+='DESCRIPTION:'+icsEsc('Hoy vence el pago de tu tarjeta '+d.bank+'.')+'\r\n';
    ics+='BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Pago '+icsEsc(d.bank)+'\r\nTRIGGER:-PT0M\r\nEND:VALARM\r\n';
    ics+='END:VEVENT\r\n';
  });
  ics+='END:VCALENDAR';
  const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pagos-tarjetas.ics';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
};
$('i-add').onclick=()=>{const n=$('i-name').value.trim(),a=+$('i-amt').value;if(!n||!a||a<=0){alert('Escribe el concepto y un valor válido 🌷');return;}M().incomes.push({name:n,amt:a});$('i-name').value='';$('i-amt').value='';persist();render();$('i-name').focus();};
$('h-add').onclick=()=>{const n=$('h-name').value.trim(),a=+$('h-amt').value;if(!n||!a||a<=0){alert('Escribe el concepto y un valor válido 🌷');return;}M().hogar.push({name:n,amt:a,paid:false});$('h-name').value='';$('h-amt').value='';syncTemplate();persist();render();$('h-name').focus();};
$('p-add').onclick=()=>{const n=$('p-name').value.trim(),a=+$('p-amt').value;if(!n||!a||a<=0){alert('Escribe un nombre y un valor válido 🌷');return;}M().pers.push({name:n,amt:a});$('p-name').value='';$('p-amt').value='';persist();render();$('p-name').focus();};
$('i-amt').onkeydown=e=>{if(e.key==='Enter')$('i-add').click();};
$('h-amt').onkeydown=e=>{if(e.key==='Enter')$('h-add').click();};
$('p-amt').onkeydown=e=>{if(e.key==='Enter')$('p-add').click();};
$('delmonth').onclick=()=>{if(confirm('¿Borrar los datos de '+keyTitle(viewKey)+'?')){delete DB.months[viewKey];ensureMonth(viewKey);persist();render();}};
$('closemonth').onclick=()=>{
  const lib=libreOf(viewKey), nk=shiftKey(viewKey,1);
  if(!confirm('¿Cerrar '+keyTitle(viewKey)+'?\n\nTu saldo libre ('+fmt(lib)+') pasará como ingreso a '+keyTitle(nk)+', y tus gastos fijos se copiarán a ese mes.'))return;
  const nm=ensureMonth(nk);
  if((!nm.hogar||nm.hogar.length===0)&&DB.fixedTemplate.length)nm.hogar=DB.fixedTemplate.map(t=>({name:t.name,amt:t.amt,paid:false}));
  if((!nm.debts||nm.debts.length===0)&&DB.debtTemplate.length)nm.debts=DB.debtTemplate.map(d=>({bank:d.bank,amt:0,dueDay:d.dueDay,paid:false}));
  nm.incomes=(nm.incomes||[]).filter(x=>x.name!=='Sobrante mes anterior');
  if(lib>0)nm.incomes.unshift({name:'Sobrante mes anterior',amt:Math.round(lib)});
  goTo(nk,'next');
  alert('✅ Pasaste a '+keyTitle(nk)+'. Se agregó tu saldo libre y tus gastos fijos.');
};

/* ---- exportar ---- */
function monthToText(s,key){const L=[];const inc=(s.incomes||[]).reduce((a,x)=>a+x.amt,0)+invIncomeFor(key);const hog=(s.hogar||[]).reduce((a,x)=>a+x.amt,0);const hogPag=(s.hogar||[]).filter(x=>x.paid).reduce((a,x)=>a+x.amt,0);const perGas=(s.pers||[]).reduce((a,x)=>a+x.amt,0);const deu=debtsSum(s);const libre=inc-(hog+perGas+(s.ahorro||0)+deu);
  L.push('  INGRESOS: '+fmt(inc));(s.incomes||[]).forEach(x=>L.push('    - '+x.name+': '+fmt(x.amt)));const ii=invIncomeFor(key);if(ii>0)L.push('    - Rendimiento inversiones (auto): '+fmt(ii));
  L.push('  HOGAR (fijos): '+fmt(hog)+'  | Pagado: '+fmt(hogPag)+'  | Pendiente: '+fmt(hog-hogPag));(s.hogar||[]).forEach(x=>L.push('    - ['+(x.paid?'PAGADO':'PENDIENTE')+'] '+x.name+': '+fmt(x.amt)));
  L.push('  PERSONALES: limite '+fmt(s.pLimit||0)+'  | Gastado: '+fmt(perGas));(s.pers||[]).forEach(x=>L.push('    - '+x.name+': '+fmt(x.amt)));
  L.push('  AHORRO: '+fmt(s.ahorro||0)+'   (recomendado 20%: '+fmt(inc*0.2)+')');
  L.push('  DEUDA tarjetas: '+fmt(deu));(s.debts||[]).forEach(x=>L.push('    - '+x.bank+': '+fmt(x.amt)+(x.dueDay?' (vence dia '+x.dueDay+')':'')));
  L.push('  >> LIBRE DEL MES: '+fmt(libre));return L.join('\n');}
$('export').onclick=()=>{
  const now=new Date();let t='===== MIS FINANZAS =====\nExportado: '+now.toLocaleDateString('es-CO')+' '+now.toLocaleTimeString('es-CO')+'\n';
  Object.keys(DB.months).sort().reverse().forEach(k=>{t+='\n['+keyTitle(k)+']\n'+monthToText(DB.months[k],k)+'\n';});
  if(DB.investments.length){t+='\n===== INVERSIONES =====\n';DB.investments.forEach(inv=>{const im=invMonthlyRate(inv.ea),FV=inv.principal*Math.pow(1+im,inv.months);t+='- '+inv.name+': '+fmt(inv.principal)+' al '+inv.ea+'% E.A. x '+inv.months+' meses (desde '+keyTitle(inv.start)+') -> ganancia '+fmt(FV-inv.principal)+'\n';});}
  t+='\n----- RESPALDO -----\nDATA:'+JSON.stringify(DB);
  const blob=new Blob([t],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mis-finanzas-'+now.toISOString().slice(0,10)+'.txt';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
};

/* ---- arranque + Firebase ---- */
function startApp(){$('root').style.display='';renderAll();}
loadLocal();
applyTheme(localStorage.getItem('theme')||'pastel');

const configured=!FIREBASE_CONFIG.apiKey.startsWith('PEGA');
if(configured&&window.firebase){
  firebase.initializeApp(FIREBASE_CONFIG);
  cloud=true;
  const auth=firebase.auth();
  auth.onAuthStateChanged(u=>{
    if(u){
      uid=u.uid;$('gate').style.display='none';$('who').textContent='👤 '+(u.email||'');$('logout').style.display='';
      startApp();
      firebase.database().ref('users/'+uid).on('value',snap=>{
        const v=snap.val();
        if(v){applyingRemote=true;DB=v;normDB();ensureMonth(viewKey);renderAll();applyingRemote=false;}
        else{firebase.database().ref('users/'+uid).set(DB).catch(()=>{});}
      });
    }else{$('gate').style.display='flex';$('root').style.display='none';}
  });
  function toggleMode(){
    signupMode=!signupMode;
    $('gate-sub').textContent=signupMode?'Crea tu cuenta para empezar a sincronizar':'Inicia sesión para ver tus datos en todos tus dispositivos';
    $('au-go').textContent=signupMode?'Crear cuenta':'Entrar';
    $('au-switch').innerHTML=signupMode?'¿Ya tienes cuenta? <b id="au-toggle">Inicia sesión</b>':'¿No tienes cuenta? <b id="au-toggle">Créala aquí</b>';
    $('au-toggle').onclick=toggleMode;
  }
  $('au-toggle').onclick=toggleMode;
  $('au-go').onclick=()=>{
    const em=$('au-email').value.trim(),pw=$('au-pass').value;
    if(!em||!pw){setMsg('Escribe correo y contraseña','err');return;}
    setMsg('Un momento...','ok');
    const p=signupMode?auth.createUserWithEmailAndPassword(em,pw):auth.signInWithEmailAndPassword(em,pw);
    p.catch(err=>setMsg(authErr(err),'err'));
  };
  $('logout').onclick=()=>auth.signOut();
}else{
  $('local-banner').style.display='';startApp();
}
function setMsg(t,cls){const m=$('au-msg');m.textContent=t;m.className='msg '+(cls||'');}
function authErr(e){const c=(e&&e.code)||'';
  if(c.includes('invalid-email'))return'El correo no es válido.';
  if(c.includes('missing-password')||c.includes('weak-password'))return'La contraseña debe tener al menos 6 caracteres.';
  if(c.includes('email-already-in-use'))return'Ese correo ya tiene cuenta. Inicia sesión.';
  if(c.includes('wrong-password')||c.includes('invalid-credential'))return'Correo o contraseña incorrectos.';
  if(c.includes('user-not-found'))return'No existe una cuenta con ese correo. Créala.';
  if(c.includes('operation-not-allowed'))return'Activa Correo/Contraseña en Firebase (Authentication).';
  if(c.includes('network'))return'Sin conexión. Revisa tu internet.';
  return'No se pudo: '+(e.message||c);}

/* ---- PWA ---- */
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
