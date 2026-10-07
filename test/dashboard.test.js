const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const quotedName = 'Example "Name" <test> & Co';
const fixtures = {
  '/team': [{ name: quotedName, role: 'Developer', status: ['Active'], email: 'test@example.com' }],
  '/team/salary': [],
  '/apps': [{ name: quotedName, status: 'In Development', currentPhase: 'Development' }],
  '/apps/phases': [{ name: quotedName, status: 'In Progress' }],
  '/apps/roadmap': [{ name: quotedName, status: 'Planned' }],
  '/tasks': [{ name: quotedName, status: 'In Progress', priority: 'High' }],
};

// A small DOM adapter exercises the real page initialization and rendering code.
// Fixtures contain records: empty arrays would miss the original rendering crash.
async function renderPage(page, data) {
  const nodes = new Map();
  function element() {
    return {
      innerHTML: '', textContent: '', style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {},
      appendChild(child) { nodes.set(child.id, child); },
      insertAdjacentHTML(_position, html) { this.innerHTML += html; },
    };
  }
  const errors = [];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, element());
        return nodes.get(id);
      },
      querySelectorAll: () => [], addEventListener() {}, createElement: element,
    },
    window: { location: { origin: 'http://localhost' } },
    console: { error: error => errors.push(error) },
    setTimeout() {}, URL,
    IntersectionObserver: class { observe() {} disconnect() {} },
    fetch: async url => {
      const key = url.replace(/^\/api/, '');
      assert.ok(Object.hasOwn(data, key), `Unexpected API request: ${key}`);
      return { ok: true, json: async () => ({ success: true, data: data[key] }) };
    },
    ico: () => '',
  });
  vm.runInContext(read('public/assets/dashboard.js'), context);
  const scripts = [...read(`public/${page}.html`).matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, script] of scripts) await vm.runInContext(script, context);
  assert.deepEqual(errors.map(e => e.message), [], `${page} should render without errors`);
  return { context, nodes };
}

for (const [page, container] of [['team', 'tmCards'], ['apps', 'cardList'], ['tasks', 'taskCards']]) {
  test(`${page} renders nonempty data with escaped attributes`, async () => {
    const { context, nodes } = await renderPage(page, fixtures);
    assert.ok(nodes.get(container).innerHTML.includes('title="Example &quot;Name&quot; &lt;test&gt; &amp; Co"'));
    assert.equal(context.safeAttr(null), '');
    assert.equal(context.safeAttr("'"), '&#39;');
    if (page === 'team') {
      vm.runInContext('openDrawer(0, 0)', context);
      assert.ok(nodes.get('drawerBody').innerHTML.includes('mailto:test@example.com'));
    }
    if (page === 'apps') {
      for (const tab of ['phases', 'roadmap']) {
        assert.doesNotThrow(() => vm.runInContext(`_activeTab = '${tab}'; renderCards()`, context));
      }
    }
  });
}

test('KPIs accept multi-select, scalar, and absent team statuses', async () => {
  const context = vm.createContext({
    require: name => name === 'dotenv' ? { config() {} } : { Client: class {} },
    process: { env: {} }, module: { exports: {} },
  });
  vm.runInContext(read('server/notion.js'), context);
  vm.runInContext(`
    getTeamMembers = async () => [
      {status: ['Active']}, {status: 'Active'}, {status: ['Inactive']},
      {status: null}, {status: []}, {status: ['Other', 'Active']}
    ];
    getMasterTasks = getAdsCampaigns = getApplications = async () => [];
    getFinanceSummary = async () => ({thisMonth: {credit: 0}});
  `, context);
  assert.equal((await context.getKPIs()).activeTeamMembers, 3);
});

if (process.env.LIVE_NOTION_TESTS === '1') {
  test('all three pages render current Notion records', async () => {
    const notion = require('../server/notion');
    const data = {};
    for (const [route, method] of Object.entries({
      '/team': 'getTeamMembers', '/team/salary': 'getAllSalaryPayments',
      '/apps': 'getApplications', '/apps/phases': 'getPhaseTracker',
      '/apps/roadmap': 'getRoadmap', '/tasks': 'getMasterTasks',
    })) data[route] = await notion[method]();
    for (const page of ['team', 'apps', 'tasks']) await renderPage(page, data);
  });
}
