<?php
// ============================================================================
// EVENT CONTENT (Version 2.0): edit this file to change the matchmaking questions,
// sectors, agenda, Q&A sessions, missions and consent wording.
// Everything the attendee sees comes from here. Push to GitHub and it goes live.
// ============================================================================

// "What can you offer?" / "What are you looking for?" Each topic has a GIVE side and a GET side;
// the app matches people whose GIVE meets someone else's GET. Keep the keys stable once
// people have joined (labels can change freely). The first five keys are the Version 1 keys.
//   key => [give label, get label, short noun used in match sentences]
const INTERESTS = [
  'training' => ['AI training for teams',                          'AI training for my team',                         'AI training'],
  'support'  => ['Funding, grants or schemes for AI',              'Funding, grants or schemes for AI',               'AI funding and schemes'],
  'practice' => ['Our own experience of using AI',                 'Real examples from businesses using AI',          'hands-on AI experience'],
  'knowhow'  => ['Helping others understand AI',                   'A plain-English start with AI',                   'AI know-how'],
  'solution' => ['An AI product or service',                       'An AI product or service for my business',        'AI products and services'],
  'rules'    => ['Guidance on AI rules and data protection',       'Guidance on AI rules and data protection',        'guidance on AI rules'],
  'pilot'    => ['Open to partner on an AI pilot or project',      'A partner for an AI pilot or project',            'AI pilots and partnerships'],
  'talent'   => ['AI skills, talent or placements',                'People with AI and digital skills',               'AI skills and talent'],
];
// A single option that matches anyone else who ticks it too.
const NETWORKING_LABEL = 'Networking with others in the room';

// Sector list. Built from the sectors on the 10 November agenda (health, banking, robotics, maritime,
// business software, marketing, accountancy, HR consulting, regulators, funders, research, unions)
// plus the main sectors of Malta's SME economy. Colours are used for avatars and the stars on the map.
const SECTORS = [
  ['Tourism & hospitality',                  '#f2b84b'],
  ['Retail & trade',                         '#f2766b'],
  ['Food, agriculture & fisheries',          '#c4d86a'],
  ['Manufacturing',                          '#a7d36b'],
  ['Robotics & engineering',                 '#6fd3a0'],
  ['Construction & property',                '#c9a26b'],
  ['Energy, water & environment',            '#58c98e'],
  ['Maritime, shipping & logistics',         '#7cc7f2'],
  ['Financial services & banking',           '#26a1cd'],
  ['Accountancy, audit & tax',               '#4fb7c9'],
  ['Legal & compliance',                     '#8fa8e8'],
  ['HR, recruitment & consulting',           '#e8a48f'],
  ['Marketing, media & communications',      '#f08fb0'],
  ['Tech, software & IT',                    '#2ec4b6'],
  ['Gaming & digital',                       '#9b7be0'],
  ['Health & care',                          '#f29ac9'],
  ['Education & training',                   '#d9c19a'],
  ['Research & innovation',                  '#b79cf0'],
  ['Government & regulators',                '#e0336f'],
  ['Business support & funding agencies',    '#ff8a5c'],
  ['Employer bodies, unions & associations', '#5b8def'],
  ['Other',                                  '#b0acd0'],
];
// Version 1 sector names => Version 2 names (used once, when Version 1 profiles are copied across).
const SECTOR_ALIASES = [
  'Professional services'           => 'HR, recruitment & consulting',
  'Tech & IT'                       => 'Tech, software & IT',
  'Shipping, logistics & maritime'  => 'Maritime, shipping & logistics',
  'Public body or support agency'   => 'Government & regulators',
  'Union or employer association'   => 'Employer bodies, unions & associations',
];

// Kind of organisation. key => label. (Keys are used by the matching rules in assets/match.js.)
const ORG_TYPES = [
  'micro'   => 'Micro business (1 to 9 people)',
  'small'   => 'Small business (10 to 49)',
  'medium'  => 'Medium business (50 to 249)',
  'large'   => 'Large business (250 or more)',
  'solo'    => 'Self-employed or consultant',
  'public'  => 'Government, regulator or public body',
  'agency'  => 'Business support or funding agency',
  'edu'     => 'Education, training or research',
  'assoc'   => 'Association, chamber or union',
];

