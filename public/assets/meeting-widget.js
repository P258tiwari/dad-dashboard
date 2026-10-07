(() => {
  const box = document.getElementById('dashboardMeetings');
  if (!box) return;
  async function load() {
    try {
      const result = await api('/meetings');
      const events = MeetingModel.events(result.meetings);
      const alerts = MeetingModel.reminders(result.meetings);
      const awaiting = result.meetings.filter(m => m.status === 'Scheduled' && Date.parse(m.endsAt || m.startsAt) < Date.now()).length;
      box.innerHTML = (alerts.length || awaiting ? `<p style="color:#92400E;font-size:12px;margin-bottom:10px">${alerts.length} reminder(s) due · ${awaiting} past meeting(s) awaiting an outcome</p>` : '') + (events.length ? events.slice(0, 4).map(e => `<a href="/meetings?meeting=${encodeURIComponent(e.meeting.id)}" style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-lt)"><div style="min-width:0"><strong style="font-size:13px;overflow-wrap:anywhere">${esc(e.meeting.title)}</strong><div style="font-size:11px;color:var(--txt2)">${esc(e.kind === 'followUp' ? e.meeting.followUpPerson || e.meeting.person : e.meeting.person)} · ${esc(e.meeting.entity)}</div></div><div style="font-size:11px;text-align:right;flex-shrink:0"><span class="badge ${e.kind === 'followUp' ? 'b-yellow' : 'b-blue'}">${e.kind === 'followUp' ? 'Follow-up' : 'Meeting'}</span><div>${esc(new Date(e.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))} IST</div></div></a>`).join('') : '<p style="font-size:12px;color:var(--txt2)">No upcoming meetings. <a href="/meetings" style="color:var(--brand);font-weight:700">Schedule your next conversation →</a></p>');
    } catch { box.innerHTML = '<p style="font-size:12px;color:var(--txt2)">Meetings could not be loaded. <a href="/meetings">Open Meetings to retry.</a></p>'; }
  }
  load();
  setInterval(load, 60000);
})();
