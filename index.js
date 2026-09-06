/* ===== LOKAL STORAGE (безопасные обёртки) ===== */
var _mem={};
function lsOk(){try{var k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return true;}catch(e){return false;}}
var useLS=lsOk();
function get(name,def){try{if(useLS){var v=localStorage.getItem(name);if(v!==null)return JSON.parse(v);}else{if(name in _mem)return _mem[name];}return def;}catch(e){return def;}}
function set(name,val){try{if(useLS){localStorage.setItem(name,JSON.stringify(val));}else{_mem[name]=val;}}catch(e){_mem[name]=val;}}
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}

/* ===== SUPABASE ===== */
var SUPABASE_URL='https://uhkftbrlcxinnmpbogku.supabase.co';
var SUPABASE_ANON='sb_publishable_0LTjO4TAJCtxT1TBGztDeA_MU2bz4nh';
var supabase=null;
var useSupabase=false;
try{
  if(window.supabase){
    supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
    useSupabase=!!supabase;
  }
}catch(e){console.warn('Supabase init failed:',e);useSupabase=false;}
console.log('Supabase ready:',useSupabase);

/* Supabase helpers */
async function fetchOrders(){
  if(!useSupabase){return get('dft.v1.orders',[]);}
  try{
    var res=await supabase.from('orders').select('*').order('created_at',{ascending:false});
    return(res.data)||[];
  }catch(e){console.error('fetchOrders:',e);return get('dft.v1.orders',[]);}
}
async function saveOrder(order){
  if(useSupabase){
    try{
      await supabase.from('orders').insert([{
        id:order.id,name:order.name,contact:order.contact,service:order.service,
        garment:order.garment,design:order.design,qty:order.qty,delivery:order.delivery,
        comment:order.comment,status:order.status||'Новый',created_at:order.created
      }]);
    }catch(e){console.error('saveOrder:',e);}
  }
  var orders=get('dft.v1.orders',[]);
  orders.unshift(order);
  if(orders.length>20)orders=orders.slice(0,20);
  set('dft.v1.orders',orders);
}
async function fetchChats(orderId){
  if(!useSupabase){return(get('dft.v1.chats',{})[orderId])||[];}
  try{
    var res=await supabase.from('chats').select('*').eq('order_id',orderId).order('created_at');
    return(res.data)||[];
  }catch(e){console.error('fetchChats:',e);return(get('dft.v1.chats',{})[orderId])||[];}
}
async function saveChat(orderId,fromRole,text){
  if(useSupabase){
    try{
      await supabase.from('chats').insert([{order_id:orderId,from_role:fromRole,message:text}]);
    }catch(e){console.error('saveChat:',e);}
  }
  var chats=get('dft.v1.chats',{});
  if(!chats[orderId])chats[orderId]=[];
  chats[orderId].push({from:fromRole,text:text,ts:Date.now()});
  set('dft.v1.chats',chats);
}
function subscribeToChat(orderId){
  if(!useSupabase)return;
  try{
    supabase.channel('chats:'+orderId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chats',filter:'order_id=eq.'+orderId},function(payload){
        renderChat().catch(function(e){console.error('renderChat error:',e);});
      })
      .subscribe(function(status){
        if(status==='SUBSCRIBED')console.log('Subscribed to chats');
      });
  }catch(e){console.error('subscribeToChat:',e);}
}
async function recordVisit(){
  var td=today();
  if(useSupabase){
    try{
      await supabase.from('visits').upsert({visit_date:td,count:1},{onConflict:'visit_date'});
    }catch(e){console.error('recordVisit:',e);}
  }
}

/* ===== МОБИЛЬНОЕ МЕНЮ ===== */
var burger=document.getElementById('burger'),menu=document.getElementById('menu');
burger.addEventListener('click',function(){
  var open=menu.classList.toggle('open');
  burger.classList.toggle('open',open);
  burger.setAttribute('aria-expanded',open);
});
menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');burger.classList.remove('open');burger.setAttribute('aria-expanded','false');});});

/* ===== ЛИПКАЯ НАВИГАЦИЯ ===== */
var nav=document.getElementById('nav');
window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>30);},{passive:true});

