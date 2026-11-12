"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";

type CoachData = {
  coach: { id: number; fullName: string; title: string; sportName: string | null };
  sessions: Array<{ id: number; startsAt: string; endsAt: string; location: string; capacity: number; status: string; programTitle: string; sportName: string }>;
  roster: Array<{ id: number; sessionId: number; status: string; fullName: string; email: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CoachWorkspace() {
  const { data, error, isLoading } = useSWR<CoachData>("/api/coach");

  return (
    <div className="portal-shell">
      <header className="portal-header"><div className="wrap portal-header-inner"><Link className="brand" href="/"><span aria-hidden="true" className="brand-mark">F</span><span>FORGE ATHLETIC</span></Link><Link className="inline-link" href="/account">Member account</Link></div></header>
      <main className="wrap portal-main">
        <div className="portal-title-row"><div><Link className="inline-link" href="/"><ArrowLeft aria-hidden="true" size={13} /> Back to the club</Link><h1 className="page-title">Coach workspace.</h1><p className="section-copy">Your timetable and session rosters.</p></div></div>
        {isLoading && <div className="empty-state">Loading your coaching schedule…</div>}
        {error && <div className="empty-state" role="alert">{error.message}</div>}
        {data && <>
          <div className="metric-grid">
            <div className="metric-card"><span>Coach</span><strong>{data.coach.fullName}</strong></div>
            <div className="metric-card"><span>Focus</span><strong>{data.coach.sportName ?? data.coach.title}</strong></div>
            <div className="metric-card"><span>Scheduled sessions</span><strong>{data.sessions.filter((session) => session.status === "scheduled").length}</strong></div>
            <div className="metric-card"><span>Roster places</span><strong>{data.roster.length}</strong></div>
          </div>
          <section className="portal-card">
            <h2><CalendarDays aria-hidden="true" size={16} /> Session schedule</h2>
            {data.sessions.length ? <div className="portal-list">{data.sessions.map((session) => (
              <article className="portal-row" key={session.id}>
                <div><strong>{session.programTitle} · {session.sportName}</strong><small>{formatDate(session.startsAt)} – {formatDate(session.endsAt)}<br />{session.location} · capacity {session.capacity}</small><div className="portal-muted" style={{ marginTop: 10 }}><Users aria-hidden="true" size={13} /> {data.roster.filter((member) => member.sessionId === session.id).length} registrations</div></div>
                <span className="status-pill" data-status={session.status}>{session.status}</span>
              </article>
            ))}</div> : <p className="portal-muted">No sessions are assigned to your coach profile yet.</p>}
          </section>
          <section className="portal-card" style={{ marginTop: 14 }}>
            <h2><Users aria-hidden="true" size={16} /> Session rosters</h2>
            {data.roster.length ? <div className="portal-list">{data.roster.map((member) => {
              const session = data.sessions.find((entry) => entry.id === member.sessionId);
              return <div className="portal-row" key={member.id}><div><strong>{member.fullName}</strong><small>{member.email}{session ? ` · ${session.programTitle}` : ""}</small></div><span className="status-pill" data-status={member.status}>{member.status}</span></div>;
            })}</div> : <p className="portal-muted">No member registrations yet.</p>}
          </section>
        </>}
      </main>
    </div>
  );
}
