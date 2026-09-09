/**
 * What the Help button explains, per screen.
 *
 * Each step names a real element by its `data-tour` attribute. Keep the copy
 * about *what this does and why*, not about where to click - the ring already
 * shows where. Steps whose element is not on screen are dropped when the tour
 * starts, so one list can cover every tab of a screen.
 */

const t = (name) => `[data-tour="${name}"]`;

const SHELL_STEPS = [
  {
    selector: t('nav'),
    title: 'Getting around',
    body: 'Dashboard is your day. Clients holds every business you manage. Each client opens into a campaign workspace with its own tabs.',
  },
  {
    selector: t('notifications'),
    title: 'Alerts',
    body: 'Rank drops of three positions or more, site-health regressions and failed background jobs land here. Meridian raises them; you decide what to act on.',
  },
];

const HELP_STEP = {
  selector: t('help'),
  title: 'This button, any time',
  body: 'Every screen has its own walkthrough. Open it whenever you are unsure what something does - nothing here changes any data.',
};

export const TOURS = {
  dashboard: [
    {
      title: 'Your morning, in one screen',
      body: 'This is where the day starts: what slipped overnight, what is waiting on you, and what the platform did while you were away.',
    },
    {
      selector: t('stats'),
      title: 'The four numbers that matter',
      body: 'Active campaigns, keywords that dropped, tasks waiting on you, and reports due. If all four are calm, there is genuinely nothing to do.',
      tip: 'Click a tile to jump straight to what it counts.',
    },
    {
      selector: t('tasks'),
      title: "Today's priority tasks",
      body: 'One line per campaign, showing the single next action. Meridian works out whether that is confirming keywords, applying content, or posting an off-page submission.',
    },
    {
      selector: t('activity'),
      title: 'Campaign memory, live',
      body: 'Every action - yours and the platform\'s - is written here and embedded into the campaign\'s memory. This feed is literally what the AI reads before writing anything new.',
    },
    ...SHELL_STEPS,
    HELP_STEP,
  ],

  clients: [
    {
      selector: t('client-search'),
      title: 'Find a client fast',
      body: 'Searches business name, domain, niche and city at once.',
    },
    {
      selector: t('client-card'),
      title: 'One card per business',
      body: 'The badges tell you the campaign phase, the CMS, and whether Search Console and WordPress push are connected. The bottom row shows confirmed keywords and anything waiting for review.',
    },
    {
      selector: t('client-new'),
      title: 'Onboard after the welcome call',
      body: 'Adding a client creates its campaign and runs the baseline audit immediately, so the first suggestions already know what the site looks like.',
    },
    HELP_STEP,
  ],

  clientNew: [
    {
      selector: t('new-business'),
      title: 'This is the campaign seed',
      body: 'Everything typed here goes into every future AI prompt for this client. Niche and target cities drive keyword research; the platform choice decides how paste instructions are written.',
    },
    {
      selector: t('new-detect'),
      title: 'Read from the site itself',
      body: 'As soon as a domain is typed, Meridian opens the homepage and works out how it is built - WordPress, Shopify, a PHP theme, a React app. The platform field fills itself unless you have already chosen.',
    },
    {
      selector: t('new-nap'),
      title: 'The NAP block',
      body: 'Name, address and phone, exactly as they should appear everywhere. Directory listings reuse this verbatim - consistent NAP across sites is what local ranking is built on.',
    },
    {
      selector: t('new-competitors'),
      title: 'Choose the competitors, do not guess them',
      body: 'Runs several searches for the trade in the city, adds the Google Maps pack, opens every site and scores how directly it competes. You tick the four or five that really sell the same thing to the same customers; they are tracked on every keyword next to the client.',
      tip: 'Needs the trade and at least one city filled in first. There is a Help button inside the picker too.',
    },
    {
      selector: t('new-audit'),
      title: 'Baseline audit',
      body: 'Leave this on. It crawls the live site the way Google sees it and takes about twenty seconds. Without it, the first content suggestions have nothing to compare against.',
    },
  ],

  /** Started from the Help button inside the competitor picker itself. */
  competitorPicker: [
    {
      selector: t('picker-search'),
      title: 'Search the way a customer would',
      body: 'The first pass already ran six phrasings - the trade, the city, "near me", "contact number" and so on - and merged them. Add your own words here when the trade has a local name the model would not know.',
    },
    {
      selector: t('picker-list'),
      title: 'Every site was opened and scored',
      body: 'Green means the model read the site and found the same service for the same customers. Amber is partial overlap - a marketplace, a supplier, a franchise. Red is not a competitor at all. The bar is how similar the business is; the Maps badge means it is in the local pack with real reviews.',
      tip: 'Open a site with the arrow before ticking it. Two minutes here saves a month of tracking the wrong company.',
    },
    {
      selector: t('picker-select'),
      title: 'The shortcut',
      body: 'Ticks everything the model marked as a direct competitor. Check the list afterwards; it is a recommendation, not a decision.',
    },
    {
      selector: t('picker-maps'),
      title: 'Competing for the calls, not the clicks',
      body: 'Businesses in the Google Maps pack with no website of their own. They cannot be tracked on Google positions, but they are who the client loses phone calls to - worth knowing when the client asks why the phone is quiet.',
    },
    {
      selector: t('picker-more'),
      title: 'Not the right ones yet?',
      body: 'Runs a fresh set of phrasings and adds anything new to the list. Each run costs a few search credits.',
    },
    {
      selector: t('picker-add'),
      title: 'Four or five, not ten',
      body: 'Every chosen competitor is checked on every keyword, every night. Ten loose ones cost search credits and blur the report; four direct ones tell the client exactly who is beating them and where.',
    },
  ],

  clientProfile: [
    {
      selector: t('profile-integrations'),
      title: 'What Meridian can publish to',
      body: 'Each card is one connection: the client\'s own CMS (WordPress, Webflow, Ghost or Shopify), Search Console for real impressions, and the community accounts. Only scoped, revocable credentials are ever stored, and each is verified before it is saved.',
      tip: 'Search Console unlocks two things at once: topic ideas from real impressions, and a weekly check for published pages nobody is seeing.',
    },
    {
      selector: t('profile-competitors'),
      title: 'The tracked competitors',
      body: 'Chosen during onboarding, editable here. Each one is checked on every keyword next to the client, and the AI reads this list before planning any content.',
    },
    {
      selector: t('profile-details'),
      title: 'The campaign seed',
      body: 'Every field here goes into every AI prompt for this client. Change the niche or the cities and the next keyword research, content plan and off-page task reflect it.',
    },
  ],

  campaignOverview: [
    {
      selector: t('campaign-tabs'),
      title: 'The campaign workspace',
      body: 'Left to right is roughly the order work happens: audit the site, map keywords, write on-page content, run off-page, publish content at scale, watch ranks, report to the client.',
      tip: 'A number on a tab means something there is waiting on you.',
    },
    {
      selector: t('phase-rail'),
      title: 'Where this campaign is',
      body: 'The phase drives what the platform does automatically. Daily rank checks and the off-page rotation only start once on-page work is published.',
    },
    {
      selector: t('next-steps'),
      title: 'What to do next',
      body: 'Computed from the campaign state, not a static checklist. If this is empty, the campaign is genuinely up to date.',
    },
    {
      selector: t('memory'),
      title: 'Campaign memory',
      body: 'The full record of what has been done. Before every AI call, Meridian pulls the most relevant entries from here so it never suggests work that is already finished.',
    },
    {
      selector: t('health'),
      title: 'Site health',
      body: 'A weighted score from the last audit. Watch it move rather than reading it as an absolute - a re-audit after applying changes is the point.',
    },
    HELP_STEP,
  ],

  audit: [
    {
      selector: t('audit-health'),
      title: 'Health score and Core Web Vitals',
      body: 'Deductions are weighted by how much each problem actually costs in rankings. A missing sitemap hurts more than a missing llms.txt, and the score reflects that.',
    },
    {
      selector: t('audit-issues'),
      title: 'What is actually wrong',
      body: 'Ranked by impact. Red is costing you rankings now; amber is holding you back; blue is worth fixing when convenient.',
    },
    {
      selector: t('audit-files'),
      title: 'Technical files',
      body: 'robots.txt, sitemap.xml, llms.txt and schema markup. Anything missing here gets generated for you on the On-page tab.',
    },
    {
      selector: t('audit-rerun'),
      title: 'Re-run any time',
      body: 'Runs automatically every Monday too. Meridian only reads public HTML, robots.txt and PageSpeed - it never touches your source files or hosting.',
    },
  ],

  keywords: [
    {
      selector: t('kw-research'),
      title: 'Research',
      body: 'Expands the trade and the cities into what people actually type, prices every candidate, then maps exactly one primary keyword to each page with supporting terms around it. Safe to run more than once - existing keywords are updated, not duplicated.',
      tip: 'Volumes marked "est." are estimates. Connect Google Ads Keyword Planner and they become Google\'s own numbers for the client\'s city.',
    },
    {
      selector: t('kw-tabs'),
      title: 'The confirmation gate',
      body: 'Nothing gets written until the client agrees the list. Awaiting confirmation is what you send them; Confirmed is what the campaign actually targets.',
    },
    {
      selector: t('kw-copy'),
      title: 'Send it to the client',
      body: 'Copies the proposed list as plain text, formatted to paste straight into WhatsApp. Confirm or reject what comes back.',
    },
    {
      selector: t('kw-table'),
      title: 'Difficulty is the real signal',
      body: 'Green is winnable within a quarter, red needs authority you probably do not have yet. Target page shows which URL is meant to rank - that mapping is what stops two pages competing for one term.',
      tip: 'Tick several rows to confirm or reject them in one go.',
    },
    {
      selector: t('kw-lock'),
      title: 'Lock the list',
      body: 'Rejects anything still pending and starts the content phase. Do this once the client has signed off.',
    },
  ],

  onpage: [
    {
      selector: t('onpage-generate'),
      title: 'Generate the on-page pass',
      body: 'Writes meta titles, descriptions, OG tags, H1s, body paragraphs, schema markup and the technical files - all from the confirmed keywords and the audit.',
    },
    {
      selector: t('onpage-card'),
      title: 'Before and after',
      body: 'Struck-through red is what is on the site now; green is the replacement. Nothing goes live until you say so.',
    },
    {
      selector: t('onpage-paste'),
      title: 'Written for this specific site',
      body: 'A WordPress client gets Yoast field names and admin navigation. A PHP client gets the file path under public_html and a line hint. Same suggestion, different instructions.',
      tip: 'Copy text takes just the content, ready to paste.',
    },
    {
      selector: t('onpage-actions'),
      title: 'Apply it',
      body: 'Mark as applied logs it to campaign memory. On a connected WordPress site, Push sends it through the REST API and keeps a snapshot so it can be rolled back from Deployments.',
    },
  ],

  offpage: [
    {
      selector: t('offpage-next'),
      title: 'The daily rotation',
      body: 'Meridian checks which platforms this campaign used in the last fortnight, then picks one that is out of cooldown. That is what stops a campaign spamming the same three sites.',
    },
    {
      selector: t('offpage-pending'),
      title: 'Waiting on you',
      body: 'Each task comes with a pre-filled package - title, body, NAP, category, tags. Open the platform, paste the fields, mark it done. Roughly two minutes.',
      tip: 'Auto-eligible means it could be posted by an API connector once one is configured. Until then it queues rather than pretending it was posted.',
    },
    {
      selector: t('offpage-week'),
      title: 'This week',
      body: 'The rotation record. It is also what the AI reads before choosing tomorrow\'s platform.',
    },
  ],

  content: [
    {
      selector: t('content-stats'),
      title: 'The content engine, in four numbers',
      body: 'What went live in the last thirty days, what is waiting for your review, how many ideas are queued, and whether the autopilot is running. The review queue is the one to keep at zero.',
    },
    {
      selector: t('content-tabs'),
      title: 'Six kinds of content, one pipeline',
      body: 'Blog posts at scale, programmatic pages from a template, Reddit replies, Quora answers and Medium pieces, Wikipedia citations - and the autopilot that keeps them moving. Every piece goes idea, drafted, approved, published, and nothing is published without a person saying so unless you switch that on.',
    },
    {
      selector: t('content-plan'),
      title: 'Plan ideas',
      body: 'Asks the model for a batch of article ideas from three pools: the confirmed keywords, the phrases where a chosen competitor outranks the client, and - when Search Console is connected - the searches the site already appears for with no page behind them. Each idea carries its keyword, an angle and an outline.',
    },
    {
      selector: t('content-write'),
      title: 'Write the next few',
      body: 'Drafts the next ideas in the calendar: 1,200-1,800 words, a FAQ built from the questions Google shows for the keyword, internal links to real pages, meta title and description. Drafts land in the review queue.',
    },
    {
      selector: t('content-gsc'),
      title: 'Free topics from Search Console',
      body: 'Searches Google already shows the site for, with no keyword and no page behind them. Real impressions, real positions. Tick the ones worth a page and add them to the keyword list; planning uses the top of this list on its own.',
    },
    {
      selector: t('content-list'),
      title: 'The review queue',
      body: 'Open a piece to read it, edit it, approve it or send it back. Tick several to draft or approve in one go. "auto" marks what the autopilot did while you were away.',
      tip: '"no impressions" on a published piece means Search Console has not shown it to anyone lately - see the Programmatic tab.',
    },
    {
      selector: t('content-template'),
      title: 'One pattern, hundreds of pages',
      body: '"{service} in {city}" with a list of services and cities becomes one page per combination, each written on its own with local detail. Two pages sharing more than a sentence is treated as a failure.',
    },
    {
      selector: t('content-generate'),
      title: 'Generate the pages',
      body: 'Queues every combination as an idea and writes the number you chose right away. The rest are picked up by the autopilot at its daily rate.',
    },
    {
      selector: t('content-prune'),
      title: 'Pages nobody is seeing',
      body: 'Every Sunday, pages published more than two months ago are checked against Search Console. Under five impressions in four weeks means the page is thinning the site rather than helping it. Keep the ones you believe in; Take down sets the rest back to draft on the CMS.',
    },
    {
      selector: t('content-discover'),
      title: 'Find the conversations',
      body: 'Searches Reddit for threads in the client\'s country where people are asking about the trade. Each thread becomes a reply that answers first and discloses the affiliation, and any thread can become a blog post that ranks for the same question.',
    },
    {
      selector: t('content-quora'),
      title: 'Questions Google already ranks',
      body: 'Finds the Quora questions that appear in Google for the campaign\'s keywords, so an answer there is seen by the client\'s own customers. Quora has no API: answers are pasted by hand and the URL recorded.',
    },
    {
      selector: t('content-wiki'),
      title: 'Wikipedia, done properly',
      body: 'Tracks where the business is already cited or named, and finds "citation needed" gaps in articles about the trade and the city. Meridian drafts the citation and the Talk-page request; a person with a declared conflict of interest posts it. It never edits Wikipedia.',
    },
    {
      selector: t('autopilot-toggle'),
      title: 'Hands off',
      body: 'On means every morning at 05:00 the backlog is topped up, the day\'s quota is written, and - only if you allow it below - published. Everything it does is logged as automated so the client report can say what the machine did.',
    },
    {
      selector: t('autopilot-quota'),
      title: 'How much',
      body: 'Pieces per day is the pace; the monthly target is the ceiling. Three a day is ninety a month; ten a day is three hundred. The limit is the model budget, not the software.',
    },
    {
      selector: t('autopilot-publish'),
      title: 'Publishing without clicking',
      body: 'Pushes drafts to whichever of the client\'s CMSs is connected - WordPress, Webflow, Ghost or Shopify. "Draft in the CMS" keeps a human between the model and the live site; "Live immediately" does not. Start with draft.',
    },
    {
      selector: t('autopilot-run'),
      title: 'Try it now',
      body: 'Runs one pass immediately with the settings above, whatever the schedule. Good for seeing what a day of autopilot produces before leaving it on.',
    },
  ],

  ranks: [
    {
      selector: t('rank-controls'),
      title: 'Device and window',
      body: 'Desktop and mobile SERPs differ, especially for local searches. Switch device to see the version your customers actually get.',
    },
    {
      selector: t('rank-chart'),
      title: 'Lower is better',
      body: 'The axis is inverted, so a line rising on this chart means the keyword is climbing. Six keywords are plotted; the rest are in the table view.',
      tip: 'Click a keyword in the legend to hide or show its line.',
    },
    {
      selector: t('rank-live'),
      title: 'The client against every competitor',
      body: 'One row per keyword, one column per chosen competitor, from the same results page the client\'s position came from. Star a keyword and it is re-checked every four hours instead of nightly.',
    },
    {
      selector: t('rank-check'),
      title: 'Checks run nightly',
      body: 'Midnight every night, automatically. This button forces one now. Any keyword dropping three or more places raises an alert.',
    },
  ],

  reports: [
    {
      selector: t('report-generate'),
      title: 'Drafted from the record',
      body: 'Reads the rank movement and every action logged in the period, then writes it in plain English for a business owner. Runs by itself on day 1 and day 15.',
    },
    {
      selector: t('report-list'),
      title: 'Report history',
      body: 'Draft means nobody has looked at it. Reviewed means you edited it. Sent is locked.',
    },
    {
      selector: t('report-body'),
      title: 'Review before it goes out',
      body: 'Edit anything you disagree with - it is your name on it. The client sees the edited version, not the draft.',
    },
    {
      selector: t('report-actions'),
      title: 'Send or download',
      body: 'Send emails the PDF and marks it sent. Without SMTP configured, it still records the send and you deliver the PDF yourself over WhatsApp.',
    },
  ],

  ask: [
    {
      selector: t('ask-box'),
      title: 'Answers from the campaign record',
      body: 'When a client asks why a keyword is not ranking, this answers from what was actually done and when - real dates, real actions - instead of generic SEO advice.',
    },
    {
      selector: t('ask-suggestions'),
      title: 'Common questions',
      body: 'The ones clients ask most. Click any of them to see the shape of an answer.',
    },
  ],

  admin: [
    {
      selector: t('admin-tabs'),
      title: 'Admin',
      body: 'Manager accounts, the background job schedule, and the off-page platform catalogue.',
    },
    {
      selector: t('admin-body'),
      title: 'Managers see only their own clients',
      body: 'Create an account here and assign clients to it. Admins see everything; managers see only what is theirs.',
      tip: 'The Jobs tab shows every scheduled run and lets you trigger one by hand.',
    },
  ],

  settings: [
    {
      selector: t('settings-password'),
      title: 'Change your password',
      body: 'Changing it signs out every other session, including any device you left logged in elsewhere.',
    },
  ],
};

/** Which tour belongs to the current URL. */
export const stepsForPath = (pathname) => {
  if (pathname === '/') return TOURS.dashboard;
  if (pathname === '/clients') return TOURS.clients;
  if (pathname === '/clients/new') return TOURS.clientNew;
  if (/^\/clients\/[^/]+$/.test(pathname)) return TOURS.clientProfile;
  if (pathname === '/admin') return TOURS.admin;
  if (pathname === '/settings') return TOURS.settings;

  const campaign = pathname.match(/^\/campaigns\/[^/]+(?:\/(\w+))?$/);
  if (campaign) {
    return (
      {
        undefined: TOURS.campaignOverview,
        audit: TOURS.audit,
        keywords: TOURS.keywords,
        onpage: TOURS.onpage,
        offpage: TOURS.offpage,
        content: TOURS.content,
        ranks: TOURS.ranks,
        reports: TOURS.reports,
        ask: TOURS.ask,
      }[campaign[1]] ?? TOURS.campaignOverview
    );
  }
  return TOURS.dashboard;
};