/* ===== СЧЁТЧИК ВИЗИТОВ ===== */
var visitsTotalPriv=get('dft.v1.visits',0)+1;
set('dft.v1.visits',visitsTotalPriv);
var td=today(),tdRec=get('dft.v1.today',{date:'',count:0});
if(tdRec.date!==td){tdRec={date:td,count:0};}
tdRec.count+=1;set('dft.v1.today',tdRec);
var tTotal=document.getElementById('visitsTotal');
var tToday=document.getElementById('visitsToday');
if(tTotal)tTotal.textContent=visitsTotalPriv;
if(tToday)tToday.textContent=tdRec.count;
recordVisit();
document.getElementById('resetAll').addEventListener('click',function(){
  if(useLS){['dft.v1.visits','dft.v1.today','dft.v1.orders'].forEach(function(k){localStorage.removeItem(k);});}
  else{_mem={};}
  location.reload();
});

/* ===== ИСТОРИЯ ЗАКАЗОВ ===== */
var orderList=document.getElementById('orderList');
var chatOpenBtns=[];
function fmtDate(str){
  var d=new Date(str);
  if(isNaN(d))return str;
  return d.getDate()+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear();
}
async function renderOrders(){
  var orders=await fetchOrders();
  orderList.innerHTML='';
  if(!orders.length){
    var li=document.createElement('li');
    li.className='empty-state';
    li.textContent='У вас пока нет заказов. Оформите первый из раздела «Заказать»!';
    orderList.appendChild(li);
    return;
  }
  orders.forEach(function(o){
    if(!o.id)o.id='ORD-'+Date.now();
    var li=document.createElement('li');li.className='order-item';
    var chat=document.createElement('button');chat.type='button';chat.className='btn btn-ghost';
    chat.textContent='💬 Чат с печатью';
    chat.addEventListener('click',function(){openChat(o.id,'user');});
    var main=document.createElement('div');main.className='oi-main';
    var b=document.createElement('b');b.textContent=o.garment+' · '+o.qty+' шт.';
    var p=document.createElement('p');p.textContent=o.service+' · '+o.delivery;
    var d=document.createElement('div');d.className='oi-extra';
    var st=document.createElement('b');st.textContent=(o.status||'Новый');
    st.className='status-badge st-'+statusKey(o.status);
    var date=document.createElement('div');date.textContent=fmtDate(o.created);
    d.appendChild(st);d.appendChild(date);
    main.appendChild(b);main.appendChild(p);
    li.appendChild(chat);li.appendChild(main);li.appendChild(d);
    orderList.appendChild(li);
  });
}
console.log('DFT Site initialized');
console.log('useSupabase:', useSupabase);
renderOrders().catch(function(e){console.error('renderOrders:',e);});

/* ===== ФОРМА ЗАКАЗА ===== */
var form=document.getElementById('orderForm');
var success=document.getElementById('orderSuccess');
var summary=document.getElementById('successSummary');
var required=[['fName','name'],['fContact','contact']];
function markErrors(){
  var ok=true;
  required.forEach(function(pair){
    var f=document.getElementById(pair[0]);
    var parent=f.closest('.field');
    if(!f.value.trim()){parent.classList.add('error');f.classList.add('invalid');ok=false;}
    else if(pair[1]==='contact'&&!phoneTelegramRe.test(f.value.trim())){
      parent.classList.add('error');f.classList.add('invalid');ok=false;
    }
    else{parent.classList.remove('error');f.classList.remove('invalid');}
  });
  return ok;
}
form.addEventListener('submit',async function(e){
  e.preventDefault();
  if(!markErrors())return;
  var o={
    id:'ORD-'+Date.now(),
    name:document.getElementById('fName').value.trim(),
    contact:document.getElementById('fContact').value.trim(),
    service:document.getElementById('fService').value,
    garment:document.getElementById('fGarment').value,
    design:document.getElementById('fDesign').value.trim()||'—',
    qty:document.getElementById('fQty').value||'1',
    delivery:document.getElementById('fDelivery').value,
    comment:document.getElementById('fComment').value.trim()||'—',
    status:'Новый',
    created:new Date().toISOString()
  };
  await saveOrder(o);
  var chats=get('dft.v1.chats',{});
  if(!chats[o.id])chats[o.id]=[];
  set('dft.v1.chats',chats);
  updateAdminDot();
  if(admIsLogged()){renderAdmin().catch(function(e){console.error(e);});}

  summary.innerHTML='<div><span>Гармент</span><b>'+escapeHtml(o.garment)+'</b></div>'
    +'<div><span>Ткань/услуга</span><b>'+escapeHtml(o.service)+'</b></div>'
    +'<div><span>Кол-во</span><b>'+escapeHtml(o.qty)+' шт.</b></div>'
    +'<div><span>Доставка</span><b>'+escapeHtml(o.delivery)+'</b></div>'
    +'<div><span>Дизайн</span><b>'+escapeHtml(o.design)+'</b></div>';
  form.style.display='none';
  success.classList.add('show');
  renderOrders().catch(function(e){console.error(e);});
});
/* Валидация контакта в реальном времени */
var fContact=document.getElementById('fContact');
var phoneTelegramRe=/^(\+?\d{10,14}|@\w+)/;
fContact.addEventListener('input',function(){
  var field=fContact.closest('.field');
  if(fContact.value.trim()&&!phoneTelegramRe.test(fContact.value.trim())){
    field.classList.add('error');
    fContact.classList.add('invalid');
    fContact.title='Введите телефон (+7...) или Telegram (@username)';
  }else{
    field.classList.remove('error');
    fContact.classList.remove('invalid');
    fContact.title='';
  }
});

