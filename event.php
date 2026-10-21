<?php
// ============================================================================
// EVENT CONTENT: edit this file to change questions, sectors, agenda and Q&A.
// Everything the attendee sees comes from here. Push to GitHub and it goes live.
// ============================================================================

// "Why are you attending?" Each pair has a GIVE side and a GET side; the app
// matches people whose GIVE meets someone else's GET. Keep the keys stable once
// people have joined (labels can change freely).
//   key => [give label, get label, short noun used in match sentences]
const INTERESTS = [
  'training' => ['We offer AI training',                       'Looking for AI training',                       'AI training'],
  'support'  => ['We offer AI schemes, funding or assistance', 'Looking for AI schemes, funding or assistance', 'AI schemes and assistance'],
  'practice' => ['Sharing our AI best-practice experience',    'Hearing AI best practice from others',          'AI best practice'],
  'knowhow'  => ['Helping others understand AI',               'Learning more about AI',                        'AI know-how'],
  'solution' => ['Offering an AI product or service',          'Looking for an AI product or service',          'AI products and services'],
];
// A single option that matches anyone else who ticks it too.
const NETWORKING_LABEL = 'Networking with others in the room';

// Sector list (optional field). Colours are used for the stars on the map.
const SECTORS = [
  ['Tourism & hospitality',            '#f2b84b'],
  ['Retail & trade',                   '#f2766b'],
  ['Manufacturing',                    '#a7d36b'],
  ['Financial services & banking',     '#26a1cd'],
  ['Professional services',            '#e8a48f'],
  ['Tech & IT',                        '#2ec4b6'],
  ['Gaming & digital',                 '#9b7be0'],
  ['Shipping, logistics & maritime',   '#7cc7f2'],
  ['Health & care',                    '#f29ac9'],
  ['Education & training',             '#d9c19a'],
  ['Construction & property',          '#c9a26b'],
  ['Public body or support agency',    '#e0336f'],
  ['Union or employer association',    '#5b8def'],
  ['Other',                            '#b0acd0'],
];

// Agenda (Tuesday 24 November 2026, Malta time). [start "HH:MM", minutes, title, who, Q&A session key or '']
const EVENT_DATE = '2026-11-24';
const AGENDA = [
  ['08:15', 30, 'Registration, networking and coffee', '', ''],
  ['08:45',  5, 'Welcome from your host, and theme video', 'Kevin Spiteri', ''],
  ['08:50',  8, 'Welcome speech', "Ivan Refalo, President, Malta Employers", ''],
  ['08:58',  8, 'Address', 'Hon. Silvio Schembri, Minister for the Economy, Technology and Strategic Projects', ''],
  ['09:06',  8, 'Address', 'Hon. Darren Carabott, Shadow Minister for the Economy, Technology and Strategic Projects', ''],
  ['09:15', 15, 'Keynote', 'Kenneth Brincat, CEO, MDIA', 'gen'],
  ['09:30', 10, 'Survey presentation', "Kevin J. Borg, Director General, Malta Employers", 'gen'],
  ['09:40', 35, 'Panel 1: Preparing for new skills in a post-AI era', 'Moderated by Kevin Spiteri', 'p1'],
  ['10:15', 20, 'Best practices in business, part 1', 'Moderated by Prof. Alexiei Dingli', 'bp'],
  ['10:35', 30, 'Coffee break', '', ''],
  ['11:05', 20, 'Best practices in business, part 2', 'Moderated by Prof. Alexiei Dingli', 'bp'],
  ['11:25', 10, 'Agentic leaders, human futures', 'Joanne Bondin', 'gen'],
  ['11:35', 20, 'International keynote', 'Danny McKoy, CEO, Ibec', 'gen'],
  ['12:00', 35, 'Panel 2: Enabling AI adoption, the support ecosystem for SMEs', 'Moderated by Kevin Spiteri', 'p2'],
  ['12:35', 45, 'Interactive presentation', 'Prof. Alexiei Dingli', 'gen'],
  ['13:20', 10, 'Concluding remarks', "Joseph Farrugia, Advisor to Malta Employers", ''],
  ['13:30', 60, 'Networking lunch', '', ''],
];

// Where audience questions can be sent. key => label
const QA_SESSIONS = [
  'p1'  => 'Panel 1: Preparing for new skills in a post-AI era',
  'p2'  => 'Panel 2: Enabling AI adoption, the support ecosystem for SMEs',
  'bp'  => 'Best practices in business',
  'gen' => 'Keynotes and other speakers',
];

// ---------------------------------------------------------------------------
// PRIVACY WORDING. DRAFT: confirm with Anton and the compliance consultant.
// ---------------------------------------------------------------------------
// How long profiles stay. Used in the consent text, the pop-up and the footer.
const RETENTION_TEXT = "Everything is deleted within 30 days of the event.";

// Required tick box: what other attendees (and the big screen) can see.
const CONSENT_TEXT = "I agree that my name, organisation, role, sector, reasons for attending and what I'm working on are shown to other attendees in this app and on the big screen at the event. My contact details stay private and are only shared with people whose request I accept.";

// Optional tick box: lets Malta Employers keep the details for its event report.
const REPORT_CONSENT_TEXT = "Optional: Malta Employers may receive my details, including my contact details, and a record of the connections I make here, to report on the event and keep in touch about similar events.";

// The pop-up everyone sees the first time they open the app. One paragraph per line.
const INTRO_TITLE = "Before you join";
const INTRO_TEXT = [
  "What you add to your profile is public: everyone at the event can see it, and it may appear on the big screen.",
  "Your mobile, email and LinkedIn are private. They are only shared with someone if they ask to connect and you accept.",
  "Only share what you're happy to share. You can change or remove your profile at any time.",
];

// Default message sent with a connection request (the sender can change it).
const REQUEST_DEFAULT = "I'd like to catch up with you during the conference.";

// ============================================================================
// LIVE POLLS (optional add-on). Set to false to switch polls off everywhere:
// the Poll tab, the host controls and the results screen all disappear.
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
