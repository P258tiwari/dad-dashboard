require('dotenv').config();
const { Client } = require('@notionhq/client');
const { fields } = require('./meeting-schema');
const config = require('./meetings-config.json');
const databaseId = process.env.NOTION_MEETINGS_DB_ID || config.databaseId;
const client = new Client({ auth: process.env.NOTION_TOKEN });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sameId = (a, b) => String(a).replace(/-/g, '') === String(b).replace(/-/g, '');
const textValue = property => (property?.[property.type] || []).map(t => t.plain_text ?? t.text?.content ?? '').join('');
const richText = value => value ? [{ text: { content: value } }] : [];
function fail(message, status = 400) { const error = new Error(message); error.statusCode = status; throw error; }

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Meeting details are required');
  const record = {};
  for (const [key, [label, type, options]] of Object.entries(fields)) {
    let value = input[key];
    if (type === 'checkbox') {
      if (value != null && typeof value !== 'boolean') fail(`${label} must be true or false`);
      value = value ?? false;
    } else if (type === 'number') {
      value = value ?? 24;
      if (![0, 1, 24, 48].includes(value)) fail('Choose a valid reminder interval');
    } else {
      if (value != null && typeof value !== 'string') fail(`${label} must be text`);
      value = (value || '').trim();
      if (value.length > (type === 'email' || type === 'phone_number' ? 100 : 2000)) fail(`${label} is too long`);
      if (type === 'date' && value) {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${label} needs a valid date, time and timezone`);
        if (new Date(value.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23) fail(`${label} is not a valid calendar date or time`);
        value = new Date(value).toISOString();
      }
      if (type === 'select' && value && !options.includes(value)) fail(`Invalid ${label}`);
      if (type === 'url' && value) {
        try { if (!['https:', 'http:'].includes(new URL(value).protocol)) throw new Error(); }
        catch { fail(`${label} must be an http or https URL`); }
      }
      if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('Enter a valid contact email');
    }
    record[key] = value;
  }
  record.status ||= 'Scheduled';
  record.mode ||= 'In person';
  record.followUpStatus ||= 'Not needed';
  for (const key of ['title', 'startsAt', 'person', 'entity']) if (!record[key]) fail(`${fields[key][0]} is required`);
  if (record.endsAt && record.endsAt <= record.startsAt) fail('End time must be after the meeting start');
  if (record.status === 'Completed' && !record.outcome) fail('Add the meeting outcome before marking it completed');
  if (record.followUpStatus === 'Pending' && (!record.followUpAt || !record.followUpAction)) fail('Pending follow-ups need a date and an action');
  if (record.previousMeetingId && !uuid.test(record.previousMeetingId)) fail('Invalid previous meeting');
  return record;
}

function toProperties(record) {
  return Object.fromEntries(Object.entries(fields).map(([key, [name, type]]) => {
    const value = record[key];
    return [name, { [type]: ['title', 'rich_text'].includes(type) ? richText(value) : type === 'date' ? (value ? { start: value } : null) : type === 'select' ? (value ? { name: value } : null) : value === '' ? null : value }];
  }));
}

function fromPage(page) {
  const record = { id: page.id, lastEdited: page.last_edited_time, notionUrl: page.url };
  for (const [key, [name, type]] of Object.entries(fields)) {
    const p = page.properties[name];
    record[key] = ['title', 'rich_text'].includes(type) ? textValue(p) : type === 'date' ? p?.date?.start || '' : type === 'select' ? p?.select?.name || '' : p?.[type] ?? (type === 'checkbox' ? false : type === 'number' ? 24 : '');
  }
  record.meetingReminderSentFor = textValue(page.properties['Meeting Reminder Sent For']);
  record.followUpReminderSentFor = textValue(page.properties['Follow-up Reminder Sent For']);
  return record;
}

function createStore(notion = client, db = databaseId) {
  // Short-lived read cache; writes clear it before the next browser refresh.
  let cached, cachedAt = 0, inFlight, revision = 0;
  function invalidate() { cached = undefined; inFlight = undefined; revision++; }
  async function get(id) {
    if (!uuid.test(id)) fail('Invalid meeting ID');
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.archived || page.in_trash || !sameId(page.parent.database_id, db)) fail('Meeting not found', 404);
    return fromPage(page);
  }
  async function list() {
    if (cached && Date.now() - cachedAt < 15000) return cached;
    if (inFlight) return inFlight;
    const version = revision;
    const request = (async () => {
      const records = [];
      let cursor;
      do {
        const result = await notion.databases.query({ database_id: db, page_size: 100, start_cursor: cursor, sorts: [{ property: 'Meeting Date', direction: 'descending' }] });
        records.push(...result.results.map(fromPage));
        cursor = result.has_more ? result.next_cursor : undefined;
      } while (cursor);
      if (version === revision) { cached = records; cachedAt = Date.now(); }
      return records;
    })();
    inFlight = request;
    try { return await request; } finally { if (inFlight === request) inFlight = undefined; }
  }
  async function save(input, id) {
    const record = validate(input);
    if (record.emailReminder && !emailAvailable()) fail('Email reminders are not configured on this server');
    if (id) {
      const current = await get(id);
      if (!input.lastEdited || input.lastEdited !== current.lastEdited) fail('This meeting changed. Close and reopen it before saving.', 409);
    }
    if (record.previousMeetingId) {
      if (record.previousMeetingId === id) fail('A meeting cannot follow itself');
      await get(record.previousMeetingId);
    }
    const properties = toProperties(record);
    const page = id ? await notion.pages.update({ page_id: id, properties }) : await notion.pages.create({ parent: { database_id: db }, properties });
    invalidate();
    return fromPage(page);
  }
  async function markReminder(id, kind, signature) {
    await get(id);
    const name = kind === 'meeting' ? 'Meeting Reminder Sent For' : 'Follow-up Reminder Sent For';
    await notion.pages.update({ page_id: id, properties: { [name]: { rich_text: richText(signature) } } });
    invalidate();
  }
  return { list, get, save, markReminder };
}

function emailAvailable() { return !!(process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD && process.env.EMAIL_TO); }
const store = createStore();
module.exports = { ...store, validate, toProperties, fromPage, createStore, emailAvailable, databaseId };
