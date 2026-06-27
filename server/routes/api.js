const express = require('express');
const crypto = require('crypto');
const router  = express.Router();
const n = require('../notion');

const isProd = process.env.NODE_ENV === 'production';

// ── Simple in-memory rate limiter for login ────────────────────
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 min
  const maxAttempts = 10;

  let rec = loginAttempts.get(key);
  if (!rec || now - rec.start > window) {
    rec = { count: 0, start: now };
    loginAttempts.set(key, rec);
  }
  if (rec.count >= maxAttempts) {
    const wait = Math.ceil((window - (now - rec.start)) / 60000);
    return res.status(429).json({ success: false, error: `Too many attempts. Try again in ${wait} min.` });
  }
  rec.count++;
  next();
}

// ── Auth ───────────────────────────────────────────────────────
router.post('/auth/login', loginRateLimit, (req, res) => {
  const { password } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  const submittedPassword = typeof password === 'string' ? password : '';
  const configured = Buffer.from(configuredPassword);
  const submitted = Buffer.from(submittedPassword);
  const passwordMatches =
    configured.length > 0 &&
    configured.length === submitted.length &&
    crypto.timingSafeEqual(configured, submitted);

  if (passwordMatches) {
    const rec = loginAttempts.get(req.ip || 'unknown');
    if (rec) rec.count = 0; // reset on success
    req.session.regenerate(err => {
      if (err) {
        console.error('[auth] session regenerate failed', err.message);
        return res.status(500).json({ success: false, error: 'Unable to sign in' });
      }
      req.session.authenticated = true;
      res.json({ success: true });
    });
    return;
  }

  res.status(401).json({ success: false, error: 'Invalid password' });
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/auth/me', (req, res) => {
  res.json({ authenticated: !!req.session?.authenticated });
});

// ── Helper ────────────────────────────────────────────────────
function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req, res);
      if (data !== undefined) res.json({ success: true, data });
    } catch (err) {
      console.error('[API Error]', err.message);
      res.status(500).json({ success: false, error: isProd ? 'Internal server error' : (err.message || 'Internal error') });
    }
  };
}

// ── Team ──────────────────────────────────────────────────────
router.get('/team',         wrap(() => n.getTeamMembers()));
router.get('/team/salary',  wrap(() => n.getAllSalaryPayments()));
router.get('/team/:name',   wrap(req => n.getMemberBySlug(req.params.name)));

// ── Attendance (public — used by member pages) ────────────────
router.get('/attendance/:memberId', wrap(req => n.getAttendanceForMember(req.params.memberId)));
router.get('/attendance/today/:memberId', wrap(req => n.getTodayAttendance(req.params.memberId)));

router.post('/checkin', wrap(async req => {
  const { memberName, memberId, timestamp } = req.body;
  if (!memberName || !memberId) throw new Error('memberName and memberId required');
  const ts = timestamp || new Date().toISOString();
  const record = await n.createCheckIn(memberName, memberId, ts);
  return { id: record.id, checkIn: ts };
}));

router.post('/checkout', wrap(async req => {
  const { recordId, timestamp } = req.body;
  if (!recordId) throw new Error('recordId required');
  return n.updateCheckOut(recordId, timestamp || new Date().toISOString());
}));

// ── Finance ───────────────────────────────────────────────────
router.get('/finance/summary',      wrap(() => n.getFinanceSummary()));
router.get('/finance/transactions', wrap(async () => {
  const d = await n.getFinanceSummary();
  return d.allTransactions;
}));
router.get('/finance/tools',        wrap(() => n.getToolsTransactions()));
router.get('/finance/marketing',    wrap(() => n.getMarketingTransactions()));

// ── Tools & Assets ────────────────────────────────────────────
router.get('/tools-assets',         wrap(() => n.getToolsAssets()));

// ── Tasks ─────────────────────────────────────────────────────
router.get('/tasks', wrap(() => n.getMasterTasks()));
router.get('/tasks/member/:id', wrap(async req => {
  const [all, members] = await Promise.all([
    n.getMasterTasks(),
    n.getTeamMembers(),
  ]);
  const member = members.find(m => m.id === req.params.id);
  if (!member) return [];
  const memberName = String(member.name || '').toLowerCase();
  const firstName = memberName.split(/\s+/)[0];

  return all.filter(t => {
    const a = t.assignedTo;
    if (Array.isArray(a)) {
      return a.some(x => {
        const assignee = String(x || '').toLowerCase();
        return assignee === memberName || assignee.includes(firstName);
      });
    }
    if (typeof a === 'string') {
      const assignee = a.toLowerCase();
      return assignee === memberName || assignee.includes(firstName);
    }
    return false;
  });
}));

// ── Campaigns ─────────────────────────────────────────────────
router.get('/campaigns', wrap(() => n.getAdsCampaigns()));

// ── Applications ──────────────────────────────────────────────
router.get('/apps',        wrap(() => n.getApplications()));
router.get('/apps/phases', wrap(() => n.getPhaseTracker()));
router.get('/apps/roadmap',wrap(() => n.getRoadmap()));

// ── Social ────────────────────────────────────────────────────
router.get('/social',     wrap(() => n.getSocialAccounts()));
router.get('/social/log', wrap(() => n.getSocialLogThisMonth()));

// ── Reminders ─────────────────────────────────────────────────
router.get('/reminders', wrap(() => n.getReminders(30)));

router.patch('/reminders/:id/advance', wrap(async req => {
  const { id } = req.params;
  const { frequency, currentDate } = req.body;
  if (!currentDate) throw new Error('currentDate required');

  const date = new Date(currentDate);
  if (isNaN(date.getTime())) throw new Error('Invalid currentDate');

  const freq = (frequency || '').toLowerCase();
  if (freq.includes('daily') || freq === 'day') {
    date.setDate(date.getDate() + 1);
  } else if (freq.includes('week')) {
    date.setDate(date.getDate() + 7);
  } else if (freq.includes('month')) {
    date.setMonth(date.getMonth() + 1);
  } else if (freq.includes('quarter')) {
    date.setMonth(date.getMonth() + 3);
  } else if (freq.includes('year') || freq.includes('annual')) {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    throw new Error('Cannot advance a one-time reminder');
  }

  const newDate = date.toISOString().split('T')[0];
  return n.updateReminderDate(id, newDate);
}));

// ── Salary (used by member pages — no auth needed for own data) ─
router.get('/salary/:memberId', wrap(req => n.getSalaryForMember(req.params.memberId)));

// ── Marketing aggregate ───────────────────────────────────────
router.get('/marketing', wrap(async () => {
  const [campaigns, influencers, physical, social, socialLog] = await Promise.all([
    n.getAdsCampaigns(), n.getInfluencers(), n.getPhysicalMarketing(),
    n.getSocialAccounts(), n.getSocialLogThisMonth(),
  ]);
  return { campaigns, influencers, physical, social, socialLog };
}));

// ── Competitors ───────────────────────────────────────────────
router.get('/competitors', wrap(() => n.getCompetitors()));

// ── Panel & Empanelment ───────────────────────────────────────
router.get('/certificates', wrap(() => n.getPanelMembers()));

// ── KPIs ──────────────────────────────────────────────────────
router.get('/kpis', wrap(() => n.getKPIs()));

module.exports = router;