document.getElementById('newOrder').addEventListener('click',function(){
  form.reset();
  form.style.display='grid';
  success.classList.remove('show');
  required.forEach(function(pair){
    var f=document.getElementById(pair[0]);
    f.closest('.field').classList.remove('error');
    f.classList.remove('invalid');
  });
});

/* ===== СКРОЛЛ-АНИМАЦИИ ===== */
var revealEls=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){en.target.classList.add('visible');io.unobserve(en.target);}
    });
  },{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
  revealEls.forEach(function(el,i){el.style.transitionDelay=((i%4)*.06)+'s';io.observe(el);});
}else{revealEls.forEach(function(el){el.classList.add('visible');});}

/* ===== АКТИВНЫЙ ЯКОРЬ ===== */
var links=Array.prototype.slice.call(document.querySelectorAll('.menu a'));
var map={};
links.forEach(function(l){var h=l.getAttribute('href');if(h&&h[0]==='#')map[h.slice(1)]=l;});
if('IntersectionObserver' in window){
  var sec=document.querySelectorAll('section[id]');
  var io2=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        links.forEach(function(l){l.style.color='';l.classList.remove('active');});
        var l=map[en.target.id];
        if(l&&!l.classList.contains('cta'))l.style.color='#2de2ff';
      }
    });
  },{rootMargin:'-40% 0px -55% 0px'});
  sec.forEach(function(s){io2.observe(s);});
}

/* ===== CANVAS-ЧАСТИЦЫ ===== */
var canvas=document.getElementById('particles');
var ctx=canvas.getContext('2d');
var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var small=window.innerWidth<700;
var particles=[],W,H;
var colors=['45,226,255','124,92,255','255,92,138','255,225,77','201,246,90'];
function make(){
  var count=reduceMotion||small?26:55;
  particles=[];
  for(var i=0;i<count;i++){
    particles.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+0.5,vx:(Math.random()-.5)*0.24,vy:(Math.random()-.5)*0.24,a:Math.random()*0.5+0.12});
  }
}
function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;make();}
function draw(){
  if(!reduceMotion){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<particles.length;i++){
      var p=particles[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba('+colors[i%colors.length]+','+p.a+')';ctx.fill();
    }
  }
  requestAnimationFrame(draw);
}
window.addEventListener('resize',function(){small=window.innerWidth<700;});
window.addEventListener('resize',resize);
resize();draw();

/* ===== АДМИН-ПАНЕЛЬ И ЧАТ ===== */
var ADMIN_PASS='dft2024';
var STATUSES=['Новый','В работе','Отправлен','Выполнен','Отменён'];
function statusKey(s){return (s||'Новый')==='Новый'?'new':(s==='В работе'?'work':(s==='Отправлен'?'ship':(s==='Выполнен'?'done':'cancel')));}
async function getOrders(){return await fetchOrders();}
function getChats(){return get('dft.v1.chats',{});}
function saveOrders(o){set('dft.v1.orders',o);}
function saveChats(c){set('dft.v1.chats',c);}
async function setStatus(orderId,st){
  if(useSupabase){
    try{await supabase.from('orders').update({status:st}).eq('id',orderId);}catch(e){console.error('setStatus:',e);}
  }
  var orders=get('dft.v1.orders')||[];
  orders.forEach(function(o){if(o.id===orderId)o.status=st;});
  saveOrders(orders);
  renderAdmin();
  renderOrders();
}
function escapeHtml(s){s=String(s==null?'':s);var out='';for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c==='&')out+='&amp;';else if(c==='<')out+='&lt;';else if(c==='>')out+='&gt;';else if(c==='\"')out+='&quot;';else out+=c;}return out;}