// Where the person's organisation is with AI. key => [label, short label]
const AI_STAGES = [
  'new'     => ['Just starting to look at AI',          'Starting out'],
  'explore' => ['Exploring and experimenting',          'Exploring'],
  'use'     => ['Using AI for some everyday tasks',     'Using AI'],
  'core'    => ['AI is part of how we work',            'AI at the core'],
  'guide'   => ['We advise or support others on AI',    'Guiding others'],
];

// "Where do you want AI to work for you?" key => label
const TOPICS = [
  'service'   => 'Customer service',
  'marketing' => 'Sales and marketing',
  'finance'   => 'Finance and accounting',
  'hr'        => 'HR and recruitment',
  'ops'       => 'Operations and logistics',
  'making'    => 'Manufacturing and robotics',
  'data'      => 'Data and analytics',
  'security'  => 'Cybersecurity and risk',
  'rules'     => 'Compliance and regulation',
  'software'  => 'Software and products',
  'admin'     => 'Admin and paperwork',
  'strategy'  => 'Strategy and leadership',
];
const MAX_TOPICS = 5;

// "Who would you like to meet?" key => label. The rule behind each key is in assets/match.js (fits()).
const MEET = [
  'owners'     => 'Business owners and SME leaders',
  'ahead'      => 'Businesses further ahead with AI',
  'funders'    => 'Funders and support agencies',
  'regulators' => 'Regulators and policymakers',
  'providers'  => 'AI and tech providers',
  'trainers'   => 'Trainers and educators',
  'peers'      => 'People in my sector',
  'speakers'   => "Today's speakers",
];

