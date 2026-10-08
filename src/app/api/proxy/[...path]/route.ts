import { NextRequest } from "next/server";
import { getBackendBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/clientIp";
import {
  pickParams,
  PROGRAMS_BY_CREDENTIAL_SPEC,
  SCHOOLS_FOR_PROGRAM_SPEC,
  SEARCH_SPEC,
  type ParamSpec,
} from "@/lib/search/searchParams";

type BodylessMethod = "GET" | "DELETE";
type BodyMethod = "POST" | "PATCH" | "PUT";

/**
 * Backend path prefixes the frontend actually calls through this proxy.
 * Anything not listed here 404s instead of being forwarded — add a line
 * here when you add a new backend call from the browser. This is
 * intentionally data, not authorization: the backend remains the real
 * authZ boundary for authed prefixes (profile, saved-colleges, compare/*,
 * report, analytics, account/delete, flag).
 */
const ALLOWED_PATH_PREFIXES = [
  // Public catalog / search data
  "search",
  "catalog/programs-by-credential",
  "catalog/schools-for-program",
  "states",
  "programs",
  "schools",
  "colleges",
  "overview",
  "outcomes",
  "campus",
  "tuition",
  "credentials",
  "courses",
  "degree-levels",
  "admission-disclosure-categories",

  // Auth
  "auth/login",
  "auth/apple",
  "auth/me",
  "account/availability",
  "account/email-available",
  "account/delete",
  "user",

  // Authenticated user data
  "profile",
  "saved-colleges",
  "compare/matrix",
  "compare/colleges",
  "report",
  "analytics",
  "flag",
] as const;

// `search` is a single endpoint, not a prefix: nothing underneath it is called.
// `colleges` is only called as colleges/<id>[/athletics] (and colleges/search
// for typeahead), never as the bare list, so the bare list is not reachable.
const EXACT_PATHS_ONLY = new Set<string>([
  "search",
  "catalog/programs-by-credential",
  "catalog/schools-for-program",
]);
const SUBPATHS_ONLY = new Set<string>(["colleges"]);

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => {
    if (path === prefix) return !SUBPATHS_ONLY.has(prefix);
    return !EXACT_PATHS_ONLY.has(prefix) && path.startsWith(`${prefix}/`);
  });
}

// Exact query-param allowlists for the list endpoints (see searchParams.ts).
const PATH_PARAM_SPECS: Record<string, ParamSpec> = {
  search: SEARCH_SPEC,
  "catalog/programs-by-credential": PROGRAMS_BY_CREDENTIAL_SPEC,
  "catalog/schools-for-program": SCHOOLS_FOR_PROGRAM_SPEC,
};

/**
 * Query string forwarded to the backend. List endpoints get an allowlist so
 * a client can't pass tuning params (`fields`, `type=universities`, ...) the
 * UI never sends; the backend still enforces its own caps. Other paths are
 * relayed verbatim.
 */
function forwardedSearch(path: string, request: NextRequest): string {
  const spec = PATH_PARAM_SPECS[path];
  if (spec) {
    const picked = pickParams(request.nextUrl.searchParams, spec).toString();
    return picked ? `?${picked}` : "";
  }
  // colleges/<id>[/athletics] and colleges/search take no params from this app.
  if (path.startsWith("colleges/")) return "";
  return request.nextUrl.search;
}

/**
 * Resolve the catch-all segments to a backend path.
 *
 * Segments arrive percent-decoded, so a traversal attempt that survives Next's
 * own URL normalisation (`%2e%2e%2f`) would reach us as a literal `..` segment
 * and could walk above the backend base path. Reject those outright rather
 * than relying on the backend to normalise.
 */
function resolvePath(path: string[] | undefined): string | null {
  if (!path || path.length === 0) return null;
  if (path.some((segment) => segment === "." || segment === ".." || segment === "")) {
    return null;
  }
  return path.join("/");
}

/**
 * Errors here are infrastructure faults — DNS failures, refused connections,
 * TLS problems. Their messages embed the backend host and port
 * ("connect ECONNREFUSED 10.0.3.14:8000"), so they are logged server-side and
 * replaced with a generic message for the client.
 */
function proxyFailure(method: string, error: unknown): Response {
  console.error(`API Proxy ${method} Error:`, error);
  return Response.json({ error: "Upstream request failed" }, { status: 502 });
}

function badPath(): Response {
  return Response.json({ error: "Invalid path" }, { status: 400 });
}

// 404 rather than 403 for a disallowed path — a 403 would confirm to a
// prober that the path exists but is blocked, which is more information
// than an unlisted route should leak.
function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

/**
 * Relay the upstream response: status code and body unchanged. The client's
 * Authorization header (app JWT) is forwarded untouched — never injected or
 * stripped here, per auth spec §4.9.
 *
 * Responses depend on the caller's token (and, for anonymous callers, on the
 * backend's tiering), so they must never enter a shared cache: a logged-in
 * response served to an anonymous visitor would defeat the backend's gating.
 */
async function relay(res: Response): Promise<Response> {
  const contentType = res.headers.get("content-type") || "application/json";
  const bodyText = await res.text();

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    Vary: "Authorization",
  };
  // Lets the UI tell a rate-limited visitor how long to wait.
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) headers["Retry-After"] = retryAfter;

  return new Response(bodyText, { status: res.status, headers });
}

function forwardedHeaders(
  request: NextRequest,
  extra?: Record<string, string>,
): Record<string, string> {
  // Built from scratch rather than copied from the request, so a browser-sent
  // X-Client-IP / X-Proxy-Signature can never pass through; ours are added
  // last and are derived from the connection, not from those headers.
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return { ...headers, ...clientIpHeaders(request.headers) };
}

async function forwardNoBody(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: BodylessMethod,
) {
  try {
    const pathStr = resolvePath((await params).path);
    if (pathStr === null) return badPath();
    if (!isAllowedPath(pathStr)) return notFound();

    const targetUrl = `${getBackendBaseUrl()}/${pathStr}${forwardedSearch(pathStr, request)}`;

    return relay(
      await fetch(targetUrl, {
        method,
        headers: forwardedHeaders(request),
        cache: "no-store",
      }),
    );
  } catch (error) {
    return proxyFailure(method, error);
  }
}

async function forwardWithBody(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: BodyMethod,
) {
  try {
    const pathStr = resolvePath((await params).path);
    if (pathStr === null) return badPath();
    if (!isAllowedPath(pathStr)) return notFound();

    const targetUrl = `${getBackendBaseUrl()}/${pathStr}${forwardedSearch(pathStr, request)}`;

    // Only JSON bodies are relayed; the backend exposes no multipart endpoints.
    let body: string | undefined;
    if ((request.headers.get("content-type") || "").includes("application/json")) {
      try {
        const raw = await request.text();
        // Forward the raw text rather than re-serialising a parsed object, so
        // a body of `0`, `false` or `""` survives instead of being dropped.
        body = raw.length > 0 ? raw : undefined;
      } catch {
        // Ignore parse errors for empty/malformed requests
      }
    }

    return relay(
      await fetch(targetUrl, {
        method,
        headers: forwardedHeaders(request, {
          "Content-Type": "application/json",
        }),
        body,
        cache: "no-store",
      }),
    );
  } catch (error) {
    return proxyFailure(method, error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forwardNoBody(request, params, "GET");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forwardNoBody(request, params, "DELETE");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forwardWithBody(request, params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forwardWithBody(request, params, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forwardWithBody(request, params, "PUT");
}