function admIsLogged(){try{return sessionStorage.getItem('dft.adm')==='1';}catch(e){return _mem.adm==='1';}}
function admLoginYes(){try{sessionStorage.setItem('dft.adm','1');}catch(e){_mem.adm='1';}}
function admLogoutYes(){try{sessionStorage.removeItem('dft.adm');}catch(e){delete _mem.adm;}}

var admGate=document.getElementById('admGate');
var admDash=document.getElementById('admDash');

/* ---- ЧАТ ---- */
var curChat={id:null,role:'user'};
var chatModal=document.getElementById('chatModal');
var chatMsgs=document.getElementById('chatMsgs');
var chatText=document.getElementById('chatText');
function timeHM(ms){var d=new Date(ms);return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
async function findOrder(id){var r=null;var orders=await getOrders()||[];orders.forEach(function(x){if(x.id===id)r=x;});return r;}
async function openChat(id,role){
  curChat.id=id;curChat.role=role;
  var o=findOrder(id);
  document.getElementById('chatAv').textContent=(o&&o.name&&o.name.trim()?o.name.trim()[0]:'?').toUpperCase();
  document.getElementById('chatTitle').textContent=o?(o.garment+' · '+o.qty+' шт.'):'Заказ';
  document.getElementById('chatSub').textContent=o?('#'+o.id):'Переписка';
  chatModal.classList.add('open');
  await renderChat().catch(function(e){console.error(e);});
  subscribeToChat(id);
}
async function renderChat(){
  chatMsgs.innerHTML='';
  var list;
  if(useSupabase){
    list=await fetchChats(curChat.id);
    if(!list.length){
      var e=document.createElement('div');e.className='empty-lab';e.textContent='Сообщений пока нет — начните диалог.';
      chatMsgs.appendChild(e);return;
    }
    for(var i=0;i<list.length;i++){
      var m=list[i];
      var div=document.createElement('div');div.className='msg '+(m.from_role==='admin'?'admin':'user');
      div.textContent=m.message;
      var w=document.createElement('span');w.className='when';w.textContent=timeHM((new Date(m.created_at)).getTime())+(m.from_role==='admin'?' · Админ':' · Вы');
      div.appendChild(w);chatMsgs.appendChild(div);
    }
  }else{
    var chats=getChats();
    list=chats[curChat.id]||[];
    if(!list.length){
      var e=document.createElement('div');e.className='empty-lab';e.textContent='Сообщений пока нет — начните диалог.';
      chatMsgs.appendChild(e);return;
    }
    for(var i=0;i<list.length;i++){
      var m=list[i];
      var div=document.createElement('div');div.className='msg '+(m.from==='admin'?'admin':'user');
      div.textContent=m.text;
      var w=document.createElement('span');w.className='when';w.textContent=timeHM(m.ts)+(m.from==='admin'?' · Админ':' · Вы');
      div.appendChild(w);chatMsgs.appendChild(div);
    }
  }
  chatMsgs.scrollTop=chatMsgs.scrollHeight;
}
async function sendChat(){
  var id=curChat.id,txt=chatText.value.trim();
  if(!id||!txt)return;
  await saveChat(id,(curChat.role==='admin'?'admin':'user'),txt);
  chatText.value='';
  await renderChat();
  if(admIsLogged()){renderAdmin().catch(function(e){console.error(e);});}
}
document.getElementById('chatSend').addEventListener('click',sendChat);
chatText.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sendChat();}});
document.getElementById('chatClose').addEventListener('click',function(){chatModal.classList.remove('open');});
chatModal.addEventListener('click',function(e){if(e.target===chatModal)chatModal.classList.remove('open');});

/* ---- СТАТУС ---- */
async function setStatus(id,st){
  var orders=getOrders()||[];
  orders.forEach(function(o){if(o.id===id)o.status=st;});
  saveOrders(orders);renderAdmin();renderOrders().catch(function(e){console.error(e);});
}

