# API reference

All endpoints return JSON. Requests that mutate state require a verified same-origin `Origin` or `Referer`, checked against the request host and trusted forwarded protocol/host headers, plus server-side Zod validation. Unexpected errors are logged server-side and return a generic response; auth tokens, passwords, SQL details, and payment data are not returned.

## Authentication and profiles

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/api/auth/{...path}` | Neon Auth | Email/password sign-up, sign-in, session lookup, and sign-out through the Neon Auth SDK. |
| `GET` | `/api/me` | Public response; profile is `null` when signed out | Return the current member profile, provisioning the app profile from the authenticated Neon Auth session when needed. |
| `PATCH` | `/api/me` | Signed-in member | Update the current profile name and phone. |
| `GET` | `/api/activity` | Signed-in member | Return the current member's recent activity only. |

## Public club catalogue

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/sports` | Public | Active sports in display order. |
| `GET` | `/api/programs` | Public | Open programmes, future sessions, availability, and assigned coach names. |
| `GET` | `/api/membership-plans` | Public | Active plans and their stored features. |
| `GET` | `/api/events` | Public | Scheduled future events and remaining places. |
| `POST` | `/api/enquiries` | Public, rate-limited | Save a validated contact enquiry. Limit: five submissions per normalized email address per 15 minutes. |

## Member workflows

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST` | `/api/memberships` | Signed-in member | View only the current member's requests or apply for an active plan. New requests remain `pending_payment`. |
| `POST` | `/api/program-registrations` | Signed-in member | Register for an open programme session. Database transactions and per-session advisory locks prevent duplicate or over-capacity registration. Full sessions return a waitlist entry. |
| `DELETE` | `/api/program-registrations/{id}` | Owning member | Cancel only the current member's future session registration. |
| `POST` | `/api/event-registrations` | Signed-in member | Register for a future event; full events create a waitlist entry. |
| `DELETE` | `/api/event-registrations/{id}` | Owning member | Cancel only the current member's future event registration. |

## Staff and administration

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/coach` | Coach or admin | Return an email-linked coach profile, its schedule, and rosters. |
| `GET` | `/api/admin/dashboard` | Admin | Aggregate member, catalogue, registration, membership, event, waitlist, and enquiry metrics plus recent queues. |
| `GET` | `/api/admin/options` | Admin | Reference lists for sport, coach, programme, and plan selectors. |
| `GET`, `POST` | `/api/admin/{resource}` | Admin | Read or create supported catalogue records: `sports`, `coaches`, `programs`, `sessions`, `plans`, and `events`. Read-only management resources include `users`, `memberships`, `program-registrations`, `event-registrations`, and `enquiries`. |
| `PATCH`, `DELETE` | `/api/admin/{resource}/{id}` | Admin | Update supported records, member roles, membership/payment status, registrations, or enquiry status. `DELETE` is a soft archive/cancellation/resolution to preserve history; it does not physically erase club records. |

Memberships can only become active after an administrator sets `paymentStatus` to `offline_verified`. This records an external/manual confirmation only; there is no payment processor or card collection in this application.
