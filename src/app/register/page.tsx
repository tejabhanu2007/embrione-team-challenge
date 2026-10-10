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