/* ---- РЕНДЕР АДМИНКИ ---- */
async function renderAdmin(){
  var orders=await fetchOrders()||[];
  admGate.style.display=admIsLogged()?'none':'block';
  admDash.style.display=admIsLogged()?'block':'none';
  if(!admIsLogged())return;
  var statTotal=orders.length,statNew=0,statWork=0,statDone=0;
  orders.forEach(function(o){var s=o.status||'Новый';if(s==='Новый')statNew++;else if(s==='В работе'||s==='Отправлен')statWork++;else if(s==='Выполнен')statDone++;});
  document.getElementById('statTotal').textContent=statTotal;
  document.getElementById('statNew').textContent=statNew;
  document.getElementById('statWork').textContent=statWork;
  document.getElementById('statDone').textContent=statDone;
  var box=document.getElementById('admOrders');
  if(!orders.length){box.innerHTML='<div class=\"empty-lab\">Новых заказов пока нет — они появятся здесь автоматически.</div>';return;}
  box.innerHTML='';
  orders.forEach(function(o){
    var card=document.createElement('div');card.className='aorder';
    var top=document.createElement('div');top.className='aorder-top';
    top.innerHTML='<span class=\"aorder-id\">#'+o.id+'</span><span class=\"aorder-cli\">👤 '+escapeHtml(o.name)+' · '+escapeHtml(o.contact)+'</span><span class=\"status-badge st-'+statusKey(o.status)+'\">'+(o.status||'Новый')+'</span><span class=\"spacer\"></span><span class=\"aorder-date\">'+fmtDate(o.created)+'</span>';
    var det=document.createElement('div');det.className='aorder-details';
    det.innerHTML='<div><span>Гармент:</span> <b>'+escapeHtml(o.garment)+'</b></div>'
      +'<div><span>Кол-во:</span> <b>'+o.qty+' шт.</b></div>'
      +'<div><span>Услуга:</span> <b>'+escapeHtml(o.service)+'</b></div>'
      +'<div><span>Доставка:</span> <b>'+escapeHtml(o.delivery)+'</b></div>'
      +'<div style=\"grid-column:1/-1\"><span>Дизайн:</span> <b>'+escapeHtml(o.design)+'</b></div>'
      +(o.comment&&o.comment!=='—'?'<div style=\"grid-column:1/-1\"><span>Комментарий:</span> <b>'+escapeHtml(o.comment)+'</b></div>':'');
    var act=document.createElement('div');act.className='aorder-actions';
    var sel=document.createElement('select');
    STATUSES.forEach(function(s){var op=document.createElement('option');op.value=s;op.textContent=s;if((o.status||'Новый')===s)op.selected=true;sel.appendChild(op);});
    sel.addEventListener('change',function(){setStatus(o.id,sel.value);});
    var chatB=document.createElement('button');chatB.type='button';chatB.className='btn btn-ghost';chatB.textContent='💬 Чат';
    chatB.addEventListener('click',function(){openChat(o.id,'admin');});
    act.appendChild(sel);act.appendChild(chatB);
    card.appendChild(top);card.appendChild(det);card.appendChild(act);
    box.appendChild(card);
  });
}

/* ---- ЛОГИН/ЛОГАУТ ---- */
document.getElementById('admLogin').addEventListener('click',function(){
  var inp=document.getElementById('admPass'),field=inp.closest('.field');
  if(inp.value.trim()===ADMIN_PASS){admLoginYes();inp.value='';field.classList.remove('error');inp.classList.remove('invalid');renderAdmin().catch(function(e){console.error(e);});}
  else{field.classList.add('error');inp.classList.add('invalid');}
});
document.getElementById('admPass').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();document.getElementById('admLogin').click();}});
document.getElementById('admLogout').addEventListener('click',function(){admLogoutYes();renderAdmin().catch(function(e){console.error(e);});});

/* ---- СЧЁТЧИК НОВЫХ НА КНОПКЕ АДМИНКИ ---- */
function updateAdminDot(){
  var orders=get('dft.v1.orders')||[];
  var n=0;orders.forEach(function(o){if((o.status||'Новый')==='Новый')n++;});
  var dot=document.getElementById('admDot');if(dot)dot.style.display=n?'block':'none';
}
updateAdminDot();
renderAdmin().catch(function(e){console.error('renderAdmin error:',e);});
renderOrders().catch(function(e){console.error('renderOrders error:',e);});
