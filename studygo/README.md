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

StudyGO is a installable web app (PWA) — no App Store needed.

1. Deploy it somewhere reachable from your iPad over HTTPS (Render, Railway,
   Vercel, etc. can all run a small Express app like this one). HTTPS is
   required for the offline/home-screen support to fully kick in.
2. On the iPad, open that URL in **Safari** (it has to be Safari, not Chrome).
3. Tap the **Share** icon, then **Add to Home Screen**.

That gives you a StudyGO icon that opens full-screen, without Safari's
address bar, and keeps working offline once you've loaded it at least once
(everything except the screenshot-reading feature, which needs a live
connection to the server).
