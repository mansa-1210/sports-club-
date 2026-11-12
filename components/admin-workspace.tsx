"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import { ArrowLeft, ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Resource = "sports" | "coaches" | "programs" | "sessions" | "plans" | "events" | "memberships" | "users" | "program-registrations" | "event-registrations" | "enquiries";
type FieldKind = "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "datetime-local" | "features";
type Field = { name: string; label: string; kind: FieldKind; required?: boolean; options?: string[]; source?: "sports" | "coaches" | "programs" | "plans"; nullable?: boolean; full?: boolean };
type Row = Record<string, unknown>;
type DashboardData = {
  metrics: Record<string, number>;
  recentEnquiries: Array<{ id: number; fullName: string; email: string; subject: string | null; status: string; createdAt: string }>;
  recentMemberships: Array<{ id: number; fullName: string; email: string; planName: string; status: string; paymentStatus: string; createdAt: string }>;
};
type OptionsData = { sports: Array<{ id: number; name: string }>; coaches: Array<{ id: number; fullName: string }>; programs: Array<{ id: number; title: string }>; plans: Array<{ id: number; name: string }> };

const sections: Array<{ key: "overview" | Resource; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "sports", label: "Sports" },
  { key: "programs", label: "Programmes" },
  { key: "sessions", label: "Schedules" },
  { key: "coaches", label: "Coaches" },
  { key: "plans", label: "Membership plans" },
  { key: "memberships", label: "Membership requests" },
  { key: "events", label: "Events" },
  { key: "program-registrations", label: "Programme roster" },
  { key: "event-registrations", label: "Event roster" },
  { key: "users", label: "Members & roles" },
  { key: "enquiries", label: "Enquiries" },
];

