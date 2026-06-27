/* DAD Member Page */

async function api(path) {
  const r = await fetch('/api' + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error || 'API error');
  return d.data;
}

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

function fmtDate(d) {
  if (!d) return '&mdash;';
  return esc(new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }));
}

function fmtMoney(n) {
  if (n == null) return '&mdash;';
  return '&#8377;' + Number(n).toLocaleString('en-IN');
}

function statusBadge(status) {
  if (!status) return '<span class="badge b-gray">&mdash;</span>';
  const s = String(status);
  const l = s.toLowerCase();
  const cls = l.includes('active') || l.includes('present') || l.includes('paid') ? 'b-green'
    : l.includes('block') || l.includes('absent') || l.includes('unpaid') ? 'b-red'
    : l.includes('pending') || l.includes('half') ? 'b-yellow'
    : 'b-gray';
  return `<span class="badge ${cls}">${esc(s)}</span>`;
}

async function init() {
  const app = document.getElementById('app');

  if (!window.__MEMBER__) {
    app.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
        <div style="text-align:center;padding:60px">
          <div style="font-size:36px;font-weight:800;color:var(--txt)">D<span style="color:var(--danger)">+</span>D</div>
          <div style="margin-top:16px;font-size:15px;color:var(--muted)">Member not found.</div>
          <a href="/" style="display:inline-block;margin-top:16px;color:var(--success);font-weight:700">Go to Dashboard &rarr;</a>
        </div>
      </div>`;
    return;
  }

  const M = window.__MEMBER__;
  const memberName = esc(M.name || '');
  const memberRole = esc(M.role || 'Team Member');
  const memberInitial = esc((M.name || '?').charAt(0).toUpperCase());

  app.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0 22px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--primary);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2v14M2 9h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--txt)">D<span style="color:var(--danger)">+</span>D</div>
          <div style="font-size:10px;color:var(--muted)">Doctors At Door</div>
        </div>
      </div>
      <span style="font-size:12px;color:var(--muted);font-weight:600">Member Portal</span>
    </div>

    <div class="mp-hd">
      <div class="mp-avatar">${memberInitial}</div>
      <div>
        <div class="mp-name">Hello, ${memberName}</div>
        <div class="mp-role">${memberRole}</div>
        <div class="mp-online"><span class="mp-online-dot"></span> Online</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${statusBadge(M.status)}
        </div>
      </div>
    </div>

    <div class="card-lg" style="margin-bottom:16px">
      <div class="card-hd"><div class="card-title">My Tasks</div></div>
      <div id="myTasks"><div class="loading"><div class="spin"></div>Loading...</div></div>
    </div>

    <div class="card-lg" style="margin-bottom:16px">
      <div class="card-hd"><div class="card-title">My Salary Slips</div></div>
      <div id="mySalary"><div class="loading"><div class="spin"></div>Loading...</div></div>
    </div>
  `;

  const firstName = String(M.name || '').split(' ')[0].toLowerCase();
  const tasks = await api(`/tasks/member/${encodeURIComponent(M.id)}`).catch(() => []);
  const myTasks = tasks.filter(t => {
    const a = t.assignedTo;
    if (Array.isArray(a)) return a.some(x => typeof x === 'string' && x.toLowerCase().includes(firstName));
    return typeof a === 'string' && a.toLowerCase().includes(firstName);
  });

  document.getElementById('myTasks').innerHTML = myTasks.length === 0
    ? '<div style="color:var(--muted);padding:12px">No tasks assigned</div>'
    : `<div class="tbl-wrap"><table>
        <thead><tr><th>Task</th><th>Due Date</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>${myTasks.map(t => {
          const over = t.dueDate && new Date(t.dueDate) < new Date() && !['done', 'complete', 'cancelled'].includes((t.status || '').toLowerCase());
          const priority = String(t.priority || '');
          const priorityClass = priority.toLowerCase() === 'high' ? 'b-red' : priority.toLowerCase() === 'medium' ? 'b-yellow' : 'b-gray';
          return `<tr class="${over ? 'tr-over' : ''}">
            <td><strong>${esc(t.name)}</strong></td>
            <td style="color:${over ? 'var(--danger)' : 'inherit'}">${fmtDate(t.dueDate)}</td>
            <td>${priority ? `<span class="badge ${priorityClass}">${esc(priority)}</span>` : '&mdash;'}</td>
            <td>${statusBadge(t.status)}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`;

  const salary = await api(`/salary/${encodeURIComponent(M.id)}`).catch(() => []);
  document.getElementById('mySalary').innerHTML = salary.length === 0
    ? '<div style="color:var(--muted);padding:12px">No salary records found</div>'
    : `<div class="tbl-wrap"><table>
        <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Payment Date</th><th>Slip</th></tr></thead>
        <tbody>${salary.map(s => {
          const fileUrl = Array.isArray(s.files) && s.files.length ? safeUrl(s.files[0]) : '';
          return `<tr>
            <td><strong>${esc(s.month)}</strong></td>
            <td style="font-weight:700;color:var(--success)">${fmtMoney(s.amount)}</td>
            <td>${statusBadge(s.status)}</td>
            <td>${fmtDate(s.paymentDate)}</td>
            <td>${fileUrl
              ? `<a href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding:5px 12px;font-size:12px">Download</a>`
              : '&mdash;'}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(e => {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
        <div style="text-align:center;padding:60px">
          <div style="font-size:36px;font-weight:800;margin-bottom:16px;color:var(--txt)">D<span style="color:var(--danger)">+</span>D</div>
          <div style="color:var(--danger);font-weight:700">Failed to load dashboard</div>
          <div style="font-size:13px;margin-top:8px;color:var(--muted)">${esc(e.message)}</div>
          <button onclick="location.reload()" style="margin-top:20px;padding:11px 24px;background:var(--primary);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-family:Arial,sans-serif;font-size:14px">Retry</button>
        </div>
      </div>`;
  });
});
