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
