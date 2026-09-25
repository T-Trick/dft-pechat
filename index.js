/* ===== МОБИЛЬНОЕ МЕНЮ ===== */
var burger=document.getElementById('burger'),menu=document.getElementById('menu');
function closeMenu(){
  menu.classList.remove('open');burger.classList.remove('open');
  burger.setAttribute('aria-expanded','false');document.body.classList.remove('menu-lock');
}
burger.addEventListener('click',function(){
  var open=menu.classList.toggle('open');
  burger.classList.toggle('open',open);
  burger.setAttribute('aria-expanded',open);
  document.body.classList.toggle('menu-lock',open);
});
menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeMenu);});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();});
/* брейкпоинт меню — 880px в index.css: при выходе за него меню и блокировка скролла снимаются */
window.addEventListener('resize',function(){if(window.innerWidth>880)closeMenu();},{passive:true});

/* ===== ЛИПКАЯ НАВИГАЦИЯ ===== */
var nav=document.getElementById('nav');
window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>30);},{passive:true});

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
        if(l&&!l.classList.contains('cta'))l.style.color='#a9c1dd';
      }
    });
  },{rootMargin:'-40% 0px -55% 0px'});
  sec.forEach(function(s){io2.observe(s);});
}

/* ===== CANVAS-ЧАСТИЦЫ ===== */
var canvas=document.getElementById('particles');
var ctx=canvas.getContext('2d');
var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var pageVisible=true;
document.addEventListener('visibilitychange',function(){pageVisible=!document.hidden;});
var small=window.innerWidth<700;
var particles=[],W,H;
var colors=['169,193,221','93,114,144','215,221,230','125,148,181','240,243,247'];
function make(){
  var count=reduceMotion||small?26:55;
  particles=[];
  for(var i=0;i<count;i++){
    particles.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+0.5,vx:(Math.random()-.5)*0.24,vy:(Math.random()-.5)*0.24,a:Math.random()*0.5+0.12});
  }
}
function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;make();}
function draw(){
  if(!reduceMotion&&pageVisible){
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