// Agenda (Tuesday 24 November 2026, Malta time), as in the amended agenda of 10 November 2026.
// [start "HH:MM", minutes, title, who, Q&A session key or '', [people on stage]]
const EVENT_DATE = '2026-11-24';
const EVENT_NAME = 'SME National Forum 2026';
const EVENT_VENUE = 'Trident Park Conference Hall, Notabile Gardens, Mdina Road, Birkirkara';
const AGENDA = [
  ['08:15', 30, 'Registration and welcome coffee', '', '', []],
  ['08:45',  5, 'Introduction', 'Kevin Spiteri, Event Host', '', []],
  ['08:50',  8, 'Welcome speech', 'Ivan Refalo, President of Malta Employers', '', []],
  ['08:58',  8, 'Address', 'Hon. Silvio Schembri, Minister for the Economy, Technology and Strategic Projects', '', []],
  ['09:06',  9, 'Address', 'Hon. Darren Carabott, Shadow Minister for the Economy, Technology and Strategic Projects', '', []],
  ['09:15', 15, 'Keynote speech', 'Kenneth Brincat, CEO, MDIA', 'gen', []],
  ['09:30', 10, 'Survey presentation', 'Kevin J. Borg, Director General, Malta Employers', 'gen', []],
  ['09:40', 35, 'Panel discussion 1: Preparing for new skills in a post-AI era', 'Moderated by Kevin Spiteri', 'p1', [
    'Ruth DeBrincat, Senior Director, Policy and Technical Affairs, National Skills Council',
    'Edwin Balzan, Digital Innovations Manager, APS Bank plc',
    'Etienne Caruana, Director General, National Statistics Office',
    'Kevin Camilleri, General Secretary, GWU',
    'Stefan Rodoligo, Chief Information Officer, Identità',
    'Martha Muscat, Head of Research and Innovation, Computime FinTech',
    "Jonathan Gerada, Malta’s Chief Artificial Intelligence Officer",
  ]],
  ['10:15', 20, 'Best practices in business and private sector: part 1', 'Moderated by Prof. Alexiei Dingli', 'bp', [
    'Donna Cauchi, Operations Manager, Niumee Limited, part of St James Hospital Group subsidiary companies',
    'Eric Aquilina, Senior DevOps Engineer, APS Bank plc',
    'James Attard Kingswell, CEO/Director, Kingswell Innovation',
    'Matthew Ellul Sullivan, CEO, Sullivan Shipping Agencies Limited',
  ]],
  ['10:35', 30, 'Coffee break', '', '', []],
  ['11:05', 20, 'Best practices in business and private sector: part 2', 'Moderated by Prof. Alexiei Dingli', 'bp', [
    'Dr Vince Vella, CTO/COO, Computime Business Software & FinTech',
    'Jonathan Dalli, CEO, Concept Stadium',
    'Andrew Schembri, Chair of the Digitalisation Working Group within the Malta Institute of Accountants, and Partner, PwC Malta',
  ]],
  ['11:25', 10, 'Agentic Leaders. Human Futures. Navigating the risks, responsibilities and realities of AI in the workplace', 'Joanne Bondin, Director, misco Consulting Limited', 'gen', []],
  ['11:35', 25, 'International keynote address', 'Danny McCoy, CEO, Ibec', 'gen', []],
  ['12:00', 35, 'Panel discussion 2: Enabling AI adoption: the support ecosystem for SMEs', 'Moderated by Kevin Spiteri', 'p2', [
    'Dr Joseph Gerada, Regulator, Family Business Office',
    'Joseph Darmanin, Chief Business Officer, MDB',
    'David Camilleri, R&I Executive, Xjenza Malta',
    'Rachel Camilleri, Senior Manager, Entrepreneurship and Funding, MDIA',
    'Karl Gauci, Senior Business Development Manager, Tech.MT',
    'Fabrizio Farrugia, Senior Manager, Information and Communication Technologies Unit, Malta Business Registry',
    'Alexander Vella, Malta Enterprise Representative',
  ]],
  ['12:35', 45, 'Interactive presentation', 'Prof. Alexiei Dingli, Consultant', 'gen', []],
  ['13:20', 10, 'Concluding remarks', 'Joseph Farrugia, Advisor to Malta Employers', '', []],
  ['13:30', 60, 'Networking lunch', '', '', []],
];
// Quick replies offered in a chat between two matched people, to agree where to meet.
const MEETUP_SUGGESTIONS = [
  'Shall we meet at the coffee break, 10:35?',
  'Shall we meet at the networking lunch, 13:30?',
  "I'm by the registration desk now.",
];

// Where audience questions can be sent. key => label
const QA_SESSIONS = [
  'p1'  => 'Panel 1: Preparing for new skills in a post-AI era',
  'p2'  => 'Panel 2: Enabling AI adoption, the support ecosystem for SMEs',
  'bp'  => 'Best practices in business',
  'gen' => 'Keynotes and other speakers',
];

// ---------------------------------------------------------------------------
// MISSIONS, XP AND LEVELS (the game layer). key => [label, XP]
// What counts as "done" for each key is worked out by the server (game_state() in api.php).
// ---------------------------------------------------------------------------
const MISSIONS = [
  'intro'    => ['Watch the opening',                                 20],
  'basics'   => ['Create your profile',                               60],
  'org'      => ['Add your sector, organisation type and AI stage',   30],
  'focus'    => ['Pick your focus areas and who you want to meet',    30],
  'card'     => ['Fill in your contact card',                         30],
  'work'     => ['Say what you are working on',                       20],
  'install'  => ['Add the app to your home screen',                   40],
  'notify'   => ['Switch on notifications',                           40],
  'request'  => ['Send your first meet request',                      40],
  'match1'   => ['Make your first match',                             60],
  'match3'   => ['Make 3 matches',                                    80],
  'match5'   => ['Make 5 matches',                                   100],
  'cross'    => ['Match with someone from another sector',            40],
  'speaker'  => ['Match with a speaker',                              40],
  'message'  => ['Send a message to a match',                         20],
  'question' => ['Ask a question from the floor',                     30],
  'poll'     => ['Vote in a live poll',                               20],
  'brief'    => ['Read the conference brief',                         20],
];
// [XP needed, level name]
const LEVELS = [[0, 'Spark'], [120, 'Star'], [280, 'Navigator'], [450, 'Connector'], [650, 'Supernova']];

