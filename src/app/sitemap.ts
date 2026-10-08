import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getSiteUrl, getBackendBaseUrl } from "@/lib/env";
import { CATEGORY_LABELS } from "@/constants/searchCategories";

interface SitemapUniversity {
  unitid: number | string;
  slug?: string | null;
  updated_at?: string | null;
}

// Rendered per request (the backend call is cached 24h below) rather than at
// build, so a build without a reachable backend still succeeds while a broken
// backend surfaces as a failing /sitemap.xml instead of an empty sitemap.
export const dynamic = "force-dynamic";

/**
 * Fails loudly: a sitemap with zero university URLs is worse than no sitemap
 * (crawlers would treat it as authoritative), so a bad response throws.
 *
 * Cached for 24h with unstable_cache rather than `fetch(..., { revalidate })`:
 * the fetch cache stores any 200, so a 200 with a bad body would be pinned for
 * a day even though we reject it. unstable_cache only stores a RETURNED value,
 * and this function throws before returning on any bad response, so failures
 * are retried on the next request instead of being cached.
 */
const fetchSitemapUniversities = unstable_cache(
  async (): Promise<SitemapUniversity[]> => {
    const url = `${getBackendBaseUrl()}/sitemap/universities`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      console.info(`[sitemap] fetching ${url}`);
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`GET /sitemap/universities returned ${res.status}`);
      }
      const data: unknown = await res.json();
      const rows = Array.isArray(data)
        ? (data as SitemapUniversity[]).filter((u) => u && u.unitid)
        : [];
      if (rows.length === 0) {
        throw new Error("GET /sitemap/universities returned 0 universities");
      }
      return rows;
    } catch (error) {
      console.error("[sitemap] Cannot build university URLs:", error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  ["sitemap-universities"],
  { revalidate: 86400 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/compare`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Add popular category landing routes
  Object.keys(CATEGORY_LABELS).forEach((catSlug) => {
    routes.push({
      url: `${siteUrl}/search?category=${encodeURIComponent(catSlug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // University URLs come from the dedicated public sitemap endpoint, which
  // returns only what a sitemap needs (not the searchable catalog).
  const universities = await fetchSitemapUniversities();
  for (const uni of universities) {
    // URLs are built from unitid; `slug` is null until the backend has one and
    // /university/[id] routes by unitid either way.
    const updated = uni.updated_at ? new Date(uni.updated_at) : null;
    routes.push({
      url: `${siteUrl}/university/${uni.unitid}`,
      // Omit lastmod rather than invent one when the backend value is unusable.
      lastModified:
        updated && !Number.isNaN(updated.getTime()) ? updated : undefined,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}
