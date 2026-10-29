// Markup for the private ccinemto vault gallery served at /vault.
// Plain HTML + vanilla JS, no React: it is returned by a route handler so the
// portfolio layout (nav, chat, physics field) never wraps it.
export const VAULT_PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0d0b14">
<title>ccinemto vault</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0d0b14;--panel:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--text:#f4f1fa;--muted:#a59fb8;--a1:#a855f7;--a2:#f472b6;--a3:#38bdf8}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--text);font-family:Poppins,system-ui,sans-serif;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.blob{position:fixed;width:60vmax;height:60vmax;border-radius:50%;filter:blur(90px);opacity:.25;z-index:-1;animation:drift 22s ease-in-out infinite alternate;pointer-events:none}
.b1{background:var(--a1);top:-22vmax;left:-18vmax}
.b2{background:var(--a2);bottom:-28vmax;right:-18vmax;animation-delay:-8s}
.b3{background:var(--a3);top:35%;left:35%;width:34vmax;height:34vmax;opacity:.14;animation-delay:-14s}
@keyframes drift{to{transform:translate(8vmax,6vmax) scale(1.15)}}
header{position:sticky;top:0;z-index:5;padding:14px 16px 10px;padding-top:max(14px,env(safe-area-inset-top));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(13,11,20,.65);border-bottom:1px solid var(--line)}
.top{display:flex;align-items:center;gap:12px;max-width:1200px;margin:0 auto}
.logo{font-weight:700;font-size:20px;text-decoration:none;background:linear-gradient(90deg,var(--a1),var(--a2),var(--a3),var(--a1));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 8s linear infinite;white-space:nowrap}
@keyframes shine{to{background-position:300% 0}}
.search{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:999px;padding:9px 15px;font:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
.search:focus{border-color:var(--a1);box-shadow:0 0 0 4px rgba(168,85,247,.15)}
.crumbs{max-width:1200px;margin:10px auto 0;font-size:13px;display:flex;flex-wrap:wrap;gap:2px;align-items:center}
.crumbs a{color:var(--muted);text-decoration:none;padding:3px 9px;border-radius:999px;transition:.2s;text-transform:capitalize}
.crumbs a+a::before{content:"\\203A";margin-right:9px;color:var(--muted)}
.crumbs a:hover,.crumbs a:last-child{color:var(--text);background:var(--panel)}
main{max-width:1200px;margin:0 auto;padding:16px 16px 70px}
.meta{color:var(--muted);font-size:13px;margin:0 0 14px;min-height:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
@media(min-width:700px){.grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}}
.cell{opacity:0;animation:pop .6s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes pop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
.card{position:relative;display:block;width:100%;border-radius:16px;overflow:hidden;background:var(--panel);border:1px solid var(--line);cursor:pointer;aspect-ratio:4/5;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s,border-color .35s;outline:none}
.card:hover,.card:focus-visible{transform:translateY(-6px);box-shadow:0 20px 44px -14px rgba(168,85,247,.5);border-color:rgba(168,85,247,.65)}
.card.busy{animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{opacity:.6}}
.card img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .6s,transform .8s cubic-bezier(.2,.8,.2,1)}
.card img.ok{opacity:1}
.card:hover img{transform:scale(1.07)}
.shim{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.09) 50%,transparent 70%);background-size:200% 100%;animation:sh 1.3s linear infinite}
@keyframes sh{from{background-position:200% 0}to{background-position:-200% 0}}
.label{position:absolute;left:0;right:0;bottom:0;padding:34px 12px 12px;background:linear-gradient(transparent,rgba(0,0,0,.88));font-size:13px;font-weight:600;line-height:1.3;text-transform:capitalize;text-align:left}
.tag{position:absolute;top:10px;left:10px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;background:linear-gradient(90deg,var(--a1),var(--a2));color:#fff}
.play .card{border-color:rgba(244,114,182,.6)}
.empty{color:var(--muted);text-align:center;padding:50px 0;grid-column:1/-1}
#more{height:40px}
.hidden{display:none}
/* viewer */
.viewer{position:fixed;inset:0;z-index:20;background:rgba(6,5,11,.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;flex-direction:column;opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s}
.viewer.open{opacity:1;visibility:visible}
.bar{height:3px;width:0;background:linear-gradient(90deg,var(--a1),var(--a2),var(--a3));transition:width .45s cubic-bezier(.2,.8,.2,1)}
.vtop{display:flex;align-items:center;gap:8px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top))}
.vtitle{flex:1;min-width:0;font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize}
.count{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.btn{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:999px;height:38px;min-width:38px;padding:0 12px;font:inherit;font-size:15px;cursor:pointer;transition:background .2s,transform .2s;display:inline-flex;align-items:center;justify-content:center}
.btn:hover{background:rgba(255,255,255,.14)}.btn:active{transform:scale(.92)}
.btn.on{background:linear-gradient(90deg,var(--a1),var(--a2));border-color:transparent}
.stage{flex:1;position:relative;overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.stage:active{cursor:grabbing}
.track{display:flex;height:100%;transition:transform .5s cubic-bezier(.2,.8,.2,1);will-change:transform}
.slide{flex:0 0 100%;height:100%;display:flex;align-items:center;justify-content:center;padding:6px 16px}
.slide img{max-width:min(100%,560px);max-height:100%;width:auto;height:auto;border-radius:14px;box-shadow:0 30px 70px -20px rgba(0,0,0,.85);transform:scale(.9);opacity:.35;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s;pointer-events:none}
.slide.cur img{transform:none;opacity:1}
.nav{position:absolute;top:50%;z-index:3;transform:translateY(-50%);width:46px;height:46px;font-size:20px}
.nav:active{transform:translateY(-50%) scale(.92)}
.prev{left:14px}.next{right:14px}
@media(max-width:640px){.nav{display:none}}
.dots{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;padding:14px 16px;padding-bottom:max(16px,env(safe-area-inset-bottom))}
.dot{width:7px;height:7px;border-radius:999px;background:rgba(255,255,255,.3);transition:width .35s,background .35s;border:0;padding:0;cursor:pointer}
.dot.on{width:24px;background:linear-gradient(90deg,var(--a1),var(--a2))}
.vwrap{position:relative;flex:1;display:flex;flex-direction:column;min-height:0}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style>
</head>
<body>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
<header>
  <div class="top">
    <a class="logo" href="#b=">ccinemto vault</a>
    <a class="btn" href="/vault/logout" title="Lock vault" aria-label="Lock vault" style="text-decoration:none">&#128274;</a>
    <input id="q" class="search" type="search" placeholder="Filter folders…" autocomplete="off">
  </div>
  <nav id="crumbs" class="crumbs"></nav>
</header>
<main>
  <p id="meta" class="meta"></p>
  <div id="grid" class="grid"></div>
  <div id="more"></div>
</main>

<div id="viewer" class="viewer" role="dialog" aria-modal="true">
  <div id="bar" class="bar"></div>
  <div class="vtop">
    <button id="close" class="btn" aria-label="Close">&#10005;</button>
    <div id="vtitle" class="vtitle"></div>
    <span id="count" class="count"></span>
    <button id="auto" class="btn" aria-label="Autoplay">&#9654;</button>
  </div>
  <div class="vwrap">
    <button id="prev" class="btn nav prev" aria-label="Previous">&#8249;</button>
    <div id="stage" class="stage"><div id="track" class="track"></div></div>
    <button id="next" class="btn nav next" aria-label="Next">&#8250;</button>
  </div>
  <div id="dots" class="dots"></div>
</div>

<script>
(function(){
var $=function(id){return document.getElementById(id)};
var grid=$("grid"),viewer=$("viewer"),track=$("track"),stage=$("stage"),dots=$("dots");
var cache={};

function api(prefix,cursor){
  var k=prefix+"|"+(cursor||"");
  if(cache[k])return Promise.resolve(cache[k]);
  var u="/vault/api/list?prefix="+encodeURIComponent(prefix)+(cursor?"&cursor="+encodeURIComponent(cursor):"");
  return fetch(u,{credentials:"same-origin"}).then(function(r){
    if(r.status===401||r.status===403){location.href="/vault";throw new Error("session expired")};
    if(!r.ok)throw new Error("HTTP "+r.status);
    return r.json();
  }).then(function(d){cache[k]=d;return d});
}
function imgUrl(k){return "/vault/img/"+k.split("/").map(encodeURIComponent).join("/")}
function coverUrl(p){return "/vault/api/cover?prefix="+encodeURIComponent(p)}
function parentOf(p){var s=p.replace(/\\/$/,"");var i=s.lastIndexOf("/");return i<0?"":s.slice(0,i+1)}
function nameOf(p){var s=p.replace(/\\/$/,"");s=s.slice(s.lastIndexOf("/")+1);return s.replace(/[-_]+/g," ")||"vault"}

/* routing: #b=<prefix> browse, #v=<prefix> view carousel */
function parse(){var m=/^#(b|v)=(.*)$/.exec(location.hash);return m?{mode:m[1],prefix:decodeURIComponent(m[2])}:{mode:"b",prefix:""}}
function go(mode,p){location.hash=mode+"="+encodeURIComponent(p)}
var current=null;
function route(){
  var r=parse();
  var browse=r.mode==="v"&&r.prefix!==current?parentOf(r.prefix):r.prefix;
  if(r.mode==="v"&&current!==null&&(r.prefix===current||parentOf(r.prefix)===current))browse=current;
  if(browse!==current)browseTo(browse);
  if(r.mode==="v")openViewer(r.prefix);else closeViewer();
}
window.addEventListener("hashchange",route);

/* grid */
var S={},idx=0;
function browseTo(p){
  current=p;S={prefix:p,cursor:null,done:false,loading:false,n:0,play:false};idx=0;
  grid.innerHTML="";$("q").value="";crumbs(p);$("meta").textContent="Loading…";
  window.scrollTo(0,0);loadMore();
}
function loadMore(){
  var s=S;if(s.loading||s.done)return;s.loading=true;
  api(s.prefix,s.cursor).then(function(d){
    if(s!==S)return;
    if(d.images.length&&!s.play){s.play=true;addCard("Slides in this folder","Play",coverUrl(s.prefix),function(){go("v",s.prefix)},true)}
    d.folders.forEach(function(f){addCard(nameOf(f),"",coverUrl(f),function(el){openFolder(f,el)})});
    s.n+=d.folders.length;s.cursor=d.cursor;s.done=!d.cursor;s.loading=false;
    meta();
    if(s.done&&!s.n&&!s.play)grid.innerHTML='<p class="empty">Nothing here yet.</p>';
    if(!s.done)setTimeout(nearBottom,50);
  }).catch(function(e){s.loading=false;$("meta").textContent="Could not load: "+e.message});
}
function meta(){
  var t=S.n+(S.done?"":"+")+" folder"+(S.n===1?"":"s");
  var q=$("q").value.trim();if(q)t+=" \\u00b7 filtering loaded folders";
  $("meta").textContent=t;
}
function nearBottom(){if($("more").getBoundingClientRect().top<innerHeight+700)loadMore()}
new IntersectionObserver(function(e){if(e[0].isIntersecting)loadMore()},{rootMargin:"700px"}).observe($("more"));

function addCard(title,tag,cover,onClick,isPlay){
  var cell=document.createElement("div");cell.className="cell"+(isPlay?" play":"");
  cell.style.animationDelay=(idx++%20)*40+"ms";
  var card=document.createElement("button");card.className="card";card.type="button";
  var sh=document.createElement("div");sh.className="shim";
  var img=document.createElement("img");img.alt="";img.loading="lazy";img.decoding="async";img.draggable=false;
  img.onload=function(){img.classList.add("ok");sh.remove()};img.onerror=function(){sh.remove()};
  img.src=cover;
  var lab=document.createElement("div");lab.className="label";lab.textContent=title;
  card.appendChild(sh);card.appendChild(img);card.appendChild(lab);
  if(tag){var t=document.createElement("span");t.className="tag";t.textContent=tag;card.appendChild(t)}
  card.onclick=function(){onClick(card)};
  cell.dataset.name=title.toLowerCase();cell.appendChild(card);grid.appendChild(cell);filterOne(cell);
}
function openFolder(p,el){
  el.classList.add("busy");
  api(p).then(function(d){el.classList.remove("busy");go(!d.folders.length&&d.images.length?"v":"b",p)})
        .catch(function(){el.classList.remove("busy");go("b",p)});
}
function crumbs(p){
  var c=$("crumbs");c.innerHTML="";
  function add(t,pr){var a=document.createElement("a");a.href="#b="+encodeURIComponent(pr);a.textContent=t;c.appendChild(a)}
  add("Vault","");var acc="";
  p.split("/").filter(Boolean).forEach(function(seg){acc+=seg+"/";add(seg.replace(/[-_]+/g," "),acc)});
}
function filterOne(cell){var q=$("q").value.trim().toLowerCase();cell.classList.toggle("hidden",!!q&&cell.dataset.name.indexOf(q)<0&&!cell.classList.contains("play"))}
$("q").addEventListener("input",function(){Array.prototype.forEach.call(grid.children,function(c){if(c.dataset.name)filterOne(c)});meta()});

/* viewer */
var V={prefix:null,imgs:[],i:0,timer:null};
function loadAll(p){var out=[];function step(c){return api(p,c).then(function(d){out=out.concat(d.images);return d.cursor?step(d.cursor):out})}return step(null)}
function openViewer(p){
  if(V.prefix===p&&viewer.classList.contains("open"))return;
  V.prefix=p;V.imgs=[];V.i=0;stopAuto();
  $("vtitle").textContent=nameOf(p);$("count").textContent="";$("bar").style.width="0";
  track.innerHTML="";dots.innerHTML="";track.style.transform="translateX(0)";
  viewer.classList.add("open");document.body.style.overflow="hidden";
  loadAll(p).then(function(imgs){
    if(V.prefix!==p)return;V.imgs=imgs;
    if(!imgs.length){track.innerHTML='<div class="slide"><p class="empty">No images in this folder.</p></div>';return}
    imgs.forEach(function(k,i){
      var s=document.createElement("div");s.className="slide";
      var im=document.createElement("img");im.alt="Slide "+(i+1);im.decoding="async";im.draggable=false;
      if(i<2)im.src=imgUrl(k);else im.dataset.src=imgUrl(k);
      s.appendChild(im);track.appendChild(s);
      var d=document.createElement("button");d.className="dot";d.setAttribute("aria-label","Slide "+(i+1));
      d.onclick=function(){show(i)};dots.appendChild(d);
    });
    show(0);
  }).catch(function(e){track.innerHTML='<div class="slide"><p class="empty">Could not load: '+e.message+'</p></div>'});
}
function show(i){
  var n=V.imgs.length;if(!n)return;V.i=(i%n+n)%n;
  track.style.transform="translateX("+(-V.i*100)+"%)";
  [-1,0,1,2].forEach(function(o){var s=track.children[(V.i+o+n)%n],im=s&&s.firstChild;if(im&&im.dataset&&im.dataset.src){im.src=im.dataset.src;delete im.dataset.src}});
  Array.prototype.forEach.call(track.children,function(s,j){s.classList.toggle("cur",j===V.i)});
  Array.prototype.forEach.call(dots.children,function(d,j){d.classList.toggle("on",j===V.i)});
  $("count").textContent=(V.i+1)+" / "+n;$("bar").style.width=((V.i+1)/n*100)+"%";
}
function closeViewer(){if(!viewer.classList.contains("open"))return;viewer.classList.remove("open");document.body.style.overflow="";stopAuto();V.prefix=null}
function stopAuto(){clearInterval(V.timer);V.timer=null;$("auto").classList.remove("on");$("auto").innerHTML="&#9654;"}
function toggleAuto(){if(V.timer){stopAuto();return}V.timer=setInterval(function(){show(V.i+1)},3500);$("auto").classList.add("on");$("auto").innerHTML="&#10074;&#10074;"}
$("close").onclick=function(){go("b",current||"")};
$("prev").onclick=function(){show(V.i-1)};
$("next").onclick=function(){show(V.i+1)};
$("auto").onclick=toggleAuto;
document.addEventListener("keydown",function(e){
  if(!viewer.classList.contains("open"))return;
  if(e.key==="ArrowRight")show(V.i+1);else if(e.key==="ArrowLeft")show(V.i-1);
  else if(e.key==="Escape")go("b",current||"");else if(e.key===" "){e.preventDefault();toggleAuto()}
});
/* swipe / drag */
var sx=null,dx=0,sw=1;
stage.addEventListener("pointerdown",function(e){sx=e.clientX;dx=0;sw=stage.clientWidth||1;track.style.transition="none";try{stage.setPointerCapture(e.pointerId)}catch(_){}});
stage.addEventListener("pointermove",function(e){if(sx===null)return;dx=e.clientX-sx;track.style.transform="translateX(calc("+(-V.i*100)+"% + "+dx+"px))"});
function end(){if(sx===null)return;track.style.transition="";var t=sw*.15;if(dx<-t)show(V.i+1);else if(dx>t)show(V.i-1);else show(V.i);sx=null}
stage.addEventListener("pointerup",end);stage.addEventListener("pointercancel",end);

route();
})();
</script>
</body></html>`;