// ---------------------------------------------------------------------------
// PRIVACY AND CONSENT (GDPR and EU AI Act transparency)
// DRAFT: confirm with Malta Employers and the compliance consultant before speakers sign up.
// The full notice is privacy.html. If you change who does what, or how long data is kept,
// change it here AND in privacy.html, and raise NOTICE_VERSION so new consents are recorded against it.
// ---------------------------------------------------------------------------
const NOTICE_VERSION = '2026-11-15';
const CONTROLLER = 'Malta Employers’ Association';
const PRIVACY_EMAIL = 'admin@maltaemployers.com';
// How long profiles stay. Shown in the pop-up, the footer and privacy.html.
const RETENTION_TEXT = "The app and everything in it are deleted by 31 December 2026.";

// Required tick box: showing the profile to other attendees (GDPR Art. 6(1)(a) consent).
const CONSENT_TEXT = "I agree to Malta Employers showing my profile (name, organisation, role, sector, kind of organisation, AI stage, focus areas, what I offer and look for, and what I'm working on) to other attendees in this app and on the big screen at the event, and to the AI features described in the privacy notice. My sign-in email and my contact details stay private unless I choose to share them with someone I match with.";

// Optional tick box 1: the event report. Must stay optional and unticked by default.
const REPORT_CONSENT_TEXT = "Optional: Malta Employers may receive my profile, my contact details (except a hidden mobile) and the names of the people I match with, for its report on this event.";

// Optional tick box 2: future contact. Separate from the report so each consent is specific.
const MARKETING_CONSENT_TEXT = "Optional: Malta Employers may email me about similar events and activities.";

// Shown under the tick boxes.
const CONSENT_FOOTNOTE = "You can untick these, or delete your account and everything in it, at any time from the Me tab. Nothing you enter is used to train AI models.";

// The privacy summary shown before someone creates an account. One paragraph per line.
const INTRO_TITLE = "Before you join";
const INTRO_TEXT = [
  "This app is run for Malta Employers’ Association. What you add to your profile is public: everyone at the event can see it, and your name may appear on the big screen.",
  "Your sign-in email, mobile and LinkedIn stay private. You choose what to share, person by person, when you match with someone.",
  "Messages are only possible between two people who have both agreed to match, and only the two of you can read them.",
  "Some features use AI (Claude, by Anthropic): suggested opening lines, a summary of the room, and grouping audience questions. They only use what's in profiles and questions, never contact details or messages, and nothing you enter is used to train AI models.",
  "Only share what you're happy to share. You can change or delete your profile at any time.",
];

// Default message sent with a meet request (the sender can change it).
const REQUEST_DEFAULT = "I'd like to catch up with you during the forum.";

// ============================================================================
// LIVE POLLS (optional add-on). Set to false to switch polls off everywhere:
// the poll card, the host controls and the results screen all disappear.
// To remove polls completely, also delete polls.php, polls.html and assets/polls.js.
// ============================================================================
const ENABLE_POLLS = true;

// key => [question, [options...], how many options each person may pick]
// Keep keys stable once voting has started. DRAFT wording: confirm with Anton.
const POLLS = [
  'journey' => ['Where is your business on its AI journey today?',
    ["We haven’t started yet", "We’re exploring and experimenting", 'We use AI for a few everyday tasks', 'AI is part of how we run the business'], 1],
  'skills' => ['Which skills gap is AI exposing most in your business?',
    ['Basic digital skills', 'Knowing which AI tools to use', 'Working with data', "Leaders’ understanding of AI", 'Time to learn and experiment', "We don’t see a gap yet"], 2],
  'support' => ['What would help your business most to adopt AI?',
    ['Funding and grants', 'Training for our staff', 'Expert advice', 'Clear rules on data and AI', 'Examples from similar businesses', 'Better technology and infrastructure'], 2],
  'next' => ['After this morning, how likely are you to try AI in a new part of your business in the next three months?',
    ['Very likely', 'Likely', 'Not sure yet', 'Unlikely'], 1],
];
