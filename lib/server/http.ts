import { z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function assertSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const expectedHost = (forwardedHost || request.headers.get("host") || requestUrl.host).toLowerCase();
  const expectedProtocol = forwardedProtocol
    ? `${forwardedProtocol.replace(/:$/, "")}:`
    : requestUrl.protocol;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let verifiedOrigin: URL | null = null;

  try {
    const candidate = origin || referer;
    if (candidate) verifiedOrigin = new URL(candidate);
  } catch {
    verifiedOrigin = null;
  }

  if (
    !verifiedOrigin ||
    verifiedOrigin.host.toLowerCase() !== expectedHost ||
    verifiedOrigin.protocol !== expectedProtocol
  ) {
    throw new ApiError(403, "This request could not be verified.", "INVALID_ORIGIN");
  }
}

export async function readJson<TSchema extends z.ZodType>(request: Request, schema: TSchema) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "Send a valid JSON request.", "INVALID_JSON");
  }

  const parsed = await schema.safeParseAsync(payload);
  if (!parsed.success) {
    throw new ApiError(422, parsed.error.issues[0]?.message ?? "Please check the submitted fields.", "VALIDATION_FAILED");
  }

  return parsed.data;
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json({ error: error.message, code: error.code }, error.status);
  }

  if (error instanceof z.ZodError) {
    return json({ error: "Please check the submitted fields.", code: "VALIDATION_FAILED" }, 422);
  }

  const databaseCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (databaseCode === "23505") {
    return json({ error: "A matching record already exists.", code: "CONFLICT" }, 409);
  }
  if (databaseCode === "23503") {
    return json({ error: "This record is still in use and cannot be removed.", code: "IN_USE" }, 409);
  }

  console.error("[v0] API request failed", error);
  return json({ error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" }, 500);
}
