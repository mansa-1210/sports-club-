import { z } from "zod";

const id = z.coerce.number().int().positive();
const optionalId = z.union([z.literal("").transform(() => null), z.coerce.number().int().positive()]).nullable().optional();
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");
const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value.startsWith("/sports-images/") || /^https:\/\/[^\s]+$/i.test(value), "Use a club image path or an HTTPS image URL.");
const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]).optional();
const optionalPhone = z.string().trim().max(40).optional();

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: optionalPhone,
});

export const membershipCreateSchema = z.object({ planId: id });
export const programRegistrationSchema = z.object({ sessionId: id });
export const eventRegistrationSchema = z.object({ eventId: id });

export const enquirySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: optionalPhone,
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(5000),
});

export const sportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  summary: z.string().trim().min(2).max(255),
  description: z.string().trim().min(2).max(5000),
  imageUrl,
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean().optional(),
});

export const coachSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(5000).default(""),
  email: optionalEmail,
  phone: optionalPhone,
  imageUrl: z.union([z.literal(""), imageUrl]).optional(),
  sportId: optionalId,
  isActive: z.boolean().optional(),
});

export const programSchema = z.object({
  sportId: id,
  coachId: optionalId,
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(5000).default(""),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  priceMinor: z.coerce.number().int().min(0).max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  capacity: z.coerce.number().int().min(1).max(10000),
  status: z.enum(["draft", "open", "full", "archived"]),
});

export const sessionSchema = z
  .object({
    programId: id,
    coachId: optionalId,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    location: z.string().trim().min(2).max(200),
    capacity: z.coerce.number().int().min(1).max(10000),
    status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "The session end must be after its start.",
  });

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  description: z.string().trim().min(2).max(5000),
  priceMinor: z.coerce.number().int().min(0).max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  durationDays: z.coerce.number().int().min(1).max(3650),
  features: z.array(z.string().trim().min(1).max(160)).max(30),
  isActive: z.boolean().optional(),
});

export const eventSchema = z
  .object({
    sportId: optionalId,
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5000).default(""),
    location: z.string().trim().min(2).max(200),
    startsAt: z.coerce.date(),
    endsAt: z.union([z.literal("").transform(() => null), z.coerce.date()]).nullable().optional(),
    registrationDeadline: z.union([z.literal("").transform(() => null), z.coerce.date()]).nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(100000),
    status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  })
  .refine((value) => !value.endsAt || value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "The event end must be after its start.",
  });

export const userRoleSchema = z.object({ role: z.enum(["member", "coach", "admin"]) });
export const membershipUpdateSchema = z.object({
  status: z.enum(["pending_payment", "active", "cancelled", "expired"]).optional(),
  paymentStatus: z.enum(["pending", "offline_verified"]).optional(),
  paymentReference: z.string().trim().max(160).optional(),
});
export const registrationUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "waitlisted", "cancelled"]),
});
export const enquiryUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved"]),
  adminNote: z.string().trim().max(5000).optional(),
});
