/* ── DAD Dashboard — shared utilities + page loaders ── */

// ── Chart.js global defaults ──────────────────────────────────
if (typeof Chart !== 'undefined') {
  Chart.defaults.color            = '#9AA4B8';
  Chart.defaults.borderColor      = '#E4E8F0';
  Chart.defaults.font.family      = "'DM Sans', system-ui, sans-serif";
  Chart.defaults.font.size        = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle  = true;
  Chart.defaults.plugins.legend.labels.pointStyle     = 'circle';
  Chart.defaults.plugins.legend.labels.boxWidth       = 8;
  Chart.defaults.plugins.legend.labels.boxHeight      = 8;
  Chart.defaults.plugins.legend.labels.padding        = 16;
}

const C = {
  green:  '#18C98A', red:    '#EF4444', yellow: '#F59E0B',
  blue:   '#3B82F6', purple: '#8B5CF6', cyan:   '#06B6D4',
  orange: '#F97316', pink:   '#EC4899',
};

const PALETTE = [C.green, C.blue, C.yellow, C.red, C.purple, C.cyan, C.orange, C.pink];

// ── Fetch helper ──────────────────────────────────────────────
async function api(path) {
  const r = await fetch('/api' + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error || 'API error');
  return d.data;
}

// ── DOM helpers ───────────────────────────────────────────────
function el(id)          { return document.getElementById(id); }
function qs(sel, root)   { return (root || document).querySelector(sel); }
function setText(id, txt){ const e = el(id); if (e) e.textContent = txt; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}
function safeUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {}
  return '';
}

function loading(id) {
  const e = el(id);
  if (e) e.innerHTML = `<div class="loading"><div class="spin"></div> Loading…</div>`;
}
function errMsg(id, msg) {
  const e = el(id);
  if (e) e.innerHTML = `<div class="err-msg"><strong>Data unavailable</strong>${esc(msg || '')}</div>`;
}

// ── Badge helpers ─────────────────────────────────────────────
function statusBadge(status) {
  const raw = Array.isArray(status) ? (status[0] || '') : (status || '');
  if (!raw) return '<span class="badge b-gray">—</span>';
  const s = raw.toLowerCase();
  let cls = 'b-gray';
  if (['active','live','present','paid','running','approved','published'].some(x => s.includes(x))) cls = 'b-green';
  else if (['blocked','overdue','failed','rejected','cancelled','unpaid','inactive'].some(x => s.includes(x))) cls = 'b-red';
  else if (['pending','review','hold','paused','draft','processing'].some(x => s.includes(x))) cls = 'b-yellow';
  else if (['development','progress','testing','planned'].some(x => s.includes(x))) cls = 'b-blue';
  else if (['done','complete','closed','finished','ended'].some(x => s.includes(x))) cls = 'b-cyan';
  return `<span class="badge ${cls}">${esc(raw)}</span>`;
}

function priorityBadge(p) {
  if (!p) return '';
  const s = p.toLowerCase();
  const cls = s === 'high' ? 'b-red' : s === 'medium' ? 'b-yellow' : 'b-gray';
  return `<span class="badge ${cls}">${esc(p)}</span>`;
}

// ── Date helpers ──────────────────────────────────────────────
// Parse "YYYY-MM-DD" as LOCAL midnight (not UTC) so IST dates are correct
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function localToday() { const t = new Date(); t.setHours(0,0,0,0); return t; }

