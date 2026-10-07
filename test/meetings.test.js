const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, toProperties, fromPage, createStore } = require('../server/meetings');
const model = require('../public/assets/meeting-model');
const base = { title: 'Partnership discussion', person: 'Example Contact', entity: 'Example Entity', startsAt: '2026-10-08T15:00:00+05:30' };
const db = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
function page(record, parent = db) {
  const properties = toProperties(validate(record));
  for (const property of Object.values(properties)) property.type = Object.keys(property)[0];
  return { id, parent: { database_id: parent }, last_edited_time: '2026-10-07T00:00:00.000Z', properties, url: 'https://notion.so/' + id };
}
test('meeting schedule uses explicit IST and round-trips every field', () => {
  const values = validate({ ...base, notes: 'Line 1\nLine 2', status: 'Completed', outcome: 'Agreed next steps', followUpStatus: 'Pending', followUpAt: '2026-10-09T12:00:00+05:30', followUpAction: 'Send proposal', emailReminder: false });
  assert.equal(values.startsAt, '2026-10-08T09:30:00.000Z');
  const restored = fromPage(page(values));
  for (const key of Object.keys(values)) assert.equal(restored[key], values[key], key);
  assert.equal(model.toInput(values.startsAt), '2026-10-08T15:00');
  assert.equal(model.fromInput('2026-10-08T15:00'), values.startsAt);
});
test('invalid schedules and incomplete outcomes are rejected', () => {
  for (const patch of [
    { title: '' }, { person: '' }, { entity: '' }, { startsAt: '2026-10-08T15:00' },
    { startsAt: '2026-02-30T15:00:00+05:30' },
    { endsAt: '2026-10-08T14:00:00+05:30' }, { status: 'Completed' },
    { followUpStatus: 'Pending' }, { meetingUrl: 'javascript:alert(1)' },
    { email: 'invalid' }, { reminderHours: -1 }, { notes: 'x'.repeat(2001) }, { emailReminder: 'true' },
  ]) assert.throws(() => validate({ ...base, ...patch }), error => error.statusCode === 400);
});
test('upcoming, history and overdue follow-ups preserve past records', () => {
  const now = Date.parse('2026-10-09T00:00:00Z');
  const old = validate({ ...base, status: 'Completed', outcome: 'Discussed', followUpStatus: 'Pending', followUpAt: '2026-10-08T20:00:00Z', followUpAction: 'Reconnect' });
  assert.equal(model.inTab(old, 'past', now), true);
  assert.equal(model.inTab(old, 'upcoming', now), false);
  assert.equal(model.events([old], now)[0].kind, 'followUp');
  assert.equal(model.reminders([old], now).length, 1);
  assert.equal(model.events([{ ...old, followUpStatus: 'Done' }], now).length, 0);
  assert.equal(model.events([{ ...old, status: 'Cancelled' }], now).length, 0);
});
test('time-specific reminders survive polling delay and deduplicate persisted sends', () => {
  const meeting = validate({ ...base, emailReminder: true, reminderHours: 0 });
  const at = Date.parse(meeting.startsAt);
  assert.equal(model.emailCandidates([meeting], at - 1000).length, 0);
  const [event] = model.emailCandidates([meeting], at + 120000);
  assert.ok(event, 'zero-hour reminder must be picked up by the next cron tick');
  const sent = { ...meeting, meetingReminderSentFor: model.signature(event) };
  assert.equal(model.emailCandidates([sent], at + 180000).length, 0);
  assert.equal(model.emailCandidates([meeting], at + 7200000).length, 0);
  assert.equal(model.emailCandidates([{ ...meeting, emailReminder: false }], at).length, 0);
});
test('writes invalidate cache, protect database ownership and reject stale edits', async () => {
  let queries = 0, updates = 0, created = 0;
  let record = page(base);
  const notion = {
    databases: { query: async () => { queries++; return { results: [record], has_more: false }; } },
    pages: {
      retrieve: async () => record,
      create: async ({ properties }) => { created++; return { ...record, properties }; },
      update: async ({ properties }) => { updates++; record = { ...record, properties }; return record; },
    },
  };
  const store = createStore(notion, db);
  await Promise.all([store.list(), store.list()]);
  assert.equal(queries, 1);
  await store.save(base);
  assert.equal(created, 1);
  await store.list();
  assert.equal(queries, 2);
  await assert.rejects(store.save({ ...base, lastEdited: 'old' }, id), e => e.statusCode === 409);
  assert.equal(updates, 0);
  await store.save({ ...base, title: 'Updated', lastEdited: record.last_edited_time }, id);
  assert.equal(updates, 1);
  record.parent.database_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await assert.rejects(store.save({ ...base, lastEdited: record.last_edited_time }, id), e => e.statusCode === 404);
  assert.equal(updates, 1);
});
test('database pagination includes every meeting', async () => {
  const cursors = [];
  const store = createStore({ databases: { query: async args => {
    cursors.push(args.start_cursor);
    return { results: [page(base)], has_more: !args.start_cursor, next_cursor: args.start_cursor ? null : 'next' };
  } } }, db);
  assert.equal((await store.list()).length, 2);
  assert.deepEqual(cursors, [undefined, 'next']);
});
