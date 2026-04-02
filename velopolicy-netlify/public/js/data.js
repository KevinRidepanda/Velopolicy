// public/js/data.js
// Bills are now stored in localStorage and managed through the dashboard.
// BILLS starts empty — you add real bills via Live Search.

// Load tracked bills from localStorage, or start with empty array
function loadTrackedBills() {
  try {
    const stored = localStorage.getItem('velopolicy_bills');
    return stored ? JSON.parse(stored) : [];
  } catch(e) {
    return [];
  }
}

function saveTrackedBills(bills) {
  try {
    localStorage.setItem('velopolicy_bills', JSON.stringify(bills));
  } catch(e) {
    console.error('Could not save bills:', e);
  }
}

// This is the live bill list — replaces the hardcoded BILLS array
let BILLS = loadTrackedBills();

const STATUS_LABELS = {
  intro:     'Introduced',
  committee: 'In Committee',
  floor:     'Floor Vote',
  passed:    'Passed',
  enacted:   'Enacted',
  failed:    'Failed',
};

const STATUS_OPTIONS = ['intro','committee','floor','passed','enacted','failed'];

const TOPICS = [
  { icon:'⚡', title:'E-Bike Incentives',  desc:'Tax credits, rebates, and purchase incentive programs.',   n:'' },
  { icon:'🛣',  title:'Infrastructure',     desc:'Protected lanes, intersections, and network funding.',     n:'' },
  { icon:'⚖️', title:'Safety & Liability', desc:'Helmet laws, age limits, and operator liability.',         n:'' },
  { icon:'🚧', title:'Parking & Zoning',   desc:'Fleet docking, sidewalk bans, and permit frameworks.',     n:'' },
  { icon:'📡', title:'Data & Privacy',     desc:'GPS tracking, data minimization, and privacy rules.',      n:'' },
  { icon:'🌍', title:'International',      desc:'EU, UK, Canada, and global policy developments.',          n:'' },
];

const DEVELOPMENTS = [
  { d:'This week', title:'Add your first bill',          body:'Use Live Search to find real legislation and click + Track to add it here.' },
  { d:'Getting started', title:'Search for any topic',  body:'Try searching "e-bike tax credit 2026" or "protected bike lane" to find current bills.' },
  { d:'Tip', title:'Update bill status as it changes',  body:'Click any bill in the tracker to update its status, priority, and notes.' },
];

const SEARCH_TOPICS = [
  'E-bike tax credit 2026',
  'Protected bike lanes legislation',
  'E-scooter regulations 2026',
  'Micromobility safety bill',
  'Cargo bike policy',
  'EU cycling directive 2026',
  'Bike infrastructure funding',
  'Speed pedelec law',
  'Shared scooter permit',
  'Cycling infrastructure federal',
];

const MONITORS = [];

const SLACK_HISTORY = [];

const EXPORT_OPTIONS = [
  { id:'weekly',  icon:'📋', title:'Weekly Brief',      desc:'Full digest with key developments, topic breakdown, and watchlist.' },
  { id:'tracker', icon:'📊', title:'Full Bill Tracker',  desc:'All your tracked bills with statuses and jurisdictions.' },
  { id:'topic',   icon:'📁', title:'Topic Brief',        desc:'Deep-dive on a single policy area.' },
  { id:'highpri', icon:'🔴', title:'High Priority Only', desc:'Just your high-priority bills with full detail.' },
  { id:'custom',  icon:'✏️', title:'Custom Selection',   desc:'Pick specific bills, topics, and sections.' },
];

const EXPORT_SECTIONS = [
  { id:'cb-summary',      label:'Executive Summary',    def:true  },
  { id:'cb-developments', label:'Key Developments',     def:true  },
  { id:'cb-table',        label:'Legislation Table',    def:true  },
  { id:'cb-highpri',      label:'High Priority Detail', def:false },
  { id:'cb-stats',        label:'Statistics Summary',   def:false },
];

const TOPIC_OPTIONS = [
  'E-Bike Incentives',
  'Infrastructure',
  'Safety & Liability',
  'Parking & Zoning',
  'Data & Privacy',
  'International',
];

const ANALYSIS_CHIPS = [
  'Policy Summary', 'Stakeholder Impact', 'Equity Analysis',
  'Advocacy Angle', 'Comparison to Law', 'International Context',
];

const PAGE_META = {
  dashboard:   { title:'Dashboard',          sub:'Your tracked micromobility legislation'        },
  brief:       { title:'Weekly Brief',        sub:'AI-generated policy digest'                   },
  search:      { title:'Live Web Search',     sub:'Find and track real legislation'              },
  legislation: { title:'Bill Tracker',        sub:'All your tracked bills'                       },
  export:      { title:'PDF Export',          sub:'Generate formatted policy reports'            },
  slack:       { title:'Slack Automation',    sub:'Automated weekly brief delivery'              },
  analyze:     { title:'AI Policy Analysis',  sub:'Powered by Claude'                            },
};
