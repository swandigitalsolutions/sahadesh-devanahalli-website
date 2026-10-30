// Static site generator: node site-src/build.mjs  ->  site/
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from './data.mjs';
import { sprite } from './icons.mjs';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SRC, '..', 'site');
const sizes = JSON.parse(await readFile(path.join(SRC, 'img', 'sizes.json'), 'utf8'));
const VER = Date.now().toString(36);
const S = D.site;
const SPRITE = sprite().replace('<svg ', '<svg aria-hidden="true" style="display:none" ');

// ------------------------------------------------------------------ helpers
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ic = (n, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const sub = (k) => D.subsites.find((s) => s.key === k);
const tel = (n) => `tel:+91${n.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')}`;
const wa = (text = '') => `https://wa.me/91${S.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
function pic(name, alt, o = {}) {
  const key = `${name}.webp`;
  const [w, h] = sizes[key] || [800, 600];
  return `<img src="~/img/${key}" width="${w}" height="${h}" alt="${esc(alt)}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${o.cls ? ` class="${o.cls}"` : ''}>`;
}

// Same rules as app.js so pages read correctly even before scripts run
const T0 = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
const dd = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - T0) / 864e5); };
const MONTHS = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];
const kDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
function deadlineChip(iso) {
  const n = dd(iso);
  const [t, c] = n < 0 ? ['ಅರ್ಜಿ ಅವಧಿ ಮುಕ್ತಾಯವಾಗಿದೆ', 'off'] : n === 0 ? ['ಇಂದೇ ಕೊನೆಯ ದಿನ!', 'hot'] : n === 1 ? ['ನಾಳೆ ಕೊನೆಯ ದಿನ', 'hot'] : n <= 7 ? [`ಇನ್ನು ${n} ದಿನ ಮಾತ್ರ`, 'warn'] : [`ಅರ್ಜಿ ಸ್ವೀಕಾರ – ಇನ್ನು ${n} ದಿನ`, 'ok'];
  return `<span class="chip ${c}" data-deadline="${iso}">${t}</span>`;
}
function windowChip(from, to) {
  const a = dd(from), b = dd(to);
  const [t, c] = a > 0 ? [a === 1 ? 'ನಾಳೆಯಿಂದ ಆರಂಭ' : `ಇನ್ನು ${a} ದಿನಗಳಲ್ಲಿ ಆರಂಭ`, 'warn'] : b >= 0 ? [`ಈಗ ಸಲ್ಲಿಸಬಹುದು – ಇನ್ನು ${b + 1} ದಿನ`, b <= 7 ? 'hot' : 'ok'] : ['ಈ ವರ್ಷದ ಅವಧಿ ಮುಗಿದಿದೆ', 'off'];
  return `<span class="chip ${c}" data-window-from="${from}" data-window-to="${to}">${t}</span>`;
}
function eventChip(iso) {
  const n = dd(iso);
  const [t, c] = n === 0 ? ['ಇಂದು', 'hot'] : n === 1 ? ['ನಾಳೆ', 'hot'] : n > 1 ? [`ಇನ್ನು ${n} ದಿನಗಳಲ್ಲಿ`, 'warn'] : ['ನಡೆದಿದೆ', 'off'];
  return `<span class="chip ${c}" data-event="${iso}">${t}</span>`;
}

// ------------------------------------------------------------------ chrome
const LOGO = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#0d2c6c"/><circle cx="32" cy="32" r="27" fill="none" stroke="#ffd23f" stroke-width="2.5"/><circle cx="20.5" cy="25" r="4.6" fill="#ffd23f"/><rect x="14" y="31" width="13" height="12" rx="6.5" fill="#ffd23f"/><circle cx="43.5" cy="25" r="4.6" fill="#ff5a5f"/><rect x="37" y="31" width="13" height="12" rx="6.5" fill="#ff5a5f"/><circle cx="32" cy="21" r="5.6" fill="#fff"/><rect x="24" y="28.5" width="16" height="15" rx="8" fill="#fff"/><path d="M14 47c10 7 26 7 36 0" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

const NAV = [['', 'ಮುಖಪುಟ', 'home'], ['parichaya/', 'ಪರಿಚಯ', 'user'], ['seve/', 'ದಾಖಲೆ ಸೇವೆ', 'idcard'], ['yojane/', 'ಯೋಜನೆಗಳು', 'gift'], ['udyoga/', 'ಉದ್ಯೋಗ', 'briefcase'], ['janaseve/', 'ಸಮಾಜ ಸೇವೆ', 'heart'], ['manavi/', 'ಮನವಿಗಳು', 'megaphone', 'opt'], ['karyakrama/', 'ಕಾರ್ಯಕ್ರಮ', 'calendar', 'opt'], ['samparka/', 'ಸಂಪರ್ಕ', 'phone']];

function header(page) {
  const cur = page.sub ? page.sub + '/' : page.url;
  const links = NAV.map(([u, l, , opt]) => `<a href="~/${u}"${opt ? ' class="opt"' : ''}${(u === cur || (u && cur.startsWith(u))) ? ' aria-current="true"' : ''}>${l}</a>`).join('');
  return `
<div class="topbar"><div class="wrap">
  <div class="tb-left"><span class="flagline" aria-hidden="true"><i></i><i></i></span><span data-today>ಇಂದು</span><span class="tb-hide">• ${esc(S.tagline)}</span></div>
  <div class="tb-right"><a href="${tel(S.phones[0])}">${ic('phone')} ${S.phones[0]}</a><a class="tb-hide" href="${tel(S.phones[1])}">${S.phones[1]}</a><a href="${wa()}" target="_blank" rel="noopener">${ic('whatsapp')} ವಾಟ್ಸಾಪ್</a><a class="tb-hide" href="${S.instagram}" target="_blank" rel="noopener" aria-label="ಇನ್‌ಸ್ಟಾಗ್ರಾಂ">${ic('instagram')}</a></div>
</div></div>
<header class="site-head"><div class="wrap">
  <a class="brand" href="~/">${LOGO}<span><b>${S.org}</b><small>${S.place} • 2018ರಿಂದ</small></span></a>
  <nav class="mainnav" aria-label="ಮುಖ್ಯ ಮೆನು">${links}</nav>
  <div class="head-tools"><button class="head-btn" type="button" data-open-search aria-label="ಹುಡುಕಿ">${ic('search')}</button><button class="head-btn menu-btn" type="button" data-open-menu aria-label="ಮೆನು ತೆರೆಯಿರಿ">${ic('menu')}</button></div>
</div></header>
<div class="ticker" role="region" aria-label="ಇತ್ತೀಚಿನ ಮಾಹಿತಿ"><div class="wrap"><span class="tk-label">ಹೊಸ ಮಾಹಿತಿ</span><div class="tk-track"><div class="tk-move">${D.ticker.map((t) => `<span>${esc(t)}</span>`).join('')}</div></div></div></div>
${D.greetings.map((g) => `<div class="greet" data-from="${g.from}" data-to="${g.to}">${esc(g.text)} <a href="~/${g.link}">ಇನ್ನಷ್ಟು ${ic('arrow')}</a></div>`).join('')}`;
}

