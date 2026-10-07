const fields = {
  title: ['Meeting Title', 'title'],
  status: ['Status', 'select', ['Scheduled', 'Completed', 'Cancelled']],
  startsAt: ['Meeting Date', 'date'],
  endsAt: ['End Time', 'date'],
  person: ['With Whom', 'rich_text'],
  designation: ['Post / Designation', 'rich_text'],
  entity: ['Entity', 'rich_text'],
  coreFunctionality: ['Core Functionality', 'rich_text'],
  email: ['Contact Email', 'email'],
  phone: ['Contact Phone', 'phone_number'],
  owner: ['DAD Owner', 'rich_text'],
  attendees: ['Other Attendees', 'rich_text'],
  mode: ['Mode', 'select', ['In person', 'Video call', 'Phone call']],
  location: ['Location', 'rich_text'],
  meetingUrl: ['Meeting Link', 'url'],
  agenda: ['Agenda / Objectives', 'rich_text'],
  notes: ['Meeting Notes', 'rich_text'],
  outcome: ['Outcome', 'rich_text'],
  decisions: ['Decisions', 'rich_text'],
  actionItems: ['Action Items / Owners / Deadlines', 'rich_text'],
  documentUrl: ['Documents Link', 'url'],
  followUpAt: ['Follow-up Date', 'date'],
  followUpPerson: ['Follow-up Person', 'rich_text'],
  followUpAction: ['Follow-up Action', 'rich_text'],
  followUpStatus: ['Follow-up Status', 'select', ['Not needed', 'Pending', 'Done']],
  previousMeetingId: ['Previous Meeting ID', 'rich_text'],
  reminderHours: ['Reminder Hours Before', 'number'],
  emailReminder: ['Email Reminder', 'checkbox'],
};

function databaseProperties() {
  const properties = {};
  for (const [name, type, options] of Object.values(fields)) {
    properties[name] = { [type]: type === 'select' ? { options: options.map(name => ({ name })) } : {} };
  }
  properties['Meeting Reminder Sent For'] = { rich_text: {} };
  properties['Follow-up Reminder Sent For'] = { rich_text: {} };
  properties['Last Edited'] = { last_edited_time: {} };
  return properties;
}

module.exports = { fields, databaseProperties };
