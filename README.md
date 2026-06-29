# Đăng Phúc · Study

A focused ESL study workspace: vocabulary cards with spaced repetition, grammar lessons, AI-powered reading practice, writing feedback, and CEFR-style practice tests.

This project is a slimmed-down spin-off of the Study section of [personal-tracker](https://github.com/vincenhat/personal-tracker), rebuilt on top of Firebase Firestore instead of Cloudflare D1 so it deploys cleanly on Vercel + Firebase.

## Stack

- Next.js 15 (App Router, Node runtime for API routes)
- React 18, Tailwind 3, TypeScript strict
- Firebase Admin SDK → Firestore (server-side only, never exposed to the browser)
- Optional AI providers: Google Gemini, Groq, OpenRouter (any combination)

## Features

| Tab        | What it does                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------- |
| Review     | SM-2 spaced-repetition queue for cards due today (Again/Hard/Good/Easy)                       |
| Decks      | Browse, add, edit, delete vocabulary cards. AI fills definition / example / translation / IPA |
| Spelling   | Listen-and-type drill across configurable pools (missed, today, recent, reviewed, all)        |
| Reading    | AI generates a level-appropriate passage with comprehension MCQs and glossary                 |
| Grammar    | Curated bilingual grammar curriculum (A1–B2) with AI-generated 15-question exercise sets      |
| Writing    | Paste a paragraph, get corrected text + grammar issues + B2 vocabulary upgrades from AI       |
| Tests      | CEFR-style practice tests (reading + vocab + grammar + writing) — auto-graded + AI feedback   |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

The app boots at `http://localhost:3000` and redirects unauthenticated visits to `/login`. Sign in with the passcode you put in `APP_PASSCODE`, then change it from `/settings`.

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. Build → Firestore Database → Create database (Native mode, any region close to your users).
3. Project Settings (gear icon) → Service accounts → "Generate new private key" → save the JSON.
4. Copy the three values into `.env.local`:
   - `FIREBASE_PROJECT_ID` → `project_id`
   - `FIREBASE_CLIENT_EMAIL` → `client_email`
   - `FIREBASE_PRIVATE_KEY` → `private_key` (keep the surrounding quotes; escape sequences `\n` are fine)
5. The app creates the collections (`study_cards`, `study_writing_entries`, `study_tests`, `study_readings`, `app_settings`) on first write — no schema migration step needed.

Because every Firestore call is made from the Admin SDK on the server, you can leave the default "no public access" security rules in place. The browser never talks to Firestore directly; it only calls our `/api/*` routes, which are guarded by the session middleware.

## Deploying to Vercel

```bash
vercel link          # link this folder to a new Vercel project
vercel env add ...   # add each of the env vars above
vercel --prod
```

Or import the GitHub repo from <https://vercel.com/new> and paste the env vars in the project settings before the first build.

## AI providers (optional)

The AI-powered tabs (Decks AI-fill, Reading, Grammar exercises, Writing feedback, Tests) call out to a text generation provider. You can configure any subset:

- Google Gemini → `GOOGLE_API_KEY`
- Groq → `GROQ_API_KEY`
- OpenRouter → `OPENROUTER_API_KEY`

The model switcher in the UI only lists models whose provider key is configured. With none set, the AI tabs surface a friendly "no AI key configured" notice and the rest of the app keeps working.

## License

MIT.
