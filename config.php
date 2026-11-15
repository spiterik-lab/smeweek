<?php
// ─────────────────────────────────────────────────────────────
//  SME Constellation – settings.
// ─────────────────────────────────────────────────────────────

// The Claude API key is NOT stored here: add it on screen.html > Organiser > Claude API key.
// It is saved outside the website folder, never in GitHub.
const ANTHROPIC_API_KEY = '';

// Organiser password, stored only as a SHA-256 hash (the password itself is never in the code).
// To change it:  php -r "echo hash('sha256', 'NEW PASSWORD');"  and paste the result here.
const ADMIN_KEY_HASH = '9c021713ee32535b4595481b1df0a37e122dd5235f8b650b4464a10ac93534ab';

// Event title shown on the pages.
const EVENT_TITLE = 'Making AI work for SMEs';
const APP_VERSION = '2.0';

// "Sign in with Google" and "Sign in with Microsoft" (optional). The buttons appear once a client ID is set,
// either here or on screen.html > Organiser > Sign-in options. Client IDs are not secrets. Setup steps: SETUP-SIGNIN.md
const GOOGLE_CLIENT_ID    = '';
const MICROSOFT_CLIENT_ID = '';

// Password-reset emails are sent from this address (use a mailbox that exists on your Hostinger account).
const MAIL_FROM      = 'noreply@tetra.com.mt';
const MAIL_FROM_NAME = 'SME Constellation';

// ── Advanced (normally leave as is) ─────────────────────────
const AI_MODEL        = 'claude-haiku-4-5-20251001'; // fast and inexpensive
const MAX_PEOPLE      = 600;   // hard cap on profiles
const INSIGHT_CACHE_S = 90;    // "Read the room" reuses its answer for this many seconds
