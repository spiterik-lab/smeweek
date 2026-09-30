SME CONSTELLATION – SETUP ON HOSTINGER (about 10 minutes)
========================================================

WHAT'S IN THE FOLDER
  index.html    Attendee page (this is what the lanyard QR code opens)
  screen.html   Big-screen page for the projector (live map, QR code, "Read the room", organiser tools)
  api.php       Saves profiles and talks to the AI
  config.php    Settings: event title and the organiser password (stored as a hash only)
  assets/       Styles, scripts and the QR generator
  Saved profiles and the AI key live in a "smeweek-data" folder OUTSIDE the website folder
  (created automatically), so updates from GitHub never wipe them.

1. DEPLOYMENT
   Deployed automatically from GitHub (spiterik-lab/smeweek, branch main) into
   tetra.com.mt/public_html/smeweek via hPanel > Advanced > Git. Every push goes live.
   Live address:  https://tetra.com.mt/smeweek/
   Big screen:    https://tetra.com.mt/smeweek/screen.html

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
