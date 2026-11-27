"use client";

import CollapseToggle, { useCollapsible } from "./CollapseToggle";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar, Button, Empty, Space, Spin, message } from "antd";
import { GlobalOutlined, DeleteOutlined, HeartFilled } from "@ant-design/icons";
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
 * Attendance (sticker_price_by_api) from GET /tuition/:unitid.
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

        if (!Number.isNaN(n)) {
          fills.set(String(c.unitid), n);
        }
      } catch {
        // Best-effort — retain the existing cost if lookup fails.
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
  return formatPercent("admissions.admission_rate", value, 1);
}

// Builds the university details URL with program/credential query params.
function buildDetailsHref(uni: SavedCollege): string {
  if (!uni.cipCode) return `/university/${uni.unitid}`;

  const params = new URLSearchParams({ cip: uni.cipCode });

  if (uni.programName) params.set("degree", uni.programName);
  if (uni.credentialTitle) {
    params.set("credentialTitle", uni.credentialTitle);
  }

  return `/university/${uni.unitid}?${params.toString()}`;
}

export default function SavedCollegesSection() {
  const router = useRouter();

  const { open, toggle } = useCollapsible("saved_colleges_section", false);

  const [colleges, setColleges] = useState<SavedCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  // Navigate to the college details page.
  const handleViewDetails = (uni: SavedCollege) => {
    setNavigatingId(String(uni.unitid));
    router.push(buildDetailsHref(uni));
  };

  const load = useCallback(async () => {
    try {
      const list = applyProgramCache(await fetchSavedColleges());

      setColleges(list);

      const enriched = await enrichWithAnnualCost(list);

      if (enriched !== list) {
        setColleges(enriched);
      }
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

        if (active) {
          setColleges(list);
        }

        const enriched = await enrichWithAnnualCost(list);

        if (active && enriched !== list) {
          setColleges(enriched);
        }
      } catch (err) {
        console.error("Failed to load saved colleges:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    // Keep saved colleges synchronized with changes elsewhere.
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

  // Remove a college from saved list.
  const handleRemove = async (unitid: string, name: string) => {
    setRemoving(unitid);

    try {
      await unsaveCollege(unitid);

      forgetProgramInfo(unitid);

      setColleges((prev) =>
        prev.filter((c) => String(c.unitid) !== String(unitid)),
      );

      await reloadSaved();

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
        <Space>
          <HeartFilled className="text-red-500" />

          <span className="font-bold">
            Saved Colleges ({colleges.length}/{MAX_SAVED})
          </span>
        </Space>
      }
      extra={
        <CollapseToggle open={open} onToggle={toggle} label="Saved Colleges" />
      }
      styles={{
        body: open ? undefined : { display: "none" },
      }}
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
      ) : (
        // List View — permanent layout.
        <div className="flex flex-col max-h-[70vh] sm:max-h-[560px] overflow-y-auto pr-1 -mr-1">
          {colleges.map((uni) => (
            <div
              key={uni.unitid}
              className="flex items-center gap-3 py-2 px-3 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 transition-colors"
            >
              <Avatar
                size="small"
                style={{
                  backgroundColor: "#1890ff",
                  fontWeight: "bold",
                }}
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
          ))}
        </div>
      )}
    </Card>
  );
}
