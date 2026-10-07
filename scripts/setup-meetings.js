require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('node:fs');
const path = require('node:path');
const { databaseProperties } = require('../server/meeting-schema');

async function setup() {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const team = await notion.databases.retrieve({ database_id: '2c93329f-8fc8-42bf-a083-2dad0daa5e17' });
  if (team.parent.type !== 'page_id') throw new Error('Team database must have a page parent');
  const matches = [];
  let cursor;
  do {
    const result = await notion.search({ query: 'Meetings', filter: { value: 'database', property: 'object' }, start_cursor: cursor });
    matches.push(...result.results.filter(d => d.parent.page_id === team.parent.page_id && d.title.map(t => t.plain_text).join('') === 'Meetings'));
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  if (matches.length > 1) throw new Error('Multiple Meetings databases found; select one manually');
  const database = matches[0] || await notion.databases.create({
    parent: { type: 'page_id', page_id: team.parent.page_id },
    title: [{ type: 'text', text: { content: 'Meetings' } }],
    description: [{ type: 'text', text: { content: 'DAD meeting schedules, past meeting records, outcomes, action items and follow-ups. Dashboard times use Asia/Kolkata. Email reminders go only to the configured internal DAD inbox.' } }],
    icon: { type: 'emoji', emoji: '📅' },
    properties: databaseProperties(),
  });
  const missing = Object.keys(databaseProperties()).filter(key => !database.properties[key]);
  if (missing.length) throw new Error(`Existing database is missing properties: ${missing.join(', ')}`);
  fs.writeFileSync(path.join(__dirname, '../server/meetings-config.json'), JSON.stringify({ databaseId: database.id, url: database.url }, null, 2) + '\n');
  console.log(JSON.stringify({ created: !matches.length, databaseId: database.id, url: database.url }));
}
setup().catch(error => { console.error(error.message); process.exitCode = 1; });
