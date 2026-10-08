/**
 * A failed backend call, carrying only the machine-readable parts of the
 * backend's `{ error: { code, message }, requestId }` envelope (request id
 * also from the X-Request-Id header). Older routes still send
 * `{ error: "string" }`; that carries no code, so only the status is kept.
 *
 * `message` is a fixed "<action> failed (<status>)" string and is never built
 * from the response body, so it is safe to log but is NOT meant for display:
 * the UI maps `code` to copy it owns (see getFriendlyError). The body's own
 * `error.message` is deliberately dropped here.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(
    action: string,
    status: number,
    code?: string,
    requestId?: string,
  ) {
    super(`${action} failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

// Only well-formed tokens survive, so nothing free-form from a response body
// can reach the UI through `code` or `requestId`.
const CODE_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Build an ApiError from a non-OK response; tolerates any body shape. */
export async function readApiError(
  res: Response,
  action: string,
): Promise<ApiError> {
  let code: string | undefined;
  let requestId: string | undefined;
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const { error, requestId: bodyRequestId } = body as {
        error?: unknown;
        requestId?: unknown;
      };
      // New envelope only: `error` is an object. The legacy `{ error: "text" }`
      // is a string, which has no `code`, so nothing is taken from it.
      if (error && typeof error === "object") {
        const rawCode = (error as { code?: unknown }).code;
        if (typeof rawCode === "string" && CODE_PATTERN.test(rawCode)) {
          code = rawCode;
        }
      }
      if (
        typeof bodyRequestId === "string" &&
        REQUEST_ID_PATTERN.test(bodyRequestId)
      ) {
        requestId = bodyRequestId;
      }
    }
  } catch {
    // Not JSON (HTML error page, empty body): status alone is what we have.
  }
  if (!requestId) {
    const header = res.headers.get("x-request-id");
    if (header && REQUEST_ID_PATTERN.test(header)) requestId = header;
  }
  return new ApiError(action, res.status, code, requestId);
}
