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

// Text shown next to the consent tick box.
const CONSENT_TEXT = "I agree that my name, organisation and answers are shown to other attendees on this map. My mobile number is only shared with people I agree to swap numbers with. Everything is deleted after the event.";
