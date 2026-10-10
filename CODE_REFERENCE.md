# Complete code reference

Every project source/configuration file is reproduced below. The ready-to-run source tree is also included in the ZIP; edit files in the tree, not this combined reference.

## `.env.example`

```text
# Supabase project settings: Project Settings -> API (or API Keys)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Server-only key. Never prefix this with NEXT_PUBLIC_ and never commit it.
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Challenge-required admin login. These are server-only environment variables.
ADMIN_EMAIL=admin@embrione.pes.edu
ADMIN_PASSWORD=EmbrioneAdmin@2026

# Replace with a long random secret (at least 32 characters).
# Example generation on Windows PowerShell: [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
ADMIN_SESSION_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
```

## `.gitignore`

```text
node_modules/
.next/
out/
build/
dist/
.env
.env.local
.env.*.local
.vercel/
.DS_Store
npm-debug.log*
```

## `database/setup.sql`

```sql
-- The Embrione challenge database setup.
-- Run the whole script once in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  position text not null,
  srn text not null,
  email text not null,
  linkedin_url text,
  github_url text,
  branch text not null,
  semester integer not null,
  bio text,
  photo_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Prevent accidental duplicate SRNs regardless of letter case.
create unique index if not exists members_srn_lower_unique on public.members (lower(srn));
create index if not exists members_status_created_at_idx on public.members (status, created_at desc);

alter table public.members enable row level security;

-- Public visitors can submit only pending member profiles.
drop policy if exists "Public can submit pending members" on public.members;
create policy "Public can submit pending members"
  on public.members for insert to anon, authenticated
  with check (status = 'pending');

-- Do not add a public SELECT policy on the base table: it contains emails and SRNs.
-- The public /api/team route uses the server key and returns only non-sensitive fields
-- for approved profiles. Do NOT create public UPDATE or DELETE policies either.
drop policy if exists "Public can read approved members" on public.members;

-- Make the public bucket. If it already exists, the duplicate-key exception is ignored.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', true, 2097152, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may upload a WebP object into this one bucket. The app creates random object names.
drop policy if exists "Public can upload member WebP photos" on storage.objects;
create policy "Public can upload member WebP photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'member-photos' and lower(storage.filename(name)) like '%.webp');

-- The bucket is public, so photos can be retrieved through their public URLs.

-- Seed profiles: dummy/demo data only. They are approved so /team is populated on first launch.
insert into public.members
  (name, domain, position, srn, email, linkedin_url, github_url, branch, semester, bio, photo_url, status)
values
  ('Aarav Demo', 'Web Development', 'Head', 'PESDEMO0001', 'aarav.demo@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'CSE', 6, 'Building clean, accessible web experiences and helping the team ship reliable features.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=AaravDemo', 'approved'),
  ('Mira Sample', 'Design', 'Vice-Head', 'PESDEMO0002', 'mira.sample@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'AIML', 5, 'Exploring visual systems, thoughtful interaction design, and consistent product experiences.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=MiraSample', 'approved'),
  ('Kabir Example', 'Logistics', 'Core Member', 'PESDEMO0003', 'kabir.example@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'ECE', 4, 'Enjoys solving operational problems and making events run smoothly behind the scenes.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=KabirExample', 'approved'),
  ('Anaya Test', 'Operations', 'Core Member', 'PESDEMO0004', 'anaya.test@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'CSE', 3, 'Focused on clear communication, team coordination, and turning plans into action.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=AnayaTest', 'approved'),
  ('Vihaan Placeholder', 'Social Media', 'Member', 'PESDEMO0005', 'vihaan.placeholder@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'EEE', 2, 'Creating short-form updates and finding useful ways to share what the community builds.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=VihaanPlaceholder', 'approved'),
  ('Isha Fiction', 'Event Management', 'Member', 'PESDEMO0006', 'isha.fiction@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'Biotech', 4, 'Likes bringing people together and making student events welcoming and memorable.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=IshaFiction', 'approved')
on conflict do nothing;
```

## `eslint.config.mjs`

```javascript
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

## `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No remote image config is needed because we use regular <img> tags.
};

export default nextConfig;
```

## `package.json`

```json
{
  "name": "embrione-team-challenge",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.0",
    "jose": "^6.1.0",
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "typescript": "^5.7.0",
    "@eslint/eslintrc": "^3.3.1"
  }
}
```

## `src/app/admin/page.tsx`

```tsx
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Member } from "@/lib/types";

