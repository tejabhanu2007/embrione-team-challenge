# The Embrione — Meet The Team Challenge

A full-stack Next.js App Router implementation of the three required pages:

- `/register` — registration form, real-time card preview, browser-side WebP conversion, Supabase Storage upload, and pending submission.
- `/admin` — challenge admin login, moderation dashboard, counters, approve/reject/delete actions.
- `/team` — public directory showing approved members with domain and position filters.

## Stack

- Next.js App Router + TypeScript
- Supabase PostgreSQL + Storage
- `jose` for a signed, HTTP-only admin session cookie
- Plain CSS (no Tailwind setup needed)

## 1. Requirements

Install Node.js 20.9 or newer and Git. Check in CMD:

```bat
node -v
npm -v
git --version
```

## 2. Install dependencies

Open CMD in this project folder and run:

```bat
npm install
```

## 3. Create the Supabase project

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run the full script in `database/setup.sql`.
3. Open **Storage** and confirm a public bucket named `member-photos` exists. The SQL script attempts to create it; if it already exists, that's fine.
4. In the bucket settings, set the maximum file size to 2 MB and allowed MIME type to `image/webp` if those settings are available in your Supabase dashboard.
5. In Project Settings / API, copy the project URL, publishable/anon key, and service-role/secret key.

**Important:** The service-role key bypasses Row Level Security. It is only used in server-side API routes. Never place it in a `NEXT_PUBLIC_` variable, commit it, or send it to the browser.

The SQL uses stricter policies than the permissive sample in the challenge PDF: visitors may submit only `pending` members. The public `/api/team` endpoint returns only non-sensitive fields for approved profiles, rather than exposing the whole table (which contains SRNs and email addresses). Admin reads/updates/deletes happen through server API routes protected by a signed session cookie. This prevents the public client from approving its own submission.

## 4. Create the local environment file

In the root project folder, make a copy of `.env.example` and name it `.env.local`:

```bat
copy .env.example .env.local
```

Edit `.env.local` and replace the three Supabase placeholders with your own project's values. Keep the admin credentials exactly as required by the challenge. Replace `ADMIN_SESSION_SECRET` with a long random value; do not share it.

If you use PowerShell, generate a secret with:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Restart the dev server after changing `.env.local`.

## 5. Run the app

```bat
npm run dev
```

Open http://localhost:3000. Test these URLs:

- http://localhost:3000/register
- http://localhost:3000/admin
- http://localhost:3000/team

## 6. Test the complete workflow

1. Open `/register`. Type a name and confirm the preview updates live.
2. Select a PNG/JPG/JPEG. The browser converts it to WebP when you submit; the upload is delayed until Submit.
3. Submit the form. Supabase should show a new row with `status = pending` and an object ending in `.webp` in Storage (if you selected a file).
4. Open `/admin` and log in with the challenge credentials.
5. Approve the submission. It should appear on `/team`; rejected members should remain hidden.
6. Try filtering `/team` by domain and position.
7. Try submitting the same SRN again; the app should warn you.

The database script inserts six clearly labelled sample/demo profiles as already approved so `/team` is populated immediately. They are dummy people and not real Embrione members.

## 7. Build locally before deployment

```bat
npm run build
```

Fix any reported errors before deploying.

## 8. Push to GitHub

Create an empty public repository on GitHub, then run from CMD inside this folder (replace the URL):

```bat
git init
git add .
git commit -m "chore: initialize Embrione team app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Add smaller commits as you finish features, e.g. `feat: registration and live preview`, `feat: webp upload`, `feat: admin moderation`, `feat: team filters`, and `fix: responsive layout`.

## 9. Deploy to Vercel

1. Import the GitHub repository at https://vercel.com.
2. In Vercel Project Settings → Environment Variables, add every value from `.env.local` except any local-only placeholders. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
3. Deploy. If you add/change environment variables after deploying, redeploy.
4. If available, set the project name/domain to the challenge format: `yourfirstname-embrione-task.vercel.app` (or the fallback format in the brief).
5. Test the live production site, not just localhost.

## 10. Two-minute demo video checklist

Show the live preview on `/register`, submit a profile with a photo, show the stored `.webp` file in Supabase Storage or the browser Network tab, log into `/admin`, approve the profile, and show it appearing on `/team`. Set the video link to anyone-with-the-link can view.

## Folder map

```text
embrione-team-challenge/
├── database/
│   └── setup.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── members/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   └── check-srn/route.ts
│   │   ├── admin/page.tsx
│   │   ├── register/page.tsx
│   │   ├── team/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── MemberCard.tsx
│   │   └── SiteNav.tsx
│   └── lib/
│       ├── admin-auth.ts
│       ├── options.ts
│       ├── types.ts
│       └── supabase/
│           ├── admin.ts
│           └── client.ts
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
└── tsconfig.json
```
