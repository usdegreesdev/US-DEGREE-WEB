"use client";

import CollapseToggle, { useCollapsible } from "./CollapseToggle";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Avatar,
  Button,
  Segmented,
  Empty,
  Row,
  Col,
  Space,
  Spin,
  message,
} from "antd";
import {
  GlobalOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  HeartFilled,
} from "@ant-design/icons";
import {
  fetchSavedColleges,
  unsaveCollege,
  authedFetch,
  SavedCollege,
} from "../../../lib/auth/api";
import {
  SAVED_EVENT,
  reloadSaved,
  applyProgramCache,
  forgetProgramInfo,
  MAX_SAVED,
  type SavedChangeDetail,
} from "../../search/useSavedColleges";
import { formatPercent } from "@/lib/fieldScale";

interface SavedCollegesSectionProps {
  view: "Grid" | "List";
  onViewChange: (view: "Grid" | "List") => void;
}

// Formats the Average Annual Cost of Attendance shown on each saved card.
function formatTuition(value: SavedCollege["tuitionFee"]): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n)
    ? String(value)
    : `$${Math.round(n).toLocaleString()}/yr`;
}

/**
 * Replace each saved card's cost figure with the Average Annual Cost of
 * Attendance (sticker_price_by_api) from GET /tuition/:unitid — the same value
 * the College Matches section and the Tuition & Costs tab show. Falls back to
 * whatever the saved record already carried when the lookup has no sticker
 * price. Stored back on `tuitionFee` since that's the card's cost field.
 */
async function enrichWithAnnualCost(
  list: SavedCollege[],
): Promise<SavedCollege[]> {
  if (list.length === 0) return list;

  const fills = new Map<string, number>();
  await Promise.all(
    list.map(async (c) => {
      try {
        const res = await authedFetch(`/tuition/${c.unitid}`);
        if (!res.ok) return;
        const data = await res.json();
        const sticker = data?.tuition?.sticker_price_by_api;
        const n = sticker == null ? NaN : Number(sticker);
        if (!Number.isNaN(n)) fills.set(String(c.unitid), n);
      } catch {
        // Best-effort — keep the record's existing cost if the lookup fails.
      }
    }),
  );

  if (fills.size === 0) return list;
  return list.map((c) =>
    fills.has(String(c.unitid))
      ? { ...c, tuitionFee: fills.get(String(c.unitid))! }
      : c,
  );
}

function formatRate(value: SavedCollege["acceptanceRate"]): string {
  // admissions.admission_rate is a 0–1 fraction (scale from lib/fieldScale).
  return formatPercent("admissions.admission_rate", value, 1);
}

// Builds the /university/:id href, prefilling the program/credential query
// params when this save carries them (see UniversityHero/ResultCard/
// CollegeMatchesSection) so the details page resolves the same program
// instead of just the school's default listing.
function buildDetailsHref(uni: SavedCollege): string {
  if (!uni.cipCode) return `/university/${uni.unitid}`;
  const params = new URLSearchParams({ cip: uni.cipCode });
  if (uni.programName) params.set("degree", uni.programName);
  if (uni.credentialTitle) params.set("credentialTitle", uni.credentialTitle);
  return `/university/${uni.unitid}?${params.toString()}`;
}

