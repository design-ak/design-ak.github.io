/* Design system site — interactions. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function store(key, val) {
    try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {}
  }
  function resolved() { return root.getAttribute('data-theme') || (mq && mq.matches ? 'dark' : 'light'); }
  function syncTheme() {
    root.setAttribute('data-theme-resolved', resolved());
    document.querySelectorAll('.mode-switch').forEach(function (sw) {
      var tgt = sw.hasAttribute('data-target') ? document.querySelector(sw.getAttribute('data-target')) : sw.closest('.demo');
      if (tgt && !tgt.hasAttribute('data-theme')) markMode(sw, resolved());
    });
  }
  function markMode(sw, mode) {
    sw.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === mode)); });
  }

  /* ---- Toast ---- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1600);
  }
  function copyText(text, label) {
    function done() { toast(label ? 'Copied ' + label : 'Copied'); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Press Ctrl+C to copy'); }
      document.body.removeChild(ta);
    }
  }

  /* ---- Stage overlays (dialogs and sheets) ---- */
  function openOverlay(el) {
    var stage = el.closest('.stage'); if (!stage) return;
    closeAll(stage);
    el.classList.add('is-open'); stage.classList.add('has-overlay');
    el._opener = document.activeElement;
    var focusable = el.querySelector('input, button:not([disabled])');
    if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 60);
  }
  function closeOverlay(el) {
    if (!el || !el.classList.contains('is-open')) return;
    el.classList.remove('is-open');
    var stage = el.closest('.stage'); if (stage) stage.classList.remove('has-overlay');
    if (el._opener && el._opener.focus) el._opener.focus({ preventScroll: true });
  }
  function closeAll(stage) { stage.querySelectorAll('.c-dialog.is-open, .c-sheet.is-open').forEach(closeOverlay); }

  /* ---- Selection sheets ---- */
  function updateMulti(sheet) {
    var n = sheet.querySelectorAll('[role="checkbox"][aria-checked="true"]').length;
    var apply = sheet.querySelector('[data-apply]'); var clear = sheet.querySelector('[data-clear]');
    if (apply) { apply.disabled = n === 0; }
    if (clear) clear.hidden = n === 0;
  }
  function filterSheet(input) {
    var sheet = input.closest('.c-sheet'); var q = input.value.trim().toLowerCase(); var shown = 0;
    sheet.querySelectorAll('.c-option').forEach(function (o) {
      var hit = o.textContent.toLowerCase().indexOf(q) !== -1; o.hidden = !hit; if (hit) shown++;
    });
    var empty = sheet.querySelector('.c-sheet-empty'); if (empty) empty.hidden = shown !== 0;
  }

  /* ---- Hero phone language ---- */
  var I18N = {
    en: { events: 'Events', upcoming: 'Upcoming', live: 'Live', past: 'Past', liveNow: 'Live now', satsang: 'Sunday Satsang',
      satsangWhen: 'Sun, 25 Oct, 7:00 PM', hall: 'Adalaj Hall', mark: 'Mark attendance', registered: 'Registered', youth: 'Youth meet',
      youthWhen: 'Sat, 31 Oct, 5:00 PM', details: 'View details', pending: 'Pending', seva: 'Seva volunteers', sevaNote: 'Waiting for approval',
      search: 'Search events', marked: 'Attendance marked', markedBody: 'You are checked in for Sunday Satsang.', done: 'Done', attendees: '128 attending' },
    gu: { events: 'કાર્યક્રમો', upcoming: 'આગામી', live: 'લાઇવ', past: 'પૂર્ણ', liveNow: 'હમણાં લાઇવ', satsang: 'રવિવાર સત્સંગ',
      satsangWhen: 'રવિ, 25 ઑક્ટો, સાંજે 7:00', hall: 'અડાલજ હોલ', mark: 'હાજરી પૂરો', registered: 'નોંધાયેલ', youth: 'યુવા સભા',
      youthWhen: 'શનિ, 31 ઑક્ટો, સાંજે 5:00', details: 'વિગતો જુઓ', pending: 'બાકી', seva: 'સેવા સ્વયંસેવકો', sevaNote: 'મંજૂરીની રાહ',
      search: 'કાર્યક્રમ શોધો', marked: 'હાજરી નોંધાઈ', markedBody: 'રવિવાર સત્સંગ માટે તમારી હાજરી નોંધાઈ ગઈ છે.', done: 'બરાબર', attendees: '128 હાજર' },
    hi: { events: 'कार्यक्रम', upcoming: 'आगामी', live: 'लाइव', past: 'पिछले', liveNow: 'अभी लाइव', satsang: 'रविवार सत्संग',
      satsangWhen: 'रवि, 25 अक्टू, शाम 7:00', hall: 'अडालज हॉल', mark: 'उपस्थिति दर्ज करें', registered: 'पंजीकृत', youth: 'युवा सभा',
      youthWhen: 'शनि, 31 अक्टू, शाम 5:00', details: 'विवरण देखें', pending: 'लंबित', seva: 'सेवा स्वयंसेवक', sevaNote: 'स्वीकृति की प्रतीक्षा',
      search: 'कार्यक्रम खोजें', marked: 'उपस्थिति दर्ज हुई', markedBody: 'रविवार सत्संग के लिए आपकी उपस्थिति दर्ज हो गई है।', done: 'ठीक है', attendees: '128 उपस्थित' }
  };
  function setLang(scope, lang) {
    var dict = I18N[lang] || I18N.en;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = dict[el.getAttribute('data-i18n')]; if (v != null) el.textContent = v;
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = dict[el.getAttribute('data-i18n-ph')] || ''; });
    scope.setAttribute('lang', lang);
  }

  /* ---- Click handling ---- */
  document.addEventListener('click', function (e) {
    var t = e.target;

    var themeBtn = t.closest('.theme-btn');
    if (themeBtn) {
      var next = resolved() === 'dark' ? 'light' : 'dark';
      var sys = mq && mq.matches ? 'dark' : 'light';
      if (next === sys) { root.removeAttribute('data-theme'); store('ds-theme', null); }
      else { root.setAttribute('data-theme', next); store('ds-theme', next); }
      syncTheme(); return;
    }

    var menu = t.closest('.menu-btn');
    if (menu) { var open = document.body.classList.toggle('nav-open'); menu.setAttribute('aria-expanded', String(open)); return; }
    if (t.closest('.nav-scrim') || (document.body.classList.contains('nav-open') && t.closest('.sidebar a'))) {
      document.body.classList.remove('nav-open'); var mb = document.querySelector('.menu-btn'); if (mb) mb.setAttribute('aria-expanded', 'false');
    }

    var modeBtn = t.closest('.mode-switch [data-mode]');
    if (modeBtn) {
      var sw = modeBtn.closest('.mode-switch'); var target = sw.closest('[data-mode-target]') || sw.closest('.demo');
      if (sw.hasAttribute('data-target')) target = document.querySelector(sw.getAttribute('data-target'));
      target.setAttribute('data-theme', modeBtn.getAttribute('data-mode')); markMode(sw, modeBtn.getAttribute('data-mode')); return;
    }

    var langBtn = t.closest('[data-lang]');
    if (langBtn) {
      var ls = langBtn.closest('[role="tablist"]'); var scope = document.querySelector(ls.getAttribute('data-target'));
      ls.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-selected', String(b === langBtn)); });
      setLang(scope, langBtn.getAttribute('data-lang')); return;
    }

    var tab = t.closest('[role="tab"]');
    if (tab) {
      var list = tab.closest('[role="tablist"]');
      list.querySelectorAll('[role="tab"]').forEach(function (b) {
        var on = b === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
        var pid = b.getAttribute('aria-controls'); if (pid) { var p = document.getElementById(pid); if (p) p.hidden = !on; }
      });
      return;
    }

    var copy = t.closest('[data-copy]');
    if (copy) { copyText(copy.getAttribute('data-copy'), copy.getAttribute('data-copy-label')); return; }
    var codeCopy = t.closest('.code .copy-btn');
    if (codeCopy) { copyText(codeCopy.closest('.code').querySelector('pre').innerText.replace(/\n$/, '')); return; }

    var opener = t.closest('[data-open]');
    if (opener) { var el = document.getElementById(opener.getAttribute('data-open')); if (el) openOverlay(el); return; }

    if (t.closest('[data-close]')) { closeOverlay(t.closest('.c-dialog, .c-sheet')); return; }
    if (t.classList.contains('scrim')) { closeAll(t.closest('.stage')); return; }

    var opt = t.closest('.c-option');
    if (opt) {
      var sheet = opt.closest('.c-sheet'); var role = opt.getAttribute('role');
      if (role === 'radio') {
        var group = opt.closest('[role="radiogroup"]');
        group.querySelectorAll('[role="radio"]').forEach(function (o) { o.setAttribute('aria-checked', String(o === opt)); });
        if (sheet) {
          var out = document.querySelector('[data-value-for="' + sheet.id + '"]');
          if (out) { out.value = opt.textContent.trim(); out.dispatchEvent(new Event('change')); }
          setTimeout(function () { closeOverlay(sheet); }, 160);
        }
      } else if (role === 'checkbox') {
        opt.setAttribute('aria-checked', String(opt.getAttribute('aria-checked') !== 'true'));
        if (sheet) updateMulti(sheet);
      }
      return;
    }

    var clear = t.closest('[data-clear]');
    if (clear) { var s1 = clear.closest('.c-sheet'); s1.querySelectorAll('[role="checkbox"]').forEach(function (o) { o.setAttribute('aria-checked', 'false'); }); updateMulti(s1); return; }

    var apply = t.closest('[data-apply]');
    if (apply) {
      var s2 = apply.closest('.c-sheet');
      var picked = Array.prototype.map.call(s2.querySelectorAll('[role="checkbox"][aria-checked="true"]'), function (o) { return o.textContent.trim(); });
      var out2 = document.querySelector('[data-value-for="' + s2.id + '"]');
      if (out2) out2.value = picked.join(', ');
      closeOverlay(s2); return;
    }

    var badgeToggle = t.closest('[data-toggle-icons]');
    if (badgeToggle) {
      var on = badgeToggle.getAttribute('aria-checked') !== 'true';
      badgeToggle.setAttribute('aria-checked', String(on));
      document.getElementById(badgeToggle.getAttribute('data-toggle-icons')).classList.toggle('badges-plain', !on); return;
    }
  });

  document.addEventListener('input', function (e) { if (e.target.matches('[data-filter]')) filterSheet(e.target); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.stage.has-overlay').forEach(closeAll);
      document.body.classList.remove('nav-open');
    }
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var tabs = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      var i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
      var next = tabs[(i + tabs.length) % tabs.length]; next.focus(); next.click(); e.preventDefault();
    }
  });

  /* ---- Highlight the section in view ---- */
  var subLinks = document.querySelectorAll('.nav-sub a');
  if ('IntersectionObserver' in window && subLinks.length) {
    var map = {};
    subLinks.forEach(function (a) { map[a.getAttribute('href').split('#')[1]] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          subLinks.forEach(function (a) { a.classList.remove('is-active'); });
          map[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  if (mq) { (mq.addEventListener ? mq.addEventListener('change', syncTheme) : mq.addListener(syncTheme)); }
  document.querySelectorAll('.c-sheet').forEach(function (s) { if (s.querySelector('[data-apply]')) updateMulti(s); });
  syncTheme();
})();
