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

// ── Advanced (normally leave as is) ─────────────────────────
const AI_MODEL        = 'claude-haiku-4-5-20251001'; // fast and inexpensive
const MAX_PEOPLE      = 600;   // hard cap on profiles
const INSIGHT_CACHE_S = 90;    // "Read the room" reuses its answer for this many seconds
