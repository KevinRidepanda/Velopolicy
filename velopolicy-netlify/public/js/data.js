// public/js/data.js
// All static data and constants used by app.js and charts.js.
// Bills are loaded from localStorage by app.js — not stored here.

var STATUS_LABELS = {
  intro:     'Introduced',
  committee: 'In Committee',
  floor:     'Floor Vote',
  passed:    'Passed',
  enacted:   'Enacted',
  failed:    'Failed',
};

var STATUS_OPTIONS = ['intro', 'committee', 'floor', 'passed', 'enacted', 'failed'];

var TOPICS = [
  { icon:'⚡', title:'E-Bike Incentives',  desc:'Tax credits, rebates, and purchase incentive programs.'      },
  { icon:'🛣',  title:'Infrastructure',     desc:'Protected lanes, intersections, and network funding.'        },
  { icon:'⚖️', title:'Safety & Liability', desc:'Helmet laws, age limits, and operator liability frameworks.' },
  { icon:'🚧', title:'Parking & Zoning',   desc:'Fleet docking, sidewalk bans, and permit frameworks.'        },
  { icon:'📡', title:'Data & Privacy',     desc:'GPS tracking, data minimization, and privacy standards.'     },
  { icon:'🌍', title:'International',      desc:'EU, UK, Canada, and global micromobility policy.'            },
];

var TOPIC_OPTIONS = [
  'E-Bike Incentives',
  'Infrastructure',
  'Safety & Liability',
  'Parking & Zoning',
  'Data & Privacy',
  'International',
];];

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
var EXPORT_SECTIONS = [
  { id:'cb-summary',      label:'Executive Summary',    def:true  },
  { id:'cb-developments', label:'Key Developments',     def:true  },
  { id:'cb-table',        label:'Legislation Table',    def:true  },
  { id:'cb-highpri',      label:'High Priority Detail', def:false },
  { id:'cb-stats',        label:'Statistics Summary',   def:false },
];

var TOPIC_OPTIONS = [
  'E-Bike Incentives',
  'Infrastructure',
  'Safety & Liability',
  'Parking & Zoning',
  'Data & Privacy',
  'International',
];

var ANALYSIS_CHIPS = [
  'Policy Summary', 'Stakeholder Impact', 'Equity Analysis',
  'Advocacy Angle', 'Comparison to Law', 'International Context',
];

var PAGE_META = {
  dashboard:   { title:'Dashboard',          sub:'Your tracked micromobility legislation'        },
  brief:       { title:'Weekly Brief',        sub:'AI-generated policy digest'                   },
  search:      { title:'Live Web Search',     sub:'Find and track real legislation'              },
  legislation: { title:'Bill Tracker',        sub:'All your tracked bills'                       },
  export:      { title:'PDF Export',          sub:'Generate formatted policy reports'            },
  slack:       { title:'Slack Automation',    sub:'Automated weekly brief delivery'              },
  analyze:     { title:'AI Policy Analysis',  sub:'Powered by Claude'                            },
};
