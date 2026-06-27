/* ── SVG icon helper ── */
function ico(name, size) {
  size = size || 16;
  const p = {
    'grid':           `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
    'bell':           `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
    'users':          `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    'user':           `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    'dollar-sign':    `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    'megaphone':      `<path d="M3 11v2"/><path d="M11.6 3.8L6 8H2v8h4l5.6 4.2"/><path d="M22 2s-6 3-6 10 6 10 6 10"/><circle cx="11.6" cy="12" r="1"/>`,
    'check-square':   `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
    'globe':          `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
    'log-out':        `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
    'alert-triangle': `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
    'calendar':       `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
    'zap':            `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
    'tool':           `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
    'credit-card':    `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
    'layers':         `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
    'trending-up':    `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
    'trending-down':  `<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>`,
    'activity':       `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
    'bar-chart':      `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
    'check-circle':   `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
    'file-text':      `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
    'mail':           `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
    'message-circle': `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
    'menu':           `<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>`,
    'plus':           `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
    'check-square2':  `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
    'cpu':            `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>`,
    'search':         `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
    'arrow-right':    `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
    'refresh-cw':     `<polyline points="23 4 23 8 19 8"/><polyline points="1 20 1 16 5 16"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
    'repeat':         `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>`,
    'x':              `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    'check':          `<polyline points="20 6 9 17 4 12"/>`,
    'pause':          `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
    'map-pin':        `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`,
    'share-2':        `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
    'slash':          `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
    'link':           `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
    'external-link':  `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`,
    'more-horizontal':`<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>`,
    'clipboard-list': `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>`,
    'radio':          `<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>`,
    'award':          `<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>`,
    'hash':           `<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>`,
    'bar-chart-2':    `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
    'percent':        `<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>`,
    'clock':          `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
    'tag':            `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
    'crosshair':      `<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>`,
    'pause-circle':   `<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>`,
    'trending-neutral':`<line x1="22" y1="12" x2="2" y2="12"/><polyline points="15 5 22 12 15 19"/>`,
    'package':        `<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
    'phone':          `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1H6.62a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>`,
    'user-x':         `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>`,
    'briefcase':      `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
    'eye':            `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  };
  const paths = p[name];
  if (!paths) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0">${paths}</svg>`;
}

/* ── Sidebar nav ── */
(function () {
  const MENU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;

  const items = [
    { href: '/',          ico: 'grid',         label: 'Dashboard' },
    { type: 'sep', label: 'Pages' },
    { href: '/team',         ico: 'users',        label: 'Team' },
    { href: '/competitors',  ico: 'search',       label: 'Competitors' },
    { href: '/finance',      ico: 'bar-chart',    label: 'Banking & Finance' },
    { href: '/marketing', ico: 'megaphone',    label: 'Marketing & Branding' },
    { href: '/apps',      ico: 'layers',       label: 'Applications' },
    { type: 'sep', label: 'Operations' },
    { href: '/tasks',     ico: 'check-square', label: 'Tasks' },
    { href: '/social',    ico: 'globe',        label: 'Social Media' },
    { href: '/reminders',    ico: 'bell',         label: 'Subscriptions & Alerts', badge: true },
    { href: '/certificates', ico: 'award',        label: 'Certificates' },
  ];

  function render() {
    const path = window.location.pathname;
    const links = items.map(item => {
      if (item.type === 'sep') return `<div class="sb-sec">${item.label}</div>`;
      const on = (path === '/' && item.href === '/') ||
                 (item.href !== '/' && path.startsWith(item.href));
      const badgeHtml = item.badge ? `<span class="nav-badge" id="reminderNavBadge" style="display:none">0</span>` : '';
      return `<a class="nav-link${on ? ' active' : ''}" href="${item.href}">
        <span class="ico">${ico(item.ico, 15)}</span>${item.label}${badgeHtml}
      </a>`;
    }).join('');

    const sb = document.getElementById('sidebar');
    if (!sb) return;

    sb.innerHTML = `
      <div class="sb-logo">
        <div class="sb-logo-icon" style="padding:0;overflow:hidden;border-radius:9px">
          <img src="/assets/images/dad-logo.png"
               alt="DAD"
               style="width:36px;height:36px;object-fit:cover;display:block;border-radius:9px">
        </div>
        <div class="sb-logo-text">
          <div class="sb-logo-mark" style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:var(--txt);letter-spacing:.01em;line-height:1.2">Doctors At Door</div>
        </div>
      </div>

      <div class="sb-menu-row">
        <span class="sb-menu-label">Menu</span>
        <span class="sb-menu-icon">${MENU_SVG}</span>
      </div>

      <nav class="sb-nav">${links}</nav>

      <div class="sb-footer">
        <div class="sb-user" id="sbUserRow">
          <div class="sb-user-avatar">AO</div>
          <div class="sb-user-info">
            <div class="sb-user-name">Admin</div>
            <div class="sb-user-role">ops@doctorsatdo…</div>
          </div>
          <div class="sb-user-dot"></div>
        </div>
        <div class="sb-user-actions">
          <button class="sb-icon-btn sb-logout-btn" id="logoutBtn" title="Sign out">${ico('log-out',14)} <span>Logout</span></button>
        </div>
      </div>`;

    /* hamburger (mobile) */
    const ham = document.getElementById('hamburger');
    if (ham) ham.innerHTML = MENU_SVG;
    const ovl = document.getElementById('overlay');
    if (ham) {
      ham.onclick = () => { sb.classList.toggle('open'); ovl?.classList.toggle('open'); };
      ovl?.addEventListener('click', () => { sb.classList.remove('open'); ovl?.classList.remove('open'); });
    }

    /* logout */
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      window.location.href = '/login';
    });

    /* load reminder badge count */
    fetch('/api/reminders')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.data) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const urgent = d.data.filter(r => {
          if (!r.date) return false;
          const [y,m,dy] = r.date.split('-').map(Number);
          const rd = new Date(y, m-1, dy); // parse as local IST, not UTC
          return Math.ceil((rd - today) / 86_400_000) <= 7;
        }).length;
        const badge = document.getElementById('reminderNavBadge');
        const dot   = document.getElementById('sbBellDot');
        if (badge && urgent > 0) { badge.textContent = urgent; badge.style.display = ''; }
        if (dot   && urgent > 0) { dot.style.display = ''; }
      }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
