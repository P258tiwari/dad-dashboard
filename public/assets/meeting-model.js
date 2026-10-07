(function (root) {
  const scheduled = meeting => meeting.status === 'Scheduled';
  const pending = meeting => meeting.status !== 'Cancelled' && meeting.followUpStatus === 'Pending' && !!meeting.followUpAt;
  function events(meetings, now = Date.now()) {
    return meetings.flatMap(meeting => {
      const result = [];
      const meetingEnd = meeting.endsAt ? Date.parse(meeting.endsAt) : Date.parse(meeting.startsAt) + 3600000;
      if (scheduled(meeting) && meetingEnd >= now) result.push({ kind: 'meeting', at: meeting.startsAt, meeting });
      if (pending(meeting)) result.push({ kind: 'followUp', at: meeting.followUpAt, meeting });
      return result;
    }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }
  function inTab(meeting, tab, now = Date.now()) {
    if (tab === 'upcoming') return scheduled(meeting) && Date.parse(meeting.startsAt) >= now;
    if (tab === 'past') return !scheduled(meeting) || Date.parse(meeting.startsAt) < now;
    if (tab === 'followups') return pending(meeting);
    return true;
  }
  function reminders(meetings, now = Date.now()) {
    return events(meetings, now).filter(event => {
      const lead = (event.meeting.reminderHours ?? 24) * 3600000;
      return Date.parse(event.at) - now <= lead;
    });
  }
  function emailCandidates(meetings, now = Date.now()) {
    return reminders(meetings, now).filter(event => {
      // Skip old follow-ups after a day; overdue work stays visible in the dashboard.
      if (!event.meeting.emailReminder || now - Date.parse(event.at) > 86400000) return false;
      return event.meeting[event.kind === 'meeting' ? 'meetingReminderSentFor' : 'followUpReminderSentFor'] !== signature(event);
    });
  }
  function signature(event) { return `${event.at}|${event.meeting.reminderHours ?? 24}`; }
  function toInput(value) {
    if (!value) return '';
    return new Date(Date.parse(value) + 19800000).toISOString().slice(0, 16);
  }
  function fromInput(value) { return value ? new Date(`${value}:00+05:30`).toISOString() : ''; }
  const model = { events, inTab, reminders, emailCandidates, signature, toInput, fromInput };
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.MeetingModel = model;
})(typeof window !== 'undefined' ? window : globalThis);
