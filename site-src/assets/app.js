/* ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ — live behaviour (no libraries) */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var BASE = doc.getAttribute('data-base') || '';
  var WA = doc.getAttribute('data-wa') || '';
  var MONTHS = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];
  var DAYS = ['ಭಾನುವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function parse(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayDiff(iso) { return Math.round((parse(iso) - today()) / 86400000); }
  function kDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  // Today's date in Kannada
  $$('[data-today]').forEach(function (el) {
    var d = new Date();
    el.textContent = el.getAttribute('data-today') === 'short' ? kDate(d) : DAYS[d.getDay()] + ', ' + kDate(d);
  });

  // Application deadlines: open / closing soon / closed
  $$('[data-deadline]').forEach(function (el) {
    var n = dayDiff(el.getAttribute('data-deadline')), t, c;
    if (n < 0) { t = 'ಅರ್ಜಿ ಅವಧಿ ಮುಕ್ತಾಯವಾಗಿದೆ'; c = 'off'; }
    else if (n === 0) { t = 'ಇಂದೇ ಕೊನೆಯ ದಿನ!'; c = 'hot'; }
    else if (n === 1) { t = 'ನಾಳೆ ಕೊನೆಯ ದಿನ'; c = 'hot'; }
    else if (n <= 7) { t = 'ಇನ್ನು ' + n + ' ದಿನ ಮಾತ್ರ'; c = 'warn'; }
    else { t = 'ಅರ್ಜಿ ಸ್ವೀಕಾರ – ಇನ್ನು ' + n + ' ದಿನ'; c = 'ok'; }
    el.textContent = t; el.className = 'chip ' + c;
  });

  // Windows such as the life-certificate period
  $$('[data-window-from]').forEach(function (el) {
    var a = dayDiff(el.getAttribute('data-window-from')), b = dayDiff(el.getAttribute('data-window-to')), t, c;
    if (a > 0) { t = a === 1 ? 'ನಾಳೆಯಿಂದ ಆರಂಭ' : 'ಇನ್ನು ' + a + ' ದಿನಗಳಲ್ಲಿ ಆರಂಭ'; c = 'warn'; }
    else if (b >= 0) { t = 'ಈಗ ಸಲ್ಲಿಸಬಹುದು – ಇನ್ನು ' + (b + 1) + ' ದಿನ'; c = b <= 7 ? 'hot' : 'ok'; }
    else { t = 'ಈ ವರ್ಷದ ಅವಧಿ ಮುಗಿದಿದೆ'; c = 'off'; }
    el.textContent = t; el.className = 'chip ' + c;
  });

  // Event dates: today / tomorrow / in n days / held
  $$('[data-event]').forEach(function (el) {
    var n = dayDiff(el.getAttribute('data-event')), t, c;
    if (n === 0) { t = 'ಇಂದು'; c = 'hot'; }
    else if (n === 1) { t = 'ನಾಳೆ'; c = 'hot'; }
    else if (n > 1) { t = 'ಇನ್ನು ' + n + ' ದಿನಗಳಲ್ಲಿ'; c = 'warn'; }
    else { t = 'ನಡೆದಿದೆ'; c = 'off'; }
    el.textContent = t; el.className = 'chip ' + c;
  });
  // Hide past items from "upcoming" lists, keep at least one
  $$('[data-upcoming-list]').forEach(function (list) {
    var items = $$('[data-until]', list), shown = 0, max = +(list.getAttribute('data-upcoming-list') || 99);
    items.forEach(function (it) {
      var past = dayDiff(it.getAttribute('data-until')) < 0;
      it.hidden = past || shown >= max; if (!it.hidden) shown++;
    });
    if (!shown && items.length) items[items.length - 1].hidden = false;
  });

  // Seasonal greeting
  $$('.greet[data-from]').forEach(function (g) {
    if (dayDiff(g.getAttribute('data-from')) <= 0 && dayDiff(g.getAttribute('data-to')) >= 0) g.classList.add('show');
  });

  // Rotating words in the hero
  var rot = $('[data-rotate]');
  if (rot) {
    var words = rot.getAttribute('data-rotate').split('|'), wi = 0, b = $('b', rot);
    setInterval(function () { wi = (wi + 1) % words.length; b.textContent = words[wi]; }, 2400);
  }

  // Count-up numbers
  var fmt = function (n) { return n.toLocaleString('en-IN'); };
  function countUp(el) {
    var end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = null;
    if (!end) return;
    var done = function () { el.textContent = fmt(end) + suf; };
    if (document.hidden) return done();
    setTimeout(done, 1700); // rAF is paused in background tabs; never leave a half-counted number
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1400); el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3)))) + suf; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  // Reveal on scroll + counters
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(countUp);
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv, [data-count]').forEach(function (el) { io.observe(el); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }

  // Drawer menu
  var drawer = $('#drawer');
  $$('[data-open-menu]').forEach(function (b) { b.addEventListener('click', function () { drawer.classList.add('open'); drawer.querySelector('a').focus(); }); });
  $$('[data-close-menu]').forEach(function (b) { b.addEventListener('click', function () { drawer.classList.remove('open'); }); });

  // Back to top
  var top = $('.d-top');
  if (top) {
    window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 700); }, { passive: true });
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // Share
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); }
      else { window.open('https://wa.me/?text=' + encodeURIComponent(document.title + ' ' + location.href), '_blank', 'noopener'); }
    });
  });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // Filter chips (schemes, helplines)
  $$('[data-filter-group]').forEach(function (group) {
    var target = $(group.getAttribute('data-filter-group'));
    $$('button', group).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('button', group).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        var tag = btn.getAttribute('data-tag');
        $$('[data-tags]', target).forEach(function (card) {
          card.hidden = !(tag === 'all' || (' ' + card.getAttribute('data-tags') + ' ').indexOf(' ' + tag + ' ') > -1);
        });
      });
    });
  });

  // Live text search within a list
  $$('[data-search-list]').forEach(function (input) {
    var list = $(input.getAttribute('data-search-list')), empty = $(input.getAttribute('data-empty'));
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), any = false;
      $$('[data-text]', list).forEach(function (row) {
        var hit = !q || row.getAttribute('data-text').toLowerCase().indexOf(q) > -1;
        row.hidden = !hit; if (hit) any = true;
      });
      if (empty) empty.style.display = any ? 'none' : 'block';
    });
  });

  // Document checklists (remembered on this device)
  $$('[data-checklist]').forEach(function (list) {
    var key = 'chk:' + list.getAttribute('data-checklist'), saved = store(key) || [], boxes = $$('input', list);
    var bar = $('.progress i', list.parentNode), label = $('[data-progress-label]', list.parentNode);
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      if (bar) bar.style.width = (100 * done / boxes.length) + '%';
      if (label) label.textContent = done + ' / ' + boxes.length + ' ದಾಖಲೆಗಳು ಸಿದ್ಧ';
      store(key, boxes.map(function (b) { return b.checked; }));
    }
    boxes.forEach(function (b, i) { b.checked = !!saved[i]; b.addEventListener('change', update); });
    update();
  });

  // WhatsApp forms: compose a message, open WhatsApp. Nothing is stored or sent elsewhere.
  $$('form[data-wa-form]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var lines = [form.getAttribute('data-wa-form')];
      $$('[name]', form).forEach(function (f) {
        if ((f.type === 'radio' || f.type === 'checkbox') && !f.checked) return;
        if (f.value.trim()) lines.push((f.getAttribute('data-label') || f.name) + ': ' + f.value.trim());
      });
      window.open('https://wa.me/91' + WA + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });
  });

  // Eligibility finder
  var finder = $('#finder');
  if (finder) {
    var rules = JSON.parse($('#finder-rules').textContent);
    var out = $('#finder-results'), count = $('#finder-count');
    var run = function () {
      var picked = {};
      $$('input:checked', finder).forEach(function (i) { picked[i.value] = true; });
      var hits = rules.filter(function (r) {
        return r.any.some(function (t) { return picked[t]; }) && !(r.not || []).some(function (t) { return picked[t]; });
      });
      out.innerHTML = hits.map(function (r) {
        return '<a class="result" href="' + BASE + r.url + '"><div><b>' + r.name + '</b><small>' + r.why + '</small></div><svg class="ic"><use href="#i-arrow"/></svg></a>';
      }).join('') || '<p class="lead">ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಮೇಲೆ ಆಯ್ಕೆ ಮಾಡಿ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗೆ ವಾಟ್ಸಾಪ್ ಮಾಡಿ.</p>';
      count.textContent = hits.length ? hits.length + ' ಸೌಲಭ್ಯಗಳು ನಿಮಗೆ ಸೂಕ್ತವಾಗಬಹುದು' : '';
    };
    finder.addEventListener('change', run); run();
  }

  // Gallery lightbox
  var lb = $('#lightbox');
  if (lb) {
    var links = $$('[data-lb]'), idx = 0, img = $('img', lb), cap = $('.lb-cap', lb);
    var show = function (i) { idx = (i + links.length) % links.length; img.src = links[idx].getAttribute('href'); img.alt = links[idx].getAttribute('data-lb'); cap.textContent = links[idx].getAttribute('data-lb'); lb.classList.add('open'); };
    links.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); show(i); }); });
    $('.lb-close', lb).addEventListener('click', function () { lb.classList.remove('open'); });
    $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Site-wide search (index loaded on first use)
  var sd = $('#search'), sIndex = null;
  function openSearch() {
    sd.classList.add('open'); var inp = $('input', sd); inp.focus();
    if (!sIndex) fetch(BASE + 'search.json').then(function (r) { return r.json(); }).then(function (j) { sIndex = j; doSearch(); }).catch(function () { sIndex = []; });
  }
  function doSearch() {
    var q = $('input', sd).value.trim().toLowerCase(), res = $('.sres', sd);
    if (!sIndex) return;
    var hits = !q ? sIndex.slice(0, 8) : sIndex.filter(function (e) { return (e.t + ' ' + e.d + ' ' + e.k).toLowerCase().indexOf(q) > -1; }).slice(0, 30);
    res.innerHTML = hits.map(function (e) { return '<a href="' + BASE + e.u + '"><b>' + e.t + '</b><small>' + e.d + '</small></a>'; }).join('') || '<p class="lead">ಯಾವುದೇ ಫಲಿತಾಂಶ ಸಿಗಲಿಲ್ಲ. ಬೇರೆ ಪದ ಪ್ರಯತ್ನಿಸಿ (ಉದಾ: ಆಧಾರ್, ಪಿಂಚಣಿ, ಉದ್ಯೋಗ).</p>';
  }
  if (sd) {
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
    $('input', sd).addEventListener('input', doSearch);
    sd.addEventListener('click', function (e) { if (e.target === sd || e.target.closest('[data-close-search]')) sd.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { sd.classList.remove('open'); if (drawer) drawer.classList.remove('open'); }
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    });
  }

  // Offline support / instant repeat visits
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(BASE + 'sw.js').catch(function () {}); });
  }
})();
