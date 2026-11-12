"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowDown, ArrowUpRight, CalendarDays, Menu, X } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import type { getHomeData } from "@/lib/server/home-data";

type HomeData = Awaited<ReturnType<typeof getHomeData>>;
type Profile = { userId: string; fullName: string; email: string; role: string };
type MeResponse = { profile: Profile | null };

type HomePageProps = { data: HomeData };

function formatPrice(priceMinor: number, currency: string) {
  if (priceMinor <= 0) return "Club pricing";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(priceMinor / 100);
}

function formatDate(value: Date | string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(value));
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "That request could not be completed.");
  return result as T;
}

export function HomePage({ data }: HomePageProps) {
  const { data: me, mutate } = useSWR<MeResponse>("/api/me");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const profile = me?.profile ?? null;
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openAuth = useCallback((mode: "sign-in" | "sign-up") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  async function runMemberAction(key: string, path: string, payload: unknown) {
    if (!profile) {
      openAuth("sign-up");
      return;
    }
    setPendingAction(key);
    setNotice("");
    try {
      const result = await postJson<{ message: string }>(path, payload);
      setNotice(result.message);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That request could not be completed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setPendingAction("enquiry");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await postJson<{ message: string }>("/api/enquiries", {
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      setNotice(result.message);
      formElement.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your message could not be sent.");
    } finally {
      setPendingAction(null);
    }
  }

  const heroImage = data.sports.find((sport) => sport.slug === "fitness")?.imageUrl || "/sports-images/fitness.png";

  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link aria-label="Forge Athletic Club home" className="brand" href="/">
            <span aria-hidden="true" className="brand-mark">F</span>
            <span>FORGE ATHLETIC</span>
          </Link>
          <button
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            className="menu-toggle"
            onClick={() => setMobileNavOpen((open) => !open)}
            type="button"
          >
            {mobileNavOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>
          <nav aria-label="Main navigation" className="main-nav" data-open={mobileNavOpen}>
            {[
              ["About", "#about"],
              ["Sports", "#sports"],
              ["Facilities", "#facilities"],
              ["Coaching", "#coaching"],
              ["Membership", "#membership"],
              ["Events", "#events"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a href={href} key={label} onClick={() => setMobileNavOpen(false)}>{label}</a>
            ))}
            {profile ? (
              <Link className="nav-mobile-auth" href={profile.role === "admin" ? "/admin" : profile.role === "coach" ? "/coach" : "/account"} onClick={() => setMobileNavOpen(false)}>Open your account</Link>
            ) : (
              <button className="nav-mobile-auth" onClick={() => { setMobileNavOpen(false); openAuth("sign-in"); }} type="button">Sign in</button>
            )}
          </nav>
          <div className="header-actions">
            {profile ? (
              <Link className="text-button" href={profile.role === "admin" ? "/admin" : profile.role === "coach" ? "/coach" : "/account"}>
                {profile.fullName.split(" ")[0]}
              </Link>
            ) : (
              <button className="text-button" onClick={() => openAuth("sign-in")} type="button">Sign in</button>
            )}
            <a className="button button-primary" href="#membership">Join our club <ArrowUpRight aria-hidden="true" size={14} /></a>
          </div>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div className="hero-copy">
            <span className="eyebrow">Multi-sport club · Mumbai</span>
            <h1>TRAIN HARD.<br />PLAY STRONG.<br /><span>LIVE BETTER.</span></h1>
            <p className="hero-description">A serious place for sport, built for people who want more from their training and more from their community.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#sports">Explore our sports <ArrowUpRight aria-hidden="true" size={14} /></a>
              <a className="button button-outline" href="#membership">Become a member</a>
            </div>
            <div className="scroll-cue">SCROLL TO EXPLORE <ArrowDown aria-hidden="true" size={12} /></div>
          </div>
          <div className="hero-visual">
            <img alt="Athlete training at Forge Athletic Club" fetchPriority="high" src={heroImage} />
            <div className="hero-stamp"><strong>EST.</strong><span>2012</span></div>
          </div>
        </section>

        <section aria-label="Club at a glance" className="wrap stat-strip">
          {[
            [String(data.stats.members).padStart(2, "0"), "registered members"],
            [String(data.stats.sports).padStart(2, "0"), "sports to explore"],
            [String(data.stats.coaches).padStart(2, "0"), "club coaches"],
            [String(data.stats.programs).padStart(2, "0"), "open programmes"],
          ].map(([value, label]) => (
            <div className="stat-item" key={label}><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span></div>
          ))}
        </section>

        <section className="section" id="about">
          <div className="wrap about-grid">
            <div className="section-heading">
              <span className="eyebrow">More than a gym</span>
              <h2 className="section-title">Built for the next version of you.</h2>
            </div>
            <p className="about-note">Forge is a home for movement, competition and belonging. From your first session to your next personal best, our coaches, spaces and people keep you moving forward.</p>
          </div>
        </section>

        <section className="section section-muted" id="sports">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">Find your game</span>
              <h2 className="section-title">One club.<br />Every kind of athlete.</h2>
              <p className="section-copy">Train solo, compete with a team or learn something completely new. Your next obsession is probably here.</p>
            </div>
            {data.sports.length ? (
              <div className="sport-grid">
                {data.sports.map((sport) => (
                  <article className="sport-card" key={sport.id}>
                    <img alt={`${sport.name} training`} loading="lazy" src={sport.imageUrl} />
                    <div className="sport-card-content">
                      <h3>{sport.name}</h3>
                      <p>{sport.summary}</p>
                      <a className="inline-link" href="#programs">Explore programme <ArrowUpRight aria-hidden="true" size={13} /></a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Sports are being updated. Please check back soon.</div>
            )}
          </div>
        </section>

        <section className="section" id="facilities">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">The Forge floor</span>
              <h2 className="section-title">Space to go <span>all in.</span></h2>
              <p className="section-copy">Thoughtfully designed spaces, serious equipment and everything you need between sessions.</p>
            </div>
            <div className="facility-grid">
              {[
                "Performance training floor",
                "Indoor courts",
                "25m swimming pool",
                "Recovery and mobility studio",
                "Clubhouse and locker rooms",
              ].map((facility, index) => (
                <article className="facility-card" key={facility}>
                  <span className="facility-index">{String(index + 1).padStart(2, "0")} / 05</span>
                  <h3>{facility}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-muted" id="programs">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">Coaching that clicks</span>
              <h2 className="section-title">Show up. <span>Level up.</span></h2>
              <p className="section-copy">Find a programme, pick a session and let our coaches meet you where you are.</p>
            </div>
            {data.programs.length ? (
              <div className="program-grid">
                {data.programs.map((program) => (
                  <article className="program-card" key={program.id}>
                    <span className="program-level">{program.skillLevel.replaceAll("_", " ")}</span>
                    <h3>{program.title}</h3>
                    <p>{program.description}</p>
                    <div className="program-meta">
                      <span>{program.sportName}</span>
                      {program.coachName && <span>Coach {program.coachName}</span>}
                      <span>{formatPrice(program.priceMinor, program.currency)}</span>
                    </div>
                    <div className="program-sessions">
                      {program.sessions.length ? program.sessions.map((session) => (
                        <div className="session-row" key={session.id}>
                          <span><CalendarDays aria-hidden="true" size={12} /> {formatDate(session.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}<br />{session.location} · {Math.max(0, session.availableSpots)} places</span>
                          <button
                            className="button button-quiet"
                            disabled={pendingAction === `session-${session.id}`}
                            onClick={() => runMemberAction(`session-${session.id}`, "/api/program-registrations", { sessionId: session.id })}
                            type="button"
                          >
                            {pendingAction === `session-${session.id}` ? "Saving…" : session.availableSpots > 0 ? "Request place" : "Join waitlist"}
                          </button>
                        </div>
                      )) : <span className="form-help">New session dates will be posted here.</span>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">New programmes are being planned. Check back soon, or send the club a message about what you would like to train.</div>
            )}
          </div>
        </section>

        <section className="section" id="coaching">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">People who move you forward</span>
              <h2 className="section-title">Meet your <span>coaches.</span></h2>
              <p className="section-copy">Our coaching team brings craft, care, and a clear plan to every session.</p>
            </div>
            {data.coaches.length ? (
              <div className="coach-grid">
                {data.coaches.map((coach) => (
                  <article className="coach-card" key={coach.id}>
                    {coach.imageUrl ? <img alt={`${coach.fullName}, ${coach.title}`} loading="lazy" src={coach.imageUrl} /> : <div aria-hidden="true" className="coach-initial">{coach.fullName.slice(0, 1)}</div>}
                    <span className="program-level">{coach.sportName ?? "Forge coaching team"}</span>
                    <h3>{coach.fullName}</h3>
                    <p>{coach.title}{coach.bio ? ` · ${coach.bio}` : ""}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="coach-grid">
                {[
                  { level: "Starter", title: "Build your base", description: "Learn the fundamentals, build a routine and find confidence in a welcoming group.", detail: "Beginners · 8 week programme" },
                  { level: "Progress", title: "Train with intent", description: "Small-group sessions with tailored feedback to make every rep and every session count.", detail: "Intermediate · 12 week programme" },
                  { level: "Perform", title: "Chase your edge", description: "High-performance programming, testing and recovery support for competitive athletes.", detail: "Advanced · Performance lab" },
                ].map((track) => (
                  <article className="coach-card" key={track.level}>
                    <span className="program-level">{track.level}</span>
                    <h3>{track.title}</h3>
                    <p>{track.description}</p>
                    <strong className="track-meta">{track.detail}</strong>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section section-muted" id="membership">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">Choose your access</span>
              <h2 className="section-title">Memberships with <span>momentum.</span></h2>
              <p className="section-copy">No lock-in. No ego. Just the right access to keep you consistent.</p>
            </div>
            {data.membershipPlans.length ? (
              <div className="plan-grid">
                {data.membershipPlans.map((plan, index) => (
                  <article className={`plan-card${index === 1 ? " plan-card-featured" : ""}`} key={plan.id}>
                    {index === 1 && <span className="plan-flag">MOST POPULAR</span>}
                    <h3>{plan.name}</h3>
                    <div className="plan-price">{formatPrice(plan.priceMinor, plan.currency)} <small>/ {plan.durationDays} days</small></div>
                    <p>{plan.description}</p>
                    <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                    <button
                      className={`button ${index === 1 ? "button-primary" : "button-outline"}`}
                      disabled={pendingAction === `plan-${plan.id}`}
                      onClick={() => runMemberAction(`plan-${plan.id}`, "/api/memberships", { planId: plan.id })}
                      type="button"
                    >
                      {pendingAction === `plan-${plan.id}` ? "Saving…" : "Request membership"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Membership options are being updated. Contact the club for current access details.</div>
            )}
            <p className="form-help" style={{ marginTop: 16 }}>Membership requests are reviewed by the club. Payment is confirmed offline; no card details are collected here.</p>
          </div>
        </section>

        <section className="section" id="events">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">On the calendar</span>
              <h2 className="section-title">Make a date with <span>your best.</span></h2>
            </div>
            {data.events.length ? (
              <div className="event-list">
                {data.events.map((event) => (
                  <article className="event-card" key={event.id}>
                    <div className="event-date"><small>{formatDate(event.startsAt, { month: "short" }).toUpperCase()}</small>{formatDate(event.startsAt, { day: "2-digit" })}</div>
                    <div>
                      <h3>{event.title}</h3>
                      <p>{[event.sportName, event.location, formatDate(event.startsAt, { hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button
                      className="button button-quiet"
                      disabled={pendingAction === `event-${event.id}`}
                      onClick={() => runMemberAction(`event-${event.id}`, "/api/event-registrations", { eventId: event.id })}
                      type="button"
                    >
                      {pendingAction === `event-${event.id}` ? "Saving…" : event.availableSpots > 0 ? "Register" : "Join waitlist"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">There are no upcoming events published yet. New fixtures and club days will appear here.</div>
            )}
          </div>
        </section>

        <section className="section section-muted" id="contact">
          <div className="wrap contact-grid">
            <div>
              <span className="eyebrow">Your next move</span>
              <h2 className="section-title">Let&apos;s make it happen.</h2>
              <p className="section-copy">Ask about membership, coaching, facilities, or finding the right programme for you.</p>
              <div className="contact-details">
                <div><strong>Visit us</strong>14 Forge Lane, Bandra West, Mumbai</div>
                <div><strong>Call or write</strong>+91 22 4890 2000<br />hello@forgeathletic.in</div>
                <div><strong>Club hours</strong>Mon–Sun · 5:30 AM – 11:00 PM</div>
              </div>
            </div>
            <form className="contact-form" onSubmit={submitEnquiry}>
              <div className="field"><label htmlFor="contact-name">Your name</label><input autoComplete="name" id="contact-name" maxLength={120} minLength={2} name="fullName" placeholder="Full name" required /></div>
              <div className="field"><label htmlFor="contact-email">Email address</label><input autoComplete="email" id="contact-email" maxLength={254} name="email" placeholder="you@example.com" required type="email" /></div>
              <div className="field"><label htmlFor="contact-phone">Phone <span className="form-help">(optional)</span></label><input autoComplete="tel" id="contact-phone" maxLength={40} name="phone" placeholder="+91" /></div>
              <div className="field"><label htmlFor="contact-subject">What can we help with? <span className="form-help">(optional)</span></label><input id="contact-subject" maxLength={160} name="subject" placeholder="Membership, coaching, facilities…" /></div>
              <div className="field"><label htmlFor="contact-message">Message</label><textarea id="contact-message" maxLength={5000} minLength={10} name="message" placeholder="Tell us a little about what you are looking for…" required /></div>
              <button className="button button-primary" disabled={pendingAction === "enquiry"} type="submit">{pendingAction === "enquiry" ? "Sending…" : "Send enquiry"} <ArrowUpRight aria-hidden="true" size={14} /></button>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <span>© {new Date().getFullYear()} Forge Athletic Club</span>
          <nav aria-label="Footer navigation" className="footer-links">
            <a href="#about">About</a><a href="#sports">Sports</a><a href="#membership">Membership</a><a href="#contact">Contact</a>
            {profile && <Link href="/account">Member portal</Link>}
          </nav>
          <span>Train hard. Play strong.</span>
        </div>
      </footer>

      {notice && <div aria-live="polite" className="notice" role="status">{notice}</div>}
      {authOpen && <AuthModal initialMode={authMode} onClose={closeAuth} onSuccess={() => { setAuthOpen(false); void mutate(); router.refresh(); }} />}
    </>
  );
}
