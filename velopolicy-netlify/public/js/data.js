// public/js/data.js
// All frontend data — bills, topics, monitors, history.

const BILLS = [
  { id:'HB 1822',      title:'National E-Bike Tax Credit Expansion Act',      topic:'E-Bike Incentives', scope:'federal', jur:'U.S. Federal',  s:'committee', p:'high', upd:'Apr 2'  },
  { id:'CA SB 403',    title:'Protected Bike Lane Mandate for Urban Streets', topic:'Infrastructure',    scope:'state',   jur:'California',     s:'floor',     p:'high', upd:'Apr 1'  },
  { id:'TX HB 2241',   title:'E-Scooter Helmet Requirement Under 18',         topic:'Safety',            scope:'state',   jur:'Texas',          s:'intro',     p:'med',  upd:'Mar 29' },
  { id:'NYC Local 88', title:'E-Scooter Speed Limit Revision',                topic:'Safety',            scope:'local',   jur:'New York City',  s:'enacted',   p:'med',  upd:'Mar 28' },
  { id:'EU Dir 2026/14',title:'Harmonized Micromobility Safety Standards',    topic:'International',     scope:'intl',    jur:'European Union', s:'intro',     p:'high', upd:'Mar 31' },
  { id:'OR AB 1105',   title:'Micromobility Sidewalk Riding Prohibition',     topic:'Parking & Zoning',  scope:'state',   jur:'Oregon',         s:'committee', p:'low',  upd:'Mar 27' },
  { id:'CO SB 902',    title:'E-Bike Rebate for Low-Income Buyers',           topic:'E-Bike Incentives', scope:'state',   jur:'Colorado',       s:'passed',    p:'high', upd:'Mar 25' },
  { id:'IL HB 4401',   title:'Shared E-Scooter Fleet Permit Framework',       topic:'Parking & Zoning',  scope:'state',   jur:'Illinois',       s:'committee', p:'med',  upd:'Mar 24' },
  { id:'UK S 2026-11', title:'Cycle Lane Network Expansion Fund',             topic:'Infrastructure',    scope:'intl',    jur:'United Kingdom', s:'passed',    p:'med',  upd:'Mar 22' },
  { id:'WA HB 1654',   title:'Protected Intersections for Cyclists',          topic:'Infrastructure',    scope:'state',   jur:'Washington',     s:'intro',     p:'med',  upd:'Mar 20' },
  { id:'NYC Local 92', title:'GPS Data Minimization for Shared Fleets',       topic:'Data & Privacy',    scope:'local',   jur:'New York City',  s:'committee', p:'low',  upd:'Mar 18' },
  { id:'MA SB 717',    title:'Cargo E-Bike Commercial Delivery Lanes',        topic:'Infrastructure',    scope:'state',   jur:'Massachusetts',  s:'intro',     p:'low',  upd:'Mar 15' },
];

const STATUS_LABELS = {
  intro:     'Introduced',
  committee: 'In Committee',
  floor:     'Floor Vote',
  passed:    'Passed',
  enacted:   'Enacted',
  failed:    'Failed',
};

const TOPICS = [
  { icon:'⚡', title:'E-Bike Incentives',  desc:'Federal credit bill in markup; 6 states add rebate programs.',   n:'7 bills'    },
  { icon:'🛣',  title:'Infrastructure',     desc:'CA, NY, WA push protected lane requirements for large cities.',  n:'5 bills'    },
  { icon:'⚖️', title:'Safety & Liability', desc:'Helmet laws, age limits, and liability frameworks debated.',     n:'4 bills'    },
  { icon:'🚧', title:'Parking & Zoning',   desc:'Shared-fleet docking, sidewalk bans, permit frameworks.',        n:'6 bills'    },
];

const DEVELOPMENTS = [
  { d:'Apr 2',  title:'HB 1822 advances to markup',             body:'Passed committee 7–3. Income cap of $150k/$300k (single/joint) and $1,500 per-unit limit added. Floor vote expected within 3 weeks.' },
  { d:'Apr 1',  title:'California SB 403 floor vote scheduled', body:'Senate floor vote set for April 14. Opposition from rural counties intensified this week.' },
  { d:'Mar 31', title:'EU publishes draft Directive 2026/14',   body:'25 km/h speed cap and mandatory UL certification for all micromobility batteries sold in EU.' },
];

const SEARCH_TOPICS = [
  'E-bike tax credit', 'Protected bike lanes', 'E-scooter regulations',
  'Micromobility safety', 'Cargo bike policy',
  'Bike infrastructure funding', 'e-bike speed regulations',
];

const MONITORS = [
  { q:'federal e-bike tax credit 2026',   freq:'Weekly',    last:'Apr 2',  hits:3 },
  { q:'protected bike lane legislation',  freq:'Weekly',    last:'Mar 31', hits:7 },
  { q:'EU micromobility directive 2026',  freq:'Bi-weekly', last:'Mar 28', hits:2 },
];

const SLACK_HISTORY = [
  { icon:'💬', d:'Weekly Brief — Week of Mar 24', t:'Mar 31, 8:01 AM', s:'ok'   },
  { icon:'💬', d:'Weekly Brief — Week of Mar 17', t:'Mar 24, 8:00 AM', s:'ok'   },
  { icon:'💬', d:'Weekly Brief — Week of Mar 10', t:'Mar 17, 8:00 AM', s:'fail' },
];

const EXPORT_OPTIONS = [
  { id:'weekly',  icon:'📋', title:'Weekly Brief',      desc:'Full digest with key developments, topic breakdown, and watchlist.' },
  { id:'tracker', icon:'📊', title:'Full Bill Tracker',  desc:'Complete legislation table with all bills, statuses, and jurisdictions.' },
  { id:'topic',   icon:'📁', title:'Topic Brief',        desc:'Deep-dive on a single policy area — incentives, infrastructure, safety, etc.' },
  { id:'highpri', icon:'🔴', title:'High Priority Only', desc:'Just the high-priority bills with full detail on each.' },
  { id:'custom',  icon:'✏️', title:'Custom Selection',   desc:'Pick specific bills, topics, and date ranges to include.' },
];

const EXPORT_SECTIONS = [
  { id:'cb-summary',      label:'Executive Summary',    def:true  },
  { id:'cb-developments', label:'Key Developments',     def:true  },
  { id:'cb-table',        label:'Legislation Table',    def:true  },
  { id:'cb-topics',       label:'Topic Briefs',         def:false },
  { id:'cb-highpri',      label:'High Priority Detail', def:false },
  { id:'cb-stats',        label:'Statistics Summary',   def:false },
];

const TOPIC_OPTIONS = [
  'E-Bike Incentives',
  'Infrastructure',
  'Safety & Liability',
  'Parking & Zoning',
];

const ANALYSIS_CHIPS = [
  'Policy Summary', 'Stakeholder Impact', 'Equity Analysis',
  'Advocacy Angle', 'Comparison to Law', 'International Context',
];

const PAGE_META = {
  dashboard:   { title:'Dashboard',          sub:'Week of March 31 – April 6, 2026'         },
  brief:       { title:'Weekly Brief',        sub:'AI-generated policy digest · Vol. 12'     },
  search:      { title:'Live Web Search',     sub:'Powered by Claude — real-time tracking'   },
  legislation: { title:'Bill Tracker',        sub:'142 active bills across 41 jurisdictions' },
  export:      { title:'PDF Export',          sub:'Generate formatted policy reports'        },
  slack:       { title:'Slack Automation',    sub:'Automated weekly brief delivery'          },
  analyze:     { title:'AI Policy Analysis',  sub:'Powered by Claude'                        },
};
