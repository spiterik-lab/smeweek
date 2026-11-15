# Switching on "Continue with Google" and "Continue with Microsoft"

Email and password sign-in works without any setup. The Google and Microsoft buttons are built and tested, but they only
appear once you have registered the app with each company (free, about ten minutes each) and pasted the ID they give you
into the organiser panel. No secret keys are needed and nothing is stored in GitHub.

The address to give both companies (called the "redirect URI") is exactly:

```
https://smeweek.tetra.com.mt/
```

## Google

1. Go to `console.cloud.google.com` and sign in. Create a project (any name, e.g. "SME Constellation").
2. Menu > **APIs & Services** > **OAuth consent screen**. Choose **External**. App name "SME Constellation", your email as support and developer contact. No extra scopes. Publish the app (status "In production"), otherwise only test users can sign in.
3. Menu > **APIs & Services** > **Credentials** > **Create credentials** > **OAuth client ID**. Type: **Web application**.
4. Under **Authorised JavaScript origins** add `https://smeweek.tetra.com.mt`. Under **Authorised redirect URIs** add `https://smeweek.tetra.com.mt/`.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

## Microsoft

1. Go to `entra.microsoft.com` (or `portal.azure.com`) > **App registrations** > **New registration**.
2. Name "SME Constellation". Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Redirect URI: platform **Web**, address `https://smeweek.tetra.com.mt/`.
4. After creating it, open **Authentication** and tick **ID tokens (used for implicit and hybrid flows)**. Save.
5. Copy the **Application (client) ID** from the Overview page.

## Paste the IDs into the app

1. Open `https://smeweek.tetra.com.mt/screen.html`, open **Organiser**, and unlock it with the organiser password.
2. Paste the Google client ID and/or the Microsoft application ID and press **Save sign-in settings**.
3. Open the app in a private window: the buttons now show on the sign-in screen. Try each one.

To switch a button off again, clear its box and save.

## How it works (for whoever checks this)

- The app uses OpenID Connect and asks only for the ID token (name and email), sent straight back to the page. It never receives a password or an access token.
- The server checks the token's signature against Google's or Microsoft's published keys, that it was issued for this app, that it has not expired, and a one-time code so that a token cannot be replayed.
- A Google sign-in with a verified email joins an existing account that has the same email. A Microsoft sign-in never does (Microsoft does not promise the email is verified), so it cannot be used to take over someone's account.
- For a staging copy on another address, add that address as a second redirect URI at both companies.
