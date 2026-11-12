import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const clubProfiles = pgTable(
  "club_profiles",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: text("role").notNull().default("member"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("club_profiles_email_key").on(table.email),
    index("club_profiles_role_idx").on(table.role, table.createdAt.desc()),
    check("club_profiles_role_check", sql`${table.role} IN ('member', 'admin', 'coach')`),
  ],
);

export const sports = pgTable(
  "sports",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    summary: varchar("summary", { length: 255 }).notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("sports_slug_key").on(table.slug),
    index("sports_active_order_idx").on(table.isActive, table.sortOrder, table.name),
  ],
);

export const coaches = pgTable(
  "coaches",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    bio: text("bio").notNull().default(""),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 40 }),
    imageUrl: text("image_url").notNull().default(""),
    sportId: integer("sport_id").references(() => sports.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("coaches_active_name_idx").on(table.isActive, table.fullName)],
);

export const membershipPlans = pgTable(
  "membership_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    durationDays: integer("duration_days").notNull(),
    features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("membership_plans_slug_key").on(table.slug),
    index("membership_plans_active_name_idx").on(table.isActive, table.name),
    check("membership_plans_price_minor_check", sql`${table.priceMinor} >= 0`),
    check("membership_plans_duration_days_check", sql`${table.durationDays} > 0`),
    check("membership_plans_features_array_check", sql`jsonb_typeof(${table.features}) = 'array'`),
  ],
);

export const programs = pgTable(
  "programs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sportId: integer("sport_id").notNull().references(() => sports.id, { onDelete: "restrict" }),
    coachId: integer("coach_id").references(() => coaches.id, { onDelete: "set null" }),
    title: varchar("title", { length: 140 }).notNull(),
    description: text("description").notNull().default(""),
    skillLevel: text("skill_level").notNull().default("all_levels"),
    priceMinor: integer("price_minor").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    capacity: integer("capacity").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("programs_sport_status_idx").on(table.sportId, table.status, table.title),
    check("programs_skill_level_check", sql`${table.skillLevel} IN ('beginner', 'intermediate', 'advanced', 'all_levels')`),
    check("programs_price_minor_check", sql`${table.priceMinor} >= 0`),
    check("programs_capacity_check", sql`${table.capacity} > 0`),
    check("programs_status_check", sql`${table.status} IN ('draft', 'open', 'full', 'archived')`),
  ],
);

export const programSessions = pgTable(
  "program_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "restrict" }),
    coachId: integer("coach_id").references(() => coaches.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 200 }).notNull(),
    capacity: integer("capacity").notNull(),
    status: text("status").notNull().default("scheduled"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("program_sessions_program_start_idx").on(table.programId, table.startsAt).where(sql`${table.status} = 'scheduled'`),
    check("program_sessions_capacity_check", sql`${table.capacity} > 0`),
    check("program_sessions_status_check", sql`${table.status} IN ('scheduled', 'cancelled', 'completed')`),
    check("program_sessions_time_check", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    planId: integer("plan_id").notNull().references(() => membershipPlans.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending_payment"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    paymentReference: varchar("payment_reference", { length: 160 }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("memberships_user_status_idx").on(table.userId, table.status, table.createdAt.desc()),
    uniqueIndex("memberships_one_open_per_user_idx")
      .on(table.userId)
      .where(sql`${table.status} IN ('pending_payment', 'active')`),
    check("memberships_status_check", sql`${table.status} IN ('pending_payment', 'active', 'cancelled', 'expired')`),
    check("memberships_payment_status_check", sql`${table.paymentStatus} IN ('pending', 'offline_verified')`),
  ],
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sportId: integer("sport_id").references(() => sports.id, { onDelete: "set null" }),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    location: varchar("location", { length: 200 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    registrationDeadline: timestamp("registration_deadline", { withTimezone: true }),
    capacity: integer("capacity").notNull(),
    status: text("status").notNull().default("scheduled"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("events_schedule_status_idx").on(table.startsAt, table.status),
    check("events_capacity_check", sql`${table.capacity} > 0`),
    check("events_status_check", sql`${table.status} IN ('scheduled', 'cancelled', 'completed')`),
    check("events_end_time_check", sql`${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`),
  ],
);

export const programRegistrations = pgTable(
  "program_registrations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sessionId: integer("session_id").notNull().references(() => programSessions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("program_registrations_user_id_session_id_key").on(table.userId, table.sessionId),
    index("program_registrations_session_status_idx").on(table.sessionId, table.status),
    check("program_registrations_status_check", sql`${table.status} IN ('pending', 'confirmed', 'waitlisted', 'cancelled')`),
  ],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("event_registrations_user_id_event_id_key").on(table.userId, table.eventId),
    index("event_registrations_event_status_idx").on(table.eventId, table.status),
    check("event_registrations_status_check", sql`${table.status} IN ('pending', 'confirmed', 'waitlisted', 'cancelled')`),
  ],
);

export const contactEnquiries = pgTable(
  "contact_enquiries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    subject: varchar("subject", { length: 160 }),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    adminNote: text("admin_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("contact_enquiries_status_created_idx").on(table.status, table.createdAt.desc()),
    index("contact_enquiries_email_created_idx").on(table.email, table.createdAt.desc()),
    check("contact_enquiries_status_check", sql`${table.status} IN ('new', 'in_progress', 'resolved')`),
    check("contact_enquiries_name_length_check", sql`char_length(trim(${table.fullName})) BETWEEN 2 AND 120`),
    check("contact_enquiries_message_length_check", sql`char_length(trim(${table.message})) BETWEEN 10 AND 5000`),
  ],
);

export const userActivity = pgTable(
  "user_activity",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [
    index("user_activity_user_created_idx").on(table.userId, table.createdAt.desc()),
    check("user_activity_metadata_object_check", sql`jsonb_typeof(${table.metadata}) = 'object'`),
  ],
);

export const schema = {
  clubProfiles,
  sports,
  coaches,
  membershipPlans,
  programs,
  programSessions,
  memberships,
  events,
  programRegistrations,
  eventRegistrations,
  contactEnquiries,
  userActivity,
};
