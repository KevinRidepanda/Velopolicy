// lib/bills.js
// Canonical bill dataset — shared by server-side functions.
// In production, replace with a database fetch.

export const BILLS = [
  { id:'HB 1822',       title:'National E-Bike Tax Credit Expansion Act',      topic:'E-Bike Incentives', scope:'federal', jurisdiction:'U.S. Federal',  status:'committee', priority:'high', updated:'Apr 2'  },
  { id:'CA SB 403',     title:'Protected Bike Lane Mandate for Urban Streets', topic:'Infrastructure',    scope:'state',   jurisdiction:'California',     status:'floor',     priority:'high', updated:'Apr 1'  },
  { id:'TX HB 2241',    title:'E-Scooter Helmet Requirement Under 18',         topic:'Safety',            scope:'state',   jurisdiction:'Texas',          status:'intro',     priority:'med',  updated:'Mar 29' },
  { id:'NYC Local 88',  title:'E-Scooter Speed Limit Revision',                topic:'Safety',            scope:'local',   jurisdiction:'New York City',  status:'enacted',   priority:'med',  updated:'Mar 28' },
  { id:'EU Dir 2026/14',title:'Harmonized Micromobility Safety Standards',     topic:'International',     scope:'intl',    jurisdiction:'European Union', status:'intro',     priority:'high', updated:'Mar 31' },
  { id:'CO SB 902',     title:'E-Bike Rebate for Low-Income Buyers',           topic:'E-Bike Incentives', scope:'state',   jurisdiction:'Colorado',       status:'passed',    priority:'high', updated:'Mar 25' },
];

export const STATUS_LABELS = {
  intro:'Introduced', committee:'In Committee', floor:'Floor Vote',
  passed:'Passed', enacted:'Enacted', failed:'Failed',
};
