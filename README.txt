SME CONSTELLATION – SETUP ON HOSTINGER (about 10 minutes)
========================================================

VERSION 2.0 (November 2026). To go back to Version 1 see ROLLBACK.md.

WHAT'S IN THE FOLDER
  event.php     >>> EDIT THIS to change the questions, sectors, agenda, Q&A sessions, missions and consent wording <<<
  index.html    The attendee app (the lanyard QR opens this). Its code is in assets/v2/ and assets/match.js
  sw.js, manifest.webmanifest   Make the app installable on phones and deliver notifications
  screen.html   Big-screen page for the projector (live map, QR code, "Read the room", organiser tools)
  host.html     Host view (organiser password): live polls (open/close) and audience questions
  polls.html    Live poll results for the big screen
  api.php       The server: accounts, profiles, meet requests, messages, notifications, missions, AI
  lib/crypto.php  Notification encryption and the Google / Microsoft sign-in checks
  config.php    Settings: event title and the organiser password (stored as a hash only)
  assets/match.js  The matching rules, explained in plain words at the top of the file
  tests/        Automatic checks: "node tests/api-test.mjs" (server) and "node tests/ui-journey.mjs" (the app in a phone-size browser)
  Saved data lives in a "smeweek-data-v2" folder OUTSIDE the website folder (created automatically),
  so updates from GitHub never wipe it. Version 1's "smeweek-data" folder is left untouched.

1. DEPLOYMENT
   Deployed automatically from GitHub (spiterik-lab/smeweek, branch main) into its own
   Hostinger website smeweek.tetra.com.mt (domains/smeweek.tetra.com.mt/public_html)
   via hPanel > Advanced > Git. Every push goes live. It is separate from the main
   tetra.com.mt site, so revamping that site does not touch the app.
   Live address:  https://smeweek.tetra.com.mt/
   Big screen:    https://smeweek.tetra.com.mt/screen.html
   Saved data:    domains/smeweek.tetra.com.mt/smeweek-data-v2 (outside the web folder)
   The old address tetra.com.mt/smeweek/ redirects to the new one (.htaccess).

3. TEST
   - Open the address on your phone, create an account and fill in your profile.
   - Open screen.html on a laptop: you should appear as a star within a few seconds.
   - Organiser panel on screen.html: unlock with the organiser password, paste your Claude API key
     (from https://console.anthropic.com > API keys, with a small credit) and press Save key.
   - "Clear all profiles" after testing.

4. ON THE DAY
   - Print the QR code shown on screen.html (or generate one for https://YOURDOMAIN/smeweek/) for the lanyards.
   - Untick "Show example attendees" on the big screen once real people are joining
     (it switches off by itself once 6 real people have joined, unless you have changed it by hand).
   - After the event: "Download attendee list (CSV)" if Malta Employers wants it, then "Clear all profiles".

NOTES
  - People sign in with an email and password.
    Phones that joined under Version 1 keep their profile and are asked to add an email and password.
  - Password reset emails are sent by the server from noreply@tetra.com.mt (MAIL_FROM in config.php).
  - Needs PHP 8.0 or newer (Hostinger default). If saving fails, set the data/ folder permissions to 755.
  - Clear profiles after testing and after the event (GDPR: the consent text promises deletion).

PRIVACY NOTES
  - Contact cards (mobile, email, LinkedIn) are never shown on the map. Someone taps "Ask to meet" and chooses
    which details to share; the other person is notified and, if they accept, chooses what to share back.
    Either can change what they share with that person afterwards, or ask for a detail in the chat.
  - Messages are only possible between two people who have both agreed to match.
  - The sign-in screen has a "Before you join" summary of what is public and what is private.
  - Speaker link: https://smeweek.tetra.com.mt/?speaker=1 ticks "I'm a speaker" automatically.
  - Organiser panel (screen.html): event report numbers plus "People (CSV)" and "Connections (CSV)".
    Contact details and who-connected-with-whom are only included for people who ticked the optional
    report box (both people, for a connection). Unique phones that opened the app are counted (hashed).
  - Privacy: full notice in privacy.html; consent wording, pop-up and retention in event.php (keep both in step,
    raise NOTICE_VERSION when the wording changes). Each profile records when consent was given and the notice version.
    AI output is labelled in the app (EU AI Act Art. 50). Approved for use by the organiser on 16 Nov 2026.
  - "Clear all profiles" also deletes all connections and visit counts. "Clear all questions" deletes the Q&A.

LIVE POLLS (optional add-on)
  - Polls are written in event.php (POLLS). Open and close them from host.html; results show on polls.html.
  - Switch off: set ENABLE_POLLS = false in event.php (the Poll tab, host controls and results screen disappear).
  - Remove completely: also delete polls.php, polls.html and assets/polls.js, and the lines marked
    data-feature="polls" in host.html and screen.html.
