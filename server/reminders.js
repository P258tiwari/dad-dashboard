require('dotenv').config();
const nodemailer = require('nodemailer');
const { getReminders } = require('./notion');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
});

async function sendReminders() {
  const today = new Date();
  const todayStr    = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 86_400_000).toISOString().split('T')[0];

  try {
    const reminders = await getReminders(2);
    let sent = 0;

    for (const r of reminders) {
      if (!r.date) continue;
      const isToday    = r.date === todayStr;
      const isTomorrow = r.date === tomorrowStr;
      if (!isToday && !isTomorrow) continue;

      const daysText = isToday ? 'today' : 'tomorrow';
      const via = Array.isArray(r.notifyVia) ? r.notifyVia : (r.notifyVia ? [r.notifyVia] : []);

      if (via.includes('Email') && process.env.EMAIL_FROM) {
        const to = r.email || process.env.EMAIL_TO;
        if (to) {
          await transporter.sendMail({
            from: `"DAD Reminders" <${process.env.EMAIL_FROM}>`,
            to,
            subject: `[DAD Reminder] ${r.title}`,
            html: buildEmail(r, daysText),
          }).catch(e => console.error('Email error:', e.message));
        }
      }

      if (via.includes('WhatsApp') && r.phone && process.env.CALLMEBOT_API_KEY) {
        const msg = `🔔 DAD Reminder: "${r.title}" is due ${daysText} (${r.date})`;
        const url = `https://api.callmebot.com/whatsapp.php?phone=${r.phone}&text=${encodeURIComponent(msg)}&apikey=${process.env.CALLMEBOT_API_KEY}`;
        await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(e => console.error('WhatsApp error:', e.message));
      }

      sent++;
    }
    console.log(`[Reminders] Processed ${sent} reminders at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Reminders] Error:', err.message);
  }
}

function buildEmail(r, daysText) {
  const badgeColor = daysText === 'today' ? '#e63946' : '#f4c430';
  const badgeText  = daysText === 'today' ? '#fff'    : '#1a1535';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#1a1535;color:#fff;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-size:28px;font-weight:800;padding:20px 0">
      D<span style="color:#e63946">+</span>D <span style="font-size:14px;font-weight:400;color:#a0a0c0">Doctors At Door</span>
    </div>
    <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;margin-top:16px">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">🔔 ${r.title}</div>
      <span style="background:${badgeColor};color:${badgeText};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">
        DUE ${daysText.toUpperCase()}
      </span>
      <div style="margin-top:16px;color:#a0a0c0;font-size:14px;line-height:1.6">
        <div><strong style="color:#fff">Date:</strong> ${r.date}</div>
        ${r.type  ? `<div><strong style="color:#fff">Type:</strong> ${r.type}</div>` : ''}
        ${r.notes ? `<div><strong style="color:#fff">Notes:</strong> ${r.notes}</div>` : ''}
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:#a0a0c0;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)">
      Automated reminder · Doctors At Door · team.doctoratdoor.com
    </div>
  </div>
</body></html>`;
}

module.exports = { sendReminders };
