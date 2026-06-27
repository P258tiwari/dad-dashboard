require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ── Verified DB IDs (auto-discovered from workspace) ──────────
const DB = {
  TEAM:               '2c93329f-8fc8-42bf-a083-2dad0daa5e17',  // 👥 Team Details
  ATTENDANCE:         '5f99ff61-f6d2-4ded-99b5-f1792f30b480',  // ⏱️ Daily Attendance
  BANK_TRANSACTIONS:  '4fb515f7-d25d-4c7a-af4b-5b372a8f6e3f',  // 🏦 Bank Transactions
  TOOLS_ASSETS:       '30151534-daca-4800-a21b-dea058d85062',  // 🛠️ Tools & Assets
  SALARY_PAYMENTS:    'a4d9662c-c55f-44b1-9653-af287b3b19a9',  // 💸 Salary Payments
  LEGAL:              'cee4c13a-9927-4d65-9e08-3177fcc4a255',  // ⚖️ Legal Documents
  SOCIAL_ACCOUNTS:    '227fc6c8-875a-4c70-a09f-53ca3aff6917',  // 📱 Social Media Accounts
  MONTHLY_CALENDAR:   'da3c3908-46da-4909-997f-ab0ab859a04c',  // 📅 Monthly Content Calendar
  POSTING_CALENDAR:   'fab976c5-2086-478f-a639-a628ab55ebf9',  // 🗓️ Posting Calendar
  DAILY_SOCIAL_LOG:   '7c63e105-8c39-4742-8877-78492ec8c575',  // 📝 Daily Social Media Work Log
  ADS_CAMPAIGNS:      '329ee479-92e5-4272-a39a-959fd61e94af',  // 📢 Ads Campaigns
  INFLUENCER:         '9cc69147-3365-4027-aa6c-21c2ae1e80f4',  // 🤝 Influencer Marketing
  PHYSICAL_MARKETING: '3c37173c-f01e-46e7-bf62-09d7c8fa765e',  // 🏙️ Physical Marketing
  PRINT_MEDIA:        '42c62179-521b-4b7b-b36e-63df5b6f5f5a',  // 🖨️ Print Media
  APPLICATIONS:       '40a6413b-bc70-4fdb-ab41-11222cd217ec',  // 🚀 Applications Master
  PHASE_TRACKER:      '3e5991c4-0a41-473f-bd94-71a227aac886',  // 📋 Phase Tracker
  APP_TASKS:          '8374ef50-e9c5-41ce-9d22-dcb2232dcf4e',  // ✅ App Task & Checklist
  CHANGELOG:          '4d0e4966-3e0d-4202-8f9b-77bd43e35e3f',  // 📜 App Changelog
  ROADMAP:            '7c17bb1c-c3c8-4ca8-bcff-92c9e5482e5e',  // 🗺️ App Roadmap
  MASTER_TASKS:       'e181fb27-a381-48c3-9ede-76e0c98e46c5',  // 📌 Master Task List
  REMINDERS:          '0736054c-f7c5-4698-bf3e-68f33fe9cfd5',  // 🔔 Reminders & Notifications
  TOOLS_TRANSACTIONS:    'e5f4ecab-1793-443c-a519-33e3fcc049c1',  // 🛠️ Tools & Assets Transactions
  MARKETING_TRANSACTIONS:'9d400147-c53a-4842-87c4-2e684536931a',  // 💸 Marketing Transactions
  COMPETITORS:           '1a7d22a5-ba20-4420-bf75-08b34d5b4bd0',  // 🔍 Competitor Analysis
  PANEL_EMPANELMENT:     'b89ed294-d085-469c-8641-7aa2347e9ed7',  // 🤝 DAD Panel & Empanelment Directory
};

// ── Cache ──────────────────────────────────────────────────────
const cache = new Map();
const TTL = 60_000;

function getCached(key) {
  const e = cache.get(key);
  if (e && Date.now() - e.t < TTL) return e.d;
  cache.delete(key);
  return null;
}
function setCached(key, d) { cache.set(key, { d, t: Date.now() }); return d; }

// Returns { "uuid-without-dashes": "Member Name", ... }
async function getMemberMap() {
  const members = await getTeamMembers();
  return Object.fromEntries(members.map(m => [m.id.replace(/-/g, ''), m.name]));
}

function resolveIds(ids, map) {
  if (!ids) return null;
  const arr = Array.isArray(ids) ? ids : [ids];
  const names = arr.map(id => map[id.replace(/-/g, '')] || id);
  return names.length === 1 ? names[0] : names.join(', ');
}

