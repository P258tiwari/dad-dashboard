const nodemailer = require('nodemailer');
const meetings = require('./meetings');
const model = require('../public/assets/meeting-model');
let running = false;
async function sendMeetingReminders() {
  if (running || !meetings.emailAvailable()) return;
  running = true;
  try {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD } });
    const candidates = model.emailCandidates(await meetings.list());
    for (const event of candidates) {
      // Re-read immediately before sending so edits/cancellations take effect.
      const latest = await meetings.get(event.meeting.id);
      const current = model.emailCandidates([latest]).find(e => e.kind === event.kind && model.signature(e) === model.signature(event));
      if (!current) continue;
      const date = new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      await transport.sendMail({
        from: `"DAD Meetings" <${process.env.EMAIL_FROM}>`, to: process.env.EMAIL_TO,
        subject: `[DAD ${event.kind === 'meeting' ? 'Meeting' : 'Follow-up'}] ${latest.title.replace(/[\r\n]/g, ' ')}`,
        text: `${latest.title}\nWhen: ${date} IST\nWith: ${event.kind === 'followUp' ? latest.followUpPerson || latest.person : latest.person}\nPost: ${latest.designation}\nEntity: ${latest.entity}\nDAD owner: ${latest.owner}\n${event.kind === 'followUp' ? latest.followUpAction : latest.agenda}\n\nView details: https://dashboard.doctorsatdoor.com/meetings?meeting=${latest.id}`,
      });
      await meetings.markReminder(latest.id, event.kind, model.signature(event));
    }
  } catch (error) { console.error('[Meeting reminders]', error.message); }
  finally { running = false; }
}
module.exports = { sendMeetingReminders };