function subbar(page) {
  const s = sub(page.sub);
  if (!s) return '';
  const items = SUBNAV[s.key] || [];
  return `
<div class="subbar"><div class="wrap"><span class="sb-icon">${ic(s.icon)}</span><div class="sb-title"><b>${s.name}</b><span>${s.tag}</span></div><span class="sb-tag">ಉಪ-ಜಾಲತಾಣ</span></div>
<nav class="subnav" aria-label="${esc(s.name)} ಮೆನು"><div class="wrap">${items.map(([u, l]) => `<a href="~/${u}"${u === page.url ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</div></nav></div>`;
}

function footer() {
  const half = Math.ceil(D.subsites.length / 2);
  const col = (list) => list.map((s) => `<a href="~/${s.key}/">${s.short === s.name ? s.name : s.short}</a>`).join('');
  return `
<footer class="site-foot"><div class="flag"></div><div class="wrap">
  <div><a class="brand" href="~/" style="color:#fff">${LOGO}<span><b style="color:#fff">${S.org}</b><small style="color:var(--yellow)">${S.place}</small></span></a>
    <p class="motto">${S.motto}</p><p>“${esc(S.quote)}”<br><b style="color:#fff">– ${S.leader}</b></p><p>${ic('pin')} ${esc(S.address)}</p></div>
  <div><h4>ಉಪ-ಜಾಲತಾಣಗಳು</h4>${col(D.subsites.slice(0, half))}</div>
  <div><h4>ಇನ್ನಷ್ಟು</h4>${col(D.subsites.slice(half))}<a href="~/samparka/">ಸಂಪರ್ಕ</a></div>
  <div><h4>ಸಂಪರ್ಕಿಸಿ</h4>${S.phones.map((p) => `<a href="${tel(p)}">${ic('phone')} ${p}</a>`).join('')}<a href="${wa()}" target="_blank" rel="noopener">${ic('whatsapp')} ವಾಟ್ಸಾಪ್: ${S.whatsapp}</a><a href="${S.instagram}" target="_blank" rel="noopener">${ic('instagram')} ಇನ್‌ಸ್ಟಾಗ್ರಾಂ</a><a href="${D.social[3].url}" target="_blank" rel="noopener">${ic('youtube')} ${S.youtubeName}</a></div>
</div>
<div class="base"><div class="wrap" style="display:block;padding:0">© 2026 ${S.org}, ${S.place}. ${esc(S.footerLine)}<br>ಯೋಜನೆಗಳ ಮಾಹಿತಿ ಸಾರ್ವಜನಿಕರ ಅರಿವಿಗಾಗಿ ಮಾತ್ರ; ಅರ್ಹತೆ ಮತ್ತು ಸೌಲಭ್ಯಗಳು ಅಧಿಕೃತ ನಿಯಮಗಳು ಹಾಗೂ ಸರ್ಕಾರದ ಅಧಿಸೂಚನೆಗಳಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತವೆ.<br>ವಿನ್ಯಾಸ ಮತ್ತು ಅಭಿವೃದ್ಧಿ: ಸ್ವಾನ್ ಡಿಜಿಟಲ್ ಸೊಲ್ಯೂಷನ್ಸ್</div></div>
</footer>
<div class="mbar no-print"><a href="${tel(S.phones[0])}">${ic('phone')} ಕರೆ ಮಾಡಿ</a><a class="wa" href="${wa('ನಮಸ್ಕಾರ, ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಬೇಕಿತ್ತು.')}" target="_blank" rel="noopener">${ic('whatsapp')} ವಾಟ್ಸಾಪ್</a></div>
<div class="drawer" id="drawer"><div class="scrim" data-close-menu></div><nav aria-label="ಮೆನು">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-family:var(--head);color:var(--navy)">ಎಲ್ಲ ವಿಭಾಗಗಳು</b><button class="head-btn" type="button" data-close-menu aria-label="ಮುಚ್ಚಿ">${ic('close')}</button></div>
  <a href="~/"><span class="dot" style="background:var(--navy)">${ic('home')}</span>ಮುಖಪುಟ</a>
  ${D.subsites.map((s) => `<a href="~/${s.key}/" data-theme="${s.theme}"><span class="dot" style="background:var(--accent)">${ic(s.icon)}</span>${s.name}</a>`).join('')}
  <a href="~/samparka/"><span class="dot" style="background:var(--red)">${ic('phone')}</span>ಸಂಪರ್ಕ</a>
</nav></div>
<div class="sdialog" id="search" role="dialog" aria-label="ಜಾಲತಾಣದಲ್ಲಿ ಹುಡುಕಿ"><div class="sbox">
  <div class="searchbar" style="margin:0">${ic('search')}<input class="input" type="search" placeholder="ಹುಡುಕಿ: ಆಧಾರ್, ಗೃಹಲಕ್ಷ್ಮಿ, ಉದ್ಯೋಗ, ಪಿಂಚಣಿ…" aria-label="ಹುಡುಕಿ"></div>
  <div class="sres"></div><p style="text-align:right;margin:10px 0 0"><button class="btn btn-ghost btn-sm" type="button" data-close-search>ಮುಚ್ಚಿ</button></p>
</div></div>`;
}

function layout(page) {
  const depth = page.file || !page.url ? 0 : page.url.split('/').filter(Boolean).length;
  const B = '../'.repeat(depth);
  const s = sub(page.sub);
  const theme = page.theme || (s ? s.theme : 'royal');
  const title = page.url ? `${page.title} | ${S.org}, ${S.place}` : `${S.org}, ${S.place} | ${S.leader}`;
  const ogImg = `${S.url}/img/${page.og ? page.og + '.webp' : 'og-cover.jpg'}`;
  const ld = page.url ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization', name: `${S.org}, ${S.place}`, url: S.url, foundingDate: '2018',
    logo: `${S.url}/img/icon-512.png`, telephone: '+91' + S.phones[0], sameAs: [S.instagram],
    address: { '@type': 'PostalAddress', addressLocality: 'ದೇವನಹಳ್ಳಿ', addressRegion: 'ಕರ್ನಾಟಕ', addressCountry: 'IN' },
    founder: { '@type': 'Person', name: S.leader, jobTitle: S.leaderRole },
  })}</script>`;
  const html = `<!doctype html>
<html lang="kn" class="no-js" data-base="~/" data-wa="${S.whatsapp}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.desc)}">
<link rel="canonical" href="${S.url}/${page.url}">
<meta property="og:type" content="website"><meta property="og:locale" content="kn_IN"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.desc)}"><meta property="og:image" content="${ogImg}"><meta property="og:url" content="${S.url}/${page.url}"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d2c6c">
<link rel="manifest" href="~/manifest.webmanifest"><link rel="icon" type="image/png" href="~/img/favicon-48.png"><link rel="apple-touch-icon" href="~/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Kannada:wght@600;700;800&family=Noto+Sans+Kannada:wght@400;600;700&display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="~/assets/style.css?v=${VER}">
${page.preload ? `<link rel="preload" as="image" href="~/img/${page.preload}.webp" fetchpriority="high">` : ''}${ld}
</head>
<body data-theme="${theme}">
<a class="skip" href="#main">ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ತೆರಳಿ</a>
${SPRITE}
${header(page)}
${subbar(page)}
<main id="main">${page.body}</main>
${footer()}
<div class="lightbox" id="lightbox" role="dialog" aria-label="ಫೋಟೋ ವೀಕ್ಷಣೆ"><button class="lb-close" type="button" aria-label="ಮುಚ್ಚಿ">${ic('close')}</button><button class="lb-prev" type="button" aria-label="ಹಿಂದಿನದು">${ic('back')}</button><img alt=""><button class="lb-next" type="button" aria-label="ಮುಂದಿನದು">${ic('arrow')}</button><div class="lb-cap"></div></div>
<script src="~/assets/app.js?v=${VER}" defer></script>
</body>
</html>`;
  return html.replaceAll('~/', B);
}

// ------------------------------------------------------------------ blocks
const crumbs = (trail) => `<nav class="crumbs" aria-label="ನೀವು ಇಲ್ಲಿದ್ದೀರಿ"><a href="~/">ಮುಖಪುಟ</a>${trail.map(([u, l]) => `<span aria-hidden="true">›</span>${u ? `<a href="~/${u}">${l}</a>` : `<span>${l}</span>`}`).join('')}</nav>`;
function phero({ trail, kicker, title, lead, img, imgAlt, extra = '', eager = true }) {
  return `<section class="phero"><div class="wrap${img ? '' : ' solo'}"><div>${crumbs(trail)}${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}</div>${img ? `<div class="ph-img">${pic(img, imgAlt || title, { eager })}</div>` : ''}</div></section>`;
}
const secHead = (h, p = '', right = '') => `<div class="sec-head"><div><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</div>${right}</div>`;
const checks = (items) => `<ul class="checks">${items.map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')}</ul>`;
function docChecklist(key, docs) {
  return `<div><ul class="doclist" data-checklist="${key}">${docs.map((d) => `<li><label><input type="checkbox"><span>${esc(d)}</span></label></li>`).join('')}</ul><div class="progress"><i></i></div><small data-progress-label style="color:var(--muted)"></small></div>`;
}
const shareRow = (extra = '') => `<div class="btns no-print" style="margin-top:18px">${extra}<button class="btn btn-ghost btn-sm" type="button" data-share>${ic('share')} ಹಂಚಿಕೊಳ್ಳಿ</button></div>`;
const waBtn = (text, label = 'ವಾಟ್ಸಾಪ್ ಮಾಡಿ', cls = 'btn btn-wa') => `<a class="${cls}" href="${wa(text)}" target="_blank" rel="noopener">${ic('whatsapp')} ${label}</a>`;
function helpBox(topic) {
  return `<div class="box accent"><h2>${ic('whatsapp')} ಸಹಾಯ ಬೇಕೇ?</h2><p>ದಾಖಲೆಗಳನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿದರೆ ಅರ್ಜಿ ಸಲ್ಲಿಕೆಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಲಾಗುವುದು. ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯವರು ಸಂಪರ್ಕಿಸಬಹುದು.</p>
  <div class="btns">${waBtn(`ನಮಸ್ಕಾರ, "${topic}" ಬಗ್ಗೆ ಮಾಹಿತಿ / ಸಹಾಯ ಬೇಕಿತ್ತು.`, 'ವಾಟ್ಸಾಪ್ ಮಾಡಿ', 'btn btn-gold')}<a class="btn btn-ghost" href="${tel(S.phones[0])}">${ic('phone')} ${S.phones[0]}</a></div></div>`;
}
function mediaCard({ href, img, title, text, chip = '', tags = '', icon = 'image' }) {
  return `<a class="card media-card rv" href="~/${href}"${tags ? ` data-tags="${tags}"` : ''}><div class="media">${img ? pic(img, title) : `<div class="ph">${ic(icon)}</div>`}</div><div class="body">${chip}<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}<span class="more">ವಿವರ ನೋಡಿ ${ic('arrow')}</span></div></a>`;
}
const iconCard = (icon, title, text, href) => `<${href ? `a href="~/${href}"` : 'div'} class="card rv"><div class="ibox">${ic(icon)}</div><h3>${title}</h3><p>${text}</p>${href ? `<span class="more">ಮುಂದೆ ${ic('arrow')}</span>` : ''}</${href ? 'a' : 'div'}>`;
function ctaBand(title = 'ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು ನಿಮ್ಮ ಹಕ್ಕು – ತಪ್ಪದೇ ಪಡೆಯಿರಿ', text = 'ಯಾವುದೇ ಮಾಹಿತಿ ಹಾಗೂ ಅರ್ಜಿಗಳಿಗೆ ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ.') {
  return `<section class="section"><div class="wrap"><div class="cta rv"><div><h2>${title}</h2><p>${text}</p></div><div class="btns">${waBtn('ನಮಸ್ಕಾರ, ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಬೇಕಿತ್ತು.', 'ವಾಟ್ಸಾಪ್', 'btn btn-gold')}<a class="btn btn-ghost" href="${tel(S.phones[0])}">${ic('phone')} ಕರೆ ಮಾಡಿ</a></div></div></div></section>`;
}
const gallery = (names, caption) => `<div class="masonry">${names.map((n) => `<a href="~/img/${n}.webp" data-lb="${esc(caption)}">${pic(n, caption)}</a>`).join('')}</div>`;

// ------------------------------------------------------------------ sub-site menus
const SUBNAV = {
  parichaya: [['parichaya/', 'ಜೀವನ ಪರಿಚಯ'], ['parichaya/sadhane/', 'ಸಾಧನೆ ಮತ್ತು ಗೌರವಗಳು'], ['parichaya/adarsha/', 'ಆದರ್ಶ ಮತ್ತು ಹವ್ಯಾಸಗಳು'], ['parichaya/samskruti/', 'ಸಾಂಸ್ಕೃತಿಕ ಸೇವೆ']],
  kendra: [['kendra/', 'ಸಂಸ್ಥೆಯ ಬಗ್ಗೆ'], ['kendra/uddesha/', 'ಉದ್ದೇಶ ಮತ್ತು ಗುರಿ'], ['kendra/mahiti-seve/', 'ಮಾಹಿತಿ ಸೇವೆಗಳು'], ['kendra/digital/', 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ'], ['kendra/kutumba/', 'ನಮ್ಮ ಕುಟುಂಬ']],
  seve: [['seve/', 'ಎಲ್ಲ ಸೇವೆಗಳು'], ...D.documentServices.slice(0, 6).map((d) => [`seve/${d.slug}/`, d.name]), ['seve/hege/', 'ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಹೇಗೆ?']],
  yojane: [['yojane/', 'ಎಲ್ಲ ಯೋಜನೆಗಳು'], ['yojane/arhate/', 'ಅರ್ಹತೆ ಪರಿಶೀಲನೆ'], ...D.schemes.map((s) => [`yojane/${s.slug}/`, s.name.split(' – ')[0].replace(' (ವೈದ್ಯಕೀಯ ನೆರವು)', '')])],
  udyoga: [['udyoga/', 'ಉದ್ಯೋಗ ಮುಖಪುಟ'], ['udyoga/hr-samparka/', 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು'], ['udyoga/nondani/', 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ'], ['udyoga/mela/', 'ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ತರಬೇತಿ']],
  janaseve: [['janaseve/', 'ಎಲ್ಲ ಸೇವೆಗಳು'], ...D.socialWork.map((w) => [`janaseve/${w.slug}/`, w.name])],
  manavi: [['manavi/', 'ಎಲ್ಲ ಮನವಿಗಳು'], ...D.petitions.map((p) => [`manavi/${p.slug}/`, p.name]), ['manavi/kundukorate/', 'ನಿಮ್ಮ ಕುಂದುಕೊರತೆ ತಿಳಿಸಿ']],
  abhivruddhi: [['abhivruddhi/', 'ಅಭಿವೃದ್ಧಿ ಕನಸು'], ['abhivruddhi/salahe/', 'ನಿಮ್ಮ ಸಲಹೆ ನೀಡಿ']],
  devanahalli: [['devanahalli/', 'ಎಲ್ಲ ತಾಣಗಳು'], ...D.places.map((p) => [`devanahalli/${p.slug}/`, p.name.split(' – ')[0]])],
  karyakrama: [['karyakrama/', 'ಎಲ್ಲ ಕಾರ್ಯಕ್ರಮಗಳು'], ['karyakrama/madhyama/', 'ಮಾಧ್ಯಮ ವರದಿಗಳು'], ...D.events.slice(0, 5).map((e) => [`karyakrama/${e.slug}/`, e.name.replace(' (ಮಾಹಿತಿ ಹಂಚಿಕೆ)', '')])],
  gallery: [['gallery/', 'ಫೋಟೋ ಗ್ಯಾಲರಿ'], ['gallery/posters/', 'ಪೋಸ್ಟರ್ ಸಂಗ್ರಹ']],
  sahayavani: [['sahayavani/', 'ಎಲ್ಲ ಸಹಾಯವಾಣಿಗಳು'], ['sahayavani/#ilakhe', 'ಇಲಾಖಾ ಸಂಖ್ಯೆಗಳು'], ['sahayavani/#kendra', 'ಕೇಂದ್ರದ ಸಂಪರ್ಕ']],
};

// ------------------------------------------------------------------ pages
const pages = [];
const add = (p) => pages.push(p);

// HOME -----------------------------------------------------------------
{
  const upcoming = [
    ...D.events.filter((e) => e.date && dd(e.date) >= -1).map((e) => ({ until: e.date, chip: eventChip(e.date), title: e.name, meta: `${kDate(e.date)} • ${e.place.split(',')[0]}`, href: `karyakrama/${e.slug}/`, date: e.date })),
    ...D.schemes.filter((s) => s.deadline).map((s) => ({ until: s.deadline, chip: deadlineChip(s.deadline), title: s.name, meta: `ಕೊನೆಯ ದಿನಾಂಕ: ${kDate(s.deadline)}`, href: `yojane/${s.slug}/`, date: s.deadline })),
    ...D.schemes.filter((s) => s.window).map((s) => ({ until: s.window.to, chip: windowChip(s.window.from, s.window.to), title: `${s.name}: ${s.window.label}`, meta: `${kDate(s.window.from)} – ${kDate(s.window.to)}`, href: `yojane/${s.slug}/`, date: s.window.from })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const stats = [[0, '2018', 'ಸ್ಥಾಪನೆ ವರ್ಷ'], [25000, '+', 'ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು'], [10, '+', 'ಸಚಿವರು/ಶಾಸಕರೊಂದಿಗೆ ಅನುಭವ'], [D.documentServices.length, '', 'ದಾಖಲೆ ಸೇವೆಗಳು'], [D.hrContacts.length, '', 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕಗಳು'], [7300, '+', 'ಫೇಸ್‌ಬುಕ್ ಸ್ನೇಹಿತರು']];
  const featured = ['gruhalakshmi', 'alpasankhyatara-nigama', 'hiriya-nagarikaru', 'mukhyamantri-parihara-nidhi'].map((k) => D.schemes.find((s) => s.slug === k));
  add({
    url: '', title: 'ಮುಖಪುಟ', theme: 'royal', preload: 'sahadesh-vidhanasoudha',
    desc: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ – ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ ಅವರ ನೇತೃತ್ವದಲ್ಲಿ 2018ರಿಂದ ಉದ್ಯೋಗ, ಆಸ್ಪತ್ರೆ, ಸಾಲ ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ನೀಡುವ ಜನಸೇವಾ ವೇದಿಕೆ.',
    k: 'home sahadesh devanahalli', body: `
<section class="hero"><div class="wrap">
  <div>
    <span class="kicker">${ic('sparkle')} 2018ರಿಂದ ಜನಸೇವೆಯಲ್ಲಿ</span>
    <h1>${S.org}<span class="place">${S.place}</span></h1>
    <p class="tagline">${S.tagline}</p>
    <p class="rotator" data-rotate="ಉದ್ಯೋಗದ ಮಾಹಿತಿ|ಆಸ್ಪತ್ರೆಯ ಮಾಹಿತಿ|ಸಾಲ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ|ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ|ದಾಖಲೆ ಸೇವೆಗಳು">ನಿಮಗಾಗಿ: <b>ಉದ್ಯೋಗದ ಮಾಹಿತಿ</b></p>
    <blockquote>“${esc(S.quote)}”<cite>– ${S.leader}, ${S.leaderRole}</cite></blockquote>
    <div class="btns"><a class="btn btn-primary" href="~/yojane/">${ic('gift')} ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು</a><a class="btn btn-gold" href="~/yojane/arhate/">${ic('check')} ನನಗೆ ಯಾವ ಸೌಲಭ್ಯ?</a>${waBtn('ನಮಸ್ಕಾರ, ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಬೇಕಿತ್ತು.', 'ವಾಟ್ಸಾಪ್')}</div>
  </div>
  <div class="hero-photo">
    <div class="frame">${pic('sahadesh-vidhanasoudha', 'ವಿಧಾನಸೌಧದ ಮುಂದೆ ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್', { eager: true })}</div>
    <div class="hero-caption"><b>${S.leader}</b><span>${S.leaderRole}, ${S.org}</span></div>
    <div class="hero-badges"><div class="hb"><span class="ibox">${ic('trophy')}</span><span>ಗಿನ್ನಿಸ್ ವಿಶ್ವ ದಾಖಲೆ<small>23,000+ ಸಂಪರ್ಕಗಳು</small></span></div><div class="hb"><span class="ibox">${ic('award')}</span><span>ಗೌರವ ಡಾಕ್ಟರೇಟ್<small>ಸಮಾಜ ಸೇವೆಗಾಗಿ</small></span></div></div>
  </div>
</div></section>

<section class="live"><div class="wrap"><div class="panel">
  <div class="today"><span>ಇಂದು</span><b data-today="short">${kDate(new Date().toISOString().slice(0, 10))}</b><span>ಮುಂಬರುವ ದಿನಾಂಕಗಳು ಮತ್ತು ಕೊನೆಯ ದಿನಾಂಕಗಳು</span></div>
  <div class="items" data-upcoming-list="3">${upcoming.map((u) => `<a class="item" href="~/${u.href}" data-until="${u.until}">${u.chip}<b>${esc(u.title)}</b><small>${esc(u.meta)}</small></a>`).join('')}</div>
</div></div></section>

<section class="section" style="padding-top:48px"><div class="wrap"><div class="stats">${stats.map(([n, suf, l]) => `<div class="stat rv"><b${n ? ` data-count="${n}" data-suffix="${suf}"` : ''}>${n ? n.toLocaleString('en-IN') + suf : suf}</b><span>${l}</span></div>`).join('')}</div></div></section>

<section class="section alt"><div class="wrap">
  ${secHead('ನಮ್ಮ ಉಪ-ಜಾಲತಾಣಗಳು', 'ಪ್ರತಿ ಸೇವೆಗೂ ಪ್ರತ್ಯೇಕ ಜಾಲತಾಣ – ನಿಮಗೆ ಬೇಕಾದ ಮಾಹಿತಿ ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ.')}
  <div class="portals">${D.subsites.map((s) => `<a class="portal rv" href="~/${s.key}/" data-theme="${s.theme}"><div class="pimg">${pic(s.img, s.name)}</div><div class="pbody"><span class="pnum">${ic(s.icon)}</span><div><h3>${s.name}</h3><p>${s.tag}</p></div><span class="go">${ic('arrow')}</span></div></a>`).join('')}</div>
</div></section>

<section class="section"><div class="wrap split">
  <div class="rv">
    <span class="kicker">${ic('user')} ಸಂಸ್ಥಾಪಕರು ಯಾರು?</span>
    <h2>${S.leader}</h2>
    <p class="lead">${esc(D.bio.story[0])}</p>
    <table class="kv">${D.bio.facts.slice(1, 6).map(([, k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>
    <div class="btns" style="margin-top:20px"><a class="btn btn-primary" href="~/parichaya/">ಪೂರ್ಣ ಪರಿಚಯ ${ic('arrow')}</a><a class="btn btn-ghost" href="~/parichaya/sadhane/">${ic('trophy')} ಸಾಧನೆಗಳು</a></div>
  </div>
  <div class="rv" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="grid-row:span 2;border-radius:22px;overflow:hidden;box-shadow:var(--shadow-lg)">${pic('sahadesh-namaste-blue', 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್', { cls: 'cover' })}</div>
    <div style="border-radius:18px;overflow:hidden;box-shadow:var(--shadow)">${pic('guinness-group', 'ಗಿನ್ನಿಸ್ ದಾಖಲೆ ಪ್ರಮಾಣ ಪತ್ರ')}</div>
    <div style="border-radius:18px;overflow:hidden;box-shadow:var(--shadow)">${pic('doctorate-certificate', 'ಗೌರವ ಡಾಕ್ಟರೇಟ್ ಪ್ರಮಾಣ ಪತ್ರ')}</div>
  </div>
</div></section>

<section class="section tint" data-theme="teal"><div class="wrap">
  ${secHead('ದಾಖಲೆ ಸೇವಾ ಕೇಂದ್ರ', 'ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯವರು ಈ ಕೆಳಕಂಡ ದಾಖಲಾತಿಗಳನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿದರೆ ಮಾಡಿಕೊಡಲಾಗುವುದು.', `<a class="btn btn-primary" href="~/seve/">ಎಲ್ಲ ಸೇವೆಗಳು ${ic('arrow')}</a>`)}
  <div class="grid g4">${D.documentServices.slice(0, 8).map((d) => iconCard(d.icon, d.name, d.short, `seve/${d.slug}/`)).join('')}</div>
</div></section>

<section class="section" data-theme="magenta"><div class="wrap">
  ${secHead('ಪ್ರಮುಖ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', 'ಅರ್ಹತೆ, ಬೇಕಾಗುವ ದಾಖಲೆಗಳು ಮತ್ತು ಕೊನೆಯ ದಿನಾಂಕ – ಎಲ್ಲವೂ ಒಂದೇ ಕಡೆ.', `<a class="btn btn-primary" href="~/yojane/">ಎಲ್ಲ ಯೋಜನೆಗಳು ${ic('arrow')}</a>`)}
  <div class="grid g4">${featured.map((s) => mediaCard({ href: `yojane/${s.slug}/`, img: s.img, title: s.name, text: s.summary.slice(0, 90) + '…', chip: s.deadline ? deadlineChip(s.deadline) : s.window ? windowChip(s.window.from, s.window.to) : `<span class="chip">${s.highlight[1]}</span>` })).join('')}</div>
</div></section>

<section class="quote-band section"><div class="wrap"><p>“${esc(D.bio.quotes[0][0])}”</p><cite>– ${S.leader}</cite></div></section>

<section class="section" data-theme="green"><div class="wrap">
  ${secHead('ಸಮಾಜ ಸೇವೆ ಮತ್ತು ಕೊಡುಗೆಗಳು', 'ಆರೋಗ್ಯ ಶಿಬಿರ, ರಕ್ತದಾನ, ಪರಿಸರ, ಜಾಗೃತಿ ಮತ್ತು ಉದ್ಯೋಗ ಮೇಳ – ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನಾದ್ಯಂತ.', `<a class="btn btn-primary" href="~/janaseve/">ಇನ್ನಷ್ಟು ${ic('arrow')}</a>`)}
  <div class="grid g3">${D.socialWork.map((w) => mediaCard({ href: `janaseve/${w.slug}/`, img: w.img, title: w.name, text: w.text.slice(0, 96) + '…' })).join('')}</div>
</div></section>

<section class="section alt" data-theme="crimson"><div class="wrap">
  ${secHead('ಜನಪರ ಮನವಿಗಳು', 'ಜನರ ಪರವಾಗಿ ಸರ್ಕಾರಕ್ಕೆ ಸಲ್ಲಿಸಿದ ಬೇಡಿಕೆಗಳು ಮತ್ತು ಅವುಗಳ ಸ್ಥಿತಿ.', `<a class="btn btn-primary" href="~/manavi/">ಎಲ್ಲ ಮನವಿಗಳು ${ic('arrow')}</a>`)}
  <div class="grid g4">${D.petitions.map((p) => mediaCard({ href: `manavi/${p.slug}/`, img: p.img, title: p.name, text: p.short, chip: `<span class="chip warn">${p.status}</span>` })).join('')}</div>
</div></section>

<section class="section" data-theme="saffron"><div class="wrap split">
  <div class="rv"><span class="kicker">${ic('briefcase')} ಉದ್ಯೋಗ ಮಾಹಿತಿ</span><h2>ಉದ್ಯೋಗ ಬೇಕೇ? ನೇರವಾಗಿ ಎಚ್‌ಆರ್‌ಗೆ ಕರೆ ಮಾಡಿ</h2>
    <p class="lead">“ನಿಮ್ಮ ಕೌಶಲ್ಯ – ನಮ್ಮ ಬೆಂಬಲ”. ${D.hrContacts.length} ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು, ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ ಮತ್ತು ಉದ್ಯೋಗ ಮೇಳಗಳ ಮಾಹಿತಿ.</p>
    <div class="btns"><a class="btn btn-primary" href="~/udyoga/hr-samparka/">${ic('phone')} ಎಚ್‌ಆರ್ ಸಂಖ್ಯೆಗಳು</a><a class="btn btn-ghost" href="~/udyoga/nondani/">${ic('file')} ನೋಂದಣಿ ಮಾಡಿ</a></div></div>
  <div class="hr-grid rv">${D.hrContacts.slice(0, 6).map(([n, name], i) => `<div class="hr-card"><span class="num">${i + 1}</span><div><b>${name}</b><a class="tel" href="${tel(n)}">${n}</a></div></div>`).join('')}</div>
</div></section>

<section class="section alt" data-theme="earth"><div class="wrap">
  ${secHead('ನಮ್ಮ ದೇವನಹಳ್ಳಿ – ನಮ್ಮ ಹೆಮ್ಮೆ', 'ಐತಿಹಾಸಿಕ ಪರಂಪರೆ… ನಮ್ಮ ಹೆಮ್ಮೆಯ ದೇವನಹಳ್ಳಿ…', `<a class="btn btn-primary" href="~/devanahalli/">ಎಲ್ಲ ತಾಣಗಳು ${ic('arrow')}</a>`)}
  <div class="grid g4">${D.places.slice(0, 4).map((p) => mediaCard({ href: `devanahalli/${p.slug}/`, img: p.img, title: p.name, chip: p.km ? `<span class="chip">${ic('pin')} ಟೋಲ್‌ನಿಂದ ${p.km} ಕಿ.ಮೀ.</span>` : '' })).join('')}</div>
</div></section>

<section class="section" data-theme="indigo"><div class="wrap">
  ${secHead('ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಸುದ್ದಿ', '', `<a class="btn btn-primary" href="~/karyakrama/">ಎಲ್ಲ ಕಾರ್ಯಕ್ರಮಗಳು ${ic('arrow')}</a>`)}
  <div class="grid g3">${D.events.slice(0, 6).map((e) => mediaCard({ href: `karyakrama/${e.slug}/`, img: e.img, title: e.name, text: e.place, chip: e.date ? `${eventChip(e.date)} <span class="chip">${kDate(e.date)}</span>` : `<span class="chip">${e.type}</span>` })).join('')}</div>
</div></section>
${ctaBand()}`,
  });
}

// PARICHAYA -----------------------------------------------------------
add({
  url: 'parichaya/', sub: 'parichaya', title: 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ – ಜೀವನ ಪರಿಚಯ', og: 'sahadesh-namaste-blue', k: 'sahadesh biography profile',
  desc: 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ – ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿಯ ಸಂಸ್ಥಾಪಕ ರಾಜ್ಯಾಧ್ಯಕ್ಷರು. ಜೀವನ, ವಿದ್ಯಾಭ್ಯಾಸ, ಅನುಭವ ಮತ್ತು ಸೇವೆ.',
  body: `${phero({ trail: [['', 'ಪರಿಚಯ']], kicker: `${ic('user')} ಸಮಾಜ ಸೇವಕರು • ದೇವನಹಳ್ಳಿ ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರ`, title: S.leader, lead: `${S.leaderRole}, ${S.org}, ${S.place}. “${D.bio.quotes[0][0]}”`, img: 'sahadesh-namaste-blue', extra: `<div class="btns"><a class="btn btn-primary" href="~/parichaya/sadhane/">${ic('trophy')} ಸಾಧನೆಗಳು</a>${waBtn('ನಮಸ್ಕಾರ ಸಹದೇಶ್ ಅವರೇ,', 'ಸಂದೇಶ ಕಳುಹಿಸಿ')}</div>` })}
<section class="section"><div class="wrap layout">
  <div>
    <div class="box rv"><h2>${ic('book')} ಜೀವನ ಪರಿಚಯ</h2>${D.bio.story.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="box rv"><h2>${ic('briefcase')} ಅನುಭವ</h2>${checks(D.bio.experience)}</div>
    <div class="box rv"><h2>${ic('image')} ಸೇವೆಯ ಕ್ಷಣಗಳು</h2>${gallery(['camp-health', 'camp-environment', 'camp-awareness', 'constitution-award', 'poster-release', 'memorandum'], 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ – ಸೇವೆಯ ಕ್ಷಣಗಳು')}</div>
  </div>
  <aside class="side"><div class="box"><h2>${ic('idcard')} ಒಂದು ನೋಟ</h2><table class="kv">${D.bio.facts.map(([, k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>${helpBox('ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ ಅವರ ಭೇಟಿ')}</aside>
</div></section>
<section class="quote-band section"><div class="wrap"><p>“${esc(D.bio.quotes[1][0])}”</p><cite>– ${S.leader}</cite></div></section>
<section class="section alt"><div class="wrap">${secHead('ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ')}<div class="grid g3">
  ${iconCard('trophy', 'ಸಾಧನೆ ಮತ್ತು ಗೌರವಗಳು', 'ಗಿನ್ನಿಸ್ ದಾಖಲೆ, ಏಷ್ಯಾ ಬುಕ್ ಆಫ್ ರೆಕಾರ್ಡ್ಸ್, ಗೌರವ ಡಾಕ್ಟರೇಟ್.', 'parichaya/sadhane/')}
  ${iconCard('heart', 'ಆದರ್ಶ ಮತ್ತು ಹವ್ಯಾಸಗಳು', 'ಬುದ್ಧ, ಬಸವ, ಅಂಬೇಡ್ಕರ್ ಮತ್ತು ಪುನೀತ್ ಅವರ ಪ್ರೇರಣೆ.', 'parichaya/adarsha/')}
  ${iconCard('mic', 'ಸಾಂಸ್ಕೃತಿಕ ಸೇವೆ', 'ಡಾ. ವಿಷ್ಣು ಕನ್ನಡ ಕರೋಕೆ ಕ್ಲಬ್‌ನ ಸಂಸ್ಥಾಪಕ ಮತ್ತು ರಾಜ್ಯಾಧ್ಯಕ್ಷರು.', 'parichaya/samskruti/')}
</div></div></section>`,
});

add({
  url: 'parichaya/sadhane/', sub: 'parichaya', title: 'ಸಾಧನೆ ಮತ್ತು ಗೌರವಗಳು', og: 'guinness-group', k: 'guinness record asia book doctorate award',
  desc: 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ ಅವರ ಗಿನ್ನಿಸ್ ವಿಶ್ವ ದಾಖಲೆ, ಏಷ್ಯಾ ಬುಕ್ ಆಫ್ ರೆಕಾರ್ಡ್ಸ್ ಮನ್ನಣೆ, ಗೌರವ ಡಾಕ್ಟರೇಟ್ ಮತ್ತು ಸನ್ಮಾನಗಳು.',
  body: `${phero({ trail: [['parichaya/', 'ಪರಿಚಯ'], ['', 'ಸಾಧನೆ ಮತ್ತು ಗೌರವಗಳು']], kicker: `${ic('trophy')} ವಿಶ್ವ ದಾಖಲೆ`, title: 'ಸಾಧನೆ ಮತ್ತು ಗೌರವಗಳು', lead: 'ಜನರೊಂದಿಗಿನ ಸಂಪರ್ಕವೇ ದೊಡ್ಡ ಆಸ್ತಿ – 25,000ಕ್ಕೂ ಹೆಚ್ಚು ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳ ಜನಸಂಪರ್ಕ ಜಾಲಕ್ಕೆ ವಿಶ್ವ ಮಟ್ಟದ ಮನ್ನಣೆ.', img: 'guinness-medal' })}
<section class="section"><div class="wrap"><div class="timeline">${D.honours.map((h) => `<div class="tl rv">${pic(h.img, h.title)}<div><span class="year">${h.year}</span><h3>${h.title}</h3><p style="margin:0;color:var(--muted)">${esc(h.text)}</p></div></div>`).join('')}</div></div></section>
<section class="section alt"><div class="wrap">${secHead('ಪ್ರಮಾಣ ಪತ್ರಗಳು')}${gallery(['doctorate-certificate', 'guinness-group', 'guinness-medal', 'constitution-certificate', 'constitution-trophy'], 'ಪ್ರಮಾಣ ಪತ್ರ ಮತ್ತು ಗೌರವ')}</div></section>`,
});

add({
  url: 'parichaya/adarsha/', sub: 'parichaya', title: 'ಆದರ್ಶ ಮತ್ತು ಹವ್ಯಾಸಗಳು', og: 'sahadesh-namaste-pink', k: 'ideals hobbies buddha basava ambedkar puneeth',
  desc: 'ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ ಅವರ ಆದರ್ಶ ಪುರುಷರು, ಮೌಲ್ಯಗಳು ಮತ್ತು ಹವ್ಯಾಸಗಳು.',
  body: `${phero({ trail: [['parichaya/', 'ಪರಿಚಯ'], ['', 'ಆದರ್ಶ ಮತ್ತು ಹವ್ಯಾಸಗಳು']], kicker: `${ic('heart')} ಸೇವೆ • ಸಮಭಾವ • ಸಮಾಜ`, title: 'ಆದರ್ಶ ಮತ್ತು ಹವ್ಯಾಸಗಳು', lead: 'ಜಾತಿ, ಧರ್ಮ, ಪಕ್ಷದ ಭೇದವಿಲ್ಲದೆ ಎಲ್ಲರನ್ನೂ ಒಂದೇ ಕುಟುಂಬವೆಂದು ಕಾಣುವ ಸೇವಾ ಮನೋಭಾವ.', img: 'sahadesh-namaste-pink' })}
<section class="section"><div class="wrap">${secHead('ಪ್ರೇರಣೆಯ ದೀಪಗಳು')}<div class="grid g4">${D.bio.inspirations.map(([n, t, q]) => `<div class="card rv"><div class="ibox">${ic('star')}</div><h3>${n}</h3><p>${t}</p><p style="margin-top:10px;color:var(--accent-2);font-weight:700">“${q}”</p></div>`).join('')}</div></div></section>
<section class="section alt"><div class="wrap split"><div class="box rv"><h2>${ic('heart')} ಹವ್ಯಾಸಗಳು</h2>${checks(D.bio.hobbies)}</div><div class="rv">${D.bio.quotes.map(([q, a]) => `<blockquote class="box" style="margin:0 0 14px;border-left:5px solid var(--accent)"><p style="font:700 1.15rem/1.5 var(--head);margin:0">“${q}”</p><small>– ${a}</small></blockquote>`).join('')}</div></div></section>`,
});

add({
  url: 'parichaya/samskruti/', sub: 'parichaya', title: 'ಸಾಂಸ್ಕೃತಿಕ ಸೇವೆ – ಡಾ. ವಿಷ್ಣು ಕನ್ನಡ ಕರೋಕೆ ಕ್ಲಬ್', og: 'sahadesh-waistcoat', k: 'karaoke club vishnu music',
  desc: 'ಡಾ. ವಿಷ್ಣು ಕನ್ನಡ ಕರೋಕೆ ಕ್ಲಬ್, ಬೆಂಗಳೂರು – ಸಂಗೀತಕ್ಕಾಗಿ, ಕಲಾವಿದರಿಗಾಗಿ, ಸಮಾಜಕ್ಕಾಗಿ. ಸಂಸ್ಥಾಪಕ ಮತ್ತು ರಾಜ್ಯಾಧ್ಯಕ್ಷರು ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್.',
  body: `${phero({ trail: [['parichaya/', 'ಪರಿಚಯ'], ['', 'ಸಾಂಸ್ಕೃತಿಕ ಸೇವೆ']], kicker: `${ic('mic')} ${D.karaoke.tagline}`, title: D.karaoke.name, lead: `${D.karaoke.place} • ${D.karaoke.role}: ${S.leader}. ನಮ್ಮ ಉದ್ದೇಶ: ${D.karaoke.aim}`, img: 'sahadesh-waistcoat' })}
<section class="section"><div class="wrap">${secHead('ನಮ್ಮ ಸಂಗೀತ ಕಾರ್ಯಕ್ರಮಗಳು', 'ಸಂಗೀತಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ಎಲ್ಲಾ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಆಯೋಜನೆ ಮಾಡುತ್ತೇವೆ.')}<div class="grid g3">${D.karaoke.activities.map(([i, t, d]) => iconCard(i, t, d)).join('')}</div></div></section>
<section class="section alt"><div class="wrap split"><div class="box rv"><h2>${ic('sparkle')} ಇನ್ನೂ ಹಲವು ವಿಶೇಷ ಕಾರ್ಯಕ್ರಮಗಳು</h2>${checks(D.karaoke.more)}</div><div class="quote-band rv" style="border-radius:22px;padding:40px 24px"><p>${D.karaoke.line}</p><cite>${D.karaoke.name}</cite></div></div></section>
${ctaBand('ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಕರೋಕೆ ಸಂಜೆ ಬೇಕೇ?', 'ಸಂಗೀತ ಕಾರ್ಯಕ್ರಮ, ಸ್ಪರ್ಧೆ ಅಥವಾ ಕಲಾವಿದರ ಭೇಟಿಗೆ ವಾಟ್ಸಾಪ್ ಮಾಡಿ.')}`,
});

// KENDRA -------------------------------------------------------------
add({
  url: 'kendra/', sub: 'kendra', title: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಬಗ್ಗೆ', og: 'poster-release', k: 'about centre organisation 2018',
  desc: '2018ರಲ್ಲಿ ಆರಂಭವಾದ ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ – ಉದ್ಯೋಗ, ಆಸ್ಪತ್ರೆ, ಸಾಲ ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ನೀಡುವ ಜನಸೇವಾ ವೇದಿಕೆ.',
  body: `${phero({ trail: [['', 'ಸಂಸ್ಥೆ']], kicker: `${ic('landmark')} ಸ್ಥಾಪನೆ: 2018`, title: `${S.org}, ${S.place}`, lead: 'ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನ ಜನತೆಗೆ ಉದ್ಯೋಗದ ಮಾಹಿತಿ, ಆಸ್ಪತ್ರೆಯ ಮಾಹಿತಿ, ಸಾಲ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಹಾಗೂ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿಯನ್ನು 2018ರಿಂದ ನೀಡಲಾಗುತ್ತಾ ಬರುತ್ತಿದೆ.', img: 'poster-release' })}
<section class="section"><div class="wrap">${secHead('ನಾವು ಏನು ಮಾಡುತ್ತೇವೆ?')}<div class="grid g4">
  ${iconCard('briefcase', 'ಉದ್ಯೋಗದ ಮಾಹಿತಿ', 'ಸರ್ಕಾರಿ ಮತ್ತು ಖಾಸಗಿ ಉದ್ಯೋಗಾವಕಾಶಗಳು, ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ.', 'udyoga/')}
  ${iconCard('stethoscope', 'ಆಸ್ಪತ್ರೆಯ ಮಾಹಿತಿ', 'ಆರೋಗ್ಯ ಶಿಬಿರಗಳು, ಉಚಿತ ಚಿಕಿತ್ಸಾ ಯೋಜನೆಗಳು.', 'janaseve/arogya-shibira/')}
  ${iconCard('rupee', 'ಸಾಲ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ', 'ನಿಗಮಗಳ ಸಾಲ ಮತ್ತು ಸಹಾಯಧನ ಯೋಜನೆಗಳು.', 'yojane/nigamagala-sala/')}
  ${iconCard('landmark', 'ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ', 'ಯೋಜನೆಗಳ ಅರ್ಹತೆ, ದಾಖಲೆ ಮತ್ತು ಅರ್ಜಿ ವಿಧಾನ.', 'yojane/')}
</div></div></section>
<section class="section alt"><div class="wrap split">
  <div class="rv"><span class="kicker">${ic('users')} ನಾವು ಯಾರಿಗಾಗಿ?</span><h2>ಸಮಾಜದ ಎಲ್ಲ ವರ್ಗದವರಿಗಾಗಿ</h2><p class="lead">ದೇವನಹಳ್ಳಿ ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರದ ಸಾರ್ವಜನಿಕ ಬಂಧುಗಳೇ, ಸರ್ಕಾರದಿಂದ ನಿಮಗಾಗಿ ಇರುವ ಯಾವುದೇ ರೀತಿಯ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿಗಾಗಿ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ. ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯವರೂ ಸಂಪರ್ಕಿಸಬಹುದು.</p><div class="btns">${D.beneficiaries.map((b) => `<span class="chip">${b}</span>`).join('')}</div></div>
  <div class="rv">${gallery(['poster-release', 'memorandum'], 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಕಾರ್ಯಕ್ರಮ')}</div>
</div></section>
<section class="section"><div class="wrap">${secHead('ಕೇಂದ್ರದ ಉಪ-ವಿಭಾಗಗಳು')}<div class="grid g4">
  ${iconCard('target', 'ಉದ್ದೇಶ ಮತ್ತು ಗುರಿ', 'ಸಂಸ್ಥೆಯ 6 ಪ್ರಮುಖ ಉದ್ದೇಶಗಳು ಮತ್ತು ಮುಂದಿನ ಗುರಿ.', 'kendra/uddesha/')}
  ${iconCard('info', 'ಮಾಹಿತಿ ಸೇವೆಗಳು', 'ಆಸ್ಪತ್ರೆ, ಉದ್ಯೋಗ, ಸಾಲ, ತರಬೇತಿ, ಶಾಲಾ-ಕಾಲೇಜು ಮಾಹಿತಿ.', 'kendra/mahiti-seve/')}
  ${iconCard('share', 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ', 'ಫೇಸ್‌ಬುಕ್, ಇನ್‌ಸ್ಟಾಗ್ರಾಂ ಮತ್ತು ವಾಟ್ಸಾಪ್ ಜಾಲ.', 'kendra/digital/')}
  ${iconCard('users', 'ನಮ್ಮ ಕುಟುಂಬ', 'ಸ್ವಯಂಸೇವಕರ ಬಳಗ – ನೀವೂ ಸೇರಿ.', 'kendra/kutumba/')}
</div></div></section>${ctaBand()}`,
});

add({
  url: 'kendra/uddesha/', sub: 'kendra', title: 'ಸಂಸ್ಥೆಯ ಉದ್ದೇಶಗಳು ಮತ್ತು ಗುರಿ', og: 'camp-awareness', k: 'objectives mission goal',
  desc: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಉದ್ದೇಶಗಳು: ಎಲ್ಲ ಸಮುದಾಯಗಳಿಗೆ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯ, ಉದ್ಯೋಗಾವಕಾಶ, ಹಿರಿಯರಿಗೆ ಭದ್ರತೆ, ಪಕ್ಷಾತೀತ ಸೇವೆ.',
  body: `${phero({ trail: [['kendra/', 'ಸಂಸ್ಥೆ'], ['', 'ಉದ್ದೇಶ ಮತ್ತು ಗುರಿ']], kicker: `${ic('target')} ನಮ್ಮ ಮೂಲ ಉದ್ದೇಶ`, title: 'ಸಂಸ್ಥೆಯ ಉದ್ದೇಶಗಳು', lead: 'ಉದ್ಯೋಗ • ಆಸ್ಪತ್ರೆ • ಸಾಲ ಸೌಲಭ್ಯಗಳು • ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ.', img: 'camp-awareness' })}
<section class="section"><div class="wrap"><div class="grid g3">${D.objectives.map(([i, t], n) => `<div class="card rv"><div class="ibox">${ic(i)}</div><span class="chip">ಉದ್ದೇಶ ${n + 1}</span><h3 style="margin-top:8px">${t}</h3></div>`).join('')}</div></div></section>
<section class="section alt"><div class="wrap split"><div class="rv"><span class="kicker">${ic('pin')} ನಮ್ಮ ಮುಂದಿನ ಗುರಿ</span><h2>ಕ್ಷೇತ್ರದ ಪ್ರತಿ ಹಳ್ಳಿಗೂ ಮಾಹಿತಿ</h2><p class="lead">ದೇವನಹಳ್ಳಿ ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರದ ಎಲ್ಲಾ ಹಳ್ಳಿಗಳಿಗೂ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಮತ್ತು ಜಾಗೃತಿ ತಲುಪಿಸುವುದು – ಉದ್ಯೋಗ ಮೇಳ, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಜಾಗೃತಿ ಕಾರ್ಯಕ್ರಮಗಳ ಮೂಲಕ.</p><a class="btn btn-primary" href="~/janaseve/jagruti-karyakrama/">ಜಾಗೃತಿ ಕಾರ್ಯಕ್ರಮಗಳು ${ic('arrow')}</a></div><div class="quote-band rv" style="border-radius:22px;padding:40px 24px"><p>ಜಾಗೃತಿ ಮೂಲಕ ಉನ್ನತ ಸಮಾಜ</p><cite>ಸೇವೆ • ಸಮಭಾವ • ಸಮಾಜ</cite></div></div></section>`,
});

add({
  url: 'kendra/mahiti-seve/', sub: 'kendra', title: 'ಮಾಹಿತಿ ಸೇವೆಗಳು', og: 'scheme-gramaone', k: 'information services hospital jobs loan training school',
  desc: 'ಸರ್ಕಾರಿ ಮತ್ತು ಖಾಸಗಿ ಆಸ್ಪತ್ರೆ, ಉದ್ಯೋಗ, ಸಾಲ, ಉಚಿತ ತರಬೇತಿ, ಶಾಲಾ-ಕಾಲೇಜುಗಳ ಮಾಹಿತಿ ಮತ್ತು ಕುಂದುಕೊರತೆ ಮಾರ್ಗದರ್ಶನ.',
  body: `${phero({ trail: [['kendra/', 'ಸಂಸ್ಥೆ'], ['', 'ಮಾಹಿತಿ ಸೇವೆಗಳು']], kicker: `${ic('info')} ಮಾಹಿತಿಯೇ ಮೊದಲ ಸೌಲಭ್ಯ`, title: 'ಮಾಹಿತಿ ಸೇವೆಗಳು', lead: 'ಸರ್ಕಾರದಿಂದ ಸಾರ್ವಜನಿಕರಿಗೆ ಇರುವ ಸೌಲಭ್ಯಗಳು ಹಾಗೂ ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳು ಮತ್ತು ಕುಂದುಕೊರತೆಗಳ ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡಲಾಗುವುದು / ಮಾಡಿಕೊಡಲಾಗುವುದು.', img: 'scheme-gramaone' })}
<section class="section"><div class="wrap"><div class="grid g3">${D.infoServices.map(([i, t, d]) => iconCard(i, t, d)).join('')}</div></div></section>${ctaBand()}`,
});

add({
  url: 'kendra/digital/', sub: 'kendra', title: 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣಗಳಲ್ಲಿ ನಾವು', og: 'sahadesh-armscrossed', k: 'facebook instagram whatsapp youtube social media',
  desc: 'ಫೇಸ್‌ಬುಕ್ 7.3K+, ಇನ್‌ಸ್ಟಾಗ್ರಾಂ 5.2K+, ವಾಟ್ಸಾಪ್ 1000+ – ದೇವನಹಳ್ಳಿ ಸ್ಥಳೀಯ ಸುದ್ದಿ, ಉದ್ಯೋಗ ಮಾಹಿತಿ ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು.',
  body: `${phero({ trail: [['kendra/', 'ಸಂಸ್ಥೆ'], ['', 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ']], kicker: `${ic('share')} ನಿಮ್ಮ ಪ್ರೀತಿಯ ಸಹದೇಶ್ ದೇವನಹಳ್ಳಿ`, title: 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣಗಳಲ್ಲಿ ನಾವು', lead: 'ಪ್ರತಿನಿತ್ಯ ನನ್ನ ಕಾರ್ಯ ವೈಖರಿಯನ್ನು ನೋಡಲು ಇಷ್ಟು ಮಂದಿ ಫಾಲೋ ಮಾಡುತ್ತಿದ್ದೀರಿ. ನಿಮ್ಮ ಪ್ರೀತಿಗೆ ಹೃದಯಪೂರ್ವಕ ಧನ್ಯವಾದಗಳು.', img: 'sahadesh-armscrossed' })}
<section class="section"><div class="wrap"><div class="grid g4">${D.social.map((s) => `<${s.url ? `a href="${s.url}" target="_blank" rel="noopener"` : 'div'} class="card social-card rv"><span class="ibox">${ic(s.icon)}</span><span>${s.count ? `<b data-count="${s.count}" data-suffix="${s.suffix}">${s.count.toLocaleString('en-IN')}${s.suffix}</b>` : `<b>${ic('youtube')}</b>`}<span style="color:var(--muted)">${s.name} ${s.label}</span><br><small>${esc(s.handle)}</small></span></${s.url ? 'a' : 'div'}>`).join('')}</div></div></section>
<section class="section alt"><div class="wrap split"><div class="rv"><span class="kicker">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮಾಹಿತಿ ಜಾಲ</span><h2>ಪ್ರತಿ ಜಿಲ್ಲೆಗೆ, ಪ್ರತಿ ಹಳ್ಳಿಗೆ ಒಂದು ಗುಂಪು</h2><p class="lead">ಜಿಲ್ಲೆಗಳಿಗೊಂದು ವಾಟ್ಸಾಪ್ ಗುಂಪು ತೆರೆದು ಸಮಾಜಮುಖಿ ಮಾಹಿತಿ ನೀಡಲಾಗುತ್ತಿದೆ. ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನ ಹಳ್ಳಿಗಳಿಗೂ ಒಂದೊಂದು ವಾಟ್ಸಾಪ್ ಗುಂಪು ಮಾಡುವ ಮುಖಾಂತರ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳನ್ನು ಮನೆ ಮನೆಗೆ ಮುಟ್ಟಿಸುವ ಪ್ರಾಮಾಣಿಕ ಪ್ರಯತ್ನ.</p>${waBtn('ನಮಸ್ಕಾರ, ನನ್ನ ಹಳ್ಳಿಯ ವಾಟ್ಸಾಪ್ ಮಾಹಿತಿ ಗುಂಪಿಗೆ ಸೇರಲು ಬಯಸುತ್ತೇನೆ. ಹಳ್ಳಿ: ', 'ನಿಮ್ಮ ಹಳ್ಳಿಯ ಗುಂಪಿಗೆ ಸೇರಿ')}</div><div class="box rv"><h2>${ic('megaphone')} ನಾವು ಹಂಚುವ ಮಾಹಿತಿ</h2>${checks(['ದೇವನಹಳ್ಳಿ ಸ್ಥಳೀಯ ಸುದ್ದಿ', 'ಉದ್ಯೋಗ ಮಾಹಿತಿ', 'ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು ಮತ್ತು ಕೊನೆಯ ದಿನಾಂಕಗಳು', 'ಸಾರ್ವಜನಿಕ ಸೇವೆ ಮತ್ತು ಶಿಬಿರಗಳ ಪ್ರಕಟಣೆ'])}</div></div></section>`,
});

add({
  url: 'kendra/kutumba/', sub: 'kendra', title: 'ನಮ್ಮ ಕುಟುಂಬ – ಸ್ವಯಂಸೇವಕರ ಬಳಗ', og: 'poster-release', k: 'team volunteers family join',
  desc: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ ದೇವನಹಳ್ಳಿ – ಒಂದು ಕುಟುಂಬ. ಸಮಾಜ ಸೇವೆಯೇ ನಮ್ಮ ಉಸಿರು. ಸ್ವಯಂಸೇವಕರಾಗಿ ಸೇರಿ.',
  body: `${phero({ trail: [['kendra/', 'ಸಂಸ್ಥೆ'], ['', 'ನಮ್ಮ ಕುಟುಂಬ']], kicker: `${ic('users')} ಒಂದು ಕುಟುಂಬ`, title: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ – ಒಂದು ಕುಟುಂಬ', lead: 'ಸಮಾಜ ಸೇವೆಯೇ ನಮ್ಮ ಉಸಿರು. ಹಳ್ಳಿ ಹಳ್ಳಿಗಳಲ್ಲಿ ಸ್ವಯಂಸೇವಕರಾಗಿ ಜನರಿಗೆ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳನ್ನು ತಲುಪಿಸುವ ನೂರಾರು ಮಂದಿಯ ಬಳಗ.', img: 'poster-release' })}
<section class="section"><div class="wrap split">
  <div class="rv">${gallery(['poster-release', 'constitution-audience', 'camp-awareness', 'memorandum'], 'ನಮ್ಮ ಕುಟುಂಬ')}</div>
  <form class="box rv" data-wa-form="ಸ್ವಯಂಸೇವಕರಾಗಿ ಸೇರಲು ಬಯಸುತ್ತೇನೆ">
    <h2>${ic('heart')} ಸ್ವಯಂಸೇವಕರಾಗಿ ಸೇರಿ</h2>
    <div class="field"><label for="v-name">ಹೆಸರು</label><input class="input" id="v-name" name="name" data-label="ಹೆಸರು" required></div>
    <div class="field"><label for="v-village">ಹಳ್ಳಿ / ಊರು</label><input class="input" id="v-village" name="village" data-label="ಊರು" required></div>
    <div class="field"><label for="v-help">ನೀವು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲಿರಿ?</label><select class="input" id="v-help" name="help" data-label="ಸಹಾಯ"><option>ಹಳ್ಳಿಯಲ್ಲಿ ಮಾಹಿತಿ ಹಂಚಿಕೆ</option><option>ಶಿಬಿರಗಳಲ್ಲಿ ಸಹಾಯ</option><option>ರಕ್ತದಾನಿ</option><option>ಉದ್ಯೋಗ ಮೇಳ ಸಹಾಯ</option><option>ಇತರೆ</option></select></div>
    <button class="btn btn-wa" type="submit">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕಳುಹಿಸಿ</button>
    <p style="margin:10px 0 0;font-size:.85rem;color:var(--muted)">ನಿಮ್ಮ ವಿವರಗಳು ನೇರವಾಗಿ ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗುತ್ತವೆ; ಈ ಜಾಲತಾಣ ಯಾವುದೇ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ.</p>
  </form>
</div></section>`,
});

// SEVE (document services) --------------------------------------------
add({
  url: 'seve/', sub: 'seve', title: 'ದಾಖಲೆ ಸೇವಾ ಕೇಂದ್ರ', og: 'seva-aadhaar', k: 'documents services aadhaar pan ration passport voter',
  desc: 'ಜನನ ಪ್ರಮಾಣ ಪತ್ರ, ಆಧಾರ್, ಆಯುಷ್ಮಾನ್, ಪಾನ್, ರೇಷನ್, ಜಾತಿ-ಆದಾಯ, ವೋಟರ್ ಐಡಿ, ಡಿಎಲ್, ಪಾಸ್‌ಪೋರ್ಟ್, ಕಾರ್ಮಿಕ ಕಾರ್ಡ್, ಪಿಂಚಣಿ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ವೇತನ – ವಾಟ್ಸಾಪ್ ಮೂಲಕ.',
  body: `${phero({ trail: [['', 'ದಾಖಲೆ ಸೇವೆ']], kicker: `${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮಾಡಿದರೆ ಮಾಡಿಕೊಡಲಾಗುವುದು`, title: 'ರಾಜ್ಯ ಸರ್ಕಾರದಿಂದ ಸಾರ್ವಜನಿಕರಿಗೆ ಸಿಗುವ ಸೌಲಭ್ಯಗಳಾದ ದಾಖಲೆ ಸೇವೆಗಳು', lead: 'ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯವರು ಸಂಪರ್ಕಿಸಿ. ದಾಖಲಾತಿಗಳನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿ – ಅರ್ಜಿ ಸಲ್ಲಿಕೆಗೆ ಸಂಪೂರ್ಣ ಮಾರ್ಗದರ್ಶನ.', img: 'seva-aadhaar', extra: `<div class="btns">${waBtn('ನಮಸ್ಕಾರ, ದಾಖಲೆ ಸೇವೆ ಬೇಕಿತ್ತು: ')}<a class="btn btn-ghost" href="~/seve/hege/">ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?</a></div>` })}
<section class="section"><div class="wrap">
  <div class="searchbar no-print">${ic('search')}<input class="input" type="search" placeholder="ಸೇವೆ ಹುಡುಕಿ (ಉದಾ: ಪಾಸ್‌ಪೋರ್ಟ್, ರೇಷನ್)" data-search-list="#svc-list" data-empty="#svc-empty" aria-label="ಸೇವೆ ಹುಡುಕಿ"></div>
  <div class="grid g4" id="svc-list">${D.documentServices.map((d, i) => `<a class="card rv" href="~/seve/${d.slug}/" data-text="${esc(d.name + ' ' + d.short + ' ' + d.k)}"><div class="ibox">${ic(d.icon)}</div><span class="chip">${String(i + 1).padStart(2, '0')}</span><h3 style="margin-top:8px">${d.name}</h3><p>${d.short}</p><span class="more">ದಾಖಲೆಗಳ ಪಟ್ಟಿ ${ic('arrow')}</span></a>`).join('')}</div>
  <p class="empty" id="svc-empty">ಸೇವೆ ಸಿಗಲಿಲ್ಲ. ವಾಟ್ಸಾಪ್ ಮಾಡಿ ಕೇಳಿ – ನಾವು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ.</p>
</div></section>
<section class="section alt"><div class="wrap">${secHead('ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಸೇವೆ – 4 ಹಂತಗಳು')}${stepsBlock()}</div></section>${ctaBand('ಸೇವೆಯೇ ನಮ್ಮ ಧರ್ಮ', 'ನಿಮ್ಮ ಸೇವೆಯಲ್ಲಿ ನಾವು ಸದಾ ನಿಮ್ಮೊಂದಿಗೆ. ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯವರು ಸಂಪರ್ಕಿಸಿ: 8296902742, 7829449336.')}`,
});
function stepsBlock() {
  return `<ol class="steps">${[['ಸೇವೆ ಆಯ್ಕೆ', 'ನಿಮಗೆ ಬೇಕಾದ ಸೇವೆ / ಯೋಜನೆಯನ್ನು ಈ ಜಾಲತಾಣದಲ್ಲಿ ನೋಡಿ.'], ['ದಾಖಲೆ ಸಿದ್ಧಪಡಿಸಿ', 'ಪುಟದಲ್ಲಿರುವ ದಾಖಲೆ ಪಟ್ಟಿಯನ್ನು ಟಿಕ್ ಮಾಡುತ್ತಾ ಸಿದ್ಧಪಡಿಸಿ.'], ['ವಾಟ್ಸಾಪ್ ಮಾಡಿ', `ದಾಖಲೆಗಳ ಫೋಟೋವನ್ನು ${S.whatsapp}ಗೆ ವಾಟ್ಸಾಪ್ ಮಾಡಿ.`], ['ಅರ್ಜಿ ಮತ್ತು ಮಾಹಿತಿ', 'ಅರ್ಜಿ ಸಲ್ಲಿಕೆ ಮತ್ತು ಮುಂದಿನ ಸ್ಥಿತಿಯ ಮಾಹಿತಿ ನಿಮಗೆ ತಿಳಿಸಲಾಗುವುದು.']].map(([t, d]) => `<li class="rv"><h3>${t}</h3><p style="margin:0;color:var(--muted)">${d}</p></li>`).join('')}</ol>`;
}
add({
  url: 'seve/hege/', sub: 'seve', title: 'ವಾಟ್ಸಾಪ್ ಮೂಲಕ ದಾಖಲೆ ಸೇವೆ ಹೇಗೆ?', og: 'scheme-gramaone', k: 'how whatsapp process',
  desc: 'ಸೇವೆ ಆಯ್ಕೆ, ದಾಖಲೆ ಸಿದ್ಧತೆ, ವಾಟ್ಸಾಪ್ ಮತ್ತು ಅರ್ಜಿ – ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ದಾಖಲೆ ಸೇವೆಯ ವಿಧಾನ.',
  body: `${phero({ trail: [['seve/', 'ದಾಖಲೆ ಸೇವೆ'], ['', 'ಹೇಗೆ?']], kicker: `${ic('info')} ಸರಳ ವಿಧಾನ`, title: 'ವಾಟ್ಸಾಪ್ ಮೂಲಕ ದಾಖಲೆ ಸೇವೆ ಹೇಗೆ?', lead: 'ಕಚೇರಿಗಳಿಗೆ ಅಲೆದಾಡುವ ಅಗತ್ಯವಿಲ್ಲ – ದಾಖಲೆಗಳನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿ, ಉಳಿದುದನ್ನು ನಾವು ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತೇವೆ.', img: 'scheme-gramaone' })}
<section class="section"><div class="wrap">${stepsBlock()}<div class="box warn rv" style="margin-top:28px"><h2>${ic('shield')} ಸುರಕ್ಷತಾ ಸೂಚನೆ</h2>${checks(['ಆಧಾರ್ OTP, ಬ್ಯಾಂಕ್ ಪಿನ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್‌ಗಳನ್ನು ಯಾರಿಗೂ ಹಂಚಬೇಡಿ', 'ಸರ್ಕಾರಿ ಶುಲ್ಕಕ್ಕಿಂತ ಹೆಚ್ಚು ಹಣ ಕೇಳುವವರ ಬಗ್ಗೆ ಎಚ್ಚರದಿಂದಿರಿ', 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ ನಂತರ ಸ್ವೀಕೃತಿ ಸಂಖ್ಯೆಯನ್ನು ಜೋಪಾನವಾಗಿಡಿ', 'ಅಧಿಕೃತ ಮಾಹಿತಿಗೆ ಸೇವಾ ಸಿಂಧು / ಸಂಬಂಧಿತ ಇಲಾಖೆಯ ಜಾಲತಾಣ ಪರಿಶೀಲಿಸಿ'])}</div></div></section>`,
});
for (const d of D.documentServices) {
  add({
    url: `seve/${d.slug}/`, sub: 'seve', title: d.name, k: d.k, icon: d.icon,
    desc: `${d.name} – ${d.short}. ಬೇಕಾಗುವ ದಾಖಲೆಗಳ ಪಟ್ಟಿ ಮತ್ತು ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಸಹಾಯ – ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ.`,
    body: `${phero({ trail: [['seve/', 'ದಾಖಲೆ ಸೇವೆ'], ['', d.name]], kicker: `${ic(d.icon)} ದಾಖಲೆ ಸೇವೆ`, title: d.name, lead: d.about, extra: `<div class="btns">${waBtn(`ನಮಸ್ಕಾರ, "${d.name}" ಸೇವೆ ಬೇಕಿತ್ತು.`)}<a class="btn btn-ghost" href="${tel(S.phones[0])}">${ic('phone')} ಕರೆ ಮಾಡಿ</a></div>` })}
<section class="section"><div class="wrap layout">
  <div>
    <div class="box rv"><h2>${ic('clipboard')} ಬೇಕಾಗುವ ದಾಖಲೆಗಳು</h2><p style="color:var(--muted)">ಸಿದ್ಧವಾದ ದಾಖಲೆಗಳನ್ನು ಟಿಕ್ ಮಾಡಿ – ನಿಮ್ಮ ಪಟ್ಟಿ ಈ ಸಾಧನದಲ್ಲೇ ನೆನಪಿನಲ್ಲಿರುತ್ತದೆ.</p>${docChecklist(d.slug, d.docs)}</div>
    ${d.validity ? `<div class="box rv"><h2>${ic('clock')} ಅವಧಿ (ವ್ಯಾಲಿಡಿಟಿ)</h2><table class="kv">${d.validity.map(([k, v]) => `<tr><th>${k}</th><td><b>${v}</b></td></tr>`).join('')}</table></div>` : ''}
    <div class="box rv"><h2>${ic('info')} ಗಮನಿಸಿ</h2>${checks(['ದಾಖಲೆಗಳ ಸ್ಪಷ್ಟ ಫೋಟೋ / ಸ್ಕ್ಯಾನ್ ಕಳುಹಿಸಿ', 'ಹೆಸರು ಮತ್ತು ಜನ್ಮ ದಿನಾಂಕ ಎಲ್ಲ ದಾಖಲೆಗಳಲ್ಲಿ ಒಂದೇ ರೀತಿ ಇರಲಿ', 'ಸರ್ಕಾರ ನಿಗದಿಪಡಿಸಿದ ಶುಲ್ಕ ಅನ್ವಯ', 'ಅಧಿಕೃತ ದಾಖಲೆ ಪಟ್ಟಿ ಕಾಲಕಾಲಕ್ಕೆ ಬದಲಾಗಬಹುದು'])}${shareRow()}</div>
  </div>
  <aside class="side">${helpBox(d.name)}<div class="box"><h2>${ic('grid')} ಇತರ ಸೇವೆಗಳು</h2>${D.documentServices.filter((x) => x !== d).slice(0, 7).map((x) => `<a href="~/seve/${x.slug}/" style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">${ic(x.icon)} ${x.name}</a>`).join('')}<a class="more" href="~/seve/" style="display:inline-flex;margin-top:10px;font-weight:700">ಎಲ್ಲ ಸೇವೆಗಳು ${ic('arrow')}</a></div></aside>
</div></section>`,
  });
}

// YOJANE (schemes) ----------------------------------------------------
const schemeChip = (s) => s.deadline ? deadlineChip(s.deadline) : s.window ? windowChip(s.window.from, s.window.to) : '<span class="chip ok">ವರ್ಷಪೂರ್ತಿ ಮಾಹಿತಿ</span>';
add({
  url: 'yojane/', sub: 'yojane', title: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', og: 'scheme-gruhalakshmi', k: 'schemes yojane government benefits',
  desc: 'ಗೃಹಲಕ್ಷ್ಮಿ, ನಿಗಮಗಳ ಸಾಲ, ಅಲ್ಪಸಂಖ್ಯಾತರ ಸಾಲ, ವಾಲ್ಮೀಕಿ ನಿಗಮ, ಹಿರಿಯರು, ವಿಶೇಷ ಚೇತನರು, ವಿಧವೆಯರು, ಮುಖ್ಯಮಂತ್ರಿ ಪರಿಹಾರ ನಿಧಿ – ಅರ್ಹತೆ, ದಾಖಲೆಗಳು, ಕೊನೆಯ ದಿನಾಂಕ.',
  body: `${phero({ trail: [['', 'ಯೋಜನೆಗಳು']], kicker: `${ic('gift')} ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು ನಿಮ್ಮ ಹಕ್ಕು`, title: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸಾಲ ಸೌಲಭ್ಯಗಳು', lead: 'ಯೋಜನೆಗಳನ್ನು ತಿಳಿದುಕೊಳ್ಳಿ, ಸೌಲಭ್ಯಗಳನ್ನು ಪಡೆಯಿರಿ. ಕೊನೆಯ ದಿನಾಂಕಗಳು ಇಂದಿನ ದಿನಾಂಕಕ್ಕೆ ಅನುಗುಣವಾಗಿ ತಾನಾಗಿಯೇ ಬದಲಾಗುತ್ತವೆ.', img: 'scheme-gruhalakshmi', extra: `<div class="btns"><a class="btn btn-primary" href="~/yojane/arhate/">${ic('check')} ನನಗೆ ಯಾವ ಸೌಲಭ್ಯ? – ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ</a></div>` })}
<section class="section"><div class="wrap">
  <div class="filters no-print" data-filter-group="#scheme-list" role="group" aria-label="ವರ್ಗದ ಪ್ರಕಾರ">${D.schemeTags.map(([t, l], i) => `<button type="button" data-tag="${t}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
  <div class="grid g3" id="scheme-list">${D.schemes.map((s) => mediaCard({ href: `yojane/${s.slug}/`, img: s.img, title: s.name, text: s.summary.slice(0, 110) + '…', chip: schemeChip(s), tags: s.tags.join(' ') })).join('')}</div>
</div></section>
<section class="section alt"><div class="wrap">${secHead('ಸಾಮಾನ್ಯವಾಗಿ ಬೇಕಾಗುವ ದಾಖಲೆಗಳು', 'ಹೆಚ್ಚಿನ ಯೋಜನೆಗಳಿಗೆ ಈ ದಾಖಲೆಗಳು ಬೇಕು – ಮೊದಲೇ ಸಿದ್ಧಪಡಿಸಿಕೊಳ್ಳಿ.')}<div class="grid g2"><div class="box rv">${docChecklist('common', ['ಆಧಾರ್ ಕಾರ್ಡ್', 'ರೇಷನ್ ಕಾರ್ಡ್', 'ಜಾತಿ ಮತ್ತು ಆದಾಯ ಪ್ರಮಾಣ ಪತ್ರ', 'ನಿವಾಸ ಪ್ರಮಾಣ ಪತ್ರ', 'ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ (ಆಧಾರ್ ಲಿಂಕ್)', 'ಪಾಸ್‌ಪೋರ್ಟ್ ಅಳತೆಯ ಫೋಟೋ', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (ಆಧಾರ್‌ಗೆ ಲಿಂಕ್)'])}</div><div class="box rv"><h2>${ic('pin')} ಅರ್ಜಿ ಎಲ್ಲಿ ಸಲ್ಲಿಸಬೇಕು?</h2>${checks(commonApplyList())}</div></div></div></section>${ctaBand()}`,
});
function commonApplyList() { return ['ಸೇವಾ ಸಿಂಧು ಪೋರ್ಟಲ್ (ಆನ್‌ಲೈನ್)', 'ಹತ್ತಿರದ ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರ', 'ಕರ್ನಾಟಕ ಒನ್ / ಬೆಂಗಳೂರು ಒನ್ ಕೇಂದ್ರ', 'ಮಾರ್ಗದರ್ಶನಕ್ಕೆ: ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ']; }

for (const s of D.schemes) {
  const dlBox = s.deadline ? `<div class="box rv" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="ibox" style="width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${ic('calendar')}</span><div><small style="color:var(--muted)">ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಕೊನೆಯ ದಿನಾಂಕ</small><h2 style="margin:0">${kDate(s.deadline)}</h2></div>${deadlineChip(s.deadline)}</div>` : '';
  const winBox = s.window ? `<div class="box rv" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="ibox" style="width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${ic('calendar')}</span><div><small style="color:var(--muted)">${s.window.label}</small><h2 style="margin:0">${kDate(s.window.from)} – ${kDate(s.window.to)}</h2></div>${windowChip(s.window.from, s.window.to)}</div>` : '';
  add({
    url: `yojane/${s.slug}/`, sub: 'yojane', title: s.name, og: s.img, k: s.k,
    desc: `${s.summary} ಅರ್ಹತೆ, ಬೇಕಾಗುವ ದಾಖಲೆಗಳು ಮತ್ತು ಅರ್ಜಿ ವಿಧಾನ.`,
    body: `${phero({ trail: [['yojane/', 'ಯೋಜನೆಗಳು'], ['', s.name]], kicker: `${ic(s.icon)} ${s.dept}`, title: s.name, lead: s.summary, img: s.img, extra: `<div class="hl">${s.highlight.map((h) => `<div>${h}</div>`).join('')}</div><div class="btns">${waBtn(`ನಮಸ್ಕಾರ, "${s.name}" ಬಗ್ಗೆ ಮಾಹಿತಿ / ಅರ್ಜಿ ಸಹಾಯ ಬೇಕಿತ್ತು.`)}${s.form ? `<a class="btn btn-gold" href="~/yojane/${s.slug}/arji/">${ic('print')} ಅರ್ಜಿ ನಮೂನೆ ತುಂಬಿ ಮುದ್ರಿಸಿ</a>` : ''}</div>` })}
<section class="section"><div class="wrap layout">
  <div>
    ${dlBox}${winBox}
    ${s.programs ? `<div class="box rv"><h2>${ic('grid')} ${s.programs.length} ಯೋಜನೆಗಳು</h2><div class="grid g2">${s.programs.map((p, i) => `<div class="card" style="padding:0;overflow:hidden"><div class="media" style="aspect-ratio:16/9;overflow:hidden">${pic(p.img, p.n)}</div><div style="padding:14px 16px"><span class="chip">${i + 1}</span><h3 style="margin:6px 0">${p.n}</h3><table class="kv">${p.rows.map(([k, v]) => `<tr><th>${k}</th><td><b>${v}</b></td></tr>`).join('')}</table></div></div>`).join('')}</div></div>` : ''}
    ${s.tiles ? `<div class="box rv"><h2>${ic('grid')} ಮುಖ್ಯ ಯೋಜನೆಗಳು</h2><div class="grid g2">${s.tiles.map(([img, n, t]) => `<div class="card" style="padding:0;overflow:hidden;display:grid;grid-template-columns:120px 1fr"><div style="overflow:hidden">${pic(img, n)}</div><div style="padding:12px 14px"><h3 style="margin:0 0 4px;font-size:1.05rem">${n}</h3><p style="font-size:.92rem">${t}</p></div></div>`).join('')}</div></div>` : ''}
    ${s.benefits ? `<div class="box rv"><h2>${ic('gift')} ಲಭ್ಯವಿರುವ ಸೌಲಭ್ಯಗಳು</h2>${checks(s.benefits)}</div>` : ''}
    ${s.corporations ? `<div class="box rv"><h2>${ic('landmark')} ವಿವಿಧ ನಿಗಮಗಳು</h2><div class="grid g2">${s.corporations.map((c) => `<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px">${ic('check')} ${c}</div>`).join('')}</div></div>` : ''}
    ${s.eligibility ? `<div class="box rv"><h2>${ic('user')} ಅರ್ಹತೆಗಳು</h2>${checks(s.eligibility)}</div>` : ''}
    ${s.extra ? `<div class="box warn rv"><h2>${ic('clock')} ${s.extra.title}</h2>${checks(s.extra.items)}</div>` : ''}
    <div class="box rv"><h2>${ic('clipboard')} ಅಗತ್ಯ ದಾಖಲೆಗಳು</h2><p style="color:var(--muted)">ಸಿದ್ಧವಾದವುಗಳನ್ನು ಟಿಕ್ ಮಾಡಿ – ಈ ಸಾಧನದಲ್ಲಿ ನೆನಪಿನಲ್ಲಿರುತ್ತದೆ.</p>${docChecklist(s.slug, s.docs)}</div>
    <div class="box rv"><h2>${ic('pin')} ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ವಿಧಾನ</h2>${checks(s.apply)}${s.note ? `<p style="margin-top:14px;color:var(--muted)">${ic('info')} ${esc(s.note)}</p>` : ''}${s.quote ? `<p style="margin-top:14px;font:700 1.15rem var(--head);color:var(--accent-2)">“${s.quote}”</p>` : ''}${shareRow()}</div>
    <p style="font-size:.88rem;color:var(--muted)">${ic('info')} ಯೋಜನೆಗಳ ಅರ್ಹತೆ ಮತ್ತು ಸೌಲಭ್ಯಗಳು ಅಧಿಕೃತ ನಿಯಮಗಳಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತವೆ. ಇತ್ತೀಚಿನ ಅಧಿಸೂಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.</p>
  </div>
  <aside class="side">${helpBox(s.name)}<div class="box"><h2>${ic('gift')} ಇತರ ಯೋಜನೆಗಳು</h2>${D.schemes.filter((x) => x !== s).map((x) => `<a href="~/yojane/${x.slug}/" style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">${ic(x.icon)} ${x.name}</a>`).join('')}</div></aside>
</div></section>`,
  });
  if (s.form) {
    const F = D.cmReliefForm;
    add({
      url: `yojane/${s.slug}/arji/`, sub: 'yojane', title: 'ಮುಖ್ಯಮಂತ್ರಿ ಪರಿಹಾರ ನಿಧಿ – ಅರ್ಜಿ ನಮೂನೆ (ತುಂಬಿ ಮುದ್ರಿಸಿ)', k: 'cm relief fund form print',
      desc: 'ಮಾನ್ಯ ಮುಖ್ಯಮಂತ್ರಿಯವರ ಪರಿಹಾರ ನಿಧಿಯಿಂದ ಪರಿಹಾರ ಪಡೆಯಲು ನಿಗದಿಪಡಿಸಿರುವ ಅರ್ಜಿ ನಮೂನೆ – ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ತುಂಬಿ ಮುದ್ರಿಸಿ.',
      body: `${phero({ trail: [['yojane/', 'ಯೋಜನೆಗಳು'], [`yojane/${s.slug}/`, 'ಮುಖ್ಯಮಂತ್ರಿ ಪರಿಹಾರ ನಿಧಿ'], ['', 'ಅರ್ಜಿ ನಮೂನೆ']], kicker: `${ic('print')} ತುಂಬಿ ಮುದ್ರಿಸಿ`, title: 'ಅರ್ಜಿ ನಮೂನೆ – ಮುಖ್ಯಮಂತ್ರಿ ಪರಿಹಾರ ನಿಧಿ', lead: 'ಕೆಳಗಿನ ನಮೂನೆಯನ್ನು ಇಲ್ಲೇ ತುಂಬಿ “ಮುದ್ರಿಸಿ” ಒತ್ತಿ. ನೀವು ತುಂಬಿದ ಮಾಹಿತಿ ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತದೆ; ಎಲ್ಲಿಗೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ.', extra: `<div class="btns"><button class="btn btn-primary" type="button" data-print>${ic('print')} ಮುದ್ರಿಸಿ</button></div>` })}
<section class="section"><div class="wrap"><div class="formsheet">
  <h2>${F.title}</h2>
  <div class="to"><div>${F.to.join('<br>')}</div><div class="photo">ಪಾಸ್‌ಪೋರ್ಟ್ ಅಳತೆಯ ರೋಗಿಯ ಭಾವಚಿತ್ರ</div></div>
  <table>${F.fields.map(([id, l, big], i) => `<tr><td>${i + 1}.</td><td><label for="f-${id}">${l}</label></td><td>${big ? `<textarea id="f-${id}" rows="3"></textarea>` : `<input id="f-${id}">`}</td></tr>`).join('')}</table>
  <p style="margin-top:22px">${F.declaration}</p>
  <div class="sign"><div>ಸ್ಥಳ: ____________<br>ದಿನಾಂಕ: ____________</div><div>ರೋಗಿಯ / ಪೋಷಕರ / ಸಂಬಂಧಿಯ ಸಹಿ</div></div>
</div><div class="btns no-print" style="margin-top:18px"><button class="btn btn-primary" type="button" data-print>${ic('print')} ಮುದ್ರಿಸಿ</button><a class="btn btn-ghost" href="~/yojane/${s.slug}/">${ic('back')} ಯೋಜನೆಯ ವಿವರ</a></div></div></section>`,
    });
  }
}

// Eligibility finder
{
  const R = (url, name, why, any, not) => ({ url, name, why, any, not });
  const rules = [
    R('yojane/gruhalakshmi/', 'ಗೃಹಲಕ್ಷ್ಮಿ ಯೋಜನೆ', 'ಕುಟುಂಬದ ಮಹಿಳಾ ಮುಖ್ಯಸ್ಥೆಗೆ ಪ್ರತಿ ತಿಂಗಳು ₹2,000', ['women'], ['minor', 'taxpayer']),
    R('yojane/maharshi-valmiki-nigama/', 'ಮಹರ್ಷಿ ವಾಲ್ಮೀಕಿ ಅಭಿವೃದ್ಧಿ ನಿಗಮ', 'ಪರಿಶಿಷ್ಟ ಪಂಗಡದವರಿಗೆ ಸಹಾಯಧನ ಸಹಿತ ಸಾಲ', ['st'], ['minor']),
    R('yojane/alpasankhyatara-nigama/', 'ಅಲ್ಪಸಂಖ್ಯಾತರ ಅಭಿವೃದ್ಧಿ ನಿಗಮ', 'ಶಿಕ್ಷಣ, ಉದ್ಯೋಗ, ವ್ಯಾಪಾರ, ವಸತಿ ಸಾಲ', ['minority']),
    R('yojane/nigamagala-sala/', 'ವಿವಿಧ ನಿಗಮಗಳ ಸಾಲ ಸೌಲಭ್ಯ', 'ಸ್ವಯಂ ಉದ್ಯೋಗ ಮತ್ತು ಉದ್ಯಮಕ್ಕೆ ಸಾಲ + ಸಹಾಯಧನ', ['sc', 'st', 'obc', 'minority', 'business'], ['minor']),
    R('yojane/hiriya-nagarikaru/', 'ಹಿರಿಯ ನಾಗರಿಕರಿಗೆ ಸೌಲಭ್ಯಗಳು', 'ಮಾಸಿಕ ಪಿಂಚಣಿ, ಆರೋಗ್ಯ, ಆಶ್ರಯ', ['senior']),
    R('seve/vruddhapya-vetana/', 'ವೃದ್ಧಾಪ್ಯ ವೇತನ (ದಾಖಲೆ ಸೇವೆ)', 'ಪಿಂಚಣಿ ಅರ್ಜಿಗೆ ಸಹಾಯ', ['senior']),
    R('yojane/vishesha-chetanaru/', 'ವಿಶೇಷ ಚೇತನರಿಗೆ ಸೌಲಭ್ಯಗಳು', 'UDID ಕಾರ್ಡ್, ಪಿಂಚಣಿ, ಸಹಾಯಕ ಸಾಧನಗಳು', ['disabled']),
    R('yojane/vidhaveyaru/', 'ವಿಧವೆಯರಿಗೆ ಸೌಲಭ್ಯಗಳು', 'ವಿಧವಾ ಪಿಂಚಣಿ, ವಸತಿ ಆದ್ಯತೆ', ['widow']),
    R('seve/vidhava-vetana/', 'ವಿಧವಾ ವೇತನ (ದಾಖಲೆ ಸೇವೆ)', 'ಪಿಂಚಣಿ ಅರ್ಜಿಗೆ ಸಹಾಯ', ['widow']),
    R('seve/vidyarthi-vetana/', 'ವಿದ್ಯಾರ್ಥಿ ವೇತನ', 'SSP ಸೇರಿದಂತೆ ವಿದ್ಯಾರ್ಥಿ ವೇತನ ಅರ್ಜಿ', ['student']),
    R('seve/jati-adaya-pramana-patra/', 'ಜಾತಿ ಮತ್ತು ಆದಾಯ ಪ್ರಮಾಣ ಪತ್ರ', 'ಹೆಚ್ಚಿನ ಯೋಜನೆಗಳಿಗೆ ಮೊದಲ ದಾಖಲೆ', ['sc', 'st', 'obc', 'minority', 'student']),
    R('seve/karmika-card/', 'ಕಾರ್ಮಿಕ ಕಾರ್ಡ್', 'ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಕಲ್ಯಾಣ ಮಂಡಳಿ ಸೌಲಭ್ಯಗಳು', ['worker']),
    R('seve/ayushman-card/', 'ಆಯುಷ್ಮಾನ್ ಕಾರ್ಡ್', 'ವಾರ್ಷಿಕ ₹5 ಲಕ್ಷವರೆಗೆ ಚಿಕಿತ್ಸಾ ರಕ್ಷಣೆ', ['patient', 'bpl', 'senior']),
    R('yojane/mukhyamantri-parihara-nidhi/', 'ಮುಖ್ಯಮಂತ್ರಿಗಳ ಪರಿಹಾರ ನಿಧಿ', 'ಗಂಭೀರ ಕಾಯಿಲೆ ಚಿಕಿತ್ಸೆಗೆ ಆರ್ಥಿಕ ನೆರವು', ['patient']),
    R('yojane/aktobar-2026-yojanegalu/', 'ಅಕ್ಟೋಬರ್ 2026ರ ಹೊಸ ಯೋಜನೆಗಳು', 'ಗ್ಯಾಸ್, ಶಿಕ್ಷಣ, ಕೃಷಿ, ಯುವ ಉದ್ಯೋಗ ಸೌಲಭ್ಯಗಳು', ['farmer', 'student', 'business', 'jobseeker', 'bpl']),
    R('udyoga/hr-samparka/', 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು', 'ಉದ್ಯೋಗಕ್ಕಾಗಿ ನೇರವಾಗಿ ಎಚ್‌ಆರ್‌ಗೆ ಕರೆ ಮಾಡಿ', ['jobseeker']),
    R('udyoga/nondani/', 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ', 'ನಿಮ್ಮ ವಿವರ ನೋಂದಾಯಿಸಿ – ಉದ್ಯೋಗ ಮಾಹಿತಿ ಪಡೆಯಿರಿ', ['jobseeker', 'student'], ['minor']),
  ];
  const q = (n, title, name, type, opts) => `<div class="qcard"><h3><span>${n}</span>${title}</h3><div class="opts">${opts.map(([v, l]) => `<label><input type="${type}" name="${name}" value="${v}"> ${l}</label>`).join('')}</div></div>`;
  add({
    url: 'yojane/arhate/', sub: 'yojane', title: 'ಅರ್ಹತೆ ಪರಿಶೀಲನೆ – ನನಗೆ ಯಾವ ಸೌಲಭ್ಯ?', og: 'scheme-gramaone', k: 'eligibility check finder which scheme',
    desc: 'ಕೆಲವು ಸರಳ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ – ನಿಮಗೆ ಸೂಕ್ತವಾಗಬಹುದಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ದಾಖಲೆ ಸೇವೆಗಳ ಪಟ್ಟಿ ತಕ್ಷಣ.',
    body: `${phero({ trail: [['yojane/', 'ಯೋಜನೆಗಳು'], ['', 'ಅರ್ಹತೆ ಪರಿಶೀಲನೆ']], kicker: `${ic('check')} 30 ಸೆಕೆಂಡುಗಳಲ್ಲಿ`, title: 'ನನಗೆ ಯಾವ ಸೌಲಭ್ಯ ಸಿಗಬಹುದು?', lead: 'ಕೆಳಗಿನ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ. ನಿಮ್ಮ ಉತ್ತರಗಳು ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತವೆ – ಎಲ್ಲಿಗೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ. ಇದು ಅಂದಾಜು ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ.' })}
<section class="section"><div class="wrap layout">
  <form class="finder" id="finder" onsubmit="return false">
    ${q(1, 'ಅರ್ಜಿದಾರರು', 'g', 'radio', [['women', 'ಮಹಿಳೆ'], ['man', 'ಪುರುಷ']])}
    ${q(2, 'ವಯಸ್ಸು', 'a', 'radio', [['minor', '18ಕ್ಕಿಂತ ಕಡಿಮೆ'], ['adult', '18 – 59'], ['senior', '60 ಮತ್ತು ಮೇಲ್ಪಟ್ಟು']])}
    ${q(3, 'ವರ್ಗ', 'c', 'radio', [['general', 'ಸಾಮಾನ್ಯ'], ['obc', 'ಹಿಂದುಳಿದ ವರ್ಗ'], ['sc', 'ಪರಿಶಿಷ್ಟ ಜಾತಿ'], ['st', 'ಪರಿಶಿಷ್ಟ ಪಂಗಡ'], ['minority', 'ಅಲ್ಪಸಂಖ್ಯಾತ']])}
    ${q(4, 'ನಿಮಗೆ ಅನ್ವಯಿಸುವವು (ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಆಯ್ಕೆ ಮಾಡಬಹುದು)', 's', 'checkbox', [['student', 'ವಿದ್ಯಾರ್ಥಿ'], ['jobseeker', 'ಉದ್ಯೋಗ ಹುಡುಕುತ್ತಿದ್ದೇನೆ'], ['farmer', 'ರೈತ'], ['business', 'ಸ್ವ-ಉದ್ಯೋಗ / ಉದ್ಯಮ ಆಸಕ್ತಿ'], ['worker', 'ಕಟ್ಟಡ ಕಾರ್ಮಿಕ'], ['disabled', 'ವಿಶೇಷ ಚೇತನ'], ['widow', 'ವಿಧವೆ'], ['patient', 'ಗಂಭೀರ ಕಾಯಿಲೆ ಚಿಕಿತ್ಸೆ'], ['bpl', 'ಬಿಪಿಎಲ್ ಕಾರ್ಡ್ ಇದೆ'], ['taxpayer', 'ಆದಾಯ ತೆರಿಗೆ ಪಾವತಿದಾರ']])}
  </form>
  <aside class="side"><div class="box"><h2>${ic('sparkle')} ನಿಮಗೆ ಸೂಕ್ತವಾದವು</h2><p id="finder-count" class="chip ok" style="margin-bottom:12px"></p><div class="results" id="finder-results"></div></div>${helpBox('ಅರ್ಹತೆ ಪರಿಶೀಲನೆ')}</aside>
</div></section>
<script type="application/json" id="finder-rules">${JSON.stringify(rules).replace(/</g, '\\u003c')}</script>`,
  });
}

// UDYOGA (jobs) --------------------------------------------------------
const hrCards = (list) => list.map(([n, name, en], i) => `<div class="hr-card" data-text="${esc(name + ' ' + en + ' ' + n)}"><span class="num">${i + 1}</span><div><b>${name}</b><a class="tel" href="${tel(n)}">${n}</a></div><div class="act"><a href="${tel(n)}" aria-label="${esc(name)} ಅವರಿಗೆ ಕರೆ">${ic('phone')}</a><a class="wa" href="https://wa.me/91${n}" target="_blank" rel="noopener" aria-label="${esc(name)} ಅವರಿಗೆ ವಾಟ್ಸಾಪ್">${ic('whatsapp')}</a></div></div>`).join('');
add({
  url: 'udyoga/', sub: 'udyoga', title: 'ಉದ್ಯೋಗ ಮಾಹಿತಿ', og: 'scheme-youth', k: 'jobs vacancy employment hr udyoga',
  desc: 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳಿಗೆ ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು, ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ, ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ಕೌಶಲ್ಯ ತರಬೇತಿ ಮಾಹಿತಿ – ದೇವನಹಳ್ಳಿ.',
  body: `${phero({ trail: [['', 'ಉದ್ಯೋಗ']], kicker: `${ic('briefcase')} ನಿಮ್ಮ ಕೌಶಲ್ಯ – ನಮ್ಮ ಬೆಂಬಲ`, title: 'ಉದ್ಯೋಗ ಮಾಹಿತಿ ಕೇಂದ್ರ', lead: 'ಕನಸಿನ ಉದ್ಯೋಗ ಹುಡುಕಿ – ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ. ಉತ್ತಮ ಉದ್ಯೋಗ, ಉಜ್ವಲ ಭವಿಷ್ಯ. ಒಟ್ಟಾಗಿ ಉತ್ತಮ ನಾಳೆಗಾಗಿ.', img: 'scheme-youth', extra: `<div class="btns"><a class="btn btn-primary" href="~/udyoga/hr-samparka/">${ic('phone')} ಎಚ್‌ಆರ್ ಸಂಖ್ಯೆಗಳು</a><a class="btn btn-gold" href="~/udyoga/nondani/">${ic('file')} ನೋಂದಣಿ ಮಾಡಿ</a></div>` })}
<section class="section"><div class="wrap"><div class="grid g3">
  ${iconCard('phone', `${D.hrContacts.length} ಎಚ್‌ಆರ್ ಸಂಪರ್ಕಗಳು`, 'ಕರೆ ಅಥವಾ ವಾಟ್ಸಾಪ್ ಮೂಲಕ ನೇರ ಸಂಪರ್ಕ.', 'udyoga/hr-samparka/')}
  ${iconCard('file', 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ', 'ವಿದ್ಯಾರ್ಹತೆ ಮತ್ತು ಆಸಕ್ತಿ ತಿಳಿಸಿ – ಸೂಕ್ತ ಉದ್ಯೋಗ ಮಾಹಿತಿ ಪಡೆಯಿರಿ.', 'udyoga/nondani/')}
  ${iconCard('users', 'ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ತರಬೇತಿ', 'ಉದ್ಯೋಗ ಮೇಳ, ಕೌಶಲ್ಯ ತರಬೇತಿ ಮತ್ತು ಸ್ವಯಂ ಉದ್ಯೋಗ ಸಾಲ.', 'udyoga/mela/')}
</div></div></section>
<section class="section alt"><div class="wrap">${secHead('ದೇವನಹಳ್ಳಿ ಸುತ್ತಮುತ್ತ ಉದ್ಯೋಗ ಕ್ಷೇತ್ರಗಳು', 'ವಿಮಾನ ನಿಲ್ದಾಣ ಮತ್ತು ಕೈಗಾರಿಕಾ ಪ್ರದೇಶಗಳಿಂದ ಬೆಳೆಯುತ್ತಿರುವ ಉದ್ಯೋಗಾವಕಾಶಗಳು.')}<div class="grid g3">${D.jobSectors.map(([i, t, d]) => iconCard(i, t, d)).join('')}</div></div></section>
<section class="section"><div class="wrap">${secHead('ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ – ಮೊದಲ 8', '', `<a class="btn btn-primary" href="~/udyoga/hr-samparka/">ಎಲ್ಲ ${D.hrContacts.length} ಸಂಖ್ಯೆಗಳು ${ic('arrow')}</a>`)}<div class="hr-grid">${hrCards(D.hrContacts.slice(0, 8))}</div></div></section>${ctaBand('ಉದ್ಯೋಗ ಮಾಹಿತಿ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಪಡೆಯಿರಿ', 'ಹೊಸ ಉದ್ಯೋಗಾವಕಾಶಗಳ ಮಾಹಿತಿಗೆ ನಿಮ್ಮ ಹಳ್ಳಿಯ ವಾಟ್ಸಾಪ್ ಗುಂಪಿಗೆ ಸೇರಿ.')}`,
});
add({
  url: 'udyoga/hr-samparka/', sub: 'udyoga', title: 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು (ಜಾಬ್ ಕಾಂಟ್ಯಾಕ್ಟ್)', og: 'scheme-youth', k: 'hr numbers job contact',
  desc: `ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ ವತಿಯಿಂದ ${D.hrContacts.length} ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು – ಕರೆ ಅಥವಾ ವಾಟ್ಸಾಪ್ ಮಾಡಿ.`,
  body: `${phero({ trail: [['udyoga/', 'ಉದ್ಯೋಗ'], ['', 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ']], kicker: `${ic('megaphone')} ಜಾಬ್ ಕಾಂಟ್ಯಾಕ್ಟ್`, title: 'ಎಚ್‌ಆರ್ ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು', lead: 'ನಿಮ್ಮ ಕನಸಿನ ಉದ್ಯೋಗಕ್ಕೆ – ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ. ಕರೆ ಮಾಡುವಾಗ ನಿಮ್ಮ ವಿದ್ಯಾರ್ಹತೆ ಮತ್ತು ಅನುಭವವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಿ.' })}
<section class="section"><div class="wrap">
  <div class="searchbar">${ic('search')}<input class="input" type="search" placeholder="ಹೆಸರು ಅಥವಾ ಸಂಖ್ಯೆ ಹುಡುಕಿ" data-search-list="#hr-list" data-empty="#hr-empty" aria-label="ಎಚ್‌ಆರ್ ಹುಡುಕಿ"></div>
  <div class="hr-grid" id="hr-list">${hrCards(D.hrContacts)}</div><p class="empty" id="hr-empty">ಯಾವುದೇ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ.</p>
  <div class="box warn rv" style="margin-top:24px"><h2>${ic('shield')} ಉದ್ಯೋಗ ವಂಚನೆಯಿಂದ ಎಚ್ಚರ</h2>${checks(['ಉದ್ಯೋಗಕ್ಕಾಗಿ ಮುಂಗಡ ಹಣ ಕೇಳುವವರಿಗೆ ಹಣ ನೀಡಬೇಡಿ', 'ಆಫರ್ ಲೆಟರ್ ಮತ್ತು ಕಂಪನಿಯ ವಿಳಾಸವನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ', 'ಸೈಬರ್ ವಂಚನೆಯಾದರೆ 1930ಗೆ ಕರೆ ಮಾಡಿ'])}</div>
</div></section>`,
});
add({
  url: 'udyoga/nondani/', sub: 'udyoga', title: 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ', og: 'scheme-youth', k: 'job registration resume apply',
  desc: 'ನಿಮ್ಮ ಹೆಸರು, ವಿದ್ಯಾರ್ಹತೆ, ಅನುಭವ ಮತ್ತು ಆಸಕ್ತಿಯ ಕ್ಷೇತ್ರ ತಿಳಿಸಿ – ಸೂಕ್ತ ಉದ್ಯೋಗ ಮಾಹಿತಿ ವಾಟ್ಸಾಪ್ ಮೂಲಕ.',
  body: `${phero({ trail: [['udyoga/', 'ಉದ್ಯೋಗ'], ['', 'ನೋಂದಣಿ']], kicker: `${ic('file')} ಉಚಿತ ನೋಂದಣಿ`, title: 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ', lead: 'ಕೆಳಗಿನ ವಿವರ ತುಂಬಿ “ಕಳುಹಿಸಿ” ಒತ್ತಿದರೆ ಸಂದೇಶ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸಿದ್ಧವಾಗುತ್ತದೆ – ರೆಸ್ಯೂಮ್ ಇದ್ದರೆ ಅದೇ ಚಾಟ್‌ನಲ್ಲಿ ಲಗತ್ತಿಸಿ.' })}
<section class="section"><div class="wrap layout">
  <form class="box" data-wa-form="ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ ನೋಂದಣಿ">
    <div class="grid g2"><div class="field"><label for="j-name">ಹೆಸರು</label><input class="input" id="j-name" name="name" data-label="ಹೆಸರು" required></div>
    <div class="field"><label for="j-age">ವಯಸ್ಸು</label><input class="input" id="j-age" name="age" data-label="ವಯಸ್ಸು" inputmode="numeric"></div></div>
    <div class="grid g2"><div class="field"><label for="j-edu">ವಿದ್ಯಾರ್ಹತೆ</label><select class="input" id="j-edu" name="edu" data-label="ವಿದ್ಯಾರ್ಹತೆ"><option>SSLC</option><option>PUC</option><option>ITI</option><option>ಡಿಪ್ಲೊಮಾ</option><option>ಪದವಿ</option><option>ಸ್ನಾತಕೋತ್ತರ ಪದವಿ</option><option>ಇತರೆ</option></select></div>
    <div class="field"><label for="j-exp">ಅನುಭವ</label><select class="input" id="j-exp" name="exp" data-label="ಅನುಭವ"><option>ಹೊಸಬರು (ಫ್ರೆಶರ್)</option><option>1–2 ವರ್ಷ</option><option>3–5 ವರ್ಷ</option><option>5 ವರ್ಷಕ್ಕಿಂತ ಹೆಚ್ಚು</option></select></div></div>
    <div class="field"><label for="j-sector">ಆಸಕ್ತಿಯ ಕ್ಷೇತ್ರ</label><select class="input" id="j-sector" name="sector" data-label="ಕ್ಷೇತ್ರ">${D.jobSectors.map(([, t]) => `<option>${t}</option>`).join('')}<option>ಯಾವುದೇ ಕ್ಷೇತ್ರ</option></select></div>
    <div class="field"><label for="j-place">ಊರು</label><input class="input" id="j-place" name="place" data-label="ಊರು"></div>
    <div class="field"><label for="j-note">ಇತರೆ ಮಾಹಿತಿ</label><textarea class="input" id="j-note" name="note" data-label="ಇತರೆ" rows="3"></textarea></div>
    <button class="btn btn-wa" type="submit">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕಳುಹಿಸಿ</button>
    <p style="margin:10px 0 0;font-size:.85rem;color:var(--muted)">ಈ ಜಾಲತಾಣ ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ – ಅದು ನೇರವಾಗಿ ನಿಮ್ಮ ವಾಟ್ಸಾಪ್‌ನಿಂದ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗುತ್ತದೆ.</p>
  </form>
  <aside class="side"><div class="box"><h2>${ic('check')} ಸಲಹೆಗಳು</h2>${checks(['ಸರಳ ಒಂದು ಪುಟದ ರೆಸ್ಯೂಮ್ ಸಿದ್ಧಪಡಿಸಿ', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಸದಾ ಚಾಲ್ತಿಯಲ್ಲಿರಲಿ', 'ಸಂದರ್ಶನಕ್ಕೆ ಮೂಲ ದಾಖಲೆಗಳ ಪ್ರತಿ ತೆಗೆದುಕೊಂಡು ಹೋಗಿ'])}</div></aside>
</div></section>`,
});
add({
  url: 'udyoga/mela/', sub: 'udyoga', title: 'ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ಕೌಶಲ್ಯ ತರಬೇತಿ', og: 'camp-awareness', k: 'job fair mela skill training',
  desc: 'ಚನ್ನರಾಯಪಟ್ಟಣ ಸೇರಿದಂತೆ ತಾಲೂಕಿನಾದ್ಯಂತ ಉದ್ಯೋಗ ಮೇಳಗಳು, ಕೌಶಲ್ಯ ತರಬೇತಿ ಮತ್ತು ಸ್ವಯಂ ಉದ್ಯೋಗ ಸಾಲ ಮಾಹಿತಿ.',
  body: `${phero({ trail: [['udyoga/', 'ಉದ್ಯೋಗ'], ['', 'ಉದ್ಯೋಗ ಮೇಳ']], kicker: `${ic('users')} ಉದ್ಯೋಗ ಮೇಳ`, title: 'ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ಕೌಶಲ್ಯ ತರಬೇತಿ', lead: 'ಚನ್ನರಾಯಪಟ್ಟಣದಲ್ಲಿ ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಜಾಗೃತಿ ಕಾರ್ಯಕ್ರಮ ನಡೆಸಲಾಗಿದೆ. ಮುಂದಿನ ಉದ್ಯೋಗ ಮೇಳಗಳ ಮಾಹಿತಿ ಇಲ್ಲಿ ಪ್ರಕಟವಾಗುತ್ತದೆ.', img: 'camp-awareness' })}
<section class="section"><div class="wrap grid g3">
  ${iconCard('users', 'ಉದ್ಯೋಗ ಮೇಳಗಳು', 'ಕಂಪನಿಗಳು ಮತ್ತು ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳನ್ನು ಒಂದೇ ವೇದಿಕೆಗೆ ತರುವ ಕಾರ್ಯಕ್ರಮಗಳು.')}
  ${iconCard('book', 'ಕೌಶಲ್ಯ ತರಬೇತಿ', 'ಸರ್ಕಾರಿ ಕೌಶಲ್ಯಾಭಿವೃದ್ಧಿ ಮತ್ತು ಉಚಿತ ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳ ಮಾಹಿತಿ.', 'kendra/mahiti-seve/')}
  ${iconCard('rupee', 'ಸ್ವಯಂ ಉದ್ಯೋಗ ಸಾಲ', 'ನಿಗಮಗಳ ಸ್ವಯಂ ಉದ್ಯೋಗ ಸಾಲ ಮತ್ತು ಸಹಾಯಧನ.', 'yojane/nigamagala-sala/')}
</div></section>
<section class="section alt"><div class="wrap">${secHead('ಉದ್ಯೋಗ ಮೇಳದ ಕ್ಷಣಗಳು')}${gallery(['camp-awareness', 'scheme-youth', 'poster-release'], 'ಉದ್ಯೋಗ ಮೇಳ ಮತ್ತು ಜಾಗೃತಿ')}</div></section>${ctaBand('ಮುಂದಿನ ಉದ್ಯೋಗ ಮೇಳದ ಮಾಹಿತಿ ಬೇಕೇ?', 'ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಊರನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿ – ಮೇಳದ ದಿನಾಂಕ ತಿಳಿಸಲಾಗುವುದು.')}`,
});

// JANASEVE (social work) ----------------------------------------------
add({
  url: 'janaseve/', sub: 'janaseve', title: 'ಸಮಾಜ ಸೇವೆ ಮತ್ತು ಸಾಮಾಜಿಕ ಕೊಡುಗೆಗಳು', og: 'camp-health', k: 'social service camps contributions',
  desc: 'ಉಚಿತ ಆರೋಗ್ಯ ಶಿಬಿರ, ರಕ್ತದಾನ, ಆಧಾರ್ ಶಿಬಿರ, ಪರಿಸರ ದಿನಾಚರಣೆ, ಜಾಗೃತಿ ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಉದ್ಯೋಗ ಮೇಳ – ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನಾದ್ಯಂತ.',
  body: `${phero({ trail: [['', 'ಸಮಾಜ ಸೇವೆ']], kicker: `${ic('heart')} ಸಮಾಜ ಸೇವೆ • ಜನಸೇವೆ`, title: 'ಸಮಾಜ ಸೇವೆ ಮತ್ತು ಸಾಮಾಜಿಕ ಕೊಡುಗೆಗಳು', lead: 'ಜನಪರ ಕಾರ್ಯಗಳೇ ನಮ್ಮ ಧ್ಯೇಯ. ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನ ಹಳ್ಳಿ ಹಳ್ಳಿಗಳಲ್ಲಿ ನಡೆದ ಸೇವಾ ಕಾರ್ಯಗಳು.', img: 'camp-health' })}
<section class="section"><div class="wrap"><div class="grid g3">${D.socialWork.map((w) => mediaCard({ href: `janaseve/${w.slug}/`, img: w.img, title: w.name, text: w.text.slice(0, 110) + '…' })).join('')}</div></div></section>
<section class="section alt"><div class="wrap">${secHead('ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನಾದ್ಯಂತ ಜಾಗೃತಿ ಕಾರ್ಯಕ್ರಮಗಳು')}<div class="table-wrap"><table class="data"><thead><tr><th>ಸ್ಥಳ</th><th>ಎಲ್ಲಿ</th><th>ಕಾರ್ಯಕ್ರಮ</th></tr></thead><tbody>${D.awarenessPlaces.map(([a, b, c]) => `<tr><td><b>${ic('pin')} ${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div></div></section>
<section class="section"><div class="wrap">${secHead('ಫೋಟೋ ಕ್ಷಣಗಳು')}${gallery(['camp-health', 'camp-environment', 'camp-awareness', 'seva-health', 'seva-sapling', 'seva-blood', 'seva-aadhaar'], 'ಸಮಾಜ ಸೇವೆ')}</div></section>`,
});
for (const w of D.socialWork) {
  add({
    url: `janaseve/${w.slug}/`, sub: 'janaseve', title: w.name, og: w.img, k: w.slug,
    desc: w.text,
    body: `${phero({ trail: [['janaseve/', 'ಸಮಾಜ ಸೇವೆ'], ['', w.name]], kicker: `${ic(w.icon)} ಸಮಾಜ ಸೇವೆ`, title: w.name, lead: w.text, img: w.img })}
<section class="section"><div class="wrap layout"><div>
  <div class="box rv"><h2>${ic('check')} ಮುಖ್ಯಾಂಶಗಳು</h2>${checks(w.points)}</div>
  ${w.slug === 'jagruti-karyakrama' ? `<div class="box rv"><h2>${ic('pin')} ಕಾರ್ಯಕ್ರಮ ನಡೆದ ಸ್ಥಳಗಳು</h2><div class="table-wrap"><table class="data"><thead><tr><th>ಸ್ಥಳ</th><th>ಎಲ್ಲಿ</th><th>ಕಾರ್ಯಕ್ರಮ</th></tr></thead><tbody>${D.awarenessPlaces.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
  <div class="box rv"><h2>${ic('image')} ಫೋಟೋಗಳು</h2>${gallery([w.img, ...w.gallery], w.name)}${shareRow()}</div>
</div><aside class="side">${helpBox(w.name)}<div class="box"><h2>${ic('heart')} ಇತರ ಸೇವೆಗಳು</h2>${D.socialWork.filter((x) => x !== w).map((x) => `<a href="~/janaseve/${x.slug}/" style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">${ic(x.icon)} ${x.name}</a>`).join('')}</div></aside></div></section>`,
  });
}

// MANAVI (petitions) -------------------------------------------------
const distanceBoard = () => `<div class="board rv"><h3>ದೇವನಹಳ್ಳಿಗೆ ಸುಸ್ವಾಗತ – ದೇವನಹಳ್ಳಿ ಟೋಲ್‌ನಿಂದ</h3><ul>${[...D.places.filter((p) => p.km).map((p) => [p.name, p.km]), ...D.moreDistances].sort((a, b) => a[1] - b[1]).map(([n, k]) => `<li><span>${n}</span><b>${k} ಕಿ.ಮೀ.</b></li>`).join('')}</ul></div>`;
add({
  url: 'manavi/', sub: 'manavi', title: 'ಜನಪರ ಮನವಿಗಳು', og: 'memorandum', k: 'petitions demands memorandum',
  desc: 'ಶಂಕರ್ ನಾಗ್ ಮೆಟ್ರೋ ನಿಲ್ದಾಣ, ಬಸ್ ನಿಲ್ದಾಣ, ಪ್ರವಾಸಿ ತಾಣಗಳ ನಾಮಫಲಕ, ಪುನೀತ್ ಪುಣ್ಯಸ್ಮರಣೆ ರಜೆ – ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಜನಪರ ಮನವಿಗಳು.',
  body: `${phero({ trail: [['', 'ಮನವಿಗಳು']], kicker: `${ic('megaphone')} ಜನರ ಧ್ವನಿ`, title: 'ಜನಪರ ಮನವಿಗಳು', lead: 'ದೇವನಹಳ್ಳಿಯ ಅಭಿವೃದ್ಧಿ ಮತ್ತು ಜನರ ಗೌರವಕ್ಕಾಗಿ ಸರ್ಕಾರಕ್ಕೆ ಸಲ್ಲಿಸಿದ ಮನವಿಗಳು.', img: 'memorandum' })}
<section class="section"><div class="wrap"><div class="grid g2">${D.petitions.map((p) => mediaCard({ href: `manavi/${p.slug}/`, img: p.img, title: p.name, text: p.short, chip: `<span class="chip warn">${ic('clock')} ${p.status}</span>` })).join('')}</div></div></section>
<section class="section alt"><div class="wrap split"><div class="rv"><span class="kicker">${ic('megaphone')} ನಿಮ್ಮ ಧ್ವನಿ</span><h2>ನಿಮ್ಮ ಊರಿನ ಸಮಸ್ಯೆ ತಿಳಿಸಿ</h2><p class="lead">ರಸ್ತೆ, ನೀರು, ವಿದ್ಯುತ್, ಬಸ್ ಸಂಪರ್ಕ – ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳ ಕುಂದುಕೊರತೆಗಳನ್ನು ಸಂಬಂಧಿಸಿದ ಇಲಾಖೆಗೆ ತಲುಪಿಸಲು ಮಾರ್ಗದರ್ಶನ.</p><a class="btn btn-primary" href="~/manavi/kundukorate/">ಕುಂದುಕೊರತೆ ತಿಳಿಸಿ ${ic('arrow')}</a></div><div class="rv">${pic('memorandum', 'ಮನವಿ ಸಲ್ಲಿಕೆ')}</div></div></section>`,
});
for (const p of D.petitions) {
  add({
    url: `manavi/${p.slug}/`, sub: 'manavi', title: p.name, og: p.img, k: p.slug,
    desc: `${p.short}. ${p.text[0]}`,
    body: `${phero({ trail: [['manavi/', 'ಮನವಿಗಳು'], ['', p.name]], kicker: `${ic(p.icon)} ${p.status}`, title: p.name, lead: p.short, img: p.img })}
<section class="section"><div class="wrap layout"><div>
  <div class="box rv"><h2>${ic('file')} ಮನವಿಯ ವಿವರ</h2>${p.text.map((t) => `<p>${esc(t)}</p>`).join('')}<p><span class="chip warn">${ic('clock')} ಸ್ಥಿತಿ: ${p.status}</span></p>${shareRow()}</div>
  ${p.distances ? distanceBoard() : ''}
  ${p.gallery ? `<div class="box rv"><h2>${ic('image')} ಚಿತ್ರಗಳು</h2>${gallery(p.gallery, p.name)}</div>` : ''}
</div><aside class="side"><div class="box"><h2>${ic('megaphone')} ಬೆಂಬಲ ನೀಡಿ</h2><p>ಈ ಮನವಿಗೆ ನಿಮ್ಮ ಬೆಂಬಲ ತಿಳಿಸಿ – ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಊರನ್ನು ವಾಟ್ಸಾಪ್ ಮಾಡಿ.</p>${waBtn(`ನಾನು "${p.name}" ಮನವಿಗೆ ಬೆಂಬಲ ನೀಡುತ್ತೇನೆ. ಹೆಸರು: , ಊರು: `, 'ಬೆಂಬಲ ಸೂಚಿಸಿ')}</div><div class="box"><h2>${ic('grid')} ಇತರ ಮನವಿಗಳು</h2>${D.petitions.filter((x) => x !== p).map((x) => `<a href="~/manavi/${x.slug}/" style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">${ic(x.icon)} ${x.name}</a>`).join('')}</div></aside></div></section>`,
  });
}
add({
  url: 'manavi/kundukorate/', sub: 'manavi', title: 'ನಿಮ್ಮ ಕುಂದುಕೊರತೆ ತಿಳಿಸಿ', og: 'memorandum', k: 'complaint grievance problem',
  desc: 'ರಸ್ತೆ, ನೀರು, ವಿದ್ಯುತ್, ಬಸ್, ಆರೋಗ್ಯ – ನಿಮ್ಮ ಊರಿನ ಮೂಲಭೂತ ಸೌಕರ್ಯ ಸಮಸ್ಯೆಯನ್ನು ವಾಟ್ಸಾಪ್ ಮೂಲಕ ತಿಳಿಸಿ.',
  body: `${phero({ trail: [['manavi/', 'ಮನವಿಗಳು'], ['', 'ಕುಂದುಕೊರತೆ']], kicker: `${ic('megaphone')} ನಿಮ್ಮ ಧ್ವನಿ`, title: 'ನಿಮ್ಮ ಕುಂದುಕೊರತೆ ತಿಳಿಸಿ', lead: 'ಸಮಸ್ಯೆಯ ಫೋಟೋ ಇದ್ದರೆ ವಾಟ್ಸಾಪ್ ಚಾಟ್‌ನಲ್ಲಿ ಲಗತ್ತಿಸಿ. ತುರ್ತು ವಿಷಯಗಳಿಗೆ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳನ್ನು ಬಳಸಿ.' })}
<section class="section"><div class="wrap layout">
  <form class="box" data-wa-form="ಕುಂದುಕೊರತೆ / ಸಮಸ್ಯೆ">
    <div class="grid g2"><div class="field"><label for="k-name">ಹೆಸರು</label><input class="input" id="k-name" name="name" data-label="ಹೆಸರು" required></div><div class="field"><label for="k-village">ಹಳ್ಳಿ / ವಾರ್ಡ್</label><input class="input" id="k-village" name="village" data-label="ಊರು" required></div></div>
    <div class="field"><label for="k-type">ಸಮಸ್ಯೆಯ ವಿಧ</label><select class="input" id="k-type" name="type" data-label="ವಿಧ">${D.development.map(([, t]) => `<option>${t}</option>`).join('')}<option>ಇತರೆ</option></select></div>
    <div class="field"><label for="k-text">ಸಮಸ್ಯೆಯ ವಿವರ</label><textarea class="input" id="k-text" name="text" data-label="ವಿವರ" rows="4" required></textarea></div>
    <button class="btn btn-wa" type="submit">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕಳುಹಿಸಿ</button>
  </form>
  <aside class="side"><div class="box"><h2>${ic('phone')} ತುರ್ತು ಸಹಾಯವಾಣಿ</h2>${D.emergencyLines.slice(0, 6).map(([n, l]) => `<a href="tel:${n}" style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span>${l}</span><b>${n}</b></a>`).join('')}<a class="more" href="~/sahayavani/" style="display:inline-flex;margin-top:10px;font-weight:700">ಎಲ್ಲ ಸಹಾಯವಾಣಿಗಳು ${ic('arrow')}</a></div></aside>
</div></section>`,
});

// ABHIVRUDDHI ----------------------------------------------------------
add({
  url: 'abhivruddhi/', sub: 'abhivruddhi', title: 'ದೇವನಹಳ್ಳಿ ಅಭಿವೃದ್ಧಿ ಕನಸು', og: 'infra-airport', k: 'development infrastructure roads water power',
  desc: 'ರಸ್ತೆ, ವಿಮಾನ ನಿಲ್ದಾಣ, ಆರೋಗ್ಯ, ಶಿಕ್ಷಣ, ಕುಡಿಯುವ ನೀರು, ವಿದ್ಯುತ್, ಕೈಗಾರಿಕೆ, ಯುವ ಸ್ಟೇಡಿಯಂ, ಬಸ್ ನಿಲ್ದಾಣ – ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನ ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳ ಆಶಯ.',
  body: `${phero({ trail: [['', 'ಅಭಿವೃದ್ಧಿ']], kicker: `${ic('target')} ದೇವನಹಳ್ಳಿ ಅಭಿವೃದ್ಧಿ ನಮ್ಮ ಗುರಿ`, title: 'ದೇವನಹಳ್ಳಿ ತಾಲೂಕಿನ ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳ ಕನಸು', lead: 'ಸಹಕಾರ, ಸಂಕಲ್ಪ, ಸಮಗ್ರ ಅಭಿವೃದ್ಧಿ. ಉತ್ತಮ ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳು – ಉಜ್ವಲ ಭವಿಷ್ಯಕ್ಕೆ ಭದ್ರ ಬುನಾದಿ.', img: 'infra-airport' })}
<section class="section"><div class="wrap"><div class="grid g3">${D.development.map(([i, t, img, pts]) => `<div class="card media-card rv" id="${i}"><div class="media">${pic(img, t)}</div><div class="body"><h3>${ic(i)} ${t}</h3>${checks(pts)}</div></div>`).join('')}</div></div></section>
${ctaBand('ನಿಮ್ಮ ಸಲಹೆ ನಮಗೆ ಮುಖ್ಯ', 'ದೇವನಹಳ್ಳಿ ಅಭಿವೃದ್ಧಿಗೆ ನಿಮ್ಮ ಸಲಹೆ / ಬೇಡಿಕೆಯನ್ನು ತಿಳಿಸಿ.')}`,
});
add({
  url: 'abhivruddhi/salahe/', sub: 'abhivruddhi', title: 'ಅಭಿವೃದ್ಧಿಗೆ ನಿಮ್ಮ ಸಲಹೆ', og: 'infra-roads', k: 'suggestion idea development',
  desc: 'ದೇವನಹಳ್ಳಿ ಅಭಿವೃದ್ಧಿಗೆ ನಿಮ್ಮ ಸಲಹೆಯನ್ನು ವಾಟ್ಸಾಪ್ ಮೂಲಕ ತಿಳಿಸಿ.',
  body: `${phero({ trail: [['abhivruddhi/', 'ಅಭಿವೃದ್ಧಿ'], ['', 'ಸಲಹೆ']], kicker: `${ic('sparkle')} ನಮ್ಮ ದೇವನಹಳ್ಳಿ – ನಮ್ಮ ಹೆಮ್ಮೆ`, title: 'ಅಭಿವೃದ್ಧಿಗೆ ನಿಮ್ಮ ಸಲಹೆ', lead: 'ನಿಮ್ಮ ಊರಿಗೆ ಮೊದಲು ಏನು ಬೇಕು? ನಿಮ್ಮ ಸಲಹೆಯನ್ನು ತಿಳಿಸಿ.' })}
<section class="section"><div class="wrap" style="max-width:760px"><form class="box" data-wa-form="ದೇವನಹಳ್ಳಿ ಅಭಿವೃದ್ಧಿಗೆ ಸಲಹೆ">
  <div class="field"><label for="s-name">ಹೆಸರು</label><input class="input" id="s-name" name="name" data-label="ಹೆಸರು" required></div>
  <div class="field"><label for="s-area">ಕ್ಷೇತ್ರ</label><select class="input" id="s-area" name="area" data-label="ಕ್ಷೇತ್ರ">${D.development.map(([, t]) => `<option>${t}</option>`).join('')}</select></div>
  <div class="field"><label for="s-idea">ನಿಮ್ಮ ಸಲಹೆ</label><textarea class="input" id="s-idea" name="idea" data-label="ಸಲಹೆ" rows="5" required></textarea></div>
  <button class="btn btn-wa" type="submit">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕಳುಹಿಸಿ</button>
</form></div></section>`,
});

// DEVANAHALLI ----------------------------------------------------------
add({
  url: 'devanahalli/', sub: 'devanahalli', title: 'ನಮ್ಮ ದೇವನಹಳ್ಳಿ – ಪ್ರವಾಸಿ ತಾಣಗಳು', og: 'place-fort', k: 'devanahalli tourism places fort nandi tipu',
  desc: 'ದೇವನಹಳ್ಳಿ ಕೋಟೆ, ಟಿಪ್ಪು ಸುಲ್ತಾನ್ ಜನ್ಮಸ್ಥಳ, ವೇಣುಗೋಪಾಲಸ್ವಾಮಿ ದೇವಾಲಯ, ಆವತಿ, ನಂದಿ ಬೆಟ್ಟ, ವಿಮಾನ ನಿಲ್ದಾಣ – ದೇವನಹಳ್ಳಿ ಟೋಲ್‌ನಿಂದ ದೂರದ ಮಾಹಿತಿಯೊಂದಿಗೆ.',
  body: `${phero({ trail: [['', 'ನಮ್ಮ ದೇವನಹಳ್ಳಿ']], kicker: `${ic('fort')} ಐತಿಹಾಸಿಕ ಪರಂಪರೆ`, title: 'ನಮ್ಮ ದೇವನಹಳ್ಳಿ – ನಮ್ಮ ಹೆಮ್ಮೆ', lead: 'ನಮ್ಮ ಇತಿಹಾಸ… ನಮ್ಮ ಭವಿಷ್ಯ… ನಮ್ಮ ದೇವನಹಳ್ಳಿ… ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ ಜಿಲ್ಲೆಯ ಐತಿಹಾಸಿಕ ತಾಲೂಕು.', img: 'place-fort' })}
<section class="section"><div class="wrap"><div class="grid g4">${D.places.map((p) => mediaCard({ href: `devanahalli/${p.slug}/`, img: p.img, title: p.name, chip: p.km ? `<span class="chip">${ic('pin')} ${p.km} ಕಿ.ಮೀ.</span>` : '' })).join('')}</div></div></section>
<section class="section alt"><div class="wrap split">${distanceBoard()}<div class="rv"><span class="kicker">${ic('pin')} ನಾಮಫಲಕ ಮನವಿ</span><h2>ಪ್ರವಾಸಿಗರಿಗೆ ದಾರಿ ತೋರುವ ನಾಮಫಲಕಗಳು</h2><p class="lead">ಪ್ರವಾಸಿ ತಾಣಗಳಿಗೆ ಕಿಲೋಮೀಟರ್ ಮಾಹಿತಿಯೊಂದಿಗೆ ನಾಮಫಲಕ ಅಳವಡಿಸಲು ಸಂಸ್ಥೆಯ ವತಿಯಿಂದ ಮನವಿ ಮಾಡಲಾಗಿದೆ.</p><a class="btn btn-primary" href="~/manavi/pravasi-tanagalige-namaphalaka/">ಮನವಿಯ ವಿವರ ${ic('arrow')}</a></div></div></section>`,
});
for (const p of D.places) {
  add({
    url: `devanahalli/${p.slug}/`, sub: 'devanahalli', title: p.name, og: p.img, k: p.slug,
    desc: p.text,
    body: `${phero({ trail: [['devanahalli/', 'ನಮ್ಮ ದೇವನಹಳ್ಳಿ'], ['', p.name]], kicker: `${ic(p.icon)} ${p.km ? `ದೇವನಹಳ್ಳಿ ಟೋಲ್‌ನಿಂದ ${p.km} ಕಿ.ಮೀ.` : 'ದೇವನಹಳ್ಳಿ ತಾಲೂಕು'}`, title: p.name, lead: p.text, img: p.img, extra: `<div class="btns"><a class="btn btn-primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name.split(' – ')[0] + ' Devanahalli')}" target="_blank" rel="noopener">${ic('pin')} ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ</a><button class="btn btn-ghost" type="button" data-share>${ic('share')} ಹಂಚಿಕೊಳ್ಳಿ</button></div>` })}
<section class="section"><div class="wrap layout"><div><div class="box rv"><h2>${ic('info')} ಪ್ರವಾಸಿಗರಿಗೆ ಸಲಹೆ</h2>${checks(p.tips)}</div>${distanceBoard()}</div>
<aside class="side"><div class="box"><h2>${ic('fort')} ಇತರ ತಾಣಗಳು</h2>${D.places.filter((x) => x !== p).map((x) => `<a href="~/devanahalli/${x.slug}/" style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">${ic(x.icon)} ${x.name}</a>`).join('')}</div></aside></div></section>`,
  });
}

// KARYAKRAMA (events & news) ------------------------------------------
add({
  url: 'karyakrama/', sub: 'karyakrama', title: 'ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಸುದ್ದಿ', og: 'constitution-award', k: 'events news programs',
  desc: 'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು, ಆಮಂತ್ರಣಗಳು, ಸಮಾರಂಭಗಳು ಮತ್ತು ಮಾಧ್ಯಮ ವರದಿಗಳು – ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ.',
  body: `${phero({ trail: [['', 'ಕಾರ್ಯಕ್ರಮಗಳು']], kicker: `${ic('calendar')} ಸೇವೆ… ಸಂವಾದ… ಸಮುದಾಯದೊಂದಿಗೆ…`, title: 'ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಸುದ್ದಿ', lead: 'ದಿನಾಂಕ ಇರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಗೆ “ಇಂದು / ನಾಳೆ / ನಡೆದಿದೆ” ಎಂಬ ಸ್ಥಿತಿ ತಾನಾಗಿಯೇ ತೋರುತ್ತದೆ.', img: 'constitution-award' })}
<section class="section"><div class="wrap"><div class="grid g3">${D.events.map((e) => mediaCard({ href: `karyakrama/${e.slug}/`, img: e.img, title: e.name, text: `${ic('pin')} ${e.place}`, chip: e.date ? `${eventChip(e.date)} <span class="chip">${kDate(e.date)}</span>` : `<span class="chip">${e.type}</span>` })).join('')}</div></div></section>`,
});
add({
  url: 'karyakrama/madhyama/', sub: 'karyakrama', title: 'ಮಾಧ್ಯಮ ವರದಿಗಳು', og: 'sahadesh-namaste-pink', k: 'media news paper udayavani',
  desc: 'ಉದಯವಾಣಿ ಸೇರಿದಂತೆ ದಿನಪತ್ರಿಕೆಗಳಲ್ಲಿ ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಕುರಿತ ವರದಿಗಳು.',
  body: `${phero({ trail: [['karyakrama/', 'ಕಾರ್ಯಕ್ರಮಗಳು'], ['', 'ಮಾಧ್ಯಮ ವರದಿಗಳು']], kicker: `${ic('book')} ಪತ್ರಿಕೆಗಳಲ್ಲಿ`, title: 'ಮಾಧ್ಯಮ ವರದಿಗಳು', lead: 'ಕೇಂದ್ರದ ಕಾರ್ಯಕ್ರಮಗಳ ಬಗ್ಗೆ ದಿನಪತ್ರಿಕೆಗಳಲ್ಲಿ ಪ್ರಕಟವಾದ ವರದಿಗಳ ಸಾರಾಂಶ.' })}
<section class="section"><div class="wrap"><div class="timeline">${D.events.filter((e) => e.media).flatMap((e) => e.media.map(([paper, date, head]) => `<a class="tl rv" href="~/karyakrama/${e.slug}/" style="color:inherit">${pic(e.img, head)}<div><span class="year">${paper} • ${date}</span><h3>${head}</h3><p style="margin:0;color:var(--muted)">${esc(e.text[1])}</p></div></a>`)).join('')}</div></div></section>`,
});
for (const e of D.events) {
  add({
    url: `karyakrama/${e.slug}/`, sub: 'karyakrama', title: e.name, og: e.img, k: e.slug,
    desc: `${e.name} – ${e.place}. ${e.text[0].slice(0, 120)}`,
    body: `${phero({ trail: [['karyakrama/', 'ಕಾರ್ಯಕ್ರಮಗಳು'], ['', e.name]], kicker: `${ic(e.icon)} ${e.type}`, title: e.name, lead: e.text[0], img: e.img, extra: `<div class="btns">${e.date ? `${eventChip(e.date)} <span class="chip">${ic('calendar')} ${kDate(e.date)}</span>` : ''}${e.time ? ` <span class="chip">${ic('clock')} ${e.time}</span>` : ''}</div>` })}
<section class="section"><div class="wrap layout"><div>
  <div class="box rv"><h2>${ic('info')} ವಿವರ</h2>${e.text.slice(1).map((t) => `<p>${esc(t)}</p>`).join('')}<table class="kv"><tr><th>ಸ್ಥಳ</th><td>${esc(e.place)}</td></tr>${e.date ? `<tr><th>ದಿನಾಂಕ</th><td>${kDate(e.date)}</td></tr>` : ''}${e.time ? `<tr><th>ಸಮಯ</th><td>${e.time}</td></tr>` : ''}</table>${shareRow()}</div>
  ${e.media ? `<div class="box rv"><h2>${ic('book')} ಮಾಧ್ಯಮ ವರದಿ</h2>${e.media.map(([p, d, h]) => `<p><span class="chip">${p} • ${d}</span><br><b>${h}</b></p>`).join('')}</div>` : ''}
  ${e.gallery ? `<div class="box rv"><h2>${ic('image')} ಫೋಟೋಗಳು</h2>${gallery([e.img, ...e.gallery], e.name)}</div>` : ''}
</div><aside class="side"><div class="box"><h2>${ic('calendar')} ಇತರ ಕಾರ್ಯಕ್ರಮಗಳು</h2>${D.events.filter((x) => x !== e).map((x) => `<a href="~/karyakrama/${x.slug}/" style="display:block;padding:7px 0;border-bottom:1px solid var(--line)">${x.name}</a>`).join('')}</div></aside></div></section>`,
  });
}

// GALLERY ---------------------------------------------------------------
{
  const photos = ['poster-release', 'memorandum', 'camp-health', 'camp-environment', 'camp-awareness', 'constitution-award', 'constitution-audience', 'guinness-group', 'guinness-medal', 'doctorate-certificate', 'sahadesh-vidhanasoudha', 'sahadesh-namaste-blue', 'sahadesh-whiteshirt', 'sahadesh-orange2', 'place-fort', 'place-venugopala', 'place-nandi-sign'];
  add({
    url: 'gallery/', sub: 'gallery', title: 'ಫೋಟೋ ಗ್ಯಾಲರಿ', og: 'constitution-audience', k: 'photos gallery',
    desc: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಕಾರ್ಯಕ್ರಮಗಳು, ಶಿಬಿರಗಳು, ಸನ್ಮಾನಗಳು ಮತ್ತು ದೇವನಹಳ್ಳಿಯ ಫೋಟೋಗಳು.',
    body: `${phero({ trail: [['', 'ಗ್ಯಾಲರಿ']], kicker: `${ic('image')} ${photos.length} ಫೋಟೋಗಳು`, title: 'ಫೋಟೋ ಗ್ಯಾಲರಿ', lead: 'ಫೋಟೋ ಮೇಲೆ ಒತ್ತಿ ದೊಡ್ಡದಾಗಿ ನೋಡಿ; ಬಾಣದ ಗುರುತುಗಳಿಂದ ಮುಂದಿನ ಫೋಟೋ.' })}
<section class="section"><div class="wrap">${gallery(photos, 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ')}</div></section>`,
  });
  const posters = Object.keys(sizes).filter((k) => k.startsWith('posters/')).map((k) => k.replace('.webp', ''));
  add({
    url: 'gallery/posters/', sub: 'gallery', title: 'ಪೋಸ್ಟರ್ ಸಂಗ್ರಹ', og: 'poster-release', k: 'posters',
    desc: 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಪೋಸ್ಟರ್‌ಗಳು – ವೀಕ್ಷಿಸಿ ಮತ್ತು ಹಂಚಿಕೊಳ್ಳಿ.',
    body: `${phero({ trail: [['gallery/', 'ಗ್ಯಾಲರಿ'], ['', 'ಪೋಸ್ಟರ್ ಸಂಗ್ರಹ']], kicker: `${ic('image')} ${posters.length} ಪೋಸ್ಟರ್‌ಗಳು`, title: 'ಪೋಸ್ಟರ್ ಸಂಗ್ರಹ', lead: 'ಕೇಂದ್ರ ಪ್ರಕಟಿಸಿದ ಮಾಹಿತಿ ಪೋಸ್ಟರ್‌ಗಳು. ಪೋಸ್ಟರ್ ಮೇಲೆ ಒತ್ತಿ ದೊಡ್ಡದಾಗಿ ನೋಡಿ.' })}
<section class="section"><div class="wrap">${gallery(posters, 'ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರದ ಪೋಸ್ಟರ್')}</div></section>`,
  });
}

// SAHAYAVANI -------------------------------------------------------------
add({
  url: 'sahayavani/', sub: 'sahayavani', title: 'ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು', og: 'scheme-gramaone', k: 'helpline emergency numbers 112 108 1902',
  desc: 'ತುರ್ತು ಸಹಾಯವಾಣಿ 112, ಆಂಬುಲೆನ್ಸ್ 108, ಆರೋಗ್ಯ 104, ಸರ್ಕಾರಿ ಸಹಾಯವಾಣಿ 1902 ಸೇರಿದಂತೆ ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಇಲಾಖೆಗಳ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು.',
  body: `${phero({ trail: [['', 'ಸಹಾಯವಾಣಿ']], kicker: `${ic('phone')} ಒಂದು ಕರೆ ಸಾಕು`, title: 'ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು', lead: 'ನಿಮ್ಮ ಸೇವೆಗಾಗಿ ಸರ್ಕಾರ ಸದಾ ನಿಮ್ಮೊಂದಿಗೆ. ಸಂಖ್ಯೆಯ ಮೇಲೆ ಒತ್ತಿದರೆ ನೇರ ಕರೆ.' })}
<section class="section"><div class="wrap">
  <div class="searchbar">${ic('search')}<input class="input" type="search" placeholder="ಇಲಾಖೆ ಅಥವಾ ಸಂಖ್ಯೆ ಹುಡುಕಿ" data-search-list="#lines" data-empty="#lines-empty" aria-label="ಸಹಾಯವಾಣಿ ಹುಡುಕಿ"></div>
  <div id="lines">
  ${secHead('ತುರ್ತು ಮತ್ತು ಪ್ರಮುಖ ಸಹಾಯವಾಣಿಗಳು')}
  <div class="grid g3">${D.emergencyLines.map(([n, l, i]) => `<div class="line-card" data-text="${esc(l + ' ' + n)}"><span class="ibox">${ic(i)}</span><div><b>${n.length > 6 ? n.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3') : n}</b><span>${l}</span></div><a class="btn btn-primary btn-sm" href="tel:${n}" aria-label="${esc(l)} ಕರೆ">${ic('phone')}</a></div>`).join('')}</div>
  <div id="ilakhe" style="height:30px"></div>${secHead('ಇಲಾಖಾವಾರು ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳು', 'ಕೇಂದ್ರದ ಸಹಾಯವಾಣಿ ಪೋಸ್ಟರ್‌ನಲ್ಲಿ ಪ್ರಕಟಿಸಿದ ಸಂಖ್ಯೆಗಳು. ಕರೆ ಮಾಡುವ ಮೊದಲು ಆಯಾ ಇಲಾಖೆಯ ಅಧಿಕೃತ ಜಾಲತಾಣದಲ್ಲಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುವುದು ಒಳ್ಳೆಯದು.')}
  <div class="grid g3">${D.departmentLines.map(([l, n]) => `<div class="line-card" data-text="${esc(l + ' ' + n)}"><span class="ibox">${ic('landmark')}</span><div><b style="font-size:1.05rem">${n}</b><span>${l}</span></div><a class="btn btn-ghost btn-sm" href="tel:${n.replace(/-/g, '')}" aria-label="${esc(l)} ಕರೆ">${ic('phone')}</a></div>`).join('')}</div>
  </div><p class="empty" id="lines-empty">ಯಾವುದೇ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ.</p>
  <div id="kendra" style="height:30px"></div>
  <div class="cta"><div><h2>ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ</h2><p>ಯಾವುದೇ ಮಾಹಿತಿ, ದೂರು, ಸಹಾಯಕ್ಕಾಗಿ ಸಂಪರ್ಕಿಸಿ: ${S.phones.join(' | ')}</p></div><div class="btns">${waBtn('ನಮಸ್ಕಾರ, ಸಹಾಯ ಬೇಕಿತ್ತು.', 'ವಾಟ್ಸಾಪ್', 'btn btn-gold')}<a class="btn btn-ghost" href="${tel(S.phones[0])}">${ic('phone')} ಕರೆ</a></div></div>
</div></section>`,
});

// SAMPARKA ---------------------------------------------------------------
add({
  url: 'samparka/', title: 'ಸಂಪರ್ಕಿಸಿ', theme: 'crimson', og: 'sahadesh-whiteshirt', k: 'contact phone whatsapp address',
  desc: `ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ – ಕರೆ: ${S.phones.join(', ')}. ವಾಟ್ಸಾಪ್: ${S.whatsapp}.`,
  body: `${phero({ trail: [['', 'ಸಂಪರ್ಕ']], kicker: `${ic('phone')} ಸದಾ ಸಾರ್ವಜನಿಕರ ಸೇವೆಯಲ್ಲಿ`, title: 'ಸಂಪರ್ಕಿಸಿ', lead: 'ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಮಾಹಿತಿ ಮತ್ತು ಅರ್ಜಿ ಸಲ್ಲಿಕೆಗೆ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಸಂಪರ್ಕಿಸಿ. ರಾಜ್ಯದ ಯಾವುದೇ ಜಿಲ್ಲೆಯಿಂದ ಸಂಪರ್ಕಿಸಬಹುದು.', img: 'sahadesh-whiteshirt' })}
<section class="section"><div class="wrap layout">
  <div>
    <div class="grid g2">${S.phones.map((p, i) => `<div class="line-card rv"><span class="ibox">${ic('phone')}</span><div><b>${p}</b><span>${i === 2 ? 'ಕರೆ ಮತ್ತು ವಾಟ್ಸಾಪ್' : 'ಕರೆ ಮಾಡಿ'}</span></div><a class="btn btn-primary btn-sm" href="${tel(p)}" aria-label="${p} ಕರೆ">${ic('phone')}</a></div>`).join('')}<div class="line-card rv"><span class="ibox">${ic('pin')}</span><div><b style="font-size:1.05rem">ವಿಳಾಸ</b><span>${esc(S.address)}</span></div><a class="btn btn-ghost btn-sm" href="https://www.google.com/maps/search/?api=1&query=Devanahalli" target="_blank" rel="noopener" aria-label="ನಕ್ಷೆ">${ic('external')}</a></div></div>
    <form class="box rv" style="margin-top:20px" data-wa-form="ಜಾಲತಾಣದಿಂದ ಸಂದೇಶ">
      <h2>${ic('whatsapp')} ಸಂದೇಶ ಕಳುಹಿಸಿ</h2>
      <div class="grid g2"><div class="field"><label for="c-name">ಹೆಸರು</label><input class="input" id="c-name" name="name" data-label="ಹೆಸರು" required></div><div class="field"><label for="c-place">ಊರು</label><input class="input" id="c-place" name="place" data-label="ಊರು"></div></div>
      <div class="field"><label for="c-topic">ವಿಷಯ</label><select class="input" id="c-topic" name="topic" data-label="ವಿಷಯ"><option>ಸರ್ಕಾರಿ ಯೋಜನೆ</option><option>ದಾಖಲೆ ಸೇವೆ</option><option>ಉದ್ಯೋಗ</option><option>ಆಸ್ಪತ್ರೆ / ಆರೋಗ್ಯ</option><option>ಸಾಲ ಸೌಲಭ್ಯ</option><option>ಕುಂದುಕೊರತೆ</option><option>ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಆಹ್ವಾನ</option><option>ಇತರೆ</option></select></div>
      <div class="field"><label for="c-msg">ಸಂದೇಶ</label><textarea class="input" id="c-msg" name="msg" data-label="ಸಂದೇಶ" rows="4" required></textarea></div>
      <button class="btn btn-wa" type="submit">${ic('whatsapp')} ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಕಳುಹಿಸಿ</button>
    </form>
  </div>
  <aside class="side"><div class="box"><h2>${ic('share')} ಸಾಮಾಜಿಕ ಜಾಲತಾಣ</h2>${D.social.map((s) => `<${s.url ? `a href="${s.url}" target="_blank" rel="noopener"` : 'div'} style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">${ic(s.icon)} ${s.name}: ${esc(s.handle)}</${s.url ? 'a' : 'div'}>`).join('')}</div>
  <div class="box accent"><h2>${ic('heart')} ${S.motto}</h2><p>“${esc(S.quote)}”</p><p><b>– ${S.leader}</b></p></div></aside>
</div></section>`,
});

// 404
add({ url: '404.html', file: true, title: 'ಪುಟ ಸಿಗಲಿಲ್ಲ', desc: 'ಪುಟ ಸಿಗಲಿಲ್ಲ', k: '', body: `${phero({ trail: [['', 'ಪುಟ ಸಿಗಲಿಲ್ಲ']], title: 'ಕ್ಷಮಿಸಿ, ಈ ಪುಟ ಸಿಗಲಿಲ್ಲ', lead: 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ ಅಥವಾ ಮೇಲಿನ ಹುಡುಕಾಟ ಬಳಸಿ.', extra: `<a class="btn btn-primary" href="/">${ic('home')} ಮುಖಪುಟ</a>` })}` });

// ------------------------------------------------------------------ write
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const p of pages) {
  const file = p.file ? path.join(OUT, p.url) : path.join(OUT, p.url, 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  let html = layout(p);
  if (p.file) html = html.replace(/(href|src)="(?!https?:|tel:|#|\/|data:)([^"]*)"/g, (m, a, u) => `${a}="/${u}"`).replace('data-base=""', 'data-base="/"');
  await writeFile(file, html);
}
await cp(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
await cp(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true, filter: (f) => !f.endsWith('sizes.json') });

const index = pages.filter((p) => !p.file).map((p) => ({ t: p.title, d: p.desc.slice(0, 140), u: p.url, k: p.k || '' }));
await writeFile(path.join(OUT, 'search.json'), JSON.stringify(index));
await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter((p) => !p.file).map((p) => `<url><loc>${S.url}/${p.url}</loc></url>`).join('')}</urlset>\n`);
await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${S.url}/sitemap.xml\n`);
await writeFile(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: `${S.org}, ${S.place}`, short_name: 'ಸಂಪರ್ಕ ಕೇಂದ್ರ', lang: 'kn', start_url: './', display: 'standalone', background_color: '#fffaf1', theme_color: '#0d2c6c',
  icons: [{ src: 'img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 1));
await writeFile(path.join(OUT, 'sw.js'), `// cache: ${VER}
const V = 'ssk-${VER}';
const CORE = ['./', 'assets/style.css?v=${VER}', 'assets/app.js?v=${VER}', 'search.json'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); return res; }).catch(() => caches.match(r).then((m) => m || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); } return res; })));
});
`);
// Apache (Hostinger) – long cache for static assets, gzip, clean 404
await writeFile(path.join(OUT, '.htaccess'), `ErrorDocument 404 /404.html
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/manifest+json
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType text/html "access plus 10 minutes"
</IfModule>
AddType application/manifest+json .webmanifest
`);
console.log(`${pages.length} pages -> ${OUT}`);