export default function SavedCollegesSection({
  view,
  onViewChange,
}: SavedCollegesSectionProps) {
  const router = useRouter();
  const { open, toggle } = useCollapsible("saved_colleges_section", false);
  const [colleges, setColleges] = useState<SavedCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  // Navigate to the college's overview page. The route is a server component
  // that fetches its own data, so there's a beat between click and the new
  // page painting — show a per-card loading state for that window instead of
  // leaving the button looking unresponsive.
  const handleViewDetails = (uni: SavedCollege) => {
    setNavigatingId(uni.unitid);
    router.push(buildDetailsHref(uni));
  };

  const load = useCallback(async () => {
    try {
      const list = applyProgramCache(await fetchSavedColleges());
      setColleges(list); // paint immediately
      const enriched = await enrichWithAnnualCost(list);
      if (enriched !== list) setColleges(enriched);
    } catch (err) {
      console.error("Failed to load saved colleges:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = applyProgramCache(await fetchSavedColleges());
        if (active) setColleges(list);
        const enriched = await enrichWithAnnualCost(list);
        if (active && enriched !== list) setColleges(enriched);
      } catch (err) {
        console.error("Failed to load saved colleges:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    // Stay in sync when a card elsewhere toggles save state this session. When
    // the event carries a detail payload we update in place for an instant,
    // delay-free result; otherwise we fall back to a full reload.
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SavedChangeDetail | undefined>).detail;
      if (detail?.action === "added") {
        const rec = detail.record;
        setColleges((prev) =>
          prev.some((c) => String(c.unitid) === String(rec.unitid))
            ? prev
            : [rec, ...prev],
        );
      } else if (detail?.action === "removed") {
        setColleges((prev) =>
          prev.filter((c) => String(c.unitid) !== String(detail.unitid)),
        );
      } else {
        load();
      }
    };
    window.addEventListener(SAVED_EVENT, handler);
    return () => {
      active = false;
      window.removeEventListener(SAVED_EVENT, handler);
    };
  }, [load]);

  const handleRemove = async (unitid: string, name: string) => {
    setRemoving(unitid);
    try {
      await unsaveCollege(unitid);
      forgetProgramInfo(unitid);
      setColleges((prev) =>
        prev.filter((c) => String(c.unitid) !== String(unitid)),
      );
      await reloadSaved(); // keep the search-card store in sync
      message.success(`${name} removed from your saved list.`);
    } catch (err) {
      console.error("Failed to remove saved college:", err);
      message.error("Could not remove this college. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card
      id="saved_colleges_section"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 gap-2">
          <Space>
            <HeartFilled className="text-red-500" />
            <span className="font-bold">
              Saved Colleges ({colleges.length}/{MAX_SAVED})
            </span>
            {/* {colleges.length >= MAX_SAVED && (
              <span className="text-xs font-semibold text-amber-600">
                Limit reached
              </span>
            )} */}
          </Space>

          {/* Grid/List segment switch */}
          <Segmented
            options={[
              { label: "Grid", value: "Grid", icon: <AppstoreOutlined /> },
              { label: "List", value: "List", icon: <UnorderedListOutlined /> },
            ]}
            value={view}
            onChange={(val: string) => onViewChange(val as "Grid" | "List")}
          />
        </div>
      }
      extra={<CollapseToggle open={open} onToggle={toggle} label="Saved Colleges" />}
      styles={{ body: open ? undefined : { display: "none" } }}
      variant="borderless"
      className="shadow-md rounded-2xl border border-neutral-100"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : colleges.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-sm font-semibold text-neutral-500">
              No saved colleges yet.
            </span>
          }
        />
      ) : view === "Grid" ? (
        /* Grid View mode: 3 cards per row on sm+ screens, single
           column on mobile. Capped to MAX_SAVED
           entries, so once the list is full it scrolls instead of growing
           the page indefinitely — height scales down on smaller screens. */
        <Row
          gutter={[12, 12]}
          className="max-h-[70vh] sm:max-h-[560px] overflow-y-auto pr-1 -mr-1"
        >
          {colleges.map((uni) => {
            return (
              <Col xs={24} sm={8} key={uni.unitid}>
                <Card
                  hoverable
                  variant="outlined"
                  className="overflow-hidden rounded-xl h-full border-neutral-150 shadow-xs"
                  styles={{ body: { padding: "10px 12px" } }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-sm font-extrabold text-neutral-800 tracking-tight leading-snug truncate"
                        title={uni.name}
                      >
                        {uni.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 flex items-center gap-1 font-medium truncate">
                        <GlobalOutlined />
                        {uni.location}
                      </p>
                    </div>
                    <Button
                      danger
                      type="text"
                      size="small"
                      aria-label={`Remove ${uni.name}`}
                      loading={removing === String(uni.unitid)}
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(uni.unitid, uni.name)}
                      className="-mr-1 -mt-0.5 shrink-0"
                    />
                  </div>

                  {uni.programName && (
                    <p
                      className="text-xs text-neutral-500 mt-1 font-semibold truncate"
                      title={uni.programName}
                    >
                      {uni.programName}
                      {uni.credentialTitle && (
                        <span className="text-neutral-400 font-medium">
                          {" "}
                          &middot; {uni.credentialTitle}
                        </span>
                      )}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-2 text-xs">
                    <span className="text-neutral-400">
                     Average Cost{" "}
                      <b className="font-semibold text-neutral-700">
                        {formatTuition(uni.tuitionFee)}
                      </b>
                    </span>
                    <span className="text-neutral-400">
                      Acceptence{" "}
                      <b className="font-semibold text-neutral-700">
                        {formatRate(uni.acceptanceRate)}
                      </b>
                    </span>
                  </div>

                  <Button
                    type="primary"
                    ghost
                    size="small"
                    block
                    loading={navigatingId === String(uni.unitid)}
                    onClick={() => handleViewDetails(uni)}
                    className="mt-2"
                    style={{ borderRadius: "6px" }}
                  >
                    View details
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* List View mode — plain rows (antd's List component is deprecated).
           Same scroll cap as the grid view once the saved list is full. */
        <div className="flex flex-col max-h-[70vh] sm:max-h-[560px] overflow-y-auto pr-1 -mr-1">
          {colleges.map((uni) => {
            return (
              <div
                key={uni.unitid}
                className="flex items-center gap-3 py-2 px-3 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 transition-colors"
              >
                <Avatar
                  size="small"
                  style={{ backgroundColor: "#1890ff", fontWeight: "bold" }}
                  className="shrink-0"
                >
                  {uni.name.substring(0, 2)}
                </Avatar>

                <div className="min-w-0 flex-1">
                  <span
                    className="font-extrabold text-sm text-neutral-800 block truncate"
                    title={uni.name}
                  >
                    {uni.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <GlobalOutlined />
                      {uni.location}
                    </span>
                    {uni.programName && (
                      <>
                        <span>•</span>
                        <span className="font-semibold">
                          {uni.programName}
                          {uni.credentialTitle && (
                            <span className="text-neutral-400 font-medium">
                              {" "}
                              &middot; {uni.credentialTitle}
                            </span>
                          )}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      Cost{" "}
                      <b className="text-neutral-700">
                        {formatTuition(uni.tuitionFee)}
                      </b>
                    </span>
                    <span>•</span>
                    <span>
                      Accept{" "}
                      <b className="text-neutral-700">
                        {formatRate(uni.acceptanceRate)}
                      </b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <Button
                    type="link"
                    size="small"
                    loading={navigatingId === String(uni.unitid)}
                    onClick={() => handleViewDetails(uni)}
                    style={{ fontWeight: 600 }}
                  >
                    View details
                  </Button>
                  <Button
                    type="text"
                    danger
                    size="small"
                    aria-label={`Remove ${uni.name}`}
                    title="Remove from list"
                    loading={removing === String(uni.unitid)}
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(uni.unitid, uni.name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
