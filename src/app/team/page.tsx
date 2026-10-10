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
