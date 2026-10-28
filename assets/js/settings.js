/* Settings page (master login only). Saving locks the whole site again with
   new keys and the new logins, then commits the changed files to the GitHub
   repository in one commit. No password or token is stored anywhere. */
(function () {
  'use strict';
  var form = document.getElementById('settings-form');
  if (!form) return;
  var cfg = JSON.parse(form.getAttribute('data-config'));
  var $ = function (id) { return document.getElementById(id); };
  var te = new TextEncoder(), td = new TextDecoder();

  function b64ToBytes(s) {
    var bin = atob(s.replace(/\s+/g, '')), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function toB64(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  // Prefill the repository from the site's address (owner.github.io or owner.github.io/repo/)
  (function () {
    var h = location.hostname, seg = location.pathname.split('/').filter(Boolean);
    if (/\.github\.io$/i.test(h) && !$('gh-repo').value) {
      var owner = h.replace(/\.github\.io$/i, '');
      var repo = seg.length && !/\.html$/.test(seg[0]) ? seg[0] : h;
      $('gh-repo').value = owner + '/' + repo;
    }
  })();

  // Show / hide password buttons
  form.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]');
    if (!t) return;
    e.preventDefault();
    var inp = $(t.getAttribute('data-toggle')), show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    t.setAttribute('aria-pressed', String(show)); t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  // Field errors
  var defaults = {};
  form.querySelectorAll('.c-help[data-for]').forEach(function (h) { defaults[h.getAttribute('data-for')] = h.textContent; });
  function setErr(id, msg) {
    var f = $('fld-' + id), h = form.querySelector('.c-help[data-for="' + id + '"]');
    f.classList.add('is-error'); h.hidden = false; h.lastElementChild.textContent = msg;
  }
  function clearErr(id) {
    var f = $('fld-' + id), h = form.querySelector('.c-help[data-for="' + id + '"]');
    f.classList.remove('is-error'); h.lastElementChild.textContent = defaults[id] || ''; h.hidden = !defaults[id];
  }
  form.addEventListener('input', function (e) { if (e.target.id) clearErr(e.target.id); });

  var statusEl = $('settings-status'), btn = $('settings-save');
  function status(msg, tone) {
    statusEl.hidden = false; statusEl.textContent = msg; statusEl.setAttribute('data-tone', tone || 'info');
  }

  function validate(v) {
    var ok = true;
    ['m-user', 'm-pass', 'm-pass2', 't-user', 't-pass', 't-pass2', 'gh-repo', 'gh-token'].forEach(clearErr);
    function need(id, msg) { if (!v[id]) { setErr(id, msg); ok = false; return false; } return true; }
    need('m-user', 'Enter a username.'); need('t-user', 'Enter a username.');
    if (v['m-user'] && v['m-user'].toLowerCase() === v['t-user'].toLowerCase()) { setErr('t-user', 'Use a different username from the master login.'); ok = false; }
    [['m-pass', 'm-pass2'], ['t-pass', 't-pass2']].forEach(function (p) {
      if (need(p[0], 'Enter a password.')) {
        if (v[p[0]].length < 8) { setErr(p[0], 'Use at least 8 characters.'); ok = false; }
        else if (v[p[0]] !== v[p[1]]) { setErr(p[1], 'The passwords don’t match.'); ok = false; }
      }
    });
    if (v['m-pass'] && v['m-pass'] === v['t-pass']) { setErr('t-pass', 'Use a different password from the master login.'); ok = false; }
    if (need('gh-repo', 'Enter the repository.') && !/^[\w.-]+\/[\w.-]+$/.test(v['gh-repo'])) { setErr('gh-repo', 'Use the form organization/repository.'); ok = false; }
    need('gh-token', 'Paste a GitHub access token.');
    return ok;
  }

  function aes(raw, usage) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [usage]); }
  function enc(key, bytes) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) {
      var out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12); return out;
    });
  }
  function dec(key, bytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)).then(function (b) { return new Uint8Array(b); });
  }
  function derive(user, pass, salt, iter) {
    return crypto.subtle.importKey('raw', te.encode(user.trim().toLowerCase() + ':' + pass), 'PBKDF2', false, ['deriveKey']).then(function (km) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    });
  }
  function fetchOk(url, how) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) { var e = new Error('site'); e.url = url; throw e; }
      return how === 'text' ? r.text() : r.arrayBuffer();
    });
  }

  function gh(repo, token, method, path, body) {
    var headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/' + repo + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        if (r.ok) return r.status === 204 ? null : r.json();
        return r.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error('github'); e.status = r.status; e.detail = j.message || ''; throw e;
        });
      });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var v = {};
    ['m-user', 'm-pass', 'm-pass2', 't-user', 't-pass', 't-pass2', 'gh-repo', 'gh-token'].forEach(function (id) {
      v[id] = /pass|token/.test(id) ? $(id).value : $(id).value.trim();
    });
    if (!validate(v)) { status('Check the highlighted fields.', 'error'); return; }
    var oldRaw = ls('ak-ds-session'), oldMRaw = ls('ak-ds-master');
    if (!oldRaw || !oldMRaw) { status('Your sign-in has ended. Sign in with the master login and try again.', 'error'); return; }

    btn.disabled = true;
    var repo = v['gh-repo'], token = v['gh-token'], branch = 'main';
    try {
      status('Locking the site with the new logins…');
      var oldK = await aes(b64ToBytes(oldRaw), 'decrypt'), oldM = await aes(b64ToBytes(oldMRaw), 'decrypt');
      var kRaw = crypto.getRandomValues(new Uint8Array(32)), mRaw = crypto.getRandomValues(new Uint8Array(32));
      var newK = await aes(kRaw, 'encrypt'), newM = await aes(mRaw, 'encrypt');
      var files = [];

      for (var i = 0; i < cfg.pages.length; i++) {
        var page = cfg.pages[i], html = await fetchOk(page, 'text');
        var m = html.match(/(<script id="payload"([^>]*)>)([^<]*)(<\/script>)/);
        if (!m) throw new Error('payload');
        var master = /data-key="master"/.test(m[2]);
        var plain = await dec(master ? oldM : oldK, b64ToBytes(m[3]));
        if (page === 'settings.html') {
          // keep the usernames shown on this page in step with the new logins
          var t = td.decode(plain)
            .replace(/(<input id="m-user" value=")[^"]*"/, '$1' + escAttr(v['m-user']) + '"')
            .replace(/(<input id="t-user" value=")[^"]*"/, '$1' + escAttr(v['t-user']) + '"');
          plain = te.encode(t);
        }
        var sealed = toB64(await enc(master ? newM : newK, plain));
        files.push({ path: page, bytes: te.encode(html.replace(m[0], m[1] + sealed + m[4])) });
      }
      for (var j = 0; j < cfg.downloads.length; j++) {
        var name = 'downloads/' + cfg.downloads[j] + '.enc';
        var data = new Uint8Array(await fetchOk(name));
        files.push({ path: name, bytes: await enc(newK, await dec(oldK, data)) });
      }
      var salt = crypto.getRandomValues(new Uint8Array(16)), iter = cfg.iterations;
      var mk = await derive(v['m-user'], v['m-pass'], salt, iter), tk = await derive(v['t-user'], v['t-pass'], salt, iter);
      var auth = { salt: toB64(salt), iterations: iter, users: [
        { k: toB64(await enc(mk, kRaw)), m: toB64(await enc(mk, mRaw)) },
        { k: toB64(await enc(tk, kRaw)) }
      ] };
      files.push({ path: 'auth.json', bytes: te.encode(JSON.stringify(auth, null, 1)) });

      status('Saving ' + files.length + ' files to GitHub…');
      var ref = await gh(repo, token, 'GET', '/git/ref/heads/' + branch);
      var base = ref.object.sha;
      var commit = await gh(repo, token, 'GET', '/git/commits/' + base);
      var tree = [];
      for (var k = 0; k < files.length; k++) {
        var blob = await gh(repo, token, 'POST', '/git/blobs', { content: toB64(files[k].bytes), encoding: 'base64' });
        tree.push({ path: files[k].path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      var newTree = await gh(repo, token, 'POST', '/git/trees', { base_tree: commit.tree.sha, tree: tree });
      var newCommit = await gh(repo, token, 'POST', '/git/commits', { message: 'Change site logins', tree: newTree.sha, parents: [base] });
      await gh(repo, token, 'PATCH', '/git/refs/heads/' + branch, { sha: newCommit.sha });

      ['m-pass', 'm-pass2', 't-pass', 't-pass2', 'gh-token'].forEach(function (id) { $(id).value = ''; });
      status('Saved. In 1–2 minutes the site switches to the new logins and everyone, including you, has to sign in again. ' +
             'Share the new team login with your team. You can delete the GitHub token now.', 'success');
    } catch (err) {
      var msg;
      if (err.message === 'github') {
        if (err.status === 401) msg = 'GitHub didn’t accept the token. Check you copied all of it and that it hasn’t expired.';
        else if (err.status === 403 || err.status === 404) msg = 'The token can’t update ' + repo + '. Check the repository name, and give the token Contents: Read and write on that repository.';
        else msg = 'GitHub refused the change' + (err.detail ? ' (' + err.detail + ')' : '') + '. Reload the page and try again.';
      } else if (err.message === 'site') {
        msg = 'Couldn’t read ' + err.url + ' from the site. Reload the page and try again.';
      } else if (err.name === 'OperationError' || err.message === 'payload') {
        msg = 'This page is out of date with the site. Sign out, sign in with the master login and try again.';
      } else if (err instanceof TypeError) {
        msg = 'Couldn’t reach GitHub. Check your connection and try again.';
      } else {
        msg = 'Something went wrong (' + err.message + ').';
      }
      status(msg + ' The site has not changed.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
