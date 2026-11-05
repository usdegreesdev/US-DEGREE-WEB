/**
 * Builds public Cloudflare R2 URLs for college images, keyed by IPEDS unitid.
 *
 *   {BASE}/{FOLDER}/{unitid}_logo.jpg
 *   {BASE}/{FOLDER}/{unitid}_image.jpg
 *
 * Config (NEXT_PUBLIC_ so the browser loads images straight from R2):
 *   NEXT_PUBLIC_COLLEGE_IMAGES_BASE_URL  – bucket public URL, no trailing slash
 *   NEXT_PUBLIC_COLLEGE_IMAGES_FOLDER    – optional, defaults to the trial folder
 *
 * Returns null when unconfigured or the unitid is unusable, so callers fall
 * back to their placeholder instead of requesting a broken URL.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_COLLEGE_IMAGES_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const FOLDER = (
  process.env.NEXT_PUBLIC_COLLEGE_IMAGES_FOLDER ?? "College trial upload"
).replace(/^\/+|\/+$/g, "");

function buildUrl(unitid: string | number | null | undefined, suffix: string) {
  const id = String(unitid ?? "").trim();
  if (!BASE_URL || !/^\d+$/.test(id)) return null;
  const folder = FOLDER ? `${encodeURIComponent(FOLDER)}/` : "";
  return `${BASE_URL}/${folder}${id}_${suffix}.jpg`;
}

export const getCollegeLogoUrl = (unitid: string | number | null | undefined) =>
  buildUrl(unitid, "logo");

export const getCollegeBannerUrl = (
  unitid: string | number | null | undefined,
) => buildUrl(unitid, "image");