const fieldsByResource: Partial<Record<Resource, Field[]>> = {
  sports: [
    { name: "name", label: "Sport name", kind: "text", required: true },
    { name: "slug", label: "URL slug", kind: "text", required: true },
    { name: "summary", label: "Card summary", kind: "text", required: true, full: true },
    { name: "description", label: "Description", kind: "textarea", required: true, full: true },
    { name: "imageUrl", label: "Image path or HTTPS URL", kind: "text", required: true, full: true },
    { name: "sortOrder", label: "Display order", kind: "number", required: true },
    { name: "isActive", label: "Published", kind: "checkbox" },
  ],
  coaches: [
    { name: "fullName", label: "Coach name", kind: "text", required: true },
    { name: "title", label: "Title or specialty", kind: "text", required: true },
    { name: "email", label: "Account email", kind: "email" },
    { name: "phone", label: "Phone", kind: "text" },
    { name: "sportId", label: "Sport", kind: "select", source: "sports", nullable: true },
    { name: "imageUrl", label: "Image path or HTTPS URL", kind: "text", full: true },
    { name: "bio", label: "Profile bio", kind: "textarea", full: true },
    { name: "isActive", label: "Published", kind: "checkbox" },
  ],
  programs: [
    { name: "title", label: "Programme title", kind: "text", required: true },
    { name: "sportId", label: "Sport", kind: "select", source: "sports", required: true },
    { name: "coachId", label: "Coach", kind: "select", source: "coaches", nullable: true },
    { name: "skillLevel", label: "Skill level", kind: "select", options: ["beginner", "intermediate", "advanced", "all_levels"], required: true },
    { name: "priceMinor", label: "Price in paise (₹ ÷ 100)", kind: "number", required: true },
    { name: "currency", label: "Currency code", kind: "text", required: true },
    { name: "capacity", label: "Programme capacity", kind: "number", required: true },
    { name: "status", label: "Status", kind: "select", options: ["draft", "open", "full", "archived"], required: true },
    { name: "description", label: "Description", kind: "textarea", full: true },
  ],
  sessions: [
    { name: "programId", label: "Programme", kind: "select", source: "programs", required: true },
    { name: "coachId", label: "Coach override", kind: "select", source: "coaches", nullable: true },
    { name: "startsAt", label: "Starts at", kind: "datetime-local", required: true },
    { name: "endsAt", label: "Ends at", kind: "datetime-local", required: true },
    { name: "location", label: "Location", kind: "text", required: true },
    { name: "capacity", label: "Places", kind: "number", required: true },
    { name: "status", label: "Status", kind: "select", options: ["scheduled", "cancelled", "completed"], required: true },
  ],
  plans: [
    { name: "name", label: "Plan name", kind: "text", required: true },
    { name: "slug", label: "URL slug", kind: "text", required: true },
    { name: "priceMinor", label: "Price in paise (₹ ÷ 100)", kind: "number", required: true },
    { name: "currency", label: "Currency code", kind: "text", required: true },
    { name: "durationDays", label: "Duration (days)", kind: "number", required: true },
    { name: "isActive", label: "Published", kind: "checkbox" },
    { name: "description", label: "Description", kind: "textarea", required: true, full: true },
    { name: "features", label: "Features (one per line or comma separated)", kind: "features", required: true, full: true },
  ],
  events: [
    { name: "title", label: "Event title", kind: "text", required: true },
    { name: "sportId", label: "Sport", kind: "select", source: "sports", nullable: true },
    { name: "startsAt", label: "Starts at", kind: "datetime-local", required: true },
    { name: "endsAt", label: "Ends at", kind: "datetime-local", nullable: true },
    { name: "registrationDeadline", label: "Registration deadline", kind: "datetime-local", nullable: true },
    { name: "location", label: "Location", kind: "text", required: true },
    { name: "capacity", label: "Places", kind: "number", required: true },
    { name: "status", label: "Status", kind: "select", options: ["scheduled", "cancelled", "completed"], required: true },
    { name: "description", label: "Description", kind: "textarea", full: true },
  ],
  memberships: [
    { name: "status", label: "Membership status", kind: "select", options: ["pending_payment", "active", "cancelled", "expired"], required: true },
    { name: "paymentStatus", label: "Payment confirmation", kind: "select", options: ["pending", "offline_verified"], required: true },
    { name: "paymentReference", label: "Offline reference (optional)", kind: "text", full: true },
  ],
  users: [{ name: "role", label: "Account role", kind: "select", options: ["member", "coach", "admin"], required: true }],
  "program-registrations": [{ name: "status", label: "Registration status", kind: "select", options: ["pending", "confirmed", "waitlisted", "cancelled"], required: true }],
  "event-registrations": [{ name: "status", label: "Registration status", kind: "select", options: ["pending", "confirmed", "waitlisted", "cancelled"], required: true }],
  enquiries: [
    { name: "status", label: "Enquiry status", kind: "select", options: ["new", "in_progress", "resolved"], required: true },
    { name: "adminNote", label: "Internal note", kind: "textarea", full: true },
  ],
};

