// Sarah Talks, Blog data layer (Supabase REST, no external libs)
window.Blog = (function () {
  var URL = 'https://mnuhcigcfakypdiycagw.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWhjaWdjZmFreXBkaXljYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTIxMDksImV4cCI6MjA5OTM2ODEwOX0.Nz0pWjbzu47ud0kHHybg9T9z76H6ZuR-tstu-XPvFNo';
  var REST = URL + '/rest/v1/blog_posts';
  var TOKEN_KEY = 'sarah_blog_token';
  var REFRESH_KEY = 'sarah_blog_refresh';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Light, safe renderer: escapes everything, then applies a tiny markdown subset.
  function render(body) {
    var blocks = String(body || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
    var html = '', inList = false;
    function closeList() { if (inList) { html += '</ul>'; inList = false; } }
    blocks.forEach(function (blk) {
      var t = blk.trim();
      if (!t) return;
      if (/^###\s+/.test(t)) { closeList(); html += '<h3>' + inline(t.replace(/^###\s+/, '')) + '</h3>'; return; }
      if (/^##\s+/.test(t)) { closeList(); html += '<h2>' + inline(t.replace(/^##\s+/, '')) + '</h2>'; return; }
      if (/^>\s+/.test(t)) { closeList(); html += '<blockquote>' + inline(t.replace(/^>\s+/, '')) + '</blockquote>'; return; }
      if (/^(-|\*)\s+/.test(t)) {
        if (!inList) { html += '<ul>'; inList = true; }
        t.split('\n').forEach(function (li) { html += '<li>' + inline(li.replace(/^(-|\*)\s+/, '')) + '</li>'; });
        return;
      }
      closeList();
      html += '<p>' + inline(t).replace(/\n/g, '<br>') + '</p>';
    });
    closeList();
    return html;
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return s;
  }

  function headers(auth) {
    var h = { 'apikey': ANON, 'Content-Type': 'application/json' };
    var tok = auth ? (localStorage.getItem(TOKEN_KEY) || ANON) : ANON;
    h['Authorization'] = 'Bearer ' + tok;
    return h;
  }

  function list() {
    return fetch(REST + '?select=slug,title,excerpt,cover_url,tag,author_name,published_at,created_at&published=eq.true&order=published_at.desc.nullslast,created_at.desc', { headers: headers(false) })
      .then(function (r) { return r.json(); });
  }
  function get(slug) {
    return fetch(REST + '?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1', { headers: headers(false) })
      .then(function (r) { return r.json(); }).then(function (a) { return a && a[0]; });
  }

  // ---- auth (admin only) ----
  function login(email, password) {
    return fetch(URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.access_token) {
        localStorage.setItem(TOKEN_KEY, d.access_token);
        if (d.refresh_token) localStorage.setItem(REFRESH_KEY, d.refresh_token);
        return d;
      }
      throw new Error((d && (d.error_description || d.msg)) || 'Login failed');
    });
  }
  function logout() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); }
  function isLoggedIn() { return !!localStorage.getItem(TOKEN_KEY); }

  // Exchange the stored refresh token for a fresh access token. Rejects (and
  // clears the session) when the refresh token is missing or itself expired.
  function refresh() {
    var rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return Promise.reject(authError());
    return fetch(URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.access_token) {
        localStorage.setItem(TOKEN_KEY, d.access_token);
        if (d.refresh_token) localStorage.setItem(REFRESH_KEY, d.refresh_token);
        return d.access_token;
      }
      logout(); throw authError();
    });
  }
  function authError() { var e = new Error('Your session expired. Please sign in again.'); e.auth = true; return e; }

  function authHeaders(extra) {
    var tok = localStorage.getItem(TOKEN_KEY) || ANON;
    var h = { 'apikey': ANON, 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  // Authenticated fetch that transparently refreshes the token once on a 401.
  function authedFetch(url, opts) {
    opts = opts || {};
    function go() { var o = Object.assign({}, opts); o.headers = authHeaders(opts.headers); return fetch(url, o); }
    return go().then(function (r) {
      if (r.status !== 401) return r;
      return refresh().then(function () { return go(); });
    });
  }
  // Resolve the response body, but surface auth failures as a rejection so the
  // caller can send the user back to the login screen instead of showing blank.
  function authedJson(url, opts) {
    return authedFetch(url, opts).then(function (r) {
      if (r.status === 401 || r.status === 403) throw authError();
      return r.json();
    });
  }
  function authedWrite(url, opts) {
    return authedFetch(url, opts).then(function (r) {
      return r.json().then(function (b) { return { ok: r.ok, status: r.status, body: b }; });
    });
  }

  function myPosts() {
    return authedJson(REST + '?select=id,slug,title,published,published_at,created_at&order=created_at.desc');
  }
  function getForEdit(idOrSlug, bySlug) {
    var q = bySlug ? ('slug=eq.' + encodeURIComponent(idOrSlug)) : ('id=eq.' + encodeURIComponent(idOrSlug));
    return authedJson(REST + '?select=*&' + q + '&limit=1').then(function (a) { return a && a[0]; });
  }
  function create(post) {
    return authedWrite(REST, { method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(post) });
  }
  function update(id, patch) {
    return authedWrite(REST + '?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(patch) });
  }

  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70)
      || ('post-' + Date.now());
  }

  return {
    esc: esc, render: render, list: list, get: get,
    login: login, logout: logout, isLoggedIn: isLoggedIn,
    myPosts: myPosts, getForEdit: getForEdit, create: create, update: update, slugify: slugify
  };
})();