// ── Property extractor ────────────────────────────────────────
function v(p) {
  if (!p) return null;
  try {
    switch (p.type) {
      case 'title':        return p.title.map(t => t.plain_text).join('').trim() || null;
      case 'rich_text':    return p.rich_text.map(t => t.plain_text).join('').trim() || null;
      case 'select':       return p.select?.name || null;
      case 'multi_select': return p.multi_select.map(s => s.name);
      case 'date':         return { start: p.date?.start || null, end: p.date?.end || null };
      case 'number':       return p.number;
      case 'checkbox':     return p.checkbox;
      case 'email':        return p.email;
      case 'phone_number': return p.phone_number;
      case 'url':          return p.url;
      case 'relation':     return p.relation.map(r => r.id);
      case 'people':       return p.people.map(x => x.name || x.id);
      case 'files':        return p.files.map(f => f.type === 'external' ? f.external.url : f.file?.url).filter(Boolean);
      case 'formula':
        if (p.formula.type === 'string') return p.formula.string;
        if (p.formula.type === 'number') return p.formula.number;
        if (p.formula.type === 'boolean') return p.formula.boolean;
        return null;
      case 'rollup': {
        const rt = p.rollup?.type;
        if (rt === 'number') return p.rollup.number ?? null;
        if (rt === 'array') {
          const arr = (p.rollup.array || []).map(a => v(a)).filter(x => x != null);
          return arr.length === 1 ? arr[0] : arr.length > 1 ? arr : null;
        }
        return null;
      }
      case 'created_time':      return p.created_time;
      case 'last_edited_time':  return p.last_edited_time;
      default: return null;
    }
  } catch { return null; }
}

function gp(page, ...names) {
  for (const n of names) {
    if (page.properties[n] !== undefined) return v(page.properties[n]);
  }
  return null;
}

// ── Paginated query with cache ─────────────────────────────────
async function queryAll(dbId, opts = {}) {
  const key = `${dbId}:${JSON.stringify(opts)}`;
  const hit = getCached(key);
  if (hit) return hit;

  const results = [];
  let cursor;
  do {
    const r = await notion.databases.query({
      database_id: dbId,
      filter:       opts.filter,
      sorts:        opts.sorts,
      start_cursor: cursor,
      page_size:    100,
    });
    results.push(...r.results);
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor);

  return setCached(key, results);
}

// ═══════════════════════════════════════════════════════════════
// TEAM  (title: "Member Name")
// ═══════════════════════════════════════════════════════════════
async function getTeamMembers() {
  const pages = await queryAll(DB.TEAM, {
    sorts: [{ property: 'Member Name', direction: 'ascending' }],
  });
  return pages.map(p => ({
    id:         p.id,
    name:       gp(p, 'Member Name'),
    role:       gp(p, 'Role'),
    status:     gp(p, 'Status'),
    email:      gp(p, 'Email ID'),
    phone:      gp(p, 'Phone Number'),
    city:       gp(p, 'City'),
    state:      gp(p, 'State'),
    joinDate:   gp(p, 'Starting Date')?.start,
    salary:     gp(p, 'Salary (₹/month)'),
    documents:  gp(p, 'Documents'),
  })).filter(m => m.name);
}

