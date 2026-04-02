// public/js/data.js
// All static data and constants used by app.js and charts.js.
// The BILLS array starts empty — bills are loaded from localStorage by app.js.

// ── Status ────────────────────────────────────────────────────

var STATUS_LABELS = {
  intro:     'Introduced',
  committee: 'In Committee',
  floor:     'Floor Vote',
  passed:    'Passed',
  enacted:   'Enacted',
  failed:    'Failed',
};

// Used by manage list and detail modal dropdowns
var STATUS_OPTIONS = ['intro', 'committee', 'floor', 'passed', 'enacted', 'failed'];

// ── Topics ────────────────────────────────────────────────────

var TOPICS = [
  { icon:'⚡', title:'E-Bike Incentives',  desc:'Tax credits, rebates, and purchase incentive programs.'       },
  { icon:'🛣',  title:'Infrastructure',     desc:'Protected lanes, intersections, and network funding.'         },
  { icon:'⚖️', title:'Safety & Liability', desc:'Helmet laws, age limits, and operator liability frameworks.'  },
  { icon:'🚧', title:'Parking & Zoning',   desc:'Fleet docking, sidewalk bans, and permit frameworks.'         },
  { icon:'📡', title:'Data & Privacy',     desc:'GPS tracking, data minimization, and privacy standards.'      },
  { icon:'🌍', title:'International',      desc:'EU, UK, Canada, and global micromobility policy.'             },
];

// Used by PDF export topic filter chips
var TOPIC_OPTIONS = [
  'E-Bike Incentives',
  'Infrastructure',
  'Safety & Liability',
  'Parking & Zoning',
  'Data & Privacy',
  'International',
];

// ── Default developments (shown before bills are tracked) ─────

var DEVELOPMENTS = [
  { d:'Get started', title:'Search for real legislation',       body:'Use Live Search to find actual bills and click + Track Bill to add them here.' },
  { d:'Tip',         title:'Update status as bills advance',    body:'Open any bill from the tracker or watchlist to change its status and priority.' },
  { d:'Tip',         title:'Set up Slack to get weekly briefs', body:'Configure the Slack Automation page to receive an AI-generated brief every Monday.' },
];

// ── Search topics (quick-pick chips on Live Search page) ──────

var SEARCH_TOPICS = [
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

// ── Slack history (shown before any real sends) ───────────────
// Once real sends happen they are stored in localStorage and prepended to this.

var SLACK_HISTORY = [];

// ── Export options ────────────────────────────────────────────

var EXPORT_OPTIONS = [
  { id:'weekly',  icon:'📋', title:'Weekly Brief',      desc:'Full digest with key developments, topic breakdown, and watchlist.'   },
  { id:'tracker', icon:'📊', title:'Full Bill Tracker',  desc:'All your tracked bills with statuses and jurisdictions.'             },
  { id:'topic',   icon:'📁', title:'Topic Brief',        desc:'Deep-dive on a single policy area.'                                  },
  { id:'highpri', icon:'🔴', title:'High Priority Only', desc:'Just your high-priority bills with full detail on each.'             },
  { id:'custom',  icon:'✏️', title:'Custom Selection',   desc:'Pick specific bills, topics, and sections to include.'               },
];

var EXPORT_SECTIONS = [
  { id:'cb-summary',      label:'Executive Summary',    def:true  },
  { id:'cb-developments', label:'Key Developments',     def:true  },
  { id:'cb-table',        label:'Legislation Table',    def:true  },
  { id:'cb-highpri',      label:'High Priority Detail', def:false },
  { id:'cb-stats',        label:'Statistics Summary',   def:false },
];

// ── Analysis chips ────────────────────────────────────────────

var ANALYSIS_CHIPS = [
  'Policy Summary',
  'Stakeholder Impact',
  'Equity Analysis',
  'Advocacy Angle',
  'Comparison to Law',
  'International Context',
];

// ── Page metadata (topbar titles and subtitles) ───────────────

var PAGE_META = {
  dashboard:   { title:'Dashboard',          sub:'Your tracked micromobility legislation'     },
  brief:       { title:'Weekly Brief',        sub:'AI-generated policy digest'                },
  search:      { title:'Live Web Search',     sub:'Find and track real legislation'           },
  legislation: { title:'Bill Tracker',        sub:'All your tracked bills'                    },
  export:      { title:'PDF Export',          sub:'Generate formatted policy reports'         },
  slack:       { title:'Slack Automation',    sub:'Automated weekly brief delivery'           },
  analyze:     { title:'AI Policy Analysis',  sub:'Powered by Claude'                         },
};
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
