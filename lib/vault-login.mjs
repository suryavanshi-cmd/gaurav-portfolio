// Sign-in screen for /vault, in the gallery's own look. `error` is a fixed
// string chosen by the route, never user input.
export function loginPage(error = '') {
  return `<!doctype html>
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
:root{--bg:#0d0b14;--panel:rgba(255,255,255,.06);--line:rgba(255,255,255,.14);--text:#f4f1fa;--muted:#a59fb8;--a1:#a855f7;--a2:#f472b6;--a3:#38bdf8;--bad:#fb7185}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font-family:Poppins,system-ui,sans-serif;display:grid;place-items:center;padding:16px;overflow:hidden;-webkit-font-smoothing:antialiased}
.blob{position:fixed;width:60vmax;height:60vmax;border-radius:50%;filter:blur(90px);opacity:.28;z-index:-1;animation:drift 20s ease-in-out infinite alternate;pointer-events:none}
.b1{background:var(--a1);top:-22vmax;left:-18vmax}.b2{background:var(--a2);bottom:-28vmax;right:-18vmax;animation-delay:-7s}.b3{background:var(--a3);top:40%;left:40%;width:30vmax;height:30vmax;opacity:.15;animation-delay:-13s}
@keyframes drift{to{transform:translate(8vmax,6vmax) scale(1.15)}}
form{width:100%;max-width:360px;padding:30px 24px;border-radius:22px;background:rgba(20,17,30,.6);border:1px solid var(--line);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 30px 80px -30px rgba(168,85,247,.45);animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(24px) scale(.97)}}
form.shake{animation:shake .45s}
@keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.lock{width:54px;height:54px;border-radius:16px;margin:0 auto 16px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,var(--a1),var(--a2));box-shadow:0 10px 30px -8px rgba(244,114,182,.7)}
h1{margin:0;text-align:center;font-size:22px;background:linear-gradient(90deg,var(--a1),var(--a2),var(--a3),var(--a1));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 8s linear infinite}
@keyframes shine{to{background-position:300% 0}}
p{margin:6px 0 22px;text-align:center;color:var(--muted);font-size:13px}
.field{position:relative}
input{width:100%;background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:14px;padding:13px 46px 13px 15px;font:inherit;font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s}
input:focus{border-color:var(--a1);box-shadow:0 0 0 4px rgba(168,85,247,.18)}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;color:var(--muted);font-size:16px;cursor:pointer;width:36px;height:36px;border-radius:10px}
.eye:hover{color:var(--text);background:var(--panel)}
button[type=submit]{margin-top:14px;width:100%;border:0;border-radius:14px;padding:13px;font:inherit;font-weight:600;font-size:15px;color:#fff;cursor:pointer;background:linear-gradient(90deg,var(--a1),var(--a2));transition:transform .15s,filter .2s}
button[type=submit]:hover{filter:brightness(1.08)}button[type=submit]:active{transform:scale(.98)}
.err{margin:12px 0 0;color:var(--bad);font-size:13px;text-align:center;min-height:18px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head><body>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
<form method="post" action="/vault" class="${error ? 'shake' : ''}" autocomplete="on">
  <div class="lock" aria-hidden="true">&#128274;</div>
  <h1>ccinemto vault</h1>
  <p>Private gallery. Enter the password to open it.</p>
  <div class="field">
    <input id="pw" name="password" type="password" placeholder="Password" required autofocus autocomplete="current-password" aria-label="Password">
    <button class="eye" type="button" aria-label="Show password" onclick="var i=document.getElementById('pw');i.type=i.type==='password'?'text':'password'">&#128065;</button>
  </div>
  <button type="submit">Open gallery</button>
  <div class="err" role="alert">${error}</div>
</form>
</body></html>`;
}
