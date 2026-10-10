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
