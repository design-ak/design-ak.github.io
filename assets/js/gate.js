/* Unlocks a page with the key saved at sign-in. Page content and downloads are
   AES-GCM encrypted at build time; without the right username and password they
   can't be read, even straight from the repository. */
(function () {
  'use strict';
  var KEY = 'ak-ds-session', MKEY = 'ak-ds-master';

  function b64ToBytes(s) {
    var bin = atob(s.replace(/\s+/g, '')), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function stored(k) { try { return localStorage.getItem(k || KEY); } catch (e) { return null; } }
  function clear() { try { localStorage.removeItem(KEY); localStorage.removeItem(MKEY); } catch (e) {} }
  function here() { return (location.pathname.split('/').pop() || 'index.html') + location.hash; }
  function toLogin() { location.replace('login.html?next=' + encodeURIComponent(here())); }

  var keys = {};
  function getKey(which) {
    which = which || KEY;
    if (!keys[which]) {
      var raw = stored(which);
      if (!raw) return Promise.reject(new Error('signed out'));
      try { keys[which] = crypto.subtle.importKey('raw', b64ToBytes(raw), { name: 'AES-GCM' }, false, ['decrypt']); }
      catch (e) { return Promise.reject(e); }  // a damaged saved sign-in: treat as signed out
    }
    return keys[which];
  }
  function decrypt(bytes, which) {
    return getKey(which).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, k, bytes.slice(12));
    });
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast is-on'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  if (!window.crypto || !crypto.subtle) {
    document.getElementById('app').innerHTML = '<p class="gate-msg">Open this site over https in an up-to-date browser to view it.</p>';
    return;
  }
  if (!stored()) { toLogin(); return; }

  var payload = document.getElementById('payload');
  var which = payload.getAttribute('data-key') === 'master' ? MKEY : KEY;
  if (which === MKEY && !stored(MKEY)) { location.replace('index.html'); return; }
  function fresh() {
    // a cached copy may be from before the logins changed: fetch the page again before giving up
    return fetch(location.pathname, { cache: 'reload' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/<script id="payload"[^>]*>([^<]*)<\/script>/);
      if (!m) throw new Error('no payload');
      return decrypt(b64ToBytes(m[1]), which);
    });
  }
  Promise.resolve().then(function () { return decrypt(b64ToBytes(payload.textContent), which); }).catch(fresh).then(function (buf) {
    var app = document.getElementById('app');
    app.insertAdjacentHTML('beforebegin', new TextDecoder().decode(buf));
    app.remove(); payload.remove();
    if (stored(MKEY)) document.querySelectorAll('[data-master-only]').forEach(function (el) { el.hidden = false; });
    var s = document.createElement('script'); s.src = 'assets/js/site.js'; document.body.appendChild(s);
    if (which === MKEY) { var t = document.createElement('script'); t.src = 'assets/js/settings.js'; document.body.appendChild(t); }
    if (location.hash) {
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) el.scrollIntoView();
    }
  }).catch(function () { clear(); toLogin(); });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-signout]')) { e.preventDefault(); clear(); location.replace('login.html'); return; }
    var f = e.target.closest('[data-file]');
    if (!f) return;
    e.preventDefault();
    var name = f.getAttribute('data-file'), mime = f.getAttribute('data-mime') || 'application/octet-stream';
    var view = f.getAttribute('data-action') === 'view';
    var win = view ? window.open('', '_blank') : null;
    fetch('downloads/' + name + '.enc', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('missing');
      return r.arrayBuffer();
    }).then(function (b) { return decrypt(new Uint8Array(b)); }).then(function (buf) {
      var url = URL.createObjectURL(new Blob([buf], { type: mime }));
      if (win) { win.location.href = url; }
      else {
        var a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function () {
      if (win) win.close();
      toast('Couldn’t open ' + name + '. Reload the page and try again.');
    });
  });
})();
