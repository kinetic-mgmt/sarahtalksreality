// Sarah Talks, shared behaviour
(function () {
  var root = document.documentElement;
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  // Default: follow the device's own light/dark setting (CSS @media drives it, no data-theme pinned).
  // Manual toggle overrides for the session; until then we live-follow the OS.
  var userSet = false;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme:dark)') : null;
  function sysDark() { return mq ? mq.matches : false; }
  function effective() { return root.getAttribute('data-theme') || (sysDark() ? 'dark' : 'light'); }
  function icon() { var b = document.getElementById('themeBtn'); if (b) b.innerHTML = effective() === 'dark' ? sun : moon; }
  icon();
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (!userSet) icon(); });
  var btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', function () {
    userSet = true;
    root.setAttribute('data-theme', effective() === 'dark' ? 'light' : 'dark');
    icon();
  });

  var mb = document.getElementById('menuBtn');
  if (mb) mb.addEventListener('click', function () { var n = document.getElementById('navLinks'); if (n) n.classList.toggle('open'); });

  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // Booking form -> posts to the Supabase "booking" function, which emails Kinetic.
  var BOOKING_URL = 'https://mnuhcigcfakypdiycagw.supabase.co/functions/v1/booking';
  var f = document.getElementById('bookForm');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { var el = f.elements[n]; return el ? el.value.trim() : ''; };
    var note = document.getElementById('formNote');
    var submit = f.querySelector('button[type="submit"]');
    var restore = submit ? submit.innerHTML : '';
    function say(msg, ok) {
      if (!note) return;
      note.style.display = 'block';
      note.textContent = msg;
      note.style.color = ok ? 'var(--sage)' : 'var(--rasp)';
    }
    if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

    fetch(BOOKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: g('name'), company: g('company'), email: g('email'),
        type: g('type'), budget: g('budget'), message: g('message'),
        website: g('website') // honeypot
      })
    })
    .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
    .then(function (d) {
      if (d && d.ok) {
        f.reset();
        say("Thanks, your inquiry is on its way to Kinetic Management. We'll be in touch soon.", true);
        if (submit) { submit.disabled = false; submit.textContent = 'Sent ✓'; }
      } else {
        say((d && d.error) || 'Something went wrong, please email craig@kinetic-mgmt.com directly.', false);
        if (submit) { submit.disabled = false; submit.innerHTML = restore; }
      }
    })
    .catch(function () {
      say('Could not send, please email craig@kinetic-mgmt.com directly.', false);
      if (submit) { submit.disabled = false; submit.innerHTML = restore; }
    });
  });

  // Tour city-request form -> inserts straight into Supabase (tour_requests table).
  var TOUR_URL = 'https://mnuhcigcfakypdiycagw.supabase.co/rest/v1/tour_requests';
  var TOUR_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWhjaWdjZmFreXBkaXljYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTIxMDksImV4cCI6MjA5OTM2ODEwOX0.Nz0pWjbzu47ud0kHHybg9T9z76H6ZuR-tstu-XPvFNo';
  var tf = document.getElementById('tourForm');
  if (tf) tf.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { var el = tf.elements[n]; return el ? el.value.trim() : ''; };
    var note = document.getElementById('tourNote');
    var submit = tf.querySelector('button[type="submit"]');
    var restore = submit ? submit.innerHTML : '';
    function say(msg, ok) {
      if (!note) return;
      note.style.display = 'block';
      note.textContent = msg;
      note.style.color = ok ? 'var(--sage)' : 'var(--rasp)';
    }
    if (g('website')) return;            // honeypot: silently drop bots
    if (!g('city')) { say('Add a city first.', false); return; }
    if (submit) { submit.disabled = true; submit.textContent = 'Adding…'; }

    fetch(TOUR_URL, {
      method: 'POST',
      headers: {
        'apikey': TOUR_ANON, 'Authorization': 'Bearer ' + TOUR_ANON,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        city: g('city'), region: g('region') || null,
        name: g('name') || null, email: g('email') || null, note: g('note') || null
      })
    })
    .then(function (r) {
      if (r.ok) {
        tf.reset();
        say('Got it! Your city is on the list. The more people who ask, the higher it climbs.', true);
        if (submit) { submit.disabled = false; submit.textContent = 'Added ✓'; }
      } else {
        say('Something went wrong. Try again, or email sarah@sarahtalks.tv.', false);
        if (submit) { submit.disabled = false; submit.innerHTML = restore; }
      }
    })
    .catch(function () {
      say('Could not send. Try again, or email sarah@sarahtalks.tv.', false);
      if (submit) { submit.disabled = false; submit.innerHTML = restore; }
    });
  });
})();