function fmtDate(d)     { if (!d) return '—'; return parseDate(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
function fmtTime(d)     { if (!d) return '—'; return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
function fmtMoney(n)    { if (n == null) return '—'; return '₹' + Number(n).toLocaleString('en-IN'); }
function isOverdue(d)   { return d && parseDate(d) < localToday(); }
function daysUntil(d)   { return d ? Math.ceil((parseDate(d) - localToday()) / 86_400_000) : null; }
function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(y, m-1).toLocaleString('en-IN', { month:'short', year:'2-digit' });
}


// ── Chart builder ─────────────────────────────────────────────
const _charts = {};
function renderHtmlLegend(chartId, containerId) {
  const chart = _charts[chartId];
  const container = el(containerId);
  if (!chart || !container) return;
  const labels = chart.data.labels || [];
  const colors = chart.data.datasets[0]?.backgroundColor || [];
  container.innerHTML = labels.map((lbl, i) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;flex-shrink:0;font-size:12px;color:var(--txt)">
      <span style="width:8px;height:8px;border-radius:50%;background:${Array.isArray(colors)?colors[i]:colors};flex-shrink:0;display:inline-block"></span>
      ${esc(lbl)}
    </span>`
  ).join('');
}

function buildChart(id, type, data, extraOptions = {}) {
  const canvas = el(id); if (!canvas) return;
  if (_charts[id]) _charts[id].destroy();
  const defaults = {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { display: type === 'doughnut' || type === 'pie' } },
    scales: (type === 'doughnut' || type === 'pie') ? undefined : {
      x: { grid: { color:'rgba(0,0,0,.05)' }, ticks: { color: '#8A94A6' } },
      y: { grid: { color:'rgba(0,0,0,.05)' }, ticks: { color: '#8A94A6' } },
    },
  };
  _charts[id] = new Chart(canvas, { type, data, options: deepMerge(defaults, extraOptions) });
}

function deepMerge(a, b) {
  const out = Object.assign({}, a);
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]))
      out[k] = deepMerge(a[k]||{}, b[k]);
    else out[k] = b[k];
  }
  return out;
}

// ── Mark Reminder Paid — global (used by banner + reminders page) ──
async function markReminderPaid(id, frequency, currentDate, btn) {
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Updating…`;

  try {
    const r = await fetch(`/api/reminders/${id}/advance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frequency, currentDate }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Update failed');

    // Fade out and remove the card
    const card = document.getElementById(`rbc-${id}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.96)';
      setTimeout(() => {
        card.remove();
        const banner = document.getElementById('todayRemindersBox');
        if (banner && !banner.querySelector('.r-banner-card')) banner.style.display = 'none';
      }, 380);
    }

    // Also update table row if on reminders page
    const row = document.querySelector(`tr[data-rid="${id}"]`);
    if (row) {
      row.classList.remove('tr-over', 'tr-warn');
      const dateCell = row.querySelector('[data-date-cell]');
      const daysCell = row.querySelector('[data-days-cell]');
      if (dateCell) dateCell.textContent = fmtDate(d.data.date);
      if (daysCell) daysCell.innerHTML = `<span style="color:var(--success);font-weight:700">Updated</span>`;
      btn.innerHTML = `${ico('check',13)} Done`;
      btn.classList.add('r-banner-btn');
      btn.style.background = 'var(--success-t)';
      btn.style.color = 'var(--success)';
    }

    showToast(`Advanced to ${fmtDate(d.data.date)}`, 'success');
  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = origHTML;
    showToast(e.message || 'Failed to update reminder', 'error');
  }
}

// ── Toast notifications ───────────────────────────────────────
function showToast(msg, type, duration) {
  type = type || 'default'; duration = duration || 3500;
  const old = document.querySelector('.toast-notification');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = `toast-notification toast-${type}`;
  const ic = type === 'success' ? ico('check-circle', 16) : type === 'error' ? ico('alert-triangle', 16) : ico('bell', 16);
  t.innerHTML = `${ic}<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── Today's Urgent Reminders (dashboard top banner) ──────────
async function loadTodayReminders() {
  const box = el('todayRemindersBox'); if (!box) return;
  try {
    const all = await api('/reminders');
    const today = localToday();

    const urgent = all.filter(r => {
      if (!r.date) return false;
      const days = Math.ceil((parseDate(r.date) - today) / 86_400_000);
      return days <= 3;
    }).sort((a,b) => parseDate(a.date) - parseDate(b.date));

    if (!urgent.length) { box.style.display = 'none'; return; }

    const cards = urgent.map(r => {
      const days = Math.ceil((parseDate(r.date) - today) / 86_400_000);

      let urgency, label;
      if (days < 0)       { urgency = 'overdue';  label = `${Math.abs(days)}d Overdue`; }
      else if (days === 0) { urgency = 'today';    label = 'Due Today'; }
      else if (days === 1) { urgency = 'tomorrow'; label = 'Tomorrow'; }
      else                 { urgency = 'soon';     label = `In ${days} Days`; }

      const notifyIcons = (Array.isArray(r.notifyVia) ? r.notifyVia : [])
        .map(n => n.toLowerCase().includes('email')    ? ico('mail', 12)
                : n.toLowerCase().includes('whatsapp') ? ico('message-circle', 12) : '').join('');

      const freq = (r.frequency || '').toLowerCase();
      const canAdvance = freq && freq !== 'once' && freq !== 'one time' && freq !== 'one-time';
      const safeId   = String(r.id || '').replace(/[^a-zA-Z0-9-]/g,'');
      const safeFreq = esc(r.frequency || '');
      const safeDate = esc(r.date || '');

      return `
        <div class="r-banner-card" data-urgency="${urgency}" id="rbc-${safeId}">
          <div class="r-banner-card-top">
            <span class="r-banner-pill">${label}</span>
            <span class="r-banner-notify">${notifyIcons}</span>
          </div>
          <div class="r-banner-name">${esc(r.title || 'Untitled reminder')}</div>
          <div class="r-banner-meta">${esc([r.type, fmtDate(r.date)].filter(Boolean).join(' · '))}</div>
          <div class="r-banner-footer">
            ${r.frequency
              ? `<span class="r-banner-freq">${ico('refresh-cw', 11)} ${esc(r.frequency)}</span>`
              : '<span></span>'}
            ${canAdvance
              ? `<button class="r-banner-btn" onclick="markReminderPaid('${safeId}','${safeFreq}','${safeDate}',this)">${ico('check', 13)} Mark Paid</button>`
              : `<span class="r-banner-once">One-time</span>`}
          </div>
        </div>`;
    }).join('');

    box.innerHTML = `
      <div class="r-banner-hd">
        <div class="r-banner-title-main">
          ${ico('bell', 15)} Upcoming Reminders
          <span class="r-banner-count">${urgent.length}</span>
        </div>
        <a href="/reminders" class="r-banner-link">View All ${ico('arrow-right', 13)}</a>
      </div>
      <div class="r-banner-cards">${cards}</div>`;
    box.style.display = 'block';
  } catch { box.style.display = 'none'; }
}

// ── Avatar colour pool ────────────────────────────────────────
const AV_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#EC4899'];
function avColor(i) { return AV_COLORS[i % AV_COLORS.length]; }
function initials(name) { return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

// ── Role colour map ───────────────────────────────────────────
const ROLE_COLORS = {
  'Founder':   '#EF4444',
  'Developer': '#3B82F6',
  'Guardian':  '#F97316',
  'Manager':   '#10B981',
  'Designer':  '#8B5CF6',
  'Marketing': '#F59E0B',
  'HR':        '#06B6D4',
};
function roleColor(role) { return ROLE_COLORS[role] || '#8B5CF6'; }

// ── Dashboard Team Overview card ──────────────────────────────
async function loadDashboardTeam() {
  const card = el('dashTeamCard'); if (!card) return;
  try {
    const members = await api('/team');
    if (!members.length) { card.innerHTML = '<div class="err-msg">No team members found</div>'; return; }

    const roles = {};
    members.forEach(m => { const r = m.role || 'Other'; roles[r] = (roles[r] || 0) + 1; });

    const MAX = 10;
    const visible = members.slice(0, MAX);

    // Member rows — chip for role, no dot
    const listRows = visible.map((m, i) => {
      const col = roleColor(m.role);
      const last = i === visible.length - 1;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:9px 0;${last?'':'border-bottom:1px solid #F0F4F8'}">
          <div style="width:34px;height:34px;border-radius:50%;background:${avColor(i)};display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;color:white;flex-shrink:0;letter-spacing:.3px">${esc(initials(m.name))}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:#111827;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.name || 'Unnamed')}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:1px">${esc(m.phone || '—')}</div>
          </div>
          <span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${col}1A;color:${col};border:1px solid ${col}33;white-space:nowrap;flex-shrink:0">${esc(m.role || '—')}</span>
        </div>`;
    }).join('');

    // View all button
    const viewAllBtn = `
      <div style="padding:10px 20px 12px;border-top:1.5px solid #F0F4F8">
        <a href="/team" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#090071;text-decoration:none" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">
          View all ${members.length} members
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>`;

    // Legend rows (By Role right panel)
    const legendRows = Object.entries(roles).map(([role, count]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#6B7280">
          <span style="width:8px;height:8px;border-radius:50%;background:${roleColor(role)};display:inline-block;flex-shrink:0"></span>
          ${esc(role)}
        </div>
        <span style="font-size:12px;font-weight:700;color:#111827">${count}</span>
      </div>`).join('');

    card.innerHTML = `
      <div class="team-overview-grid">

        <!-- 60% — member list -->
        <div style="display:flex;flex-direction:column;border-right:1.5px solid #F0F4F8;min-height:0">
          <div style="overflow-y:auto;flex:1;padding:4px 20px 0;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent">
            ${listRows}
          </div>
          ${viewAllBtn}
        </div>

        <!-- 40% — By Role -->
        <div style="padding:20px 22px">
          <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:16px">By Role</div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:16px;height:170px">
            <canvas id="chartDashTeamRoles" style="max-height:170px;max-width:170px;width:100%;height:100%"></canvas>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;line-height:1">
              <div style="font-size:24px;font-weight:700;color:#111827">${members.length}</div>
              <div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.1em;margin-top:3px">MEMBERS</div>
            </div>
          </div>
          <div style="border-top:1px solid #F0F4F8;padding-top:12px">
            ${legendRows}
          </div>
        </div>

      </div>`;

    const roleKeys = Object.keys(roles);
    buildChart('chartDashTeamRoles', 'doughnut', {
      labels: roleKeys,
      datasets: [{ data: Object.values(roles), backgroundColor: roleKeys.map(r => roleColor(r)), borderWidth: 3, borderColor: '#FFFFFF', hoverOffset: 6 }],
    }, {
      cutout: '68%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } } },
    });

  } catch(e) { card.innerHTML = '<div class="err-msg"><strong>Team data unavailable</strong></div>'; }
}

// ── Social platform colour + icon map ─────────────────────────
const SOCIAL_META = {
  instagram: { color:'#E1306C', bg:'rgba(225,48,108,.10)', label:'Instagram', baseUrl:'https://instagram.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>` },
  linkedin:  { color:'#0A66C2', bg:'rgba(10,102,194,.10)', label:'LinkedIn', baseUrl:'https://linkedin.com/company/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>` },
  twitter:   { color:'#000000', bg:'rgba(0,0,0,.07)', label:'X (Twitter)', baseUrl:'https://x.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.902-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>` },
  x:         { color:'#000000', bg:'rgba(0,0,0,.07)', label:'X (Twitter)', baseUrl:'https://x.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.902-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>` },
  xtwitter:  { color:'#000000', bg:'rgba(0,0,0,.07)', label:'X (Twitter)', baseUrl:'https://x.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.902-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>` },
  youtube:   { color:'#FF0000', bg:'rgba(255,0,0,.10)', label:'YouTube', baseUrl:'https://youtube.com/@',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>` },
  facebook:  { color:'#1877F2', bg:'rgba(24,119,242,.10)', label:'Facebook', baseUrl:'https://facebook.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>` },
  whatsapp:  { color:'#25D366', bg:'rgba(37,211,102,.10)', label:'WhatsApp', baseUrl:'https://wa.me/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` },
  google:    { color:'#4285F4', bg:'rgba(66,133,244,.10)', label:'Google', baseUrl:'https://google.com/',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>` },
};
function socialMeta(platform) {
  const key = (platform||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z]/g,'');
  return SOCIAL_META[key] || { color:'#6B7280', bg:'rgba(107,114,128,.10)', label: platform, baseUrl:'https://',
    svg:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` };
}
function socialUrl(platform, handle) {
  const meta = socialMeta(platform);
  const h = (handle || '').replace(/^@/, '').trim();
  /* hardcoded known URLs */
  const key = (platform||'').toLowerCase().replace(/\s+/g,'');
  if (key === 'twitter' || key === 'x') return `https://x.com/${h}`;
  return (meta.baseUrl || 'https://') + h;
}

// ── Company card + topbar avatars ─────────────────────────────
async function loadCompanyCard() {
  try {
    const [members, tasks, apps, social] = await Promise.all([
      api('/team').catch(()=>[]),
      api('/tasks').catch(()=>[]),
      api('/apps').catch(()=>[]),
      api('/social').catch(()=>[]),
    ]);

    const teamCount = members.length;
    const appsCount = apps.length;
    const openTasks = tasks.filter(t => !['done','complete','cancelled'].includes((t.status||'').toLowerCase())).length;

    // Company sub
    const sub = el('teamCountSub'); if (sub) sub.textContent = teamCount;

    // Stats
    const sT = el('statTeam');  if (sT) sT.textContent = teamCount;
    const sA = el('statApps');  if (sA) sA.textContent = appsCount;
    const sK = el('statTasks'); if (sK) sK.textContent = openTasks;

    // Progress bars (visual proportion)
    const maxVal = Math.max(teamCount, appsCount, openTasks, 1);
    const bT = el('barTeam');  if (bT) bT.style.width = Math.round((teamCount/maxVal)*100)+'%';
    const bA = el('barApps');  if (bA) bA.style.width = Math.round((appsCount/maxVal)*100)+'%';
    const bK = el('barTasks'); if (bK) bK.style.width = Math.round((openTasks/maxVal)*100)+'%';

    // Topbar avatars (first 3 members)
    const topAv = el('topbarAvatars');
    if (topAv && members.length) {
      topAv.innerHTML = members.slice(0,3).map((m,i) =>
        `<div class="av" style="background:${avColor(i+3)}" title="${esc(m.name)}">${esc(initials(m.name))}</div>`
      ).join('');
    }

    // Now online row (use first few active members)
    const online = members.slice(0, 3);
    const onlineCount = el('onlineCount'); if (onlineCount) onlineCount.textContent = online.length;
    const onlineAv = el('onlineAvatars');
    if (onlineAv) {
      onlineAv.innerHTML = online.map((m,i) =>
        `<div class="av" style="background:${avColor(i)}" title="${esc(m.name)}">${esc(initials(m.name))}</div>`
      ).join('');
    }

    // Social chips
    const chipsEl = el('companySocialChips');
    const makeChip = (platform, handle, followers, status, url) => {
      const meta = socialMeta(platform);
      const fmtF = followers ? ` · ${Number(followers).toLocaleString('en-IN')}` : '';
      const isActive = (status||'').toLowerCase().includes('active');
      const dot = isActive ? `<span style="width:5px;height:5px;border-radius:50%;background:#10B981;display:inline-block;flex-shrink:0"></span>` : '';
      const href = safeUrl(url || socialUrl(platform, handle));
      if (!href) return '';
      return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"
          style="display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;background:${meta.bg};border:1px solid ${meta.color}28;text-decoration:none;transition:opacity .15s"
          title="${esc(meta.label + fmtF)}">
          <span style="color:${meta.color};display:flex;align-items:center">${meta.svg}</span>
          ${dot}
          <span style="font-size:11px;font-weight:600;color:${meta.color}">${esc(handle || meta.label)}</span>
          ${fmtF ? `<span style="font-size:10px;color:${meta.color};opacity:.65">${fmtF}</span>` : ''}
        </a>`;
    };

    if (chipsEl && Array.isArray(social) && social.length) {
      chipsEl.innerHTML = social.map(s => {
        const handle = s.handle || s.username || s.name || '';
        return makeChip(s.platform, handle, s.followers, s.status, null);
      }).join('');
    } else if (chipsEl) {
      // Fallback with known handles
      const fallback = [
        { platform:'Twitter', handle:'@doctors_at_door', url:'https://x.com/doctors_at_door' },
        { platform:'Instagram', handle:'@doctorsatdoor', url:'https://instagram.com/doctorsatdoor' },
        { platform:'LinkedIn',  handle:'Doctors At Door', url:'https://linkedin.com/company/doctorsatdoor' },
        { platform:'WhatsApp',  handle:'Chat with us', url:'https://wa.me/91XXXXXXXXXX' },
      ];
      chipsEl.innerHTML = fallback.map(s => makeChip(s.platform, s.handle, null, 'active', s.url)).join('');
    }
  } catch(e) { console.error('Company card error', e); }
}

// ── My Summary cards ──────────────────────────────────────────
async function loadSummaryCards() {
  try {
    const now = new Date();
    const ts  = now.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) + ', ' + now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});

    const [tasks, apps, reminders] = await Promise.all([
      api('/tasks').catch(()=>[]),
      api('/apps').catch(()=>[]),
      api('/reminders').catch(()=>[]),
    ]);

    // Pending / active tasks
    const pending = tasks.filter(t => {
      const s = (t.status||'').toLowerCase();
      return !['done','complete','cancelled'].includes(s);
    }).length;

    // Apps in development
    const appsInDev = apps.filter(a => (a.status||'').toLowerCase().includes('development')).length;

    // Renewals due within 30 days
    const today = localToday();
    const renewals = reminders.filter(r => {
      if (!r.date) return false;
      const d = Math.ceil((parseDate(r.date) - today) / 86_400_000);
      return d >= 0 && d <= 30;
    }).length;

    const pad = n => String(n).padStart(2, '0');

    const tN = el('summaryTasksNum');    if (tN) tN.textContent = pad(pending);
    const tM = el('summaryTasksMeta');   if (tM) tM.textContent = `Update: ${ts}`;
    const aN = el('summaryAppsNum');     if (aN) aN.textContent = pad(appsInDev);
    const aM = el('summaryAppsMeta');    if (aM) aM.textContent = `Update: ${ts}`;
    const rN = el('summaryRenewalsNum'); if (rN) rN.textContent = pad(renewals);
    const rM = el('summaryRenewalsMeta');if (rM) rM.textContent = `Update: ${ts}`;
  } catch(e) { console.error('Summary cards error', e); }
}

// ── Name-based deterministic avatar colour ────────────────────
function nameColor(name) {
  let h = 0;
  for (const c of (name || '?')) h = (h * 31 + c.charCodeAt(0)) & 0xFFFF;
  return AV_COLORS[h % AV_COLORS.length];
}

// ── Finance Snapshot card ─────────────────────────────────────
async function loadFinanceSnapshot() {
  const card = el('financeSnapshotCard'); if (!card) return;
  try {
    const d = await api('/finance/summary');
    const { allTransactions } = d;
    const txns = allTransactions || [];

    const fmtLakh = v => {
      if (v === 0) return '₹0';
      if (v >= 100000) return '₹' + (v/100000).toFixed(1) + 'L';
      if (v >= 1000)   return '₹' + (v/1000).toFixed(0) + 'K';
      return '₹' + Number(v).toLocaleString('en-IN');
    };

    const PERIODS = [
      { key:'1m',    label:'This Month'  },
      { key:'lastm', label:'Last Month'  },
      { key:'3m',    label:'3 Months'    },
      { key:'6m',    label:'6 Months'    },
      { key:'1y',    label:'This Year'   },
      { key:'lasty', label:'Last Year'   },
    ];

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-size:15px;font-weight:700;color:#111827">Finance Snapshot</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="position:relative" id="finPeriodWrap">
            <div id="finPeriodBtn" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#6B7280;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:20px;padding:5px 13px;cursor:pointer;user-select:none">
              <span id="finPeriodLabel">This Month</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="finPeriodMenu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:white;border:1.5px solid #E5E7EB;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.13);z-index:200;min-width:140px;overflow:hidden">
              ${PERIODS.map(p=>`<div class="fin-opt" data-key="${p.key}" style="padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;color:#374151;transition:background .1s">${p.label}</div>`).join('')}
            </div>
          </div>
          <a href="/finance" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #E5E7EB;background:#F9FAFB;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#6B7280;transition:all .15s;flex-shrink:0" onmouseover="this.style.borderColor='#090071';this.style.color='#090071'" onmouseout="this.style.borderColor='#E5E7EB';this.style.color='#6B7280'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>
      <div id="finStats" class="fin-stats-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px"></div>
      <div id="finChartLbl" style="font-size:11px;color:#9CA3AF;margin-bottom:10px;font-weight:500">Daily Credits vs Debits</div>
      <div class="chart-wrap" style="position:relative;width:100%;height:180px;overflow:hidden"><canvas id="chartFinanceSnapshot"></canvas></div>`;

    function getRange(key) {
      const now = new Date();
      let start, end = new Date(now.getFullYear(), now.getMonth()+1, 0);
      let useMonthly = false;
      if (key === '1m')    { start = new Date(now.getFullYear(), now.getMonth(), 1); }
      else if (key==='lastm') { start = new Date(now.getFullYear(), now.getMonth()-1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
      else if (key==='3m')    { start = new Date(now.getFullYear(), now.getMonth()-2, 1); useMonthly = true; }
      else if (key==='6m')    { start = new Date(now.getFullYear(), now.getMonth()-5, 1); useMonthly = true; }
      else if (key==='1y')    { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); useMonthly = true; }
      else if (key==='lasty') { start = new Date(now.getFullYear()-1, 0, 1); end = new Date(now.getFullYear()-1, 11, 31); useMonthly = true; }
      return { start, end, useMonthly };
    }

    function renderPeriod(key) {
      const { start, end, useMonthly } = getRange(key);
      start.setHours(0,0,0,0); end.setHours(23,59,59,999);
      const filtered = txns.filter(t => { if (!t.date) return false; const td = new Date(t.date); return td >= start && td <= end; });

      let totalCredit = 0, totalDebit = 0;
      filtered.forEach(t => {
        const tp = (t.type||'').toLowerCase();
        const amt = t.amount || 0;
        if (tp==='credit'||tp==='cr'||tp==='income') totalCredit += amt; else totalDebit += amt;
      });
      const net = totalCredit - totalDebit;

      el('finStats').innerHTML = `
        <div style="background:#F9FAFB;border:1px solid #F0F0F0;border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px">Credit</div>
          <div style="font-size:17px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtMoney(totalCredit)}</div>
        </div>
        <div style="background:#F9FAFB;border:1px solid #F0F0F0;border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px">Debit</div>
          <div style="font-size:17px;font-weight:700;color:#EF4444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtMoney(totalDebit)}</div>
        </div>
        <div style="background:#F9FAFB;border:1px solid #F0F0F0;border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px">Net</div>
          <div style="font-size:17px;font-weight:700;color:${net>=0?'#10B981':'#EF4444'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${net<0?'−':''}${fmtMoney(Math.abs(net))}</div>
        </div>`;

      let labels, creditData, debitData;
      if (!useMonthly) {
        el('finChartLbl').textContent = 'Daily Credits vs Debits';
        const dayCount = Math.round((end - start) / 86400000) + 1;
        labels = Array.from({length: dayCount}, (_, i) => i+1);
        creditData = new Array(dayCount).fill(0);
        debitData  = new Array(dayCount).fill(0);
        filtered.forEach(t => {
          const idx = Math.floor((new Date(t.date) - start) / 86400000);
          if (idx < 0 || idx >= dayCount) return;
          const tp = (t.type||'').toLowerCase(); const amt = t.amount||0;
          if (tp==='credit'||tp==='cr'||tp==='income') creditData[idx] += amt; else debitData[idx] += amt;
        });
      } else {
        el('finChartLbl').textContent = 'Monthly Credits vs Debits';
        const mKeys = [];
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) { mKeys.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`); cur.setMonth(cur.getMonth()+1); }
        labels = mKeys.map(k => { const [y,m] = k.split('-'); return new Date(y,m-1).toLocaleString('en-IN',{month:'short',year:'2-digit'}); });
        creditData = new Array(mKeys.length).fill(0);
        debitData  = new Array(mKeys.length).fill(0);
        filtered.forEach(t => {
          const mk = (t.date||'').substring(0,7); const idx = mKeys.indexOf(mk); if (idx<0) return;
          const tp = (t.type||'').toLowerCase(); const amt = t.amount||0;
          if (tp==='credit'||tp==='cr'||tp==='income') creditData[idx] += amt; else debitData[idx] += amt;
        });
      }

      buildChart('chartFinanceSnapshot', 'line', {
        labels,
        datasets: [
          { label:'Credit', data: creditData, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.07)', fill:true, tension:0.3, borderWidth:2, pointRadius: creditData.map(v=>v>0?4:0), pointBackgroundColor:'#fff', pointBorderColor:'#10B981', pointBorderWidth:2 },
          { label:'Debit',  data: debitData,  borderColor:'#EF4444', backgroundColor:'rgba(239,68,68,0.07)',  fill:true, tension:0.3, borderWidth:2, pointRadius: debitData.map(v=>v>0?4:0),  pointBackgroundColor:'#fff', pointBorderColor:'#EF4444',  pointBorderWidth:2 },
        ],
      }, {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid:{ color:'rgba(0,0,0,.04)', drawBorder:false }, ticks:{ maxRotation:0, callback: useMonthly ? undefined : ((_,i)=>([1,7,13,19,25,31].includes(i+1)?i+1:'')) } },
          y: { grid:{ color:'rgba(0,0,0,.04)', drawBorder:false }, ticks:{ callback: v=>fmtLakh(v) }, beginAtZero:true },
        },
      });
    }

    renderPeriod('1m');

    // Dropdown toggle
    const btn  = el('finPeriodBtn');
    const menu = el('finPeriodMenu');
    btn.addEventListener('click', e => { e.stopPropagation(); menu.style.display = menu.style.display==='none'?'block':'none'; });
    document.addEventListener('click', () => { if(menu) menu.style.display='none'; });
    card.querySelectorAll('.fin-opt').forEach(opt => {
      opt.addEventListener('mouseover', () => opt.style.background='#F3F4F6');
      opt.addEventListener('mouseout',  () => opt.style.background='');
      opt.addEventListener('click', e => {
        e.stopPropagation();
        el('finPeriodLabel').textContent = opt.textContent;
        menu.style.display = 'none';
        renderPeriod(opt.dataset.key);
      });
    });
  } catch(e) { card.innerHTML = '<div class="err-msg"><strong>Finance data unavailable</strong></div>'; }
}

// ── Task Status card ──────────────────────────────────────────
async function loadTaskSnapshot() {
  const card = el('taskStatusCard'); if (!card) return;
  try {
    const tasks = await api('/tasks');

    // Status counts
    const statusMap = {};
    tasks.forEach(t => { const s = t.status||'Unknown'; statusMap[s]=(statusMap[s]||0)+1; });

    // Assignee workload
    const assigneeMap = {};
    tasks.forEach(t => {
      const members = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo||'Unassigned'];
      const key = members.join(', ');
      if (!assigneeMap[key]) assigneeMap[key] = { count:0, members };
      assigneeMap[key].count++;
    });

    const sColor = s => {
      const l = (s||'').toLowerCase();
      if (l.includes('upcoming'))                                           return '#F59E0B';
      if (l.includes('active')||l.includes('live')||l.includes('running')) return '#F97316';
      if (l.includes('done')||l.includes('complete')||l.includes('finish')) return '#10B981';
      if (l.includes('block')||l.includes('cancel')||l.includes('hold'))   return '#EF4444';
      if (l.includes('progress')||l.includes('develop'))                   return '#8B5CF6';
      return '#9CA3AF';
    };

    const workloadHtml = Object.entries(assigneeMap)
      .sort(([,a],[,b]) => b.count - a.count)
      .slice(0, 3)
      .map(([key, { count, members }]) => {
        const first = members[0] || 'Unknown';
        const label = members.length > 1
          ? members.map(n => n.split(' ')[0][0] + '. ' + (n.split(' ')[1]||'')[0]+'.').join(', ')
          : first;
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #F4F6FA">
            <div style="width:28px;height:28px;border-radius:50%;background:${nameColor(first)};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;flex-shrink:0">${esc(initials(first))}</div>
            <div style="flex:1;min-width:0;font-size:12.5px;color:#374151;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</div>
            <div style="font-size:13px;font-weight:700;color:#111827;flex-shrink:0">${count}</div>
            <div style="font-size:11px;color:#9CA3AF;flex-shrink:0">tasks</div>
          </div>`;
      }).join('');

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-size:15px;font-weight:700;color:#111827">Task Status</div>
        <a href="/tasks" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #E5E7EB;background:#F9FAFB;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#6B7280;transition:all .15s;flex-shrink:0" onmouseover="this.style.borderColor='#090071';this.style.color='#090071'" onmouseout="this.style.borderColor='#E5E7EB';this.style.color='#6B7280'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>
      <div class="chart-wrap" style="position:relative;width:100%;height:180px;margin-bottom:16px;overflow:hidden"><canvas id="chartTaskSnapshot"></canvas></div>
      <div style="border-top:1.5px solid #F4F6FA;padding-top:4px">${workloadHtml}</div>`;

    const statusKeys = Object.keys(statusMap);
    buildChart('chartTaskSnapshot', 'bar', {
      labels: statusKeys,
      datasets: [{
        data: Object.values(statusMap),
        backgroundColor: statusKeys.map(s => sColor(s)),
        borderRadius: 6, borderWidth: 0,
      }],
    }, {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { display: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { stepSize: 4 }, beginAtZero: true },
      },
    });
  } catch(e) { card.innerHTML = '<div class="err-msg"><strong>Task data unavailable</strong></div>'; }
}

// ── Application Phase Update (from Phase Tracker DB) ──────────
async function loadAppsGrid() {
  const grid = el('appsGrid'); if (!grid) return;
  try {
    const phases = await api('/apps/phases');

    // Exclude ONLY "Not Started" — show everything else (Wireframe, Development, Field Testing…)
    const active = phases.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s && !(s.includes('not start') || s === 'not started');
    });

    const countEl = el('appsCount'); if (countEl) countEl.textContent = active.length;
    if (!active.length) { grid.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--muted)">No active phase records</div>'; return; }

    const phaseCol = s => {
      const l = (s || '').toLowerCase();
      if (['field test','testing','qa','uat'].some(x => l.includes(x)))                    return '#F59E0B';
      if (['develop','build','wip','coding','progress','active'].some(x => l.includes(x))) return '#3B82F6';
      if (['wireframe','design','mockup','prototype','ui','ux'].some(x => l.includes(x)))  return '#8B5CF6';
      if (['launch','live','prod','done','complete','ship'].some(x => l.includes(x)))       return '#10B981';
      return '#6366F1';
    };

    grid.innerHTML = active.map(p => {
      const col    = phaseCol(p.status);
      const status = p.status || '—';
      return `
        <div class="app-card-slim" style="border-color:${col}28;box-shadow:0 2px 12px ${col}12">
          <div style="font-size:12.5px;font-weight:700;color:var(--txt);line-height:1.4;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"
            title="${esc(p.name || '')}">${esc(p.name || '—')}</div>
          <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;
            border-radius:20px;background:${col}14;border:1px solid ${col}30;align-self:flex-start">
            <span style="width:5px;height:5px;border-radius:50%;background:${col};flex-shrink:0"></span>
            <span style="font-size:10.5px;font-weight:700;color:${col}">${esc(status)}</span>
          </div>
        </div>`;
    }).join('');
  } catch(e) { grid.innerHTML = '<div class="err-msg"><strong>Could not load phase data</strong></div>'; }
}

// ── Live Feed Panel ───────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// RIGHT PANEL — Tools Updates (Reminders ⟷ Assets toggle)
// ─────────────────────────────────────────────────────────────
(function () {
  let _reminders = [];
  let _tools     = [];
  let _activeView = 'reminders'; // 'reminders' | 'assets'
  let _activeChip = 'All';

  // ── Format currency from tool object (priceUSD / priceINR) ──
  function fmtToolAmt(tool) {
    if (tool.priceUSD && Number(tool.priceUSD) > 0)
      return '$' + Number(tool.priceUSD).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (tool.priceINR && Number(tool.priceINR) > 0)
      return '₹' + Number(tool.priceINR).toLocaleString('en-IN');
    return '—';
  }

  // ── Total spend — from Notion Total Spent ($) / Total Spent (₹) ──
  function totalSpend(tool) {
    // treat null/undefined as "not available", 0 as a valid zero value
    const hasUSD = tool.totalSpentUSD != null;
    const hasINR = tool.totalSpentINR != null;
    const tUSD   = Number(tool.totalSpentUSD) || 0;
    const tINR   = Number(tool.totalSpentINR) || 0;

    if (!hasUSD && !hasINR) return null;

    const parts = [];
    if (hasUSD && tUSD > 0) parts.push('$' + tUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (hasINR && tINR > 0) parts.push('₹' + tINR.toLocaleString('en-IN'));
    return parts.length ? parts.join(' / ') : '₹0';
  }

  // ── Card price line (per-cycle amount; Credits → fall back to total spent) ──
  function cardPrice(tool) {
    const amt = fmtToolAmt(tool);
    if (amt !== '—') return amt;
    // Credits / usage — no fixed price; show what's been spent
    const tUSD = Number(tool.totalSpentUSD) || 0;
    const tINR = Number(tool.totalSpentINR) || 0;
    if (tUSD > 0) return '$' + tUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (tINR > 0) return '₹' + tINR.toLocaleString('en-IN');
    return '—';
  }

  // ── Status chip colour ───────────────────────────────────
  function toolStatusStyle(s) {
    const l = (s||'').toLowerCase();
    if (l.includes('active') || l.includes('live'))      return 'background:var(--success-t);color:#047857';
    if (l.includes('cancel') || l.includes('inactive'))  return 'background:var(--danger-t);color:var(--danger)';
    if (l.includes('trial') || l.includes('pending'))    return 'background:var(--warning-t);color:#92400E';
    return 'background:var(--surface);color:var(--txt2)';
  }

  // ── Render reminders view ────────────────────────────────
  function renderReminders() {
    const el = document.getElementById('rpContent'); if (!el) return;
    const today = localToday();

    const sorted = [..._reminders]
      .filter(r => r.date && (r.status || '').toLowerCase() === 'active')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 20);

    if (!sorted.length) {
      el.innerHTML = `<div class="err-msg" style="padding:24px">No upcoming reminders</div>`; return;
    }

    const nextUp = sorted[0];
    const nextDays = Math.ceil((parseDate(nextUp.date) - today) / 86400000);
    const nextDaysCls = nextDays <= 3 ? 'urgent' : nextDays <= 7 ? 'warn' : 'ok';
    const nextDaysLabel = nextDays < 0 ? 'Overdue' : nextDays === 0 ? 'Today' : nextDays === 1 ? 'Tomorrow' : `${nextDays} days`;

    const nextHtml = `
      <div class="rp-next-up">
        <div class="rp-next-up-label">Next Renewal</div>
        <div class="rp-next-up-name">${esc(nextUp.title || 'Untitled reminder')}</div>
        <div class="rp-next-up-row">
          <div class="rp-next-up-date">${fmtDate(nextUp.date)}</div>
          <div class="rp-next-up-days ${nextDaysCls}">${nextDaysLabel}</div>
        </div>
      </div>`;

    const itemsHtml = sorted.slice(1).map(r => {
      const days = Math.ceil((parseDate(r.date) - today) / 86400000);
      const cls  = days <= 3 ? 'urgent' : days <= 7 ? 'soon' : '';
      const dotC = days <= 3 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--success)';
      const dayCls  = days <= 3 ? 'd-urgent' : days <= 7 ? 'd-soon' : 'd-ok';
      const dayLabel = days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d left`;
      const dateShort = r.date ? parseDate(r.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';
      return `
        <div class="rp-reminder-item ${cls}">
          <div class="rp-reminder-dot" style="background:${dotC}"></div>
          <div class="rp-reminder-body">
            <div class="rp-reminder-name">${esc(r.title || 'Untitled reminder')}</div>
            <div class="rp-reminder-meta">${esc(r.type || r.frequency || 'Reminder')}</div>
          </div>
          <div class="rp-reminder-right">
            <div class="rp-reminder-date">${dateShort}</div>
            <div class="rp-reminder-days ${dayCls}">${dayLabel}</div>
          </div>
        </div>`;
    }).join('');

    el.innerHTML = `<div class="rp-view">${nextHtml}<div class="rp-section-label">Upcoming</div>${itemsHtml}</div>`;
  }

  // ── Render tools/assets view ─────────────────────────────
  function renderTools(chipFilter) {
    const el = document.getElementById('rpContent'); if (!el) return;

    // Unique statuses for chips
    const statuses = ['All', ...new Set(_tools.map(t => t.status).filter(Boolean))];

    // Filter
    const filtered = chipFilter === 'All'
      ? _tools
      : _tools.filter(t => (t.status||'') === chipFilter);

    const chipsHtml = `
      <div class="rp-chips-wrap">
        <div class="rp-filter-chips">
          ${statuses.map(s => `<button class="rp-chip${s === chipFilter ? ' active' : ''}" data-chip="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>
      </div>`;

    const toolsHtml = filtered.length === 0
      ? `<div class="err-msg" style="padding:16px">No tools found</div>`
      : filtered.map(t => {
          const amt   = cardPrice(t);
          const cyc   = t.billing || '';
          const total = totalSpend(t);

          // Status colour for inline text
          const s = (t.status||'').toLowerCase();
          const statusColor = s.includes('active') ? '#10B981'
            : s.includes('cancel')                  ? '#EF4444'
            : s.includes('occasion') || s.includes('credit') ? '#F59E0B'
            : '#9CA3AF';

          // Clean domain for display
          let domain = '';
          let website = '';
          if (t.website) {
            try {
              const u = new URL(t.website, window.location.origin);
              if (u.protocol === 'http:' || u.protocol === 'https:') {
                website = u.href;
                domain = u.hostname.replace(/^www\./, '');
              }
            } catch {}
          }

          return `
            <div class="rp-tool-item">
              <!-- Row 1: Name + Amount -->
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:5px">
                <div style="font-size:12.5px;font-weight:700;color:#111827;line-height:1.35;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name || 'Untitled tool')}</div>
                <div style="font-size:12.5px;font-weight:700;color:#090071;flex-shrink:0;white-space:nowrap">${amt}</div>
              </div>
              <!-- Row 2: Status • Cycle • Website -->
              <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:10px">
                <span style="font-size:11px;color:${statusColor};font-weight:600">${esc(t.status || '—')}</span>
                ${cyc ? `<span style="font-size:11px;color:#D1D5DB">•</span><span style="font-size:11px;color:#9CA3AF">${esc(cyc)}</span>` : ''}
                ${domain ? `
                  <span style="font-size:11px;color:#D1D5DB">•</span>
                  <a href="${esc(website)}" target="_blank" rel="noopener noreferrer"
                     style="font-size:11px;color:#6B7280;text-decoration:none;display:inline-flex;align-items:center;gap:3px;transition:color .14s"
                     onmouseover="this.style.color='#090071'" onmouseout="this.style.color='#6B7280'">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    ${esc(domain)}
                  </a>` : ''}
              </div>
              <!-- Divider -->
              <div style="height:1px;background:#EEF0F6;margin-bottom:8px"></div>
              <!-- Total spent row -->
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:11px;color:#9CA3AF;font-weight:500">Total spent</div>
                <div style="font-size:11.5px;font-weight:700;color:#374151">${total || '—'}</div>
              </div>
            </div>`;
        }).join('');

    el.innerHTML = `<div class="rp-view">${chipsHtml}${toolsHtml}</div>`;

    // Chip click handlers
    el.querySelectorAll('.rp-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeChip = btn.dataset.chip;
        renderTools(_activeChip);
      });
    });
  }

  // ── Toggle logic ─────────────────────────────────────────
  function setView(view) {
    _activeView = view;
    const btnR = document.getElementById('rpBtnReminders');
    const btnA = document.getElementById('rpBtnAssets');
    if (!btnR || !btnA) return;
    btnR.classList.toggle('active', view === 'reminders');
    btnA.classList.toggle('active', view === 'assets');
    if (view === 'reminders') renderReminders();
    else renderTools(_activeChip);
  }

  // ── Main loader ───────────────────────────────────────────
  window.loadRightPanel = async function () {
    const content = document.getElementById('rpContent'); if (!content) return;
    try {
      [_reminders, _tools] = await Promise.all([
        api('/reminders').catch(() => []),
        api('/tools-assets').catch(() => []),
      ]);
      // Wire toggle buttons
      document.getElementById('rpBtnReminders')?.addEventListener('click', () => setView('reminders'));
      document.getElementById('rpBtnAssets')?.addEventListener('click',    () => setView('assets'));
      // Default view
      setView('reminders');
    } catch (e) {
      content.innerHTML = '<div class="err-msg"><strong>Panel unavailable</strong></div>';
    }
  };
})();

// ── Full dashboard init ───────────────────────────────────────
async function initDashboard() {
  await Promise.all([
    loadCompanyCard(),
    loadSummaryCards(),
    loadDashboardTeam(),
    loadFinanceSnapshot(),
    loadTaskSnapshot(),
    loadAppsGrid(),
    loadRightPanel(),
  ]);
}
