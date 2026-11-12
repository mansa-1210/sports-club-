"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ArrowLeft, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Profile = { userId: string; fullName: string; email: string; phone: string | null; role: string };
type AccountWorkspaceProps = {
  profile: Profile;
  memberships: Array<{ id: number; status: string; paymentStatus: string; startsAt: Date | null; endsAt: Date | null; createdAt: Date; planName: string; priceMinor: number; currency: string }>;
  programRegistrations: Array<{ id: number; status: string; createdAt: Date; startsAt: Date; endsAt: Date; location: string; programTitle: string; sportName: string }>;
  eventRegistrations: Array<{ id: number; status: string; createdAt: Date; startsAt: Date; location: string; eventTitle: string }>;
  activities: Array<{ id: number; action: string; entityType: string | null; createdAt: Date }>;
};

function formatDate(value: Date | string | null) {
  if (!value) return "Awaiting club confirmation";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export function AccountWorkspace({ profile, memberships, programRegistrations, eventRegistrations, activities }: AccountWorkspaceProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Profile could not be updated.");
      await mutate("/api/me");
      setNotice("Your profile has been updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be updated.");
    } finally {
      setBusy("");
    }
  }

  async function cancelRegistration(kind: "program" | "event", id: number) {
    if (!window.confirm("Cancel this registration?")) return;
    setBusy(`${kind}-${id}`);
    setError("");
    try {
      const response = await fetch(`/api/${kind}-registrations/${id}`, { method: "DELETE", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Registration could not be cancelled.");
      setNotice(result.message);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration could not be cancelled.");
    } finally {
      setBusy("");
    }
  }

  async function signOut() {
    setBusy("signout");
    await authClient.signOut();
    await mutate("/api/me", { profile: null }, false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="wrap portal-header-inner">
          <Link className="brand" href="/"><span aria-hidden="true" className="brand-mark">F</span><span>FORGE ATHLETIC</span></Link>
          <div className="portal-actions">
            {profile.role === "admin" && <Link className="inline-link" href="/admin">Admin workspace</Link>}
            {profile.role === "coach" && <Link className="inline-link" href="/coach">Coach workspace</Link>}
            <button aria-label="Sign out" className="button button-outline" disabled={busy === "signout"} onClick={signOut} type="button"><LogOut aria-hidden="true" size={14} /> Sign out</button>
          </div>
        </div>
      </header>
      <main className="wrap portal-main">
        <div className="portal-title-row">
          <div><Link className="inline-link" href="/"><ArrowLeft aria-hidden="true" size={13} /> Back to the club</Link><h1 className="page-title">Your Forge account.</h1><p className="section-copy">Membership, bookings, and your details in one place.</p></div>
        </div>
        {notice && <p aria-live="polite" className="form-success" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="portal-grid">
          <section className="portal-card">
            <h2>Profile</h2>
            <form className="auth-form" onSubmit={updateProfile}>
              <div className="field"><label htmlFor="account-name">Full name</label><input autoComplete="name" id="account-name" maxLength={120} minLength={2} onChange={(event) => setFullName(event.target.value)} required value={fullName} /></div>
              <div className="field"><label htmlFor="account-email">Email</label><input autoComplete="email" id="account-email" readOnly value={profile.email} /></div>
              <div className="field"><label htmlFor="account-phone">Phone</label><input autoComplete="tel" id="account-phone" maxLength={40} onChange={(event) => setPhone(event.target.value)} value={phone} /></div>
              <button className="button button-primary" disabled={busy === "profile"} type="submit">{busy === "profile" ? "Saving…" : "Save profile"}</button>
            </form>
          </section>
          <section className="portal-card">
            <h2>Membership</h2>
            {memberships.length ? <div className="portal-list">{memberships.map((membership) => (
              <div className="portal-row" key={membership.id}>
                <div><strong>{membership.planName}</strong><small>{membership.paymentStatus === "offline_verified" ? "Payment verified by the club" : "Payment pending · confirmed offline"}<br />Requested {formatDate(membership.createdAt)}</small></div>
                <span className="status-pill" data-status={membership.status}>{humanize(membership.status)}</span>
              </div>
            ))}</div> : <p className="portal-muted">No membership requests yet. Explore the club plans to get started.</p>}
            <Link className="inline-link" href="/#membership">Explore memberships</Link>
          </section>
          <section className="portal-card">
            <h2>Upcoming sessions</h2>
            {programRegistrations.length ? <div className="portal-list">{programRegistrations.map((registration) => (
              <div className="portal-row" key={registration.id}>
                <div><strong>{registration.programTitle} · {registration.sportName}</strong><small>{formatDate(registration.startsAt)}<br />{registration.location}</small></div>
                <div className="admin-actions"><span className="status-pill" data-status={registration.status}>{humanize(registration.status)}</span>{registration.startsAt > new Date() && registration.status !== "cancelled" && <button className="button button-danger" disabled={busy === `program-${registration.id}`} onClick={() => cancelRegistration("program", registration.id)} type="button">Cancel</button>}</div>
              </div>
            ))}</div> : <p className="portal-muted">Your programme registrations will appear here.</p>}
          </section>
          <section className="portal-card">
            <h2>Event registrations</h2>
            {eventRegistrations.length ? <div className="portal-list">{eventRegistrations.map((registration) => (
              <div className="portal-row" key={registration.id}>
                <div><strong>{registration.eventTitle}</strong><small>{formatDate(registration.startsAt)}<br />{registration.location}</small></div>
                <div className="admin-actions"><span className="status-pill" data-status={registration.status}>{humanize(registration.status)}</span>{registration.startsAt > new Date() && registration.status !== "cancelled" && <button className="button button-danger" disabled={busy === `event-${registration.id}`} onClick={() => cancelRegistration("event", registration.id)} type="button">Cancel</button>}</div>
              </div>
            ))}</div> : <p className="portal-muted">Your event registrations will appear here.</p>}
          </section>
          <section className="portal-card portal-card-wide">
            <h2>Recent activity</h2>
            {activities.length ? <div className="portal-list">{activities.map((activity) => <div className="portal-row" key={activity.id}><div><strong>{humanize(activity.action)}</strong><small>{activity.entityType ? `${humanize(activity.entityType)} · ` : ""}{formatDate(activity.createdAt)}</small></div></div>)}</div> : <p className="portal-muted">Your account activity will appear here as you book and join.</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
