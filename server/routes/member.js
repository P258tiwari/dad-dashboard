const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { getMemberBySlug } = require('../notion');

const RESERVED = new Set([
  'login', 'api', 'assets', 'member', 'team', 'finance', 'marketing', 'apps',
  'reminders', 'tasks', 'social', 'favicon.ico', 'robots.txt',
]);

router.get('/:name', async (req, res, next) => {
  const slug = req.params.name.toLowerCase();
  if (RESERVED.has(slug)) return next();

  try {
    const member = await getMemberBySlug(slug);
    if (!member) return next(); // fall through to 404

    const templatePath = path.join(__dirname, '../../public/member/index.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    const injection = `<script>
window.__MEMBER__ = ${JSON.stringify({
  id:     member.id,
  name:   member.name,
  role:   member.role   || '',
  status: member.status || '',
  slug:   slug,
})};
</script>`;

    html = html.replace('</head>', injection + '\n</head>');
    res.send(html);
  } catch (err) {
    console.error('[member route]', err.message);
    next();
  }
});

module.exports = router;
