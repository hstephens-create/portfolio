# StudyGO

See what's due, plan your two hours, go.

StudyGO takes your assignment list — either typed in or read off a screenshot of
your school's homework page — and:

1. Shows what needs to be done, with a priority dot based on how soon it's due.
2. Packs everything into a 2-hour block schedule (focus blocks up to 45 minutes,
   5-minute breaks between them, anything that doesn't fit gets listed as
   "carried over" so you know what's left for next time).
3. Generates quick resource links (Google, YouTube, Khan Academy, Quizlet) for
   each assignment.

## Running it

```bash
cd studygo
npm install
npm start
```

Then open http://localhost:3001.

Manual entry (typing in title / subject / due date / estimated minutes) works
with no setup at all.

## Screenshot reading (optional)

Uploading a screenshot of your assignments page uses Claude's vision API to
read it. To enable that:

1. Copy `.env.example` to `.env`.
2. Get an API key from https://console.anthropic.com/ and set `ANTHROPIC_API_KEY`.
3. Restart the server.

Without a key, the upload button will tell you it's not configured and you
can just add assignments manually instead — the planning and resources
features work the same either way.

## Installing on iPad

StudyGO is an installable web app (PWA) — no App Store, no Xcode, no Mac
needed. Two steps: deploy it somewhere with HTTPS, then add it to your
Home Screen.

### 1. Deploy (free, via Render)

This repo includes a `render.yaml` at the root, so Render can deploy it
automatically:

1. Go to https://dashboard.render.com and sign in with your GitHub account.
2. Click **New +** → **Blueprint**.
3. Pick this repo (`portfolio`) and the branch StudyGO is on.
4. Render reads `render.yaml` and sets up the `studygo` service for you —
   just click **Apply**.
5. (Optional) In the service's **Environment** tab, add `ANTHROPIC_API_KEY`
   if you want the screenshot-reading feature. Skip it and manual entry
   still works fine.
6. Wait for the build to finish. You'll get a URL like
   `https://studygo.onrender.com`.

Free-tier services spin down after 15 minutes idle — the first load after
a quiet spell takes ~30–50 seconds to wake back up. That's normal.

### 2. Add to Home Screen

1. On the iPad, open your Render URL in **Safari** (must be Safari, not
   Chrome).
2. Tap the **Share** icon, then **Add to Home Screen**.

That gives you a StudyGO icon that opens full-screen, without Safari's
address bar, and keeps working offline once you've loaded it at least once
(everything except the screenshot-reading feature, which needs a live
connection to the server).