async function getMemberBySlug(slug) {
  const members = await getTeamMembers();
  const s = slug.toLowerCase();
  return members.find(m => {
    const parts = (m.name || '').toLowerCase().split(/\s+/);
    return parts[0] === s || (m.name || '').toLowerCase().replace(/\s+/g, '-') === s;
  }) || null;
}

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE  (Check-In/Out stored as rich_text timestamps)
// Properties: Record Title (title), Team Member (relation),
//             Date (date), Check-In Time (rich_text),
//             Check-Out Time (rich_text), Total Hours (number), Status (select)
// ═══════════════════════════════════════════════════════════════
async function getAttendanceForMember(memberId) {
  const since = new Date();
  since.setDate(since.getDate() - 31);

  const pages = await queryAll(DB.ATTENDANCE, {
    filter: {
      and: [
        { property: 'Team Member', relation: { contains: memberId } },
        { property: 'Date', date: { on_or_after: since.toISOString().split('T')[0] } },
      ],
    },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return pages.map(p => ({
    id:         p.id,
    title:      gp(p, 'Record Title'),
    date:       gp(p, 'Date')?.start,
    checkIn:    gp(p, 'Check-In Time'),   // stored as ISO string text
    checkOut:   gp(p, 'Check-Out Time'),  // stored as ISO string text
    totalHours: gp(p, 'Total Hours'),
    status:     gp(p, 'Status'),
  }));
}

async function getTodayAttendance(memberId) {
  const today = new Date().toISOString().split('T')[0];
  const r = await notion.databases.query({
    database_id: DB.ATTENDANCE,
    filter: {
      and: [
        { property: 'Team Member', relation: { contains: memberId } },
        { property: 'Date', date: { equals: today } },
      ],
    },
    page_size: 1,
  });
  if (!r.results.length) return null;
  const p = r.results[0];
  return {
    id:         p.id,
    date:       today,
    checkIn:    gp(p, 'Check-In Time'),
    checkOut:   gp(p, 'Check-Out Time'),
    totalHours: gp(p, 'Total Hours'),
    status:     gp(p, 'Status'),
  };
}

async function createCheckIn(memberName, memberId, timestamp) {
  const date    = new Date(timestamp).toISOString().split('T')[0];
  const timeStr = new Date(timestamp).toISOString();
  return notion.pages.create({
    parent: { database_id: DB.ATTENDANCE },
    properties: {
      'Record Title':  { title:    [{ text: { content: `${memberName} - ${date}` } }] },
      'Team Member':   { relation: [{ id: memberId }] },
      'Date':          { date:     { start: date } },
      'Check-In Time': { rich_text:[{ text: { content: timeStr } }] },
      'Status':        { select:   { name: 'Present' } },
    },
  });
}

async function updateCheckOut(recordId, timestamp) {
  const checkOut    = new Date(timestamp);
  const checkOutISO = checkOut.toISOString();

  // Read current record to get check-in time for hour calculation
  const page    = await notion.pages.retrieve({ page_id: recordId });
  const checkInStr = v(page.properties['Check-In Time']);
  let totalHours   = null;
  if (checkInStr) {
    const checkIn  = new Date(checkInStr);
    totalHours = Math.round(((checkOut - checkIn) / 3_600_000) * 100) / 100;
  }

  await notion.pages.update({
    page_id: recordId,
    properties: {
      'Check-Out Time': { rich_text: [{ text: { content: checkOutISO } }] },
      ...(totalHours != null ? { 'Total Hours': { number: totalHours } } : {}),
    },
  });
  return { checkOut: checkOutISO, totalHours };
}

// ═══════════════════════════════════════════════════════════════
// FINANCE  (title: "Transaction Title", amount: "Amount (₹)")
// ═══════════════════════════════════════════════════════════════
async function getFinanceSummary() {
  const pages = await queryAll(DB.BANK_TRANSACTIONS, {
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  const txns = pages.map(p => ({
    id:          p.id,
    name:        gp(p, 'Transaction Title'),
    date:        gp(p, 'Date')?.start,
    amount:      gp(p, 'Amount (₹)') || 0,
    type:        gp(p, 'Type'),
    category:    gp(p, 'Category'),
    description: gp(p, 'Reason / Description', 'Notes'),
    paymentMode: gp(p, 'Payment Mode'),
    bankAccount: gp(p, 'Bank Account'),
  }));

  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthly = {};
  const catBreakdown = {};

  txns.forEach(t => {
    if (!t.date) return;
    const mo   = t.date.substring(0, 7);
    if (!monthly[mo]) monthly[mo] = { credit: 0, debit: 0 };
    const type = (t.type || '').toLowerCase();
    if (type === 'credit' || type === 'income' || type === 'cr') {
      monthly[mo].credit += t.amount;
    } else if (type === 'debit' || type === 'expense' || type === 'dr') {
      monthly[mo].debit += t.amount;
      if (mo === currentMonth) {
        const cat = t.category || 'Other';
        catBreakdown[cat] = (catBreakdown[cat] || 0) + t.amount;
      }
    }
  });

  const cm = monthly[currentMonth] || { credit: 0, debit: 0 };
  return {
    thisMonth: { credit: cm.credit, debit: cm.debit, net: cm.credit - cm.debit },
    monthly: Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
      .map(([month, d]) => ({ month, ...d })),
    categoryBreakdown: catBreakdown,
    allTransactions: txns,
  };
}

async function getToolsAssets() {
  const pages = await queryAll(DB.TOOLS_ASSETS, {
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  });
  return pages.map(p => {
    // Universal title fallback
    const titleText = Object.values(p.properties || {})
      .find(v => v.type === 'title')?.title?.map(t => t.plain_text).join('') || null;
    return {
      id:          p.id,
      name:        gp(p, 'Tool / Asset Name') || gp(p, 'Name') || gp(p, 'Tool Name') || titleText,
      status:      gp(p, 'Status'),
      category:    gp(p, 'Category') || gp(p, 'Type'),
      priceUSD:       gp(p, 'Amount ($)')       || gp(p, 'Price ($)'),
      priceINR:       gp(p, 'Amount (₹)')       || gp(p, 'Price (₹)'),
      totalSpentUSD:  gp(p, 'Total Spent ($)', 'Total Spent($)', 'Spent ($)', 'Total ($)'),
      totalSpentINR:  gp(p, 'Total Spent (₹)', 'Total Spent(₹)', 'Spent (₹)', 'Total (₹)'),
      billing:        gp(p, 'Payment Cycle', 'Billing Cycle', 'Billing', 'Frequency'),
      website:        gp(p, 'Website', 'URL', 'Link', 'Website URL', 'Site'),
      notes:          gp(p, 'Notes'),
      purchaseDate:   gp(p, 'Date of Purchase')?.start || gp(p, 'Start Date')?.start,
      renewalDate:    gp(p, 'Renewal Date')?.start     || gp(p, 'Next Renewal')?.start,
    };
  }).filter(t => t.name);
}

async function getToolsTransactions() {
  const pages = await queryAll(DB.TOOLS_TRANSACTIONS, {
    sorts: [{ property: 'Transaction Date', direction: 'descending' }],
  });
  return pages.map(p => ({
    id:          p.id,
    name:        gp(p, 'Name'),
    amountUSD:   gp(p, 'Amount ($)'),
    amountINR:   gp(p, 'Amount (₹)'),
    date:        gp(p, 'Transaction Date')?.start,
    paymentMode: gp(p, 'Payment Mode'),
    paymentMonth:gp(p, 'Payment Month'),
    paymentType: gp(p, 'Payment Type'),
    status:      gp(p, 'Status'),
    notes:       gp(p, 'Notes'),
    invoice:     gp(p, 'Invoice / Receipt'),
  })).filter(t => t.name);
}

// ═══════════════════════════════════════════════════════════════
// TASKS  (title: "Task Name", relation: "Assigned To")
// ═══════════════════════════════════════════════════════════════
async function getMasterTasks() {
  const [pages, map] = await Promise.all([
    queryAll(DB.MASTER_TASKS, { sorts: [{ property: 'Due Date', direction: 'ascending' }] }),
    getMemberMap(),
  ]);
  return pages.map(p => ({
    id:          p.id,
    name:        gp(p, 'Task Name'),
    status:      gp(p, 'Status'),
    assignedTo:  resolveIds(gp(p, 'Assigned To'), map),
    dueDate:     gp(p, 'Due Date')?.start,
    startDate:   gp(p, 'Start Date')?.start,
    priority:    gp(p, 'Priority'),
    notes:       gp(p, 'Notes'),
    relatedApp:  gp(p, 'Related App'),
  })).filter(t => t.name);
}

// ═══════════════════════════════════════════════════════════════
// ADS CAMPAIGNS  (title: "Campaign Name", budget: "Budget (₹)")
// ═══════════════════════════════════════════════════════════════
async function getAdsCampaigns() {
  const [pages, map] = await Promise.all([queryAll(DB.ADS_CAMPAIGNS), getMemberMap()]);
  return pages.map(p => ({
    id:        p.id,
    name:      gp(p, 'Campaign Name'),
    platform:  gp(p, 'Platform'),
    status:    gp(p, 'Status'),
    budget:    gp(p, 'Budget (₹)'),
    startDate: gp(p, 'Start Date')?.start,
    endDate:   gp(p, 'End Date')?.start,
    goal:      gp(p, 'Ads Goal'),
    managedBy: resolveIds(gp(p, 'Managed By'), map),
    creative:  gp(p, 'Ad Creative Link'),
    notes:     gp(p, 'Notes'),
  })).filter(c => c.name);
}

// ═══════════════════════════════════════════════════════════════
// APPLICATIONS  (title: "App Name", status: "Overall Status")
// ═══════════════════════════════════════════════════════════════
async function getApplications() {
  const [pages, map] = await Promise.all([queryAll(DB.APPLICATIONS), getMemberMap()]);
  return pages.map(p => ({
    id:           p.id,
    name:         gp(p, 'App Name'),
    type:         gp(p, 'Type'),
    status:       gp(p, 'Overall Status'),
    currentPhase: gp(p, 'Current Phase'),
    launchDate:   gp(p, 'Date of Launch')?.start,
    devAssigned:  resolveIds(gp(p, 'Assigned Dev'), map),
    techStack:    gp(p, 'Tech Stack'),
    liveUrl:      gp(p, 'Live URL'),
    notes:        gp(p, 'Notes'),
  })).filter(a => a.name);
}

// ═══════════════════════════════════════════════════════════════
// PHASE TRACKER
// ═══════════════════════════════════════════════════════════════
async function getPhaseTracker() {
  const [pages, appPages, memberMap] = await Promise.all([
    queryAll(DB.PHASE_TRACKER, { sorts: [{ timestamp: 'created_time', direction: 'descending' }] }),
    queryAll(DB.APPLICATIONS),
    getMemberMap(),
  ]);

  // Build app id (no dashes) → display name map for relation resolution
  const appNameMap = {};
  appPages.forEach(a => {
    const name = gp(a, 'App Name');
    if (name) appNameMap[a.id.replace(/-/g, '')] = name;
  });

  return pages.map(p => {
    // Find title property by type — works regardless of what it's named in Notion
    const titleProp = Object.values(p.properties).find(prop => prop.type === 'title');
    const titleVal  = titleProp ? v(titleProp) : null;

    const dateRange = gp(p, 'Start Date', 'Start', 'Date') || {};
    const endField  = gp(p, 'End Date', 'Due Date', 'Target Date', 'Deadline');

    // Resolve app relation IDs → names; fall back to text value
    const appRaw = gp(p, 'Application', 'App', 'Project', 'Apps', 'App Name');
    let appName = null;
    if (Array.isArray(appRaw)) {
      const resolved = appRaw.map(id => appNameMap[String(id).replace(/-/g, '')] || null).filter(Boolean);
      appName = resolved.length ? resolved.join(', ') : null;
    } else {
      appName = appRaw || null;
    }

    // Resolve assignee: try people type first, then relation → member names
    const assigneeRaw = gp(p, 'Assigned To', 'Owner', 'Assignee', 'Team Member', 'Assigned');
    let assignee = null;
    if (Array.isArray(assigneeRaw)) {
      // If values look like UUIDs, resolve via memberMap; otherwise they're already names
      const isUuid = /^[0-9a-f-]{30,}$/i;
      const resolved = assigneeRaw
        .map(v => isUuid.test(String(v)) ? (memberMap[String(v).replace(/-/g,'')] || null) : v)
        .filter(Boolean);
      assignee = resolved[0] || null;
    } else {
      assignee = assigneeRaw || null;
    }

    return {
      id:         p.id,
      name:       gp(p, 'Version Name', 'Phase Name', 'Name', 'Title', 'Task') || titleVal,
      app:        appName,
      status:     gp(p, 'Phase', 'Status', 'Phase Status', 'Stage', 'State'),
      phase:      gp(p, 'Phase', 'Current Phase', 'Sprint', 'Stage'),
      startDate:  typeof dateRange === 'object' ? (dateRange.start || null) : null,
      endDate:    (endField && typeof endField === 'object' ? endField.start : null)
                  || (typeof dateRange === 'object' ? dateRange.end : null) || null,
      progress:   gp(p, 'Progress', 'Completion', 'Done %', '%', 'Percent'),
      assignedTo: assignee,
      priority:   gp(p, 'Priority'),
      notes:      gp(p, 'Notes', 'Description', 'Details'),
    };
  }).filter(p => p.name);
}

// ═══════════════════════════════════════════════════════════════
// ROADMAP  (DB display name: "App Roadmap & Future Planner")
// ═══════════════════════════════════════════════════════════════
async function getRoadmap() {
  const [pages, appPages] = await Promise.all([
    queryAll(DB.ROADMAP, { sorts: [{ timestamp: 'created_time', direction: 'descending' }] }),
    queryAll(DB.APPLICATIONS),
  ]);

  const appNameMap = {};
  appPages.forEach(a => {
    const name = gp(a, 'App Name');
    if (name) appNameMap[a.id.replace(/-/g, '')] = name;
  });

  return pages.map(p => {
    // Universal title fallback — always works regardless of property name
    const titleProp = Object.values(p.properties).find(prop => prop.type === 'title');
    const titleVal  = titleProp ? v(titleProp) : null;

    const dateField = gp(p, 'Target Date', 'Due Date', 'Launch Date', 'Date', 'Timeline', 'Deadline', 'Planned Date');

    const appRaw = gp(p, 'Application', 'App', 'Project', 'App Name', 'Apps');
    let appName = null;
    if (Array.isArray(appRaw)) {
      const resolved = appRaw.map(id => appNameMap[String(id).replace(/-/g, '')] || null).filter(Boolean);
      appName = resolved.length ? resolved.join(', ') : null;
    } else {
      appName = appRaw || null;
    }

    return {
      id:         p.id,
      name:       gp(p, 'Feature', 'Item', 'Name', 'Title', 'App Name', 'Roadmap Item', 'Task', 'Roadmap', 'Feature Name', 'Epic', 'Milestone') || titleVal,
      app:        appName,
      status:     gp(p, 'Status', 'Stage', 'State', 'Progress'),
      priority:   gp(p, 'Priority'),
      type:       gp(p, 'Type', 'Category', 'Label', 'Feature Type', 'Tag', 'Module'),
      targetDate: (dateField && typeof dateField === 'object') ? dateField.start : null,
      quarter:    gp(p, 'Quarter', 'Q', 'Sprint', 'Release', 'Timeline', 'Milestone', 'Period'),
      notes:      gp(p, 'Notes', 'Description'),
    };
  }).filter(r => r.name);
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL ACCOUNTS  (title: "Platform", handle: "Username / Handle")
// ═══════════════════════════════════════════════════════════════
async function getSocialAccounts() {
  const [pages, map] = await Promise.all([queryAll(DB.SOCIAL_ACCOUNTS), getMemberMap()]);
  return pages.map(p => ({
    id:        p.id,
    name:      gp(p, 'Platform'),  // title field IS the platform name
    platform:  gp(p, 'Platform'),
    handle:    gp(p, 'Username / Handle'),
    status:    gp(p, 'Status'),
    managedBy: resolveIds(gp(p, 'Managed By'), map),
    profileUrl:gp(p, 'Profile URL'),
    email:     gp(p, 'Email Used'),
    phone:     gp(p, 'Phone Linked'),
    notes:     gp(p, 'Notes'),
  })).filter(s => s.name);
}

// ═══════════════════════════════════════════════════════════════
// DAILY SOCIAL LOG  (title: "Task")
// ═══════════════════════════════════════════════════════════════
async function getSocialLogThisMonth() {
  const start = new Date();
  start.setDate(1);
  const pages = await queryAll(DB.DAILY_SOCIAL_LOG, {
    filter: { property: 'Date', date: { on_or_after: start.toISOString().split('T')[0] } },
  });
  return pages.map(p => ({
    id:          p.id,
    task:        gp(p, 'Task'),
    date:        gp(p, 'Date')?.start,
    platform:    gp(p, 'Platform'),     // multi_select
    workType:    gp(p, 'Work Type'),
    timeSpent:   gp(p, 'Time Spent (hrs)'),
    doneBy:      gp(p, 'Done By'),
    notes:       gp(p, 'Notes'),
  }));
}

// ═══════════════════════════════════════════════════════════════
// REMINDERS  (title: "Reminder Title", date: "Reminder Date")
// ═══════════════════════════════════════════════════════════════
async function getReminders(daysAhead = 30) {
  const [pages, toolsPages] = await Promise.all([
    queryAll(DB.REMINDERS, {
      sorts: [{ property: 'Reminder Date', direction: 'ascending' }],
    }),
    queryAll(DB.TOOLS_ASSETS).catch(() => []),
  ]);

  // Build tools id → amounts map for linked-item resolution
  const toolsMap = {};
  toolsPages.forEach(t => {
    toolsMap[t.id.replace(/-/g, '')] = {
      priceUSD: gp(t, 'Amount ($)', 'Price ($)', 'Cost ($)', 'Monthly ($)', 'Annual ($)') || null,
      priceINR: gp(t, 'Amount (₹)', 'Price (₹)', 'Cost (₹)', 'Monthly (₹)', 'Annual (₹)') || null,
    };
  });

  return pages.map(p => {
    // Try direct fields first, then fall back to linked tool
    let priceUSD = gp(p, 'Amount ($)', 'Price ($)', 'Cost ($)', 'Monthly Amount ($)', 'Annual Amount ($)') || null;
    let priceINR = gp(p, 'Amount (₹)', 'Price (₹)', 'Cost (₹)', 'Monthly Amount (₹)', 'Annual Amount (₹)') || null;

    const linkedIds = gp(p, 'Tools', 'Tool', 'Application', 'Linked Tool', 'Service', 'Subscription', 'Linked Item', 'Item', 'Linked Application') || [];
    if (!priceUSD && !priceINR && Array.isArray(linkedIds) && linkedIds.length) {
      const linked = toolsMap[String(linkedIds[0]).replace(/-/g, '')];
      if (linked) { priceUSD = linked.priceUSD; priceINR = linked.priceINR; }
    }

    return {
      id:        p.id,
      title:     gp(p, 'Reminder Title'),
      date:      gp(p, 'Reminder Date')?.start,
      type:      gp(p, 'Type'),
      frequency: gp(p, 'Frequency'),
      notifyVia: gp(p, 'Notify Via'),
      status:    gp(p, 'Status'),
      phone:     gp(p, 'WhatsApp Number'),
      email:     gp(p, 'Email Address'),
      notes:     gp(p, 'Notes'),
      priceUSD,
      priceINR,
    };
  }).filter(r => r.title);
}

// ═══════════════════════════════════════════════════════════════
// REMINDERS — update date (advance to next cycle)
// ═══════════════════════════════════════════════════════════════
async function updateReminderDate(reminderId, newDateStr) {
  // Clear all cached reminder queries so next fetch is fresh
  for (const key of cache.keys()) {
    if (key.startsWith(DB.REMINDERS)) cache.delete(key);
  }
  await notion.pages.update({
    page_id: reminderId,
    properties: {
      'Reminder Date': { date: { start: newDateStr } },
    },
  });
  return { id: reminderId, date: newDateStr };
}

// ═══════════════════════════════════════════════════════════════
// SALARY  (title: "Payment Title", relation: "Team Member")
// ═══════════════════════════════════════════════════════════════
async function getSalaryForMember(memberId) {
  const pages = await queryAll(DB.SALARY_PAYMENTS, {
    filter: { property: 'Team Member', relation: { contains: memberId } },
    sorts:  [{ property: 'Date of Transaction', direction: 'descending' }],
  });
  return pages.map(p => ({
    id:          p.id,
    month:       gp(p, 'Payment Title'),
    paymentMonth:gp(p, 'Payment Month'),
    amount:      gp(p, 'Amount (₹)'),
    status:      gp(p, 'Status'),
    paymentDate: gp(p, 'Date of Transaction')?.start,
    paymentMode: gp(p, 'Payment Mode'),
    files:       gp(p, 'Payment Slip'),
  })).filter(s => s.month);
}

async function getAllSalaryPayments() {
  const [pages, map] = await Promise.all([
    queryAll(DB.SALARY_PAYMENTS, {
      sorts: [{ property: 'Date of Transaction', direction: 'descending' }],
    }),
    getMemberMap(),
  ]);
  return pages.map(p => ({
    id:          p.id,
    month:       gp(p, 'Payment Title'),
    paymentMonth:gp(p, 'Payment Month'),
    member:      resolveIds(gp(p, 'Team Member'), map),
    amount:      gp(p, 'Amount (₹)'),
    status:      gp(p, 'Status'),
    paymentDate: gp(p, 'Date of Transaction')?.start,
    paymentMode: gp(p, 'Payment Mode'),
  })).filter(s => s.month);
}

// ═══════════════════════════════════════════════════════════════
// INFLUENCERS  (title: "Influencer Name")
// ═══════════════════════════════════════════════════════════════
async function getInfluencers() {
  const [pages, map] = await Promise.all([queryAll(DB.INFLUENCER), getMemberMap()]);
  return pages.map(p => ({
    id:          p.id,
    name:        gp(p, 'Influencer Name'),
    platform:    gp(p, 'Platform'),
    followers:   gp(p, 'Followers'),
    status:      gp(p, 'Status'),
    niche:       gp(p, 'Niche / Category'),
    dealType:    gp(p, 'Deal Type'),
    amount:      gp(p, 'Amount (₹)'),
    postLink:    gp(p, 'Post Link'),
    managedBy:   resolveIds(gp(p, 'Managed By'), map),
  })).filter(i => i.name);
}

// ═══════════════════════════════════════════════════════════════
// PHYSICAL MARKETING  (title: "Activity Name")
// ═══════════════════════════════════════════════════════════════
async function getPhysicalMarketing() {
  const pages = await queryAll(DB.PHYSICAL_MARKETING);
  return pages.map(p => ({
    id:       p.id,
    name:     gp(p, 'Activity Name'),
    type:     gp(p, 'Type'),
    status:   gp(p, 'Status'),
    date:     gp(p, 'Date')?.start,
    location: gp(p, 'Location'),
    budget:   gp(p, 'Budget (₹)'),
    spent:    gp(p, 'Amount Spent (₹)'),
    notes:    gp(p, 'Outcome / Notes'),
  })).filter(i => i.name);
}

// ═══════════════════════════════════════════════════════════════
// MARKETING TRANSACTIONS  (title: "Transaction Name")
// ═══════════════════════════════════════════════════════════════
async function getMarketingTransactions() {
  const pages = await queryAll(DB.MARKETING_TRANSACTIONS, {
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return pages.map(p => {
    // collect linked names from the 4 relation columns
    const marketing = [];
    if ((gp(p, 'Ads Campaigns') || []).length)         marketing.push('Ads Campaigns');
    if ((gp(p, 'Influencer Marketing') || []).length)  marketing.push('Influencer Marketing');
    if ((gp(p, 'Physical Marketing') || []).length)    marketing.push('Physical Marketing');
    if ((gp(p, 'Print Media') || []).length)           marketing.push('Print Media');

    return {
      id:          p.id,
      name:        gp(p, 'Transaction Name'),
      date:        gp(p, 'Date')?.start,
      notes:       gp(p, 'Notes'),
      platform:    gp(p, 'Platform'),
      source:      gp(p, 'Source'),
      totalBudget: gp(p, '📊 Total Budget (₹)'),
      totalAmount: gp(p, '💰 Total Amount (₹)'),
      status:      gp(p, 'Status'),
      marketing,
    };
  }).filter(t => t.name);
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// COMPETITORS  (title: "App Name")
// ═══════════════════════════════════════════════════════════════
async function getCompetitors() {
  const pages = await queryAll(DB.COMPETITORS);
  return pages.map(p => ({
    id:              p.id,
    name:            gp(p, 'App Name'),
    company:         gp(p, 'Company Name'),
    region:          gp(p, 'Operating Region'),
    revenueModel:    gp(p, 'Revenue Model'),
    integrationType: gp(p, 'Integration Type'),
    abdm:            gp(p, 'ABDM Compliant'),
    threatLevel:     gp(p, 'DAD Threat Level'),
    website:         gp(p, 'Website'),
    keyFeatures:     gp(p, 'Key Features'),
    notes:           gp(p, 'Notes'),
    fundingStatus:   gp(p, 'Funding Status'),
    targetUsers:     gp(p, 'Target Users'),
  })).filter(c => c.name);
}

// ═══════════════════════════════════════════════════════════════
// PANEL & EMPANELMENT DIRECTORY
// ═══════════════════════════════════════════════════════════════
async function getPanelMembers() {
  const pages = await queryAll(DB.PANEL_EMPANELMENT, {
    sorts: [{ property: 'Name', direction: 'ascending' }],
  });
  return pages.map(p => ({
    id:              p.id,
    notionUrl:       p.url,
    name:            gp(p, 'Name'),
    role:            gp(p, 'Role'),
    panelType:       gp(p, 'Panel Type'),
    status:          gp(p, 'Status'),
    organization:    gp(p, 'Organization'),
    specialization:  gp(p, 'Specialization'),
    phone:           gp(p, 'Phone'),
    email:           gp(p, 'Email'),
    location:        gp(p, 'Location'),
    onboardingDate:  gp(p, 'Onboarding Date')?.start,
    agreementExpiry: gp(p, 'Agreement Expiry')?.start,
    lastContacted:   gp(p, 'Last Contacted')?.start,
    commission:      gp(p, 'Commission / Fee Structure'),
    certificate:     gp(p, 'Certificate'),
    contract:        gp(p, 'Contract / Agreement'),
    notes:           gp(p, 'Notes'),
    created:         gp(p, 'Created'),
    lastEdited:      gp(p, 'Last Edited'),
  })).filter(m => m.name);
}

// KPIs  (aggregate)
// ═══════════════════════════════════════════════════════════════
async function getKPIs() {
  const [team, tasks, campaigns, apps, finance] = await Promise.all([
    getTeamMembers(), getMasterTasks(), getAdsCampaigns(), getApplications(), getFinanceSummary(),
  ]);
  return {
    activeTeamMembers:  team.filter(m => (m.status || '').toLowerCase() === 'active').length,
    thisMonthRevenue:   finance.thisMonth.credit,
    activeTasks:        tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return s === 'active' || s === 'in progress' || s === 'live' || s === 'in-progress';
    }).length,
    liveCampaigns:      campaigns.filter(c => (c.status || '').toLowerCase() === 'live').length,
    appsInDevelopment:  apps.filter(a => (a.status || '').toLowerCase().includes('development')).length,
  };
}

module.exports = {
  DB, notion,
  getTeamMembers, getMemberBySlug,
  getAttendanceForMember, getTodayAttendance, createCheckIn, updateCheckOut,
  getFinanceSummary, getToolsAssets, getToolsTransactions,
  getMasterTasks,
  getAdsCampaigns,
  getApplications, getPhaseTracker, getRoadmap,
  getSocialAccounts, getSocialLogThisMonth,
  getReminders, updateReminderDate,
  getSalaryForMember, getAllSalaryPayments,
  getInfluencers, getPhysicalMarketing,
  getMarketingTransactions,
  getCompetitors,
  getPanelMembers,
  getKPIs,
};
