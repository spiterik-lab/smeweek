SME CONSTELLATION – SETUP ON HOSTINGER (about 10 minutes)
========================================================

WHAT'S IN THE FOLDER
  event.php     >>> EDIT THIS to change the questions, sectors, agenda and Q&A sessions <<<
  host.html     Host view (organiser password): live polls (open/close) and audience questions
  polls.html    Live poll results for the big screen
  index.html    Attendee page (the lanyard QR opens this): add yourself, matches, map, agenda, ask a question
  screen.html   Big-screen page for the projector (live map, QR code, "Read the room", organiser tools)
  api.php       Saves profiles and talks to the AI
  config.php    Settings: event title and the organiser password (stored as a hash only)
  assets/       Styles, scripts and the QR generator
  Saved profiles and the AI key live in a "smeweek-data" folder OUTSIDE the website folder
  (created automatically), so updates from GitHub never wipe them.

1. DEPLOYMENT
   Deployed automatically from GitHub (spiterik-lab/smeweek, branch main) into its own
   Hostinger website smeweek.tetra.com.mt (domains/smeweek.tetra.com.mt/public_html)
   via hPanel > Advanced > Git. Every push goes live. It is separate from the main
   tetra.com.mt site, so revamping that site does not touch the app.
   Live address:  https://smeweek.tetra.com.mt/
   Big screen:    https://smeweek.tetra.com.mt/screen.html
   Saved data:    domains/smeweek.tetra.com.mt/smeweek-data (outside the web folder)
   The old address tetra.com.mt/smeweek/ redirects to the new one (.htaccess).

3. TEST
   - Open the address on your phone and add yourself.
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
  - Nobody needs an account. Each phone remembers its own entry so people can edit or remove themselves.
  - Needs PHP 8.0 or newer (Hostinger default). If saving fails, set the data/ folder permissions to 755.
  - Clear profiles after testing and after the event (GDPR: the consent text promises deletion).

PRIVACY NOTES
  - Contact cards (mobile, email, LinkedIn) are never shown on the map. Someone taps "Ask to connect",
    the other person gets a pop-up and, if they accept, both see each other's card. "Hide my mobile"
    keeps the number out of the card even after accepting.
  - First visit shows a pop-up explaining what is public (and may appear on the big screen) and what is private.
  - Speaker link: https://smeweek.tetra.com.mt/?speaker=1 ticks "I'm a speaker" automatically.
  - Organiser panel (screen.html): event report numbers plus "People (CSV)" and "Connections (CSV)".
    Contact details and who-connected-with-whom are only included for people who ticked the optional
    report box (both people, for a connection). Unique phones that opened the app are counted (hashed).
  - Privacy wording (consent, report consent, pop-up, retention) is in event.php. DRAFT until confirmed.
  - "Clear all profiles" also deletes all connections and visit counts. "Clear all questions" deletes the Q&A.

LIVE POLLS (optional add-on)
  - Polls are written in event.php (POLLS). Open and close them from host.html; results show on polls.html.
  - Switch off: set ENABLE_POLLS = false in event.php (the Poll tab, host controls and results screen disappear).
  - Remove completely: also delete polls.php, polls.html and assets/polls.js, and the lines marked
    data-feature="polls" in index.html, host.html and screen.html (and the polls block at the end of app.css).
