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
