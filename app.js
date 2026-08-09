// Sarah Talks — shared behaviour
(function () {
  var root = document.documentElement;
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function sysDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches; }
  function cur() { return root.getAttribute('data-theme') || (sysDark() ? 'dark' : 'light'); }
  function set(t) { root.setAttribute('data-theme', t); var b = document.getElementById('themeBtn'); if (b) b.innerHTML = t === 'dark' ? sun : moon; }
  set(cur());
  var btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', function () { set(cur() === 'dark' ? 'light' : 'dark'); });

  var mb = document.getElementById('menuBtn');
  if (mb) mb.addEventListener('click', function () { var n = document.getElementById('navLinks'); if (n) n.classList.toggle('open'); });

  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // Booking form -> opens an email to Kinetic with the details prefilled
  var f = document.getElementById('bookForm');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { var el = f.elements[n]; return el ? el.value.trim() : ''; };
    var subject = 'Booking inquiry — ' + (g('name') || 'New') + (g('company') ? ' (' + g('company') + ')' : '');
    var body =
      'Name: ' + g('name') + '\n' +
      'Company / Show: ' + g('company') + '\n' +
      'Email: ' + g('email') + '\n' +
      'Type: ' + g('type') + '\n' +
      'Budget: ' + g('budget') + '\n\n' +
      'Details:\n' + g('message') + '\n\n— Sent from sarahtalksreality.com';
    window.location.href = 'mailto:craig@kinetic-mgmt.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    var note = document.getElementById('formNote');
    if (note) note.style.display = 'block';
  });
})();
