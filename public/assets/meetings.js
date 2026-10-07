(() => {
  const model = MeetingModel;
  const $ = id => document.getElementById(id);
  const drawer = $('meetingDrawer');
  let meetings = [], tab = 'upcoming', emailAvailable = false, current = null, editing = false, saving = false, refreshNeeded = false;
  const date = value => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST' : 'Not set';
  const shortDate = (value, options) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
  const tabs = { upcoming: 'Upcoming', past: 'Past meetings', followups: 'Follow-ups', all: 'All' };
  const pill = m => `<span class="meeting-pill ${m.status === 'Completed' ? 'completed' : m.status === 'Cancelled' ? 'cancelled' : ''}">${esc(m.status)}</span>`;
  async function request(path = '', options = {}) {
    const response = await fetch('/api/meetings' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (response.status === 401) { window.location.assign('/login'); throw new Error('Your session expired. Please sign in again.'); }
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error || 'Unable to save. Please try again.');
    return body.data;
  }
  function toast(message) { $('meetingToast').textContent = message; $('meetingToast').hidden = false; setTimeout(() => { $('meetingToast').hidden = true; }, 4500); }
  function render() {
    const now = Date.now();
    const counts = Object.fromEntries(Object.keys(tabs).map(key => [key, meetings.filter(m => model.inTab(m, key, now)).length]));
    $('meetingStats').innerHTML = [['Upcoming', counts.upcoming], ['Completed', meetings.filter(m => m.status === 'Completed').length], ['Open follow-ups', counts.followups]].map(([label, count]) => `<div class="meeting-stat"><strong>${count}</strong><span>${label}</span></div>`).join('');
    $('meetingTabs').innerHTML = Object.entries(tabs).map(([key, label]) => `<button class="meeting-tab ${tab === key ? 'active' : ''}" data-tab="${key}" aria-pressed="${tab === key}">${label} <span>${counts[key]}</span></button>`).join('');
    const query = $('meetingSearch').value.trim().toLowerCase();
    const filtered = meetings.filter(m => model.inTab(m, tab, now) && [m.title, m.person, m.entity, m.owner, m.agenda, m.outcome].join(' ').toLowerCase().includes(query));
    filtered.sort((a, b) => tab === 'past' || tab === 'all' ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(tab === 'followups' ? a.followUpAt : a.startsAt) - Date.parse(tab === 'followups' ? b.followUpAt : b.startsAt));
    $('meetingList').innerHTML = filtered.length ? filtered.map(m => `<button class="meeting-card" data-meeting="${safeAttr(m.id)}">
      <div class="meeting-calendar"><span>${esc(shortDate(m.startsAt, { month: 'short' }))}</span><strong>${esc(shortDate(m.startsAt, { day: '2-digit' }))}</strong><span>${esc(shortDate(m.startsAt, { year: 'numeric' }))}</span></div>
      <div class="meeting-card-body"><h3>${esc(m.title)}</h3><p>${esc(m.person)}${m.designation ? ' · ' + esc(m.designation) : ''}<br>${esc(m.entity)}</p><div class="meeting-meta"><span>${esc(shortDate(m.startsAt, { hour: '2-digit', minute: '2-digit' }))} IST</span><span>${esc(m.mode)}</span>${m.owner ? `<span>Owner: ${esc(m.owner)}</span>` : ''}${pill(m)}</div>
      ${m.status === 'Scheduled' && Date.parse(m.startsAt) < now ? '<div class="meeting-meta" style="margin-top:9px"><span class="meeting-pill attention">Meeting started · add outcome when complete</span></div>' : ''}
      ${m.followUpStatus === 'Pending' ? `<div class="meeting-meta" style="margin-top:9px"><span class="meeting-pill attention">${Date.parse(m.followUpAt) < now ? 'Follow-up overdue' : 'Follow-up'} · ${esc(date(m.followUpAt))}</span></div>` : ''}</div><span aria-hidden="true">↗</span></button>`).join('') : `<div class="meeting-empty">${ico('calendar', 30)}<h3>${query ? 'No matching meetings' : tab === 'past' ? 'Your meeting history starts here' : tab === 'followups' ? 'No open follow-ups' : 'Room for the next conversation'}</h3><p>${query ? 'Try another person, entity, or meeting title.' : tab === 'past' ? 'Past meetings and their notes stay here for future reference.' : tab === 'followups' ? 'Add a next contact date and action inside a meeting to track it here.' : 'Schedule a meeting, then return to capture the outcome and next steps.'}</p>${!query ? '<button class="mt-btn primary" data-new>+ New meeting</button>' : ''}</div>`;
    const events = model.events(meetings, now);
    const alerts = model.reminders(meetings, now);
    $('meetingUpcoming').innerHTML = (alerts.length ? `<div class="meeting-alert">${alerts.length} reminder${alerts.length === 1 ? '' : 's'} due. Open a meeting below to review the next action.</div>` : '') + (events.length ? events.slice(0, 20).map(event => `<button class="meeting-upcoming" data-meeting="${safeAttr(event.meeting.id)}"><span class="meeting-pill ${event.kind === 'followUp' ? 'attention' : ''}">${event.kind === 'meeting' ? 'Meeting' : Date.parse(event.at) < now ? 'Overdue follow-up' : 'Follow-up'}</span><strong>${esc(event.meeting.title)}</strong><p>${esc(event.kind === 'followUp' ? event.meeting.followUpPerson || event.meeting.person : event.meeting.person)} · ${esc(event.meeting.entity)}</p><span>${esc(date(event.at))}</span>${event.kind === 'followUp' ? `<p style="margin-top:5px">${esc(event.meeting.followUpAction)}</p>` : ''}</button>`).join('') : '<p class="meeting-muted">No upcoming meetings or open follow-ups. Your next steps will appear here.</p>');
  }
  async function load() {
    const result = await request();
    meetings = result.meetings;
    emailAvailable = result.emailAvailable;
    $('meetingNotion').href = result.notionUrl;
    $('meetingNotion').hidden = false;
    render();
  }
  const detail = (label, value, full = false, link = false) => `<div class="meeting-detail ${full ? 'full' : ''}"><dt>${esc(label)}</dt><dd>${link && safeUrl(value) ? `<a href="${safeAttr(safeUrl(value))}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>` : esc(value || '—')}</dd></div>`;
  const section = (title, content) => `<section class="meeting-section"><h3>${title}</h3><dl class="meeting-detail-grid">${content}</dl></section>`;
  function showDetails(meeting) {
    current = meeting; editing = false;
    $('drawerHeading').textContent = meeting.title;
    $('drawerEyebrow').textContent = 'MEETING DETAILS';
    const m = meeting;
    $('meetingDrawerBody').innerHTML = `<div class="meeting-detail-actions"><button class="mt-btn primary" data-edit>Edit details</button>${m.status !== 'Cancelled' ? '<button class="mt-btn" data-complete>Record outcome</button>' : ''}<button class="mt-btn" data-follow>Schedule next meeting</button><a class="mt-btn" href="${safeAttr(safeUrl(m.notionUrl))}" target="_blank" rel="noopener noreferrer">Open in Notion ↗</a></div>` +
      section('Schedule & contact', detail('Status', m.status) + detail('Mode', m.mode) + detail('Date & time', date(m.startsAt)) + detail('End time', m.endsAt ? date(m.endsAt) : '') + detail('With whom', m.person) + detail('Post / designation', m.designation) + detail('Entity', m.entity) + detail('Core functionality', m.coreFunctionality) + detail('Email', m.email) + detail('Phone', m.phone) + detail('DAD owner', m.owner) + detail('Other attendees', m.attendees) + detail('Location', m.location) + detail('Meeting link', m.meetingUrl, false, true)) +
      section('Purpose & preparation', detail('Agenda / objectives', m.agenda, true) + detail('Documents', m.documentUrl, true, true)) +
      section('Meeting record', detail('Notes / discussion', m.notes, true) + detail('Outcome', m.outcome, true) + detail('Decisions', m.decisions, true) + detail('Action items / owners / deadlines', m.actionItems, true)) +
      section('Next steps & reminders', detail('Follow-up status', m.followUpStatus) + detail('Next contact', m.followUpAt ? date(m.followUpAt) : '') + detail('Authorised person to contact', m.followUpPerson || m.person) + detail('Reminder', `${m.reminderHours} hour(s) before · ${m.emailReminder ? 'Dashboard + internal email' : 'Dashboard'}`) + detail('Follow-up action', m.followUpAction, true)) +
      (m.previousMeetingId ? `<button class="mt-btn" data-previous="${safeAttr(m.previousMeetingId)}">← Previous meeting</button>` : '') +
      (meetings.some(x => x.previousMeetingId === m.id) ? '<section class="meeting-section"><h3>Continued meetings</h3>' + meetings.filter(x => x.previousMeetingId === m.id).map(x => `<button class="meeting-upcoming" data-meeting="${safeAttr(x.id)}"><strong>${esc(x.title)}</strong>${esc(date(x.startsAt))}</button>`).join('') + '</section>' : '');
    if (!drawer.open) drawer.showModal();
    drawer.scrollTop = 0;
  }
  async function open(id) {
    if (saving) return;
    try { const meeting = await request('/' + encodeURIComponent(id)); showDetails(meeting); }
    catch (error) { toast(error.message); }
  }
  const formGroups = [
    ['Schedule', [
      ['title', 'Meeting title', 'text', true, true], ['status', 'Status', ['Scheduled', 'Completed', 'Cancelled']],
      ['mode', 'Mode', ['In person', 'Video call', 'Phone call']], ['startsAt', 'Date & time (IST)', 'datetime-local', true], ['endsAt', 'End time (IST)', 'datetime-local'],
      ['location', 'Location', 'text'], ['meetingUrl', 'Meeting link', 'url'],
    ]],
    ['People & entity', [
      ['person', 'With whom', 'text', true], ['designation', 'Post / designation', 'text'], ['entity', 'Entity / organisation', 'text', true],
      ['coreFunctionality', 'Core functionality of the entity', 'text'], ['email', 'Contact email', 'email'], ['phone', 'Contact phone', 'tel'],
      ['owner', 'DAD owner', 'text'], ['attendees', 'Other attendees', 'text'],
    ]],
    ['Preparation', [['agenda', 'Agenda / objectives', 'textarea', false, true], ['documentUrl', 'Documents link', 'url', false, true]]],
    ['After the meeting', [
      ['notes', 'Notes / discussion', 'textarea', false, true], ['outcome', 'Outcome (required when completed)', 'textarea', false, true],
      ['decisions', 'Decisions', 'textarea', false, true], ['actionItems', 'Action items, owners & deadlines', 'textarea', false, true],
    ]],
    ['Follow-up & reminders', [
      ['followUpStatus', 'Follow-up status', ['Not needed', 'Pending', 'Done']], ['followUpAt', 'Next contact date & time (IST)', 'datetime-local'],
      ['followUpPerson', 'Authorised person to contact again', 'text', false, true], ['followUpAction', 'Next action / reason to reconnect', 'textarea', false, true],
      ['reminderHours', 'Remind me before', [['0', 'At the scheduled time'], ['1', '1 hour'], ['24', '1 day'], ['48', '2 days']]],
    ]],
  ];
  function field([key, label, type, required, full], values) {
    const raw = values[key] ?? '';
    const value = type === 'datetime-local' ? model.toInput(raw) : raw;
    const attrs = `id="field-${key}" name="${key}" ${required ? 'required' : ''}`;
    let input;
    if (Array.isArray(type)) input = `<select ${attrs}>${type.map(option => { const [v, text] = Array.isArray(option) ? option : [option, option]; return `<option value="${safeAttr(v)}" ${String(raw) === v ? 'selected' : ''}>${esc(text)}</option>`; }).join('')}</select>`;
    else if (type === 'textarea') input = `<textarea ${attrs} maxlength="2000" rows="3">${esc(value)}</textarea>`;
    else input = `<input ${attrs} type="${type}" value="${safeAttr(value)}" maxlength="${type === 'email' || type === 'tel' ? 100 : 2000}">`;
    return `<div class="meeting-field ${full ? 'full' : ''}"><label for="field-${key}">${label}${required ? ' *' : ''}</label>${input}</div>`;
  }
  function edit(values = {}, isNew = false) {
    editing = true;
    if (isNew) current = null;
    const defaults = { status: 'Scheduled', mode: 'In person', followUpStatus: 'Not needed', reminderHours: 24, ...values };
    $('drawerHeading').textContent = isNew ? 'Schedule a meeting' : 'Update meeting';
    $('drawerEyebrow').textContent = isNew ? 'NEW CONVERSATION' : 'KEEP THE RECORD COMPLETE';
    $('meetingDrawerBody').innerHTML = `<form id="meetingForm"><p class="meeting-help">All times are in IST (Asia/Kolkata). Fields marked * are required. Add notes and outcomes after your meeting.</p>${formGroups.map(([title, fields]) => `<section class="meeting-section"><h3>${title}</h3><div class="meeting-form-grid">${fields.map(f => field(f, defaults)).join('')}</div></section>`).join('')}
      <div class="meeting-field"><label><input type="checkbox" name="emailReminder" ${defaults.emailReminder ? 'checked' : ''} ${emailAvailable ? '' : 'disabled'}>Email reminders to the internal DAD inbox</label></div><p class="meeting-help">${emailAvailable ? 'Checked every 5 minutes. No invitation or email is sent to the meeting contact.' : 'Email reminders are not configured. Dashboard reminders remain available.'} Follow-up reminders stay visible until marked Done. Record a separate meeting using “Schedule next meeting”.</p>
      <div id="meetingFormError" class="meeting-error" role="alert" hidden></div><div class="meeting-form-footer"><button type="button" class="mt-btn" data-cancel>Cancel</button><button class="mt-btn primary" type="submit" id="saveMeeting">${isNew ? 'Create meeting' : 'Save changes'}</button></div></form>`;
    $('meetingForm').dataset.previous = values.previousMeetingId || '';
    $('meetingForm').addEventListener('submit', save);
    const syncRequired = () => {
      $('field-outcome').required = $('field-status').value === 'Completed';
      const follow = $('field-followUpStatus').value === 'Pending';
      $('field-followUpAt').required = follow;
      $('field-followUpAction').required = follow;
    };
    $('field-status').addEventListener('change', syncRequired);
    $('field-followUpStatus').addEventListener('change', syncRequired);
    syncRequired();
    if (!drawer.open) drawer.showModal();
    drawer.scrollTop = 0;
    $('field-title').focus();
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const form = event.target;
    const values = Object.fromEntries(new FormData(form));
    for (const key of ['startsAt', 'endsAt', 'followUpAt']) values[key] = model.fromInput(values[key]);
    values.reminderHours = Number(values.reminderHours);
    values.emailReminder = form.elements.emailReminder.checked;
    values.previousMeetingId = form.dataset.previous;
    if (current) values.lastEdited = current.lastEdited;
    saving = true;
    $('saveMeeting').disabled = true;
    $('saveMeeting').textContent = 'Saving to Notion…';
    $('meetingFormError').hidden = true;
    try {
      const saved = await request(current ? '/' + current.id : '', { method: current ? 'PUT' : 'POST', body: JSON.stringify(values) });
      meetings = [saved, ...meetings.filter(m => m.id !== saved.id)];
      tab = model.inTab(saved, 'upcoming') ? 'upcoming' : 'past';
      render(); showDetails(saved); toast('Meeting saved to Notion');
    } catch (error) {
      $('meetingFormError').textContent = error.message;
      $('meetingFormError').hidden = false;
      $('saveMeeting').disabled = false;
      $('saveMeeting').textContent = 'Save meeting';
    } finally { saving = false; }
  }
  function close() { if (saving) return; drawer.close(); editing = false; current = null; if (refreshNeeded) { refreshNeeded = false; load().catch(() => {}); } }
  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.meeting) open(target.dataset.meeting);
    else if (target.dataset.previous) open(target.dataset.previous);
    else if (target.dataset.tab) { tab = target.dataset.tab; render(); }
    else if (target.hasAttribute('data-new') || target.id === 'newMeeting') edit({}, true);
    else if (target.hasAttribute('data-edit')) edit(current);
    else if (target.hasAttribute('data-complete')) { edit({ ...current, status: 'Completed' }); $('field-outcome').focus(); }
    else if (target.hasAttribute('data-follow')) {
      const m = current;
      edit({ title: `Follow-up: ${m.title}`.slice(0, 2000), person: m.followUpPerson || m.person, designation: m.designation, entity: m.entity, coreFunctionality: m.coreFunctionality, email: m.email, phone: m.phone, owner: m.owner, attendees: m.attendees, mode: m.mode, agenda: m.followUpAction, previousMeetingId: m.id }, true);
    } else if (target.hasAttribute('data-cancel')) { if (current) showDetails(current); else close(); }
    else if (target.hasAttribute('data-retry')) start();
  });
  $('closeMeeting').addEventListener('click', close);
  drawer.addEventListener('cancel', event => { event.preventDefault(); close(); });
  $('meetingSearch').addEventListener('input', render);
  $('meetingDate').textContent = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  async function start() {
    try {
      await load();
      const id = new URLSearchParams(location.search).get('meeting');
      if (id) await open(id);
    } catch (error) {
      $('meetingList').innerHTML = `<div class="meeting-empty"><h3>Meetings unavailable</h3><p>${esc(error.message)}</p><button class="mt-btn" data-retry>Try again</button></div>`;
      $('meetingUpcoming').textContent = 'Unable to load upcoming meetings.';
    }
  }
  setInterval(() => { if (drawer.open || saving || editing) { refreshNeeded = true; return; } load().catch(() => {}); }, 60000);
  start();
})();