function localDateValue(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function displayDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function rowTitle(row: Row) {
  return String(row.fullName ?? row.title ?? row.name ?? row.planName ?? row.eventTitle ?? row.programTitle ?? `Record #${row.id ?? ""}`);
}

function rowSubtitle(row: Row) {
  return String(row.email ?? row.sportName ?? row.programTitle ?? row.eventTitle ?? row.location ?? row.slug ?? "");
}

function rowStatus(row: Row) {
  if (typeof row.status === "string") return row.status;
  if (typeof row.role === "string") return row.role;
  if (typeof row.isActive === "boolean") return row.isActive ? "active" : "archived";
  return "";
}

function formDefaults(resource: Resource, fields: Field[], item: Row | null) {
  const initial: Record<string, unknown> = {};
  for (const field of fields) {
    const existing = item?.[field.name];
    if (field.kind === "datetime-local") initial[field.name] = localDateValue(existing);
    else if (field.kind === "features") initial[field.name] = Array.isArray(existing) ? existing.join("\n") : "";
    else if (field.kind === "checkbox") initial[field.name] = typeof existing === "boolean" ? existing : resource === "sports" || resource === "coaches" || resource === "plans";
    else if (existing !== undefined && existing !== null) initial[field.name] = String(existing);
    else if (field.name === "currency") initial[field.name] = "INR";
    else if (field.name === "skillLevel") initial[field.name] = "all_levels";
    else if (field.name === "status") initial[field.name] = resource === "programs" ? "draft" : resource === "memberships" ? "pending_payment" : resource === "plans" ? "" : "scheduled";
    else if (field.name === "sortOrder") initial[field.name] = "0";
    else initial[field.name] = "";
  }
  return initial;
}

export function AdminWorkspace({ fullName }: { fullName: string }) {
  const [active, setActive] = useState<"overview" | Resource>("overview");
  const [editing, setEditing] = useState<Row | null | false>(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const resource = active === "overview" ? null : active;
  const { data: dashboard, isLoading: dashboardLoading } = useSWR<DashboardData>(active === "overview" ? "/api/admin/dashboard" : null);
  const { data: collection, isLoading: collectionLoading } = useSWR<{ items: Row[] }>(resource ? `/api/admin/${resource}` : null);
  const { data: optionsResult } = useSWR<{ items: OptionsData }>("/api/admin/options");
  const fields = resource ? fieldsByResource[resource] ?? [] : [];
  const formOpen = editing !== false && resource !== null;
  const options = optionsResult?.items;
  const rows = collection?.items ?? [];
  const label = sections.find((section) => section.key === active)?.label ?? "Overview";
  const metrics = dashboard?.metrics ?? {};
  const metricEntries = useMemo(() => [
    ["Member and coach accounts", metrics.members ?? 0],
    ["Published sports", metrics.sports ?? 0],
    ["Open programmes", metrics.programs ?? 0],
    ["Pending memberships", metrics.pendingMemberships ?? 0],
    ["Active memberships", metrics.activeMemberships ?? 0],
    ["Programme registrations", metrics.programRegistrations ?? 0],
    ["Upcoming events", metrics.upcomingEvents ?? 0],
    ["Active coaches", metrics.coaches ?? 0],
    ["Open enquiries", metrics.openEnquiries ?? 0],
    ["Waitlist requests", metrics.waitlisted ?? 0],
  ], [metrics]);

  function startCreate() {
    if (!resource) return;
    setEditing(null);
    setValues(formDefaults(resource, fields, null));
    setError("");
    setNotice("");
  }

  function startEdit(item: Row) {
    if (!resource) return;
    setEditing(item);
    setValues(formDefaults(resource, fields, item));
    setError("");
    setNotice("");
  }

  function closeForm() {
    setEditing(false);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resource) return;
    setSaving(true);
    setError("");
    setNotice("");
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = values[field.name];
      if (field.kind === "checkbox") body[field.name] = Boolean(raw);
      else if (field.kind === "number") body[field.name] = raw === "" && field.nullable ? null : Number(raw);
      else if (field.kind === "datetime-local") body[field.name] = raw ? new Date(String(raw)).toISOString() : null;
      else if (field.kind === "features") body[field.name] = String(raw ?? "").split(/[\n,]/).map((part) => part.trim()).filter(Boolean);
      else if (field.kind === "select" && field.nullable && raw === "") body[field.name] = null;
      else body[field.name] = raw;
    }

    try {
      const itemId = editing && typeof editing === "object" ? String(editing.id ?? editing.userId) : "";
      const response = await fetch(resource && itemId ? `/api/admin/${resource}/${encodeURIComponent(itemId)}` : `/api/admin/${resource}`, {
        method: itemId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The record could not be saved.");
      setEditing(false);
      setNotice(itemId ? "Changes saved." : "Record created.");
      await Promise.all([mutate(`/api/admin/${resource}`), mutate("/api/admin/dashboard"), mutate("/api/admin/options")]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(item: Row) {
    if (!resource || resource === "users") return;
    const title = rowTitle(item);
    if (!window.confirm(`Archive or cancel “${title}”? Historical records will be preserved.`)) return;
    setError("");
    setNotice("");
    const id = String(item.id);
    try {
      const response = await fetch(`/api/admin/${resource}/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The record could not be archived.");
      setNotice(result.message ?? "Record archived.");
      await Promise.all([mutate(`/api/admin/${resource}`), mutate("/api/admin/dashboard")]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The record could not be archived.");
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="portal-shell">
      <header className="portal-header"><div className="wrap portal-header-inner"><Link className="brand" href="/"><span aria-hidden="true" className="brand-mark">F</span><span>FORGE ATHLETIC</span></Link><div className="portal-actions"><span className="portal-muted">{fullName}</span><Link className="inline-link" href="/account">Member view <ArrowUpRight aria-hidden="true" size={13} /></Link><button className="button button-outline" onClick={signOut} type="button">Sign out</button></div></div></header>
      <main className="wrap portal-main">
        <div className="portal-title-row"><div><Link className="inline-link" href="/"><ArrowLeft aria-hidden="true" size={13} /> Back to the club</Link><h1 className="page-title">Club operations.</h1><p className="section-copy">Manage the catalogue, schedules, members, and incoming requests.</p></div></div>
        <div className="admin-layout">
          <nav aria-label="Admin sections" className="admin-nav">
            {sections.map((section) => <button aria-current={active === section.key ? "page" : undefined} key={section.key} onClick={() => { setActive(section.key); setEditing(false); setError(""); }} type="button">{section.label}</button>)}
          </nav>
          <section className="admin-content">
            {active === "overview" ? (
              <>
                <div className="admin-toolbar"><h2>Overview</h2><button className="button button-quiet" onClick={() => void mutate("/api/admin/dashboard")} type="button"><RefreshCw aria-hidden="true" size={13} /> Refresh</button></div>
                <div className="metric-grid">{metricEntries.map(([name, value]) => <div className="metric-card" key={String(name)}><span>{name}</span><strong>{dashboardLoading ? "—" : value}</strong></div>)}</div>
                <div className="portal-grid">
                  <section className="portal-card"><h2>Recent enquiries</h2>{dashboard?.recentEnquiries.length ? <div className="portal-list">{dashboard.recentEnquiries.map((item) => <div className="portal-row" key={item.id}><div><strong>{item.fullName}</strong><small>{item.email}{item.subject ? ` · ${item.subject}` : ""}</small></div><span className="status-pill" data-status={item.status}>{item.status.replaceAll("_", " ")}</span></div>)}</div> : <p className="portal-muted">No enquiries have been received yet.</p>}</section>
                  <section className="portal-card"><h2>Membership queue</h2>{dashboard?.recentMemberships.length ? <div className="portal-list">{dashboard.recentMemberships.map((item) => <div className="portal-row" key={item.id}><div><strong>{item.fullName} · {item.planName}</strong><small>{item.email} · {item.paymentStatus.replaceAll("_", " ")}</small></div><span className="status-pill" data-status={item.status}>{item.status.replaceAll("_", " ")}</span></div>)}</div> : <p className="portal-muted">No membership requests yet.</p>}</section>
                </div>
                <p className="form-help" style={{ marginTop: 16 }}>Membership requests are not charged online. Mark payment as offline verified before activating a membership.</p>
              </>
            ) : (
              <>
                <div className="admin-toolbar"><div><h2>{label}</h2><p className="portal-muted">{rows.length} record{rows.length === 1 ? "" : "s"}</p></div><div className="admin-actions"><button className="button button-quiet" onClick={() => void mutate(`/api/admin/${active}`)} type="button"><RefreshCw aria-hidden="true" size={13} /> Refresh</button>{fields.length > 0 && ["sports", "coaches", "programs", "sessions", "plans", "events"].includes(active) && <button className="button button-primary" onClick={startCreate} type="button"><Plus aria-hidden="true" size={14} /> Add</button>}</div></div>
                {notice && <p aria-live="polite" className="form-success" role="status">{notice}</p>}
                {error && <p className="admin-error" role="alert">{error}</p>}
                {formOpen && resource && <form className="admin-form" onSubmit={save}>
                  <h3>{editing ? `Edit ${rowTitle(editing)}` : `Add ${label.toLowerCase()}`}</h3>
                  {resource === "memberships" && <p className="form-help full-span">Set payment to “offline verified” only after confirming receipt outside this app. There is no online charge flow.</p>}
                  {fields.map((field) => {
                    const id = `admin-${field.name}`;
                    const value = values[field.name];
                    const optionRows = field.source ? options?.[field.source] ?? [] : [];
                    return <div className={`field${field.full ? " full-span" : ""}`} key={field.name}>
                      {field.kind === "checkbox" ? <label className="checkbox-field" htmlFor={id}><input checked={Boolean(value)} id={id} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))} type="checkbox" />{field.label}</label> : <>
                        <label htmlFor={id}>{field.label}</label>
                        {field.kind === "textarea" || field.kind === "features" ? <textarea id={id} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} rows={field.kind === "features" ? 5 : 3} value={String(value ?? "")} /> : field.kind === "select" ? <select id={id} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} value={String(value ?? "")}>
                          {field.nullable && <option value="">Not assigned</option>}
                          {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                          {optionRows.map((option) => <option key={option.id} value={option.id}>{"name" in option ? option.name : "fullName" in option ? option.fullName : "title" in option ? option.title : ""}</option>)}
                        </select> : <input id={id} maxLength={field.kind === "text" || field.kind === "email" ? 2048 : undefined} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} step={field.kind === "number" ? "1" : undefined} type={field.kind} value={field.kind === "datetime-local" ? localDateValue(value) : String(value ?? "")} />}
                      </>}
                    </div>;
                  })}
                  <div className="admin-form-actions"><button className="button button-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button><button className="button button-outline" onClick={closeForm} type="button">Close</button></div>
                </form>}
                {collectionLoading ? <div className="empty-state">Loading records…</div> : rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Record</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead><tbody>{rows.map((item) => {
                  const itemId = String(item.id ?? item.userId ?? "");
                  const status = rowStatus(item);
                  const summary = String(item.message ?? item.description ?? item.subject ?? item.paymentReference ?? "");
                  const removable = active !== "users";
                  return <tr key={itemId}><td><strong>{rowTitle(item)}</strong><small>{rowSubtitle(item)}</small></td><td>{status && <span className="status-pill" data-status={status}>{status.replaceAll("_", " ")}</span>}</td><td><small>{summary || (item.createdAt ? `Added ${displayDate(item.createdAt)}` : item.startsAt ? displayDate(item.startsAt) : item.priceMinor !== undefined ? `${item.currency ?? "INR"} ${(Number(item.priceMinor) / 100).toLocaleString("en-IN")}` : "")}</small>{typeof item.paymentStatus === "string" && <small style={{ display: "block", marginTop: 5 }}>Payment: {item.paymentStatus.replaceAll("_", " ")}</small>}</td><td><div className="admin-actions"><button className="button button-quiet" onClick={() => startEdit(item)} type="button">Edit</button>{removable && <button className="button button-danger" onClick={() => void archive(item)} type="button">{active === "enquiries" ? "Resolve" : active === "memberships" || active.includes("registrations") || active === "events" || active === "sessions" ? "Cancel" : "Archive"}</button>}</div></td></tr>;
                })}</tbody></table></div> : <div className="empty-state">No records yet. Use “Add” to publish the first item in this section.</div>}
                {active === "memberships" && <p className="form-help" style={{ marginTop: 14 }}>Activation requires an administrator to mark the offline payment as verified. The app never stores card information or claims to collect a payment.</p>}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
