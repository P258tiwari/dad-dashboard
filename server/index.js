require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const cron    = require('node-cron');
const { sendReminders } = require('./reminders');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

// ── Startup env validation ─────────────────────────────────────
if (!process.env.NOTION_TOKEN) {
  console.warn('[WARN] NOTION_TOKEN is not set — Notion API calls will fail');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD is not set — dashboard login will not work');
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change_this_to_a_random_string_64chars') {
  console.warn('[WARN] SESSION_SECRET is using an insecure default — set a strong random value in .env');
}
if (isProd && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change_this_to_a_random_string_64chars')) {
  throw new Error('Production requires ADMIN_PASSWORD and a strong SESSION_SECRET');
}

// ── Security headers ───────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'self'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dad-dashboard-secret-changeme',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   isProd,
    sameSite: 'lax',
  },
}));

// ── Auth guard for HTML pages ──────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.redirect('/login');
}

// ── Public static assets (CSS, JS — no auth needed) ───────────
app.use('/assets/images/Docs', requireAuth, express.static(path.join(__dirname, '../public/assets/images/Docs'), {
  maxAge: 0,
  etag: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'private, no-store');
  },
}));

app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
  maxAge: isProd ? '7d' : 0,
  etag:   true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  },
}));

// ── Login page ────────────────────────────────────────────────
app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/login.html')));

// ── API routes ────────────────────────────────────────────────
const apiRouter = require('./routes/api');

// Public API paths are limited to login and member self-service flows.
// Admin-wide team, payroll, finance, marketing, and report data must stay behind auth.
const PUBLIC_API_PREFIXES = [
  '/auth/',
  '/attendance/',
  '/checkin',
  '/checkout',
  '/salary/',
  '/tasks/member/',
];

app.use('/api', (req, res, next) => {
  if (PUBLIC_API_PREFIXES.some(p => req.path.startsWith(p))) return next();
  if (!req.session?.authenticated)
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  next();
}, apiRouter);

// ── Protected admin HTML pages ────────────────────────────────
const PAGES = {
  '/':             'index.html',
  '/team':         'team.html',
  '/competitors':  'competitors.html',
  '/finance':      'finance.html',
  '/marketing':    'marketing.html',
  '/apps':         'apps.html',
  '/reminders':    'reminders.html',
  '/tasks':        'tasks.html',
  '/social':        'social.html',
  '/certificates':  'certificates.html',
};

Object.entries(PAGES).forEach(([route, file]) => {
  app.get(route, requireAuth, (req, res) =>
    res.sendFile(path.join(__dirname, '../public', file)));
});

// ── Member pages (public, wildcard) ───────────────────────────
app.use('/', require('./routes/member'));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).send(`
  <html><body style="font-family:Arial,Helvetica,sans-serif;background:#F0F2F8;color:#1A2035;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center;background:#fff;border:1px solid #E4E7EF;border-radius:20px;padding:48px 56px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <div style="font-size:42px;font-weight:800;margin-bottom:8px">D<span style="color:#F05252">+</span>D</div>
      <div style="font-size:22px;font-weight:700;margin:14px 0 8px">404 — Page not found</div>
      <div style="font-size:14px;color:#8A94A6;margin-bottom:24px">The page you're looking for doesn't exist.</div>
      <a href="/" style="display:inline-block;padding:11px 24px;background:#141414;color:#fff;border-radius:10px;font-weight:700;font-size:14px">← Back to Dashboard</a>
    </div>
  </body></html>`));

// ── Cron: daily reminders at 8:00 AM IST (2:30 UTC) ──────────
cron.schedule('30 2 * * *', sendReminders, { timezone: 'UTC' });

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥 DAD Dashboard running → http://localhost:${PORT}`);
  console.log(`   Admin:  http://localhost:${PORT}/`);
  console.log(`   Member: http://localhost:${PORT}/aman\n`);
});
