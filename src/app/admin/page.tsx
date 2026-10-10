
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Member } from "@/lib/types";

function safeExternalUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

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

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

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

      if (!response.ok) {
        throw new Error(result.error ?? "Login failed.");
      }

      setPassword("");

      const loaded = await loadMembers();

      if (!loaded) {
        throw new Error("Logged in, but could not load the dashboard.");
      }
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Login failed."
      );
      setLoading(false);
    }
  }

  async function moderate(
    member: Member,
    status: "approved" | "rejected"
  ) {
    setBusyId(member.id);
    setNotice("");

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Update failed.");
      }

      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? result.member : item
        )
      );

      setNotice(`${member.name} marked ${status}.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not update this submission."
      );
    } finally {
      setBusyId("");
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Permanently delete ${member.name}'s submission?`)) {
      return;
    }

    setBusyId(member.id);
    setNotice("");

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Delete failed.");
      }

      setMembers((current) =>
        current.filter((item) => item.id !== member.id)
      );

      setNotice(`${member.name}'s submission was deleted.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not delete this submission."
      );
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
    return (
      <section className="page-shell admin-page">
        <div className="state-panel">
          <span className="loading-ring" /> Checking admin session…
        </div>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="page-shell admin-page admin-login-wrap">
        <div className="admin-login-art">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> RESTRICTED AREA
          </span>
          <h1>
            Behind the
            <br />
            <span className="headline-muted">curtain.</span>
          </h1>
          <p>
            Review applications, recognise good people, and help the right
            profiles find their place in the directory.
          </p>
          <div className="login-art-symbol">
            E<span>✳</span>
          </div>
        </div>

        <form className="panel login-panel" onSubmit={handleLogin}>
          <p className="eyebrow">ADMIN ACCESS / 03</p>
          <h2>Welcome back.</h2>
          <p className="login-copy">
            Sign in with the challenge admin credentials to manage submissions.
          </p>

          <label className="field">
            Admin email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </label>

          {loginError && (
            <p className="notice notice-error" role="alert">
              {loginError}
            </p>
          )}

          <button
            className="button button-primary submit-button"
            type="submit"
          >
            Sign in <span aria-hidden="true">↗</span>
          </button>

          <p className="form-footnote">
            Session expires after 8 hours. Your password is checked server-side.
          </p>
        </form>
      </section>
    );
  }

  return (
    <section className="page-shell admin-page">
      <div className="admin-heading-row">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> ADMIN WORKSPACE / 03
          </p>
          <h1>
            Good people,
            <br />
            <span className="headline-muted">good decisions</span>
            <span className="headline-period">.</span>
          </h1>
          <p className="page-intro">
            A quick look at who’s waiting to join the directory.
          </p>
        </div>

        <button
          className="button button-secondary logout-button"
          type="button"
          onClick={logout}
        >
          Sign out ↗
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>TOTAL SUBMISSIONS</span>
          <strong>{counts.total.toString().padStart(2, "0")}</strong>
          <small>All applications received</small>
        </div>

        <div className="stat-card stat-highlight">
          <span>AWAITING REVIEW</span>
          <strong>{counts.pending.toString().padStart(2, "0")}</strong>
          <small>Need your attention</small>
        </div>

        <div className="stat-card">
          <span>APPROVED</span>
          <strong>{counts.approved.toString().padStart(2, "0")}</strong>
          <small>Visible in the directory</small>
        </div>
      </div>

      <div className="admin-list-heading">
        <div>
          <p className="eyebrow">MODERATION QUEUE</p>
          <h2>Applications</h2>
        </div>
        <span className="queue-count">{counts.pending} PENDING</span>
      </div>

      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}

      {members.length === 0 ? (
        <div className="state-panel">
          No submissions found yet. New registrations will appear here.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Domain / Position</th>
                <th>Course</th>
                <th>Profile details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => {
                const linkedinUrl = safeExternalUrl(member.linkedin_url);
                const githubUrl = safeExternalUrl(member.github_url);

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="admin-member">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={`${member.name}'s profile`}
                            className="admin-profile-photo"
                          />
                        ) : (
                          <div className="admin-avatar">
                            {member.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((x) => x[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                        )}

                        <div>
                          <strong>{member.name}</strong>
                          <small>{member.srn}</small>
                          <small>{member.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>{member.domain}</strong>
                      <small>{member.position}</small>
                    </td>

                    <td>
                      {member.branch}
                      <small>Semester {member.semester}</small>
                    </td>

                    <td>
                      <div className="admin-profile-details">
                        <p className="admin-member-bio">
                          {member.bio || "No bio provided."}
                        </p>

                        <div className="admin-profile-links">
                          {linkedinUrl ? (
                            <a
                              href={linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              LinkedIn ↗
                            </a>
                          ) : (
                            <small>LinkedIn: Not provided</small>
                          )}

                          {githubUrl ? (
                            <a
                              href={githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              GitHub ↗
                            </a>
                          ) : (
                            <small>GitHub: Not provided</small>
                          )}
                        </div>

                        <small className="admin-submission-date">
                          Submitted:{" "}
                          {member.created_at
                            ? new Date(member.created_at).toLocaleString()
                            : "Date unavailable"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-pill status-${member.status}`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        {member.status !== "approved" && (
                          <button
                            type="button"
                            className="mini-button mini-approve"
                            disabled={busyId === member.id}
                            onClick={() =>
                              void moderate(member, "approved")
                            }
                          >
                            {busyId === member.id ? "…" : "Approve"}
                          </button>
                        )}

                        {member.status !== "rejected" && (
                          <button
                            type="button"
                            className="mini-button mini-reject"
                            disabled={busyId === member.id}
                            onClick={() =>
                              void moderate(member, "rejected")
                            }
                          >
                            Reject
                          </button>
                        )}

                        <button
                          type="button"
                          className="mini-button mini-delete"
                          disabled={busyId === member.id}
                          onClick={() => void removeMember(member)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-footnote">
        Approved profiles appear on <a href="/team">/team</a>. Rejected
        profiles remain hidden from the public directory.
      </p>
    </section>
  );
}
