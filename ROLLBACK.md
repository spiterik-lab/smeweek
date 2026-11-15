# Going back to Version 1

Version 2.0 was built so that going back is one step and loses nothing that Version 1 could hold.

## What is kept where

| | Version 1 | Version 2.0 |
|---|---|---|
| Code | GitHub branch `v1-stable` (never changed). A zip of the same code is saved in the project files as `smeweek-v1.0-source.zip`. | GitHub branch `v2`, and `main` once it is live |
| Saved data on Hostinger | `domains/smeweek.tetra.com.mt/smeweek-data` | `domains/smeweek.tetra.com.mt/smeweek-data-v2` |
| Address and QR code | `https://smeweek.tetra.com.mt/` | the same address, the same QR code |

Version 2 never writes to the Version 1 folder. The first time Version 2 runs it copies the Version 1 profiles,
requests, questions, poll votes and the AI key into its own folder, and leaves the originals untouched.

## How to go back (about two minutes)

The live site shows whatever is on the `main` branch, so going back means pointing `main` at the Version 1 code again.

**Easiest: ask Claude** in this project: "Roll the event app back to Version 1." Claude will do the steps below and check the live site.

**By hand, option A (Hostinger, no Git knowledge needed):**

1. hPanel > Websites > smeweek.tetra.com.mt > Advanced > **Git**.
2. Under "Manage repositories", remove the entry for branch `main` and add the same repository (`spiterik-lab/smeweek`) with branch **`v1-stable`**, install path left empty. Press **Deploy**.
3. Open `https://smeweek.tetra.com.mt/` and check that the Version 1 page ("Add yourself to the map") is back.

**By hand, option B (from a computer with Git):**

```
git fetch origin
git push origin origin/v1-stable:main --force-with-lease
```

Hostinger picks up the change within a minute. Then check the live address as in step 3 above.

To return to Version 2 afterwards, push the `v2` branch to `main` again. Its data folder is still there.

## What happens to the data

**If you go back before anyone has used Version 2:** nothing to do. Version 1 reads its own folder, which was never changed.

**If you go back after people have joined on Version 2:** before switching the code, open
`https://smeweek.tetra.com.mt/screen.html`, open **Organiser**, unlock it, and press
**"Going back to Version 1? Copy profiles across"**. This writes the Version 2 profiles, meet requests, questions and
poll votes into the Version 1 folder in Version 1's format. The files that were there are kept beside them with
`before-rollback-<date>` in their names. Then switch the code as above.

| Data | After going back |
|---|---|
| Profiles (name, organisation, role, sector, contact card, consents) | Kept. People's phones still recognise them, so they can edit or remove their profile. |
| Sectors | Kept as chosen. A sector that only exists in Version 2 shows as its name but is not in Version 1's list if the person edits. |
| What people offer and look for | The five Version 1 topics are kept. The three new ones (AI rules, pilots, skills) are dropped. |
| Meet requests and matches | Kept. Version 1 shows them as connection requests and connections. |
| Questions and poll votes | Kept. |
| Accounts (email and password, Google or Microsoft sign-in) | Not used by Version 1. They stay in the Version 2 folder and work again if you return to Version 2. |
| Messages, notifications, points and missions | Not shown by Version 1 (it has no such features). They stay in the Version 2 folder. |
| Kind of organisation, AI stage, focus areas, who to meet | Not shown by Version 1. They stay in the Version 2 folder. |

Nothing is deleted by going back. The Version 2 folder is left in place until you clear it (Organiser > Clear all profiles while Version 2 is live, or delete the folder in Hostinger's File Manager).

## Things to know

- Phones that added Version 2 to their home screen keep the icon. It opens the same address, so it shows Version 1 after a rollback.
- Notifications stop after a rollback, because Version 1 does not send any.
- The Git tag `v1.0` exists only in the working copy (GitHub refused the tag push on the day); the branch `v1-stable` is the reference.
- Privacy: Version 2 collects more than Version 1 (accounts, messages, notification addresses). If you go back for good, clear the Version 2 folder so that data is not kept without a purpose.
