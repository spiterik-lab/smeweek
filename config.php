<?php
// ─────────────────────────────────────────────────────────────
//  SME Constellation – settings.
// ─────────────────────────────────────────────────────────────

// The Claude API key is NOT stored here: add it on screen.html > Organiser > Claude API key.
// It is saved outside the website folder, never in GitHub.
const ANTHROPIC_API_KEY = '';

// Organiser password, stored only as a SHA-256 hash (the password itself is never in the code).
// To change it:  php -r "echo hash('sha256', 'NEW PASSWORD');"  and paste the result here.
// One-time reset: the organiser can choose a new password on screen.html > Organiser > "Forgotten the password?"
// with a reset code. Only the code's hash is kept here. It works once per site and stops working after the date below.
// A password chosen that way is kept (as a hash) in the data folder and replaces the one in this file.
const ADMIN_RESET_HASH  = '41db4c8e2cf40871a18f578480ac9debeb5938b5baf79d9592faad6bf83fc2bc';
const ADMIN_RESET_UNTIL = '2026-11-30';
// Fresh start: when this value changes, the app (once, on its next visit) moves all profiles, accounts, requests,
// messages, questions and poll votes into a private backup folder inside the data folder and starts empty.
// Settings (AI key, organiser password, email) are kept. Set on 16 Nov 2026 at the organiser's request.
const FRESH_START_ID = '2026-11-16';
const ADMIN_KEY_HASH = '9c021713ee32535b4595481b1df0a37e122dd5235f8b650b4464a10ac93534ab';

// Event title shown on the pages.
const EVENT_TITLE = 'Making AI work for SMEs';
const APP_VERSION = '2.0';

// Google and Microsoft sign-in are switched OFF (organiser decision, 15 Nov 2026): the app uses email and
// password only. The code stays in place but nothing is shown or accepted while SOCIAL_SIGNIN is false.
const SOCIAL_SIGNIN = false;
const GOOGLE_CLIENT_ID    = '';
const MICROSOFT_CLIENT_ID = '';

// Password-reset emails are sent from this address (use a mailbox that exists on your Hostinger account).
const MAIL_FROM      = 'noreply@tetra.com.mt';
const MAIL_FROM_NAME = 'SME Constellation';

// ── Advanced (normally leave as is) ─────────────────────────
const AI_MODEL        = 'claude-haiku-4-5-20251001'; // fast and inexpensive
const MAX_PEOPLE      = 600;   // hard cap on profiles
const INSIGHT_CACHE_S = 90;    // "Read the room" reuses its answer for this many seconds
