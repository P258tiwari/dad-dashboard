const router = require('express').Router();
const meetings = require('../meetings');
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
function handle(fn) {
  return async (req, res) => {
    try { res.json({ success: true, data: await fn(req) }); }
    catch (error) {
      console.error('[Meetings]', error.code || error.statusCode || 'error', error.message);
      res.status(error.statusCode || 502).json({ success: false, error: error.statusCode ? error.message : 'Unable to sync meetings with Notion. Please try again.' });
    }
  };
}
router.get('/', handle(async () => ({ meetings: await meetings.list(), emailAvailable: meetings.emailAvailable(), notionUrl: `https://www.notion.so/${meetings.databaseId.replace(/-/g, '')}` })));
router.get('/:id', handle(req => meetings.get(req.params.id)));
router.post('/', handle(req => meetings.save(req.body)));
router.put('/:id', handle(req => meetings.save(req.body, req.params.id)));
module.exports = router;