export default function AdminPage() {
  const [email, setEmail] = useState("admin@embrione.pes.edu");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");

  const loadMembers = useCallback(async () => {
    const response = await fetch("/api/admin/members", { cache: "no-store" });
    if (!response.ok) {
      setAuthenticated(false);
      setLoading(false);
      return false;
    }
    const result = await response.json();
    setMembers(result.members ?? []);
    setAuthenticated(true);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const counts = useMemo(() => ({
    total: members.length,
    pending: members.filter((m) => m.status === "pending").length,
    approved: members.filter((m) => m.status === "approved").length,
  }), [members]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Login failed.");
      setPassword("");
      const loaded = await loadMembers();
      if (!loaded) throw new Error("Logged in, but could not load the dashboard.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
      setLoading(false);
    }
  }

  async function moderate(member: Member, status: "approved" | "rejected") {
    setBusyId(member.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Update failed.");
      setMembers((current) => current.map((item) => item.id === member.id ? result.member : item));
      setNotice(`${member.name} marked ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this submission.");
    } finally {
      setBusyId("");
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Permanently delete ${member.name}'s submission?`)) return;
    setBusyId(member.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Delete failed.");
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setNotice(`${member.name}'s submission was deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete this submission.");
    } finally {
      setBusyId("");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setMembers([]);
    setNotice("");
  }

  if (loading) {
    return <section className="page-shell admin-page"><div className="state-panel"><span className="loading-ring" /> Checking admin session…</div></section>;
  }

  if (!authenticated) {
    return (
      <section className="page-shell admin-page admin-login-wrap">
        <div className="admin-login-art"><span className="eyebrow"><span className="eyebrow-dot" /> RESTRICTED AREA</span><h1>Behind the<br /><span className="headline-muted">curtain.</span></h1><p>Review applications, recognise good people, and help the right profiles find their place in the directory.</p><div className="login-art-symbol">E<span>✳</span></div></div>
        <form className="panel login-panel" onSubmit={handleLogin}>
          <p className="eyebrow">ADMIN ACCESS / 03</p><h2>Welcome back.</h2><p className="login-copy">Sign in with the challenge admin credentials to manage submissions.</p>
          <label className="field">Admin email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">Password
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" />
          </label>
          {loginError && <p className="notice notice-error" role="alert">{loginError}</p>}
          <button className="button button-primary submit-button" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          <p className="form-footnote">Session expires after 8 hours. Your password is checked server-side.</p>
        </form>
      </section>
    );
  }

  return (
    <section className="page-shell admin-page">
      <div className="admin-heading-row">
        <div><p className="eyebrow"><span className="eyebrow-dot" /> ADMIN WORKSPACE / 03</p><h1>Good people,<br /><span className="headline-muted">good decisions</span><span className="headline-period">.</span></h1><p className="page-intro">A quick look at who’s waiting to join the directory.</p></div>
        <button className="button button-secondary logout-button" type="button" onClick={logout}>Sign out ↗</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>TOTAL SUBMISSIONS</span><strong>{counts.total.toString().padStart(2, "0")}</strong><small>All applications received</small></div>
        <div className="stat-card stat-highlight"><span>AWAITING REVIEW</span><strong>{counts.pending.toString().padStart(2, "0")}</strong><small>Need your attention</small></div>
        <div className="stat-card"><span>APPROVED</span><strong>{counts.approved.toString().padStart(2, "0")}</strong><small>Visible in the directory</small></div>
      </div>

      <div className="admin-list-heading"><div><p className="eyebrow">MODERATION QUEUE</p><h2>Applications</h2></div><span className="queue-count">{counts.pending} PENDING</span></div>
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      {members.length === 0 ? <div className="state-panel">No submissions found yet. New registrations will appear here.</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Member</th><th>Domain / Position</th><th>Course</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><div className="admin-member"><div className="admin-avatar">{member.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase()}</div><div><strong>{member.name}</strong><small>{member.srn}</small><small>{member.email}</small></div></div></td>
                  <td><strong>{member.domain}</strong><small>{member.position}</small></td>
                  <td>{member.branch}<small>Semester {member.semester}</small></td>
                  <td><span className={`status-pill status-${member.status}`}>{member.status}</span></td>
                  <td><div className="table-actions">
                    {member.status !== "approved" && <button type="button" className="mini-button mini-approve" disabled={busyId === member.id} onClick={() => void moderate(member, "approved")}>{busyId === member.id ? "…" : "Approve"}</button>}
                    {member.status !== "rejected" && <button type="button" className="mini-button mini-reject" disabled={busyId === member.id} onClick={() => void moderate(member, "rejected")}>Reject</button>}
                    <button type="button" className="mini-button mini-delete" disabled={busyId === member.id} onClick={() => void removeMember(member)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-footnote">Approved profiles appear on <a href="/team">/team</a>. Rejected profiles remain hidden from the public directory.</p>
    </section>
  );
}
```

## `src/app/api/admin/login/route.ts`

```ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE, createAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: "Admin credentials are not configured on the server." }, { status: 500 });
  }

  if (body.email?.trim().toLowerCase() !== expectedEmail.toLowerCase() || body.password !== expectedPassword) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  try {
    const token = await createAdminToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Admin session creation failed:", error);
    return NextResponse.json({ error: "Could not start admin session. Check ADMIN_SESSION_SECRET." }, { status: 500 });
  }
}
```

## `src/app/api/admin/logout/route.ts`

```ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
```

## `src/app/api/admin/members/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Status must be approved or rejected." }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .update({ status: body.status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ member: data });
  } catch (error) {
    console.error("Member moderation failed:", error);
    return NextResponse.json({ error: "Could not update this member." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member delete failed:", error);
    return NextResponse.json({ error: "Could not delete this member." }, { status: 500 });
  }
}
```

## `src/app/api/admin/members/route.ts`

```ts
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error("Admin member fetch failed:", error);
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
}
```

## `src/app/api/check-srn/route.ts`

```ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const srn = (searchParams.get("srn") ?? "").trim().toUpperCase();
  if (!srn || srn.length > 50) {
    return NextResponse.json({ error: "Enter a valid SRN." }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("members").select("id").eq("srn", srn).limit(1);
    if (error) throw error;
    return NextResponse.json({ exists: Boolean(data?.length) });
  } catch (error) {
    console.error("SRN check failed:", error);
    return NextResponse.json({ error: "Could not check SRN right now." }, { status: 500 });
  }
}
```

## `src/app/api/team/route.ts`

```ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Return only fields intended for public display. Never send email addresses or SRNs here.
export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .select("id,name,domain,position,branch,semester,bio,photo_url,linkedin_url,github_url,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error("Public team fetch failed:", error);
    return NextResponse.json({ error: "Could not load the team directory." }, { status: 500 });
  }
}
```

## `src/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
  --bg: #10110f;
  --panel: #191b18;
  --panel-soft: #20221f;
  --line: #343730;
  --line-soft: #282b26;
  --text: #f0f0e9;
  --muted: #a1a69b;
  --subtle: #747b70;
  --accent: #c7f36b;
  --accent-ink: #161a0e;
  --danger: #ff8d85;
  --success: #c7f36b;
  --radius: 18px;
}

* { box-sizing: border-box; }
html { min-height: 100%; background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.55; }
button, input, select, textarea { font: inherit; }
a { color: inherit; text-decoration: none; }
button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
::selection { color: var(--accent-ink); background: var(--accent); }

.site-nav { height: 76px; padding: 0 clamp(20px, 5.2vw, 86px); border-bottom: 1px solid var(--line-soft); display: flex; align-items: center; justify-content: space-between; gap: 24px; position: relative; z-index: 5; background: rgba(16,17,15,.92); }
.brand { display: inline-flex; align-items: center; gap: 11px; font: 700 13px 'Space Grotesk', sans-serif; letter-spacing: .12em; }
.brand-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px 10px 10px 3px; background: var(--accent); color: var(--accent-ink); font: 700 19px 'Space Grotesk', sans-serif; letter-spacing: 0; }
.brand-dot, .headline-period { color: var(--accent); }
.site-nav nav { display: flex; align-items: center; gap: clamp(16px, 3vw, 38px); color: var(--muted); font-size: 13px; }
.site-nav nav a { transition: color .2s ease; }
.site-nav nav a:hover { color: var(--text); }
.site-nav nav a:first-child { color: var(--text); }
.site-nav nav span { color: var(--accent); }
.site-nav .nav-admin { color: var(--subtle); border-left: 1px solid var(--line); padding-left: clamp(14px, 2vw, 26px); }
main { min-height: calc(100vh - 140px); }
.page-shell { width: min(1200px, calc(100% - 48px)); margin: 0 auto; padding: 64px 0 92px; }
.eyebrow { color: var(--muted); font: 500 10px 'DM Mono', monospace; letter-spacing: .16em; text-transform: uppercase; margin: 0 0 15px; }
.eyebrow-dot, .live-dot { display: inline-block; width: 7px; height: 7px; background: var(--accent); border-radius: 50%; margin-right: 9px; vertical-align: 1px; }
h1, h2, h3, p { margin-top: 0; }
h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
h1 { font-size: clamp(42px, 6.5vw, 78px); line-height: .99; letter-spacing: -.065em; font-weight: 600; margin-bottom: 19px; }
h2 { font-size: 27px; line-height: 1.1; letter-spacing: -.045em; font-weight: 500; margin-bottom: 0; }
h3 { font-size: 24px; line-height: 1.1; letter-spacing: -.045em; margin-bottom: 11px; font-weight: 600; }
.headline-muted { color: #747a70; }
.page-intro { color: var(--muted); max-width: 510px; line-height: 1.75; margin: 0; font-size: 15px; }
.page-heading { margin-bottom: 38px; }
.page-heading h1 { max-width: 760px; }

/* Registration form and card preview */
.register-layout { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(300px, .88fr); gap: 24px; align-items: start; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(22px, 3vw, 34px); }
.panel-heading { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 26px; }
.panel-heading .eyebrow { margin-bottom: 8px; }
.step-number { color: var(--subtle); font: 10px 'DM Mono', monospace; padding-top: 5px; white-space: nowrap; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 19px 15px; }
.field { display: flex; flex-direction: column; gap: 8px; color: #daddd4; font-size: 12px; font-weight: 600; min-width: 0; }
.field > span { color: var(--accent); display: inline; }
.field small { font-size: 10px; font-weight: 400; color: var(--subtle); margin-top: -4px; }
.field-full { grid-column: 1 / -1; }
.field input, .field select, .field textarea, .filter-label select { appearance: none; width: 100%; border: 1px solid #3a3e36; border-radius: 9px; background-color: #111310; padding: 12px 13px; color: var(--text); outline: none; font-size: 12px; font-weight: 400; min-height: 43px; transition: border-color .18s ease, box-shadow .18s ease; }
.field select, .filter-label select { background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m1 1 5 5 5-5' stroke='%23a1a69b' stroke-width='1.4' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; padding-right: 35px; }
.field input:focus, .field select:focus, .field textarea:focus, .filter-label select:focus { border-color: #869b54; box-shadow: 0 0 0 3px rgba(199,243,107,.07); }
.field input::placeholder, .field textarea::placeholder { color: #62685d; }
.field textarea { resize: vertical; min-height: 105px; }
.field input[type=file] { padding: 9px; color: var(--muted); }
.field input[type=file]::file-selector-button { cursor: pointer; background: var(--panel-soft); border: 1px solid var(--line); color: var(--text); padding: 7px 10px; border-radius: 6px; margin-right: 12px; font-size: 11px; }
.file-note { color: var(--accent) !important; overflow-wrap: anywhere; font-weight: 400; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: 24px; border-radius: 9px; padding: 12px 17px; min-height: 45px; font-size: 12px; font-weight: 700; border: 1px solid transparent; cursor: pointer; transition: transform .2s ease, background .2s ease, border-color .2s ease; }
.button:hover { transform: translateY(-2px); }
.button:disabled, .mini-button:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.button-primary { background: var(--accent); color: var(--accent-ink); }
.button-primary:hover { background: #d7ff86; }
.button-secondary { border-color: var(--line); background: transparent; color: var(--text); }
.submit-button { width: 100%; margin-top: 21px; }
.submit-button span, .button span { font-size: 17px; line-height: 1; }
.form-footnote { margin: 12px 0 0; color: var(--subtle); font-size: 10px; text-align: center; }
.notice { border-radius: 8px; padding: 11px 13px; margin: 18px 0 0; font-size: 12px; line-height: 1.5; }
.notice-success { border: 1px solid #485c2b; color: var(--accent); background: rgba(199,243,107,.06); }
.notice-error { border: 1px solid #703b36; color: var(--danger); background: rgba(255,141,133,.06); }
.preview-column { position: sticky; top: 24px; padding-top: 7px; }
.preview-label { display: flex; flex-wrap: wrap; align-items: center; font: 10px 'DM Mono', monospace; letter-spacing: .1em; margin: 0 0 15px; color: var(--text); }
.preview-label > span:last-child { color: var(--subtle); margin-left: auto; font-size: 8px; }
.preview-label .live-dot { width: 6px; height: 6px; margin-right: 8px; box-shadow: 0 0 12px rgba(199,243,107,.7); }
.member-card { position: relative; overflow: hidden; border-radius: 16px; border: 1px solid #42463c; background: linear-gradient(145deg, #22251f, #181a17 66%); min-width: 0; transition: border-color .2s ease, transform .25s ease; }
.member-card:hover { border-color: #67764a; transform: translateY(-3px); }
.member-card-image-wrap { height: 230px; position: relative; background: #272b23; overflow: hidden; }
.member-card-image { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 35%; filter: saturate(.8); }
.member-card-image-wrap::after { content: ''; pointer-events: none; position: absolute; inset: 35% 0 0; background: linear-gradient(transparent, rgba(16,17,15,.65)); }
.avatar-placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: var(--accent); font: 600 72px 'Space Grotesk', sans-serif; background: radial-gradient(circle at 50% 35%, #444d34, #20231d 62%); }
.card-index { position: absolute; z-index: 1; top: 15px; left: 15px; font: 9px 'DM Mono', monospace; color: white; letter-spacing: .1em; border: 1px solid rgba(255,255,255,.25); padding: 6px 8px; border-radius: 5px; background: rgba(18,20,16,.36); }
.member-card-content { padding: 22px 23px 26px; }
.member-card-content .eyebrow { color: var(--accent); margin-bottom: 10px; font-size: 9px; }
.member-card-content h3 { overflow-wrap: anywhere; }
.member-meta { display: flex; flex-wrap: wrap; gap: 7px; color: var(--muted); font-size: 10px; }
.member-meta span { border: 1px solid var(--line); border-radius: 5px; padding: 4px 7px; }
.member-bio { color: #adb1a7; font-size: 12px; line-height: 1.7; margin: 19px 0 0; overflow-wrap: anywhere; }
.card-corner { position: absolute; right: 19px; bottom: 13px; color: var(--accent); font-size: 16px; }
.member-links { display: flex; gap: 15px; border-top: 1px solid var(--line-soft); padding-top: 13px; margin-top: 17px; color: var(--accent); font: 10px 'DM Mono', monospace; }
.preview-note { display: flex; gap: 14px; border: 1px solid var(--line-soft); padding: 17px; border-radius: 12px; margin-top: 18px; }
.preview-note-icon { color: var(--accent); font-size: 20px; }
.preview-note p { color: var(--muted); font-size: 11px; line-height: 1.7; margin: 0; }
.preview-note strong { color: var(--text); font-size: 12px; font-weight: 600; }

/* Team directory */
.team-hero { min-height: 370px; position: relative; padding: 25px 0 62px; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 35px; border-bottom: 1px solid var(--line-soft); }
.team-hero > div:first-child { position: relative; z-index: 1; }
.team-hero h1 { font-size: clamp(48px, 7.1vw, 86px); margin-bottom: 22px; }
.team-hero .page-intro { max-width: 445px; }
.team-count-block { position: relative; z-index: 1; align-self: flex-end; display: flex; flex-direction: column; padding: 0 11px 6px 20px; border-left: 1px solid #56633f; min-width: 140px; }
.team-count { font: 500 clamp(36px, 5vw, 56px) 'Space Grotesk', sans-serif; color: var(--accent); letter-spacing: -.07em; line-height: 1.1; }
.team-count-block > span:last-child { font: 9px 'DM Mono', monospace; color: var(--muted); letter-spacing: .1em; margin-top: 7px; }
.hero-orbit { width: 300px; height: 300px; border: 1px solid rgba(199,243,107,.09); border-radius: 50%; position: absolute; right: 70px; top: 8px; pointer-events: none; }
.orbit-two { width: 220px; height: 220px; right: 110px; top: 48px; border-color: rgba(199,243,107,.13); }
.hero-spark { position: absolute; right: 205px; top: 135px; color: var(--accent); font-size: 45px; opacity: .8; }
.directory-toolbar { padding: 47px 0 25px; display: flex; align-items: end; justify-content: space-between; gap: 24px; }
.directory-toolbar .eyebrow { margin-bottom: 9px; }
.directory-toolbar h2 { font-size: 25px; }
.filters { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
.filter-label { display: flex; flex-direction: column; gap: 7px; font: 9px 'DM Mono', monospace; color: var(--subtle); letter-spacing: .1em; }
.filter-label select { min-width: 155px; min-height: 39px; font: 11px 'DM Sans', sans-serif; color: var(--text); letter-spacing: 0; }
.clear-filters { border: 0; background: transparent; color: var(--accent); font-size: 11px; padding: 10px 0; cursor: pointer; }
.member-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.member-grid-item { min-width: 0; animation: fade-up .45s both; }
.member-grid .member-card-image-wrap { height: 255px; }
.member-grid .member-card-content { padding: 20px 20px 25px; }
.member-grid .member-card-content h3 { font-size: 22px; }
.member-grid .member-meta { gap: 5px; }
.state-panel { min-height: 140px; border: 1px dashed var(--line); background: rgba(255,255,255,.015); border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 13px; padding: 25px; text-align: center; font-size: 13px; color: var(--muted); }
.state-error { color: var(--danger); border-color: #703b36; }
.loading-ring { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--accent); animation: spin .8s linear infinite; }
.join-strip { display: flex; justify-content: space-between; align-items: center; gap: 25px; padding: 29px 31px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); margin-top: 55px; }
.join-strip .eyebrow { margin-bottom: 8px; }
.join-strip h2 { font-size: 23px; }
.join-strip .button { white-space: nowrap; }

/* Admin */
.admin-page { padding-top: 65px; }
.admin-heading-row { display: flex; justify-content: space-between; align-items: start; gap: 25px; }
.admin-heading-row .page-intro { margin-top: 0; }
.logout-button { margin-top: 30px; white-space: nowrap; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px; margin-top: 42px; }
.stat-card { border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 21px 23px 22px; min-width: 0; }
.stat-card > span { display: block; color: var(--muted); font: 9px 'DM Mono', monospace; letter-spacing: .11em; }
.stat-card strong { display: block; font: 500 43px 'Space Grotesk', sans-serif; letter-spacing: -.07em; margin: 11px 0 7px; }
.stat-card small { display: block; color: var(--subtle); font-size: 10px; }
.stat-highlight { border-color: #627544; background: linear-gradient(135deg, rgba(199,243,107,.08), var(--panel) 70%); }
.stat-highlight strong { color: var(--accent); }
.admin-list-heading { display: flex; justify-content: space-between; align-items: end; gap: 15px; margin: 55px 0 20px; }
.admin-list-heading .eyebrow { margin-bottom: 7px; }
.queue-count { font: 9px 'DM Mono', monospace; color: var(--accent); border: 1px solid #4d6130; padding: 7px 9px; border-radius: 5px; }
.admin-table-wrap { border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; background: var(--panel); }
.admin-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 800px; }
.admin-table th { font: 9px 'DM Mono', monospace; color: var(--subtle); letter-spacing: .1em; padding: 15px 16px; border-bottom: 1px solid var(--line); background: #1c1e1a; font-weight: 400; }
.admin-table td { padding: 17px 16px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; font-size: 11px; }
.admin-table tbody tr:last-child td { border-bottom: 0; }
.admin-table td > strong, .admin-table td > small { display: block; }
.admin-table td > strong { font-size: 11px; font-weight: 600; }
.admin-table td > small { color: var(--subtle); margin-top: 3px; font-size: 10px; }
.admin-member { display: flex; align-items: center; gap: 10px; min-width: 195px; }
.admin-avatar { width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; background: #333b29; color: var(--accent); border-radius: 10px; font: 500 11px 'Space Grotesk', sans-serif; }
.admin-member strong, .admin-member small { display: block; }
.admin-member strong { font-size: 11px; }
.admin-member small { color: var(--subtle); font-size: 9px; margin-top: 2px; }
.status-pill { display: inline-block; border-radius: 30px; border: 1px solid var(--line); padding: 5px 8px; text-transform: uppercase; font: 8px 'DM Mono', monospace; letter-spacing: .07em; }
.status-pending { color: #e9c680; border-color: #6f5c35; background: rgba(233,198,128,.05); }
.status-approved { color: var(--accent); border-color: #4b6030; background: rgba(199,243,107,.05); }
.status-rejected { color: var(--danger); border-color: #713d39; background: rgba(255,141,133,.05); }
.table-actions { display: flex; flex-wrap: wrap; gap: 5px; }
.mini-button { cursor: pointer; border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; background: transparent; color: var(--muted); font-size: 9px; transition: .2s; }
.mini-approve { color: var(--accent); border-color: #4b6030; }
.mini-approve:hover { background: rgba(199,243,107,.1); }
.mini-reject { color: #e9c680; }
.mini-reject:hover { background: rgba(233,198,128,.08); }
.mini-delete { color: var(--danger); }
.mini-delete:hover { background: rgba(255,141,133,.08); }
.admin-footnote { color: var(--subtle); font-size: 11px; margin-top: 17px; }
.admin-footnote a { color: var(--accent); }
.admin-login-wrap { min-height: calc(100vh - 220px); display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 420px); gap: clamp(35px, 7vw, 100px); align-items: center; }
.admin-login-art { position: relative; min-height: 400px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.admin-login-art h1 { position: relative; z-index: 1; }
.admin-login-art > p:not(.eyebrow) { color: var(--muted); font-size: 13px; max-width: 380px; line-height: 1.8; position: relative; z-index: 1; }
.login-art-symbol { position: absolute; right: 25px; top: 35px; font: 700 clamp(180px, 25vw, 340px) 'Space Grotesk', sans-serif; color: #1a1d17; line-height: 1; user-select: none; }
.login-art-symbol span { font-size: 45px; color: var(--accent); position: absolute; top: 31%; right: -7px; }
.login-panel { padding: 31px; }
.login-panel .eyebrow { margin-bottom: 10px; }
.login-panel h2 { font-size: 30px; }
.login-copy { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 13px 0 27px; }
.login-panel .field { margin: 0 0 19px; }
.login-panel .submit-button { margin-top: 0; }

.site-footer { border-top: 1px solid var(--line-soft); padding: 20px clamp(20px, 5.2vw, 86px); display: flex; justify-content: space-between; gap: 15px; color: var(--subtle); font: 9px 'DM Mono', monospace; letter-spacing: .08em; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 980px) {
  .register-layout { grid-template-columns: minmax(0, 1fr) minmax(260px, .8fr); gap: 17px; }
  .member-card-image-wrap { height: 190px; }
  .member-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .member-grid .member-card-image-wrap { height: 245px; }
  .team-hero { min-height: 330px; }
  .hero-orbit { right: 0; }
  .orbit-two { right: 40px; }
  .hero-spark { right: 125px; }
  .directory-toolbar { align-items: start; flex-direction: column; }
  .admin-login-wrap { gap: 30px; }
}
@media (max-width: 700px) {
  .site-nav { height: 66px; padding-inline: 18px; }
  .site-nav nav { gap: 14px; font-size: 11px; }
  .site-nav nav a:first-child { display: none; }
  .site-nav .nav-admin { padding-left: 12px; }
  .page-shell { width: min(100% - 34px, 520px); padding-top: 43px; padding-bottom: 60px; }
  .page-heading { margin-bottom: 29px; }
  h1 { font-size: clamp(42px, 12vw, 63px); }
  .page-intro { font-size: 13px; }
  .register-layout { grid-template-columns: 1fr; }
  .preview-column { position: static; order: -1; }
  .preview-label > span:last-child { margin-left: 0; }
  .member-card-preview .member-card-image-wrap { height: 230px; }
  .member-card-preview { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); }
  .member-card-preview .member-card-image-wrap { height: 100%; min-height: 250px; }
  .member-card-preview .member-card-content { padding: 18px 15px 21px; }
  .member-card-preview .member-card-content h3 { font-size: 20px; }
  .member-card-preview .member-meta { display: grid; justify-content: start; }
  .member-card-preview .member-bio { margin-top: 12px; font-size: 11px; }
  .form-grid { gap: 16px 11px; }
  .panel { padding: 21px 17px; }
  .team-hero { min-height: 365px; align-items: start; flex-direction: column; justify-content: start; padding-top: 12px; gap: 23px; }
  .team-hero h1 { font-size: clamp(48px, 12vw, 66px); }
  .team-count-block { align-self: start; }
  .hero-orbit { width: 205px; height: 205px; right: -72px; top: 80px; }
  .orbit-two { width: 145px; height: 145px; right: -42px; top: 110px; }
  .hero-spark { right: 35px; top: 165px; font-size: 29px; }
  .filters { width: 100%; }
  .filter-label { flex: 1; min-width: 0; }
  .filter-label select { min-width: 0; }
  .member-grid { grid-template-columns: 1fr; gap: 16px; }
  .member-grid .member-card-image-wrap { height: 270px; }
  .join-strip { flex-direction: column; align-items: stretch; padding: 23px 20px; margin-top: 35px; }
  .join-strip .button { align-self: start; }
  .admin-login-wrap { min-height: unset; grid-template-columns: 1fr; gap: 16px; }
  .admin-login-art { min-height: 220px; }
  .admin-login-art h1 { font-size: 54px; }
  .login-art-symbol { font-size: 190px; right: 7px; top: 7px; }
  .login-panel { padding: 24px 19px; }
  .admin-heading-row { flex-direction: column; }
  .logout-button { margin-top: 0; }
  .stats-grid { gap: 9px; margin-top: 30px; }
  .stat-card { padding: 14px 12px; }
  .stat-card > span { font-size: 7px; letter-spacing: .05em; }
  .stat-card strong { font-size: 34px; }
  .stat-card small { font-size: 9px; line-height: 1.4; }
  .admin-list-heading { margin-top: 40px; }
  .site-footer { padding-inline: 17px; font-size: 7px; }
}
@media (max-width: 410px) {
  .brand { font-size: 11px; gap: 7px; }
  .site-nav nav { gap: 10px; }
  .site-nav nav a:first-child { display: none; }
  .form-grid { grid-template-columns: 1fr; }
  .field-full { grid-column: auto; }
  .member-card-preview { grid-template-columns: 1fr; }
  .member-card-preview .member-card-image-wrap { height: 195px; min-height: 0; }
  .member-card-preview .member-meta { display: flex; }
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; }
  .stat-card strong { grid-column: 2; grid-row: 1 / span 2; margin: 0; }
  .stat-card small { grid-column: 1; }
  .site-footer { flex-direction: column; gap: 5px; }
}
```

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "The Embrione — Meet the Team",
  description: "Meet the people building with The Embrione at PES University.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        <main>{children}</main>
        <footer className="site-footer">
          <span>THE EMBRIONE · PES UNIVERSITY</span>
          <span>Curiosity into creation <span className="brand-dot">✳</span></span>
        </footer>
      </body>
    </html>
  );
}
```

## `src/app/page.tsx`

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/team");
}
```

## `src/app/register/page.tsx`

```tsx
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { MemberCard } from "@/components/MemberCard";
import { BRANCHES, DOMAINS, POSITIONS, SEMESTERS } from "@/lib/options";
import type { MemberCardData } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const emptyForm = {
  name: "",
  domain: DOMAINS[0] as string,
  position: POSITIONS[3] as string,
  srn: "",
  email: "",
  linkedin_url: "",
  github_url: "",
  branch: BRANCHES[0] as string,
  semester: "1",
  bio: "",
};

async function convertImageToWebP(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const bitmap = await createImageBitmap(file);
  const maxWidth = 800;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not process this image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("WebP conversion failed. Try another image."));
    }, "image/webp", 0.8);
  });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "member-photo";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

export default function RegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhoto(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
    setNotice(null);
  }

  const card: MemberCardData = {
    name: form.name,
    domain: form.domain,
    position: form.position,
    branch: form.branch,
    semester: Number(form.semester),
    bio: form.bio,
    photo_url: previewUrl,
    linkedin_url: form.linkedin_url,
    github_url: form.github_url,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    try {
      const srn = form.srn.trim().toUpperCase();
      const duplicateResponse = await fetch(`/api/check-srn?srn=${encodeURIComponent(srn)}`);
      const duplicateResult = await duplicateResponse.json();
      if (!duplicateResponse.ok) throw new Error(duplicateResult.error ?? "Could not validate the SRN.");
      if (duplicateResult.exists) throw new Error("This SRN has already been submitted.");

      let photoUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(form.name.trim())}`;
      if (photo) {
        const webp = await convertImageToWebP(photo);
        const safeName = `${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(safeName, webp, { contentType: "image/webp", upsert: false });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        const { data: publicUrlData } = supabase.storage.from("member-photos").getPublicUrl(safeName);
        photoUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("members").insert({
        name: form.name.trim(),
        domain: form.domain,
        position: form.position,
        srn,
        email: form.email.trim(),
        linkedin_url: form.linkedin_url.trim() || null,
        github_url: form.github_url.trim() || null,
        branch: form.branch,
        semester: Number(form.semester),
        bio: form.bio.trim(),
        photo_url: photoUrl,
        // status deliberately omitted: the database default and RLS policy enforce pending.
      });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("This SRN has already been submitted.");
        throw new Error(`Could not submit your profile: ${insertError.message}`);
      }

      setNotice({ type: "success", text: "Application submitted! Your profile is now pending admin approval." });
      setForm({ ...emptyForm });
      setPhoto(null);
      setPreviewUrl("");
      const input = document.getElementById("profile-picture") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-shell register-page">
      <div className="page-heading">
        <p className="eyebrow"><span className="eyebrow-dot" /> MEMBER ONBOARDING / 01</p>
        <h1>Make your mark<span className="headline-period">.</span></h1>
        <p className="page-intro">A good team starts with good people. Tell us a little about yourself.</p>
      </div>

      <div className="register-layout">
        <form className="panel registration-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div><p className="eyebrow">YOUR DETAILS</p><h2>Member profile</h2></div>
            <span className="step-number">01 — 02</span>
          </div>

          <div className="form-grid">
            <label className="field field-full">Full name <span>*</span>
              <input required maxLength={80} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Alex Johnson" autoComplete="name" />
            </label>
            <label className="field">Domain <span>*</span>
              <select required value={form.domain} onChange={(e) => updateField("domain", e.target.value)}>{DOMAINS.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">Position <span>*</span>
              <select required value={form.position} onChange={(e) => updateField("position", e.target.value)}>{POSITIONS.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">SRN <span>*</span>
              <input required maxLength={50} value={form.srn} onChange={(e) => updateField("srn", e.target.value)} placeholder="PES1UG23CS001" autoComplete="off" />
            </label>
            <label className="field">Email <span>*</span>
              <input required type="email" maxLength={254} value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </label>
            <label className="field">Branch <span>*</span>
              <select required value={form.branch} onChange={(e) => updateField("branch", e.target.value)}>{BRANCHES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">Semester <span>*</span>
              <select required value={form.semester} onChange={(e) => updateField("semester", e.target.value)}>{SEMESTERS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className="field field-full">LinkedIn URL <small>Optional</small>
              <input type="url" value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/yourname" />
            </label>
            <label className="field field-full">GitHub URL <small>Optional</small>
              <input type="url" value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} placeholder="https://github.com/yourname" />
            </label>
            <label className="field field-full">Short bio <small>{form.bio.length}/200</small>
              <textarea maxLength={200} rows={4} value={form.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="What do you enjoy building? What would you bring to the team?" />
            </label>
            <label className="field field-full">Profile picture <small>Optional · PNG/JPG/JPEG · converted to WebP</small>
              <input id="profile-picture" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handlePhotoChange} />
              {photo && <span className="file-note">Selected: {photo.name}</span>}
            </label>
          </div>

          {notice && <p className={`notice notice-${notice.type}`} role="status">{notice.text}</p>}
          <button className="button button-primary submit-button" type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit for approval"}<span aria-hidden="true">↗</span>
          </button>
          <p className="form-footnote">Your profile appears publicly only after an admin approves it.</p>
        </form>

        <aside className="preview-column">
          <div className="preview-label"><span className="live-dot" /> LIVE CARD PREVIEW <span>UPDATES AS YOU TYPE</span></div>
          <MemberCard member={card} preview />
          <div className="preview-note"><span className="preview-note-icon">✳</span><p><strong>One team. Many perspectives.</strong><br />This is an approximate preview of how your profile will look in the directory.</p></div>
        </aside>
      </div>
    </section>
  );
}
```

## `src/app/team/page.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberCard } from "@/components/MemberCard";
import { DOMAINS, POSITIONS } from "@/lib/options";
import type { PublicMember } from "@/lib/types";

export default function TeamPage() {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [domain, setDomain] = useState("All domains");
  const [position, setPosition] = useState("All positions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadMembers() {
      try {
        const response = await fetch("/api/team", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Directory request failed.");
        if (!alive) return;
        setMembers((result.members ?? []) as PublicMember[]);
      } catch {
        if (alive) setError("We couldn't load the directory. Check your Supabase settings and policies.");
      }
      if (alive) setLoading(false);
    }
    void loadMembers();
    return () => { alive = false; };
  }, []);

  const visibleMembers = useMemo(() => members.filter((member) =>
    (domain === "All domains" || member.domain === domain) &&
    (position === "All positions" || member.position === position)
  ), [members, domain, position]);

  return (
    <section className="page-shell team-page">
      <div className="team-hero">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> THE PEOPLE BEHIND THE PROGRESS</p>
          <h1>Meet the<br /><span className="headline-muted">minds in motion</span><span className="headline-period">.</span></h1>
          <p className="page-intro">Different disciplines. Shared curiosity. One community building what comes next.</p>
        </div>
        <div className="team-count-block"><span className="team-count">{loading ? "—" : String(visibleMembers.length).padStart(2, "0")}</span><span>APPROVED MEMBERS</span></div>
        <div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" /><span className="hero-spark" aria-hidden="true">✳</span>
      </div>

      <div className="directory-toolbar">
        <div><p className="eyebrow">OUR COMMUNITY</p><h2>People, not just positions<span className="headline-period">.</span></h2></div>
        <div className="filters">
          <label className="filter-label">DOMAIN
            <select value={domain} onChange={(e) => setDomain(e.target.value)}><option>All domains</option>{DOMAINS.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="filter-label">POSITION
            <select value={position} onChange={(e) => setPosition(e.target.value)}><option>All positions</option>{POSITIONS.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          {(domain !== "All domains" || position !== "All positions") && <button type="button" className="clear-filters" onClick={() => { setDomain("All domains"); setPosition("All positions"); }}>Clear ×</button>}
        </div>
      </div>

      {loading && <div className="state-panel"><span className="loading-ring" /> Loading the team…</div>}
      {!loading && error && <div className="state-panel state-error">{error}</div>}
      {!loading && !error && visibleMembers.length === 0 && <div className="state-panel">No approved members match those filters yet.</div>}
      {!loading && !error && visibleMembers.length > 0 && (
        <div className="member-grid">
          {visibleMembers.map((member, index) => (
            <div className="member-grid-item" key={member.id} style={{ animationDelay: `${index * 45}ms` }}>
              <MemberCard member={member} />
            </div>
          ))}
        </div>
      )}
      <div className="join-strip"><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>There’s room for your ideas.</h2></div><a className="button button-primary" href="/register">Create your profile <span aria-hidden="true">↗</span></a></div>
    </section>
  );
}
```

## `src/components/MemberCard.tsx`

```tsx
import type { MemberCardData } from "@/lib/types";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "EM";
}

export function MemberCard({ member, preview = false }: { member: MemberCardData; preview?: boolean }) {
  return (
    <article className={`member-card${preview ? " member-card-preview" : ""}`}>
      <div className="member-card-image-wrap">
        {member.photo_url ? (
          // Regular img is intentional: source URLs can be local blob URLs during preview.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="member-card-image" src={member.photo_url} alt={`${member.name || "Member"} profile`} />
        ) : (
          <div className="avatar-placeholder" aria-label="Default avatar placeholder">{initials(member.name)}</div>
        )}
        <span className="card-index">TEAM / 026</span>
      </div>
      <div className="member-card-content">
        <p className="eyebrow">{member.domain || "YOUR DOMAIN"}</p>
        <h3>{member.name || "Your name here"}</h3>
        <div className="member-meta">
          <span>{member.position || "Position"}</span>
          <span>{member.branch || "Branch"} · Sem {member.semester || "—"}</span>
        </div>
        <p className="member-bio">{member.bio || "A short introduction about you and what you bring to the team."}</p>
        {!preview && (member.linkedin_url || member.github_url) && (
          <div className="member-links">
            {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
            {member.github_url && <a href={member.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}
          </div>
        )}
      </div>
      <span className="card-corner" aria-hidden="true">✳</span>
    </article>
  );
}
```

## `src/components/SiteNav.tsx`

```tsx
import Link from "next/link";

export function SiteNav() {
  return (
    <header className="site-nav">
      <Link className="brand" href="/team" aria-label="Embrione home">
        <span className="brand-mark">E</span>
        <span>EMBRIONE<span className="brand-dot">.</span></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/team">The team</Link>
        <Link href="/register">Join us <span aria-hidden="true">↗</span></Link>
        <Link className="nav-admin" href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
```

## `src/lib/admin-auth.ts`

```ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "embrione_admin_session";
const SESSION_LENGTH_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_LENGTH_SECONDS}s`)
    .sign(getSecret());
}

export async function hasAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_MAX_AGE = SESSION_LENGTH_SECONDS;
```

## `src/lib/options.ts`

```ts
export const DOMAINS = [
  "Web Development",
  "Design",
  "Logistics",
  "Operations",
  "Sponsorship",
  "Hospitality",
  "Social Media",
  "Event Management",
] as const;

export const POSITIONS = ["Head", "Vice-Head", "Core Member", "Member"] as const;
export const BRANCHES = ["CSE", "AIML", "ECE", "EEE", "ME", "Biotech", "Other"] as const;
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
```

## `src/lib/supabase/admin.ts`

```ts
import { createClient } from "@supabase/supabase-js";

/** Server only. Never import this module into a client component. */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

## `src/lib/supabase/client.ts`

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## `src/lib/types.ts`

```ts
export type MemberStatus = "pending" | "approved" | "rejected";

export type Member = {
  id: string;
  name: string;
  domain: string;
  position: string;
  srn: string;
  email: string;
  linkedin_url: string | null;
  github_url: string | null;
  branch: string;
  semester: number;
  bio: string | null;
  photo_url: string;
  status: MemberStatus;
  created_at: string;
};

export type MemberCardData = Pick<
  Member,
  "name" | "domain" | "position" | "branch" | "semester" | "bio" | "photo_url" | "linkedin_url" | "github_url"
>;

export type PublicMember = Pick<
  Member,
  | "id"
  | "name"
  | "domain"
  | "position"
  | "branch"
  | "semester"
  | "bio"
  | "photo_url"
  | "linkedin_url"
  | "github_url"
  | "status"
  | "created_at"
>;
```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```
