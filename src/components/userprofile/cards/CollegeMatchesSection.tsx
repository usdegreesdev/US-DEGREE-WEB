"use client";

import CollapseToggle, { useCollapsible } from "./CollapseToggle";

import React from "react";
import { formatPercentOrNotPublished } from "@/lib/university/outcomeFormat";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Row,
  Col,
  Space,
  Tag,
  Tooltip,
  Empty,
  Spin,
  message,
} from "antd";
import {
  GlobalOutlined,
  HeartOutlined,
  HeartFilled,
  SyncOutlined,
  CompassOutlined,
  ReadOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { CollegeMatch } from "../matchEngine";
import {
  toggleCompare as toggleCompareStore,
  useCompareEntryIds,
  MAX_COMPARE,
} from "../../compare/compareMatrixStore";
import { parseEntryId } from "../../compare/compareEntryIds";
import {
  toggleSaved,
  useSavedIds,
  reloadSaved,
  SavedLimitError,
} from "../../search/useSavedColleges";
import type { SavedCollege } from "../../../lib/auth/api";
import EarningsMethodBadge from "../../common/EarningsMethodBadge";
import { NOT_PUBLISHED } from "@/lib/notPublished";
import { notPublishedReason } from "@/lib/university/stickerPrice";

interface CollegeMatchesSectionProps {
  matches: CollegeMatch[];
  loading: boolean;
}

// Display helpers — render the backend value when present, otherwise "N/A".
const fmtPercent = (v: number | null) =>
  v === null ? "N/A" : `${v.toFixed(1)}%`;
const fmtMoney = (v: number | null) =>
  v === null ? "N/A" : `$${Math.round(v).toLocaleString()}`;

export default function CollegeMatchesSection({
  matches,
  loading,
}: CollegeMatchesSectionProps) {
  const router = useRouter();
  const { open, toggle } = useCollapsible("college_matches_section", true);

  // Selected-for-comparison entries, from the single shared matrix store. Kept
  // in sync with selections made anywhere (search cards, university page,
  // /compare page).
  const comparedEntryIds = useCompareEntryIds();
  const isCollegeCompared = (unitid: string) =>
    comparedEntryIds.some((e) => parseEntryId(e).unitid === String(unitid));

  // Saved-college set, from the same shared store the Saved Colleges grid reads.
  // Reading it here keeps the heart indicator in sync with saves made anywhere.
  const savedIds = useSavedIds();

  // Add/remove a matched college via the shared matrix store, which handles
  // the localStorage mirror, backend persistence, and the 5-entry cap.
  const toggleCompare = async (match: CollegeMatch) => {
    try {
      const hasCip = !!match.cipCode && match.cipCode !== "default";
      const result = await toggleCompareStore({
        unitid: match.id,
        cipCode: match.cipCode || "default",
        programName: hasCip ? match.programTitle || undefined : undefined,
        credentialLevel: hasCip
          ? (match.credentialLevel ?? undefined)
          : undefined,
        credentialTitle: hasCip ? match.degreeLevel || undefined : undefined,
        name: match.name,
        location: [match.city, match.state].filter(Boolean).join(", "),
        schoolType: match.isPrivate ? "Private" : "Public",
        schoolUrl: match.schoolUrl ?? undefined,
      });
      if (result === "removed") {
        message.info(`Removed ${match.name} from comparison.`);
      } else if (result === "added") {
        message.success(`Added ${match.name} to comparison.`);
      } else if (result === "full") {
        message.warning(
          `You can compare a maximum of ${MAX_COMPARE} programs simultaneously.`,
        );
      }
    } catch (err) {
      console.error("Failed to update comparison selection:", err);
      message.error("Could not update your comparison list. Please try again.");
    }
  };

  // Save/unsave a matched college via the shared store. The enriched record is
  // broadcast so the Saved Colleges grid shows (or drops) the card instantly,
  // and the same call persists to the backend (/saved-colleges).
  const toggleSave = async (match: CollegeMatch) => {
    const hasCip = !!match.cipCode && match.cipCode !== "default";
    const record: SavedCollege = {
      unitid: match.unitid,
      name: match.name,
      location:
        match.city && match.state
          ? `${match.city}, ${match.state}`
          : match.city || match.state || "",
      tuitionFee: match.tuition ?? match.costOfAttendance,
      acceptanceRate: match.acceptanceRate,
      createdAt: new Date().toISOString(),
      schoolUrl: match.schoolUrl,
      cipCode: hasCip ? match.cipCode : null,
      programName: hasCip ? match.programTitle || null : null,
      credentialLevel: hasCip ? (match.credentialLevel ?? null) : null,
      credentialTitle: hasCip ? match.degreeLevel || null : null,
    };
    try {
      const nowSaved = await toggleSaved(match.unitid, record);
      if (nowSaved) {
        message.success(`Saved ${match.name} to your colleges.`);
        // The save is now persisted — reconcile the Saved Colleges grid with the
        // backend-enriched record (school URL, acceptance rate) so "Visit
        // website" works immediately instead of only after a manual refresh.
        void reloadSaved();
      } else {
        message.info(`Removed ${match.name} from saved colleges.`);
      }
    } catch (err) {
      if (err instanceof SavedLimitError) {
        message.warning(err.message);
      } else {
        console.error("Failed to update saved colleges:", err);
        message.error("Could not update saved colleges. Please try again.");
      }
    }
  };

  // Open the college's full details page, mirroring the search ResultCard's
  // "View Full Details" link (route /university/:id with prefill query params).
  const goToDetails = (match: CollegeMatch) => {
    const params = new URLSearchParams({
      cip: match.cipCode || "default",
      name: match.name,
      city: match.city,
      state: match.state,
      degree: match.programTitle,
      type: match.isPrivate ? "Private" : "Public",
    });
    // Only pass figures we actually have: the details page prefers a URL value
    // over its own API data, so an "N/A" here would hide a real number there.
    if (match.acceptanceRate !== null)
      params.set("admissionRate", fmtPercent(match.acceptanceRate));
    if (match.inStateSticker?.published)
      params.set("tuition", fmtMoney(match.inStateSticker.total));
    if (match.medianSalary1yr !== null)
      params.set("avgSalary", fmtMoney(match.medianSalary1yr));
    router.push(`/university/${match.id}?${params.toString()}`);
  };

  return (
    <Card
      id="college_matches_section"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 gap-2">
          <Space>
            <CompassOutlined className="text-amber-500 text-lg" />
            <div>
              <span className="font-bold text-base block">
                My Intelligent College Matches
              </span>
              <span className="text-xs text-neutral-400 font-normal block">
                Matched to your target states and majors
              </span>
            </div>
          </Space>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-neutral-500 font-semibold tracking-wide uppercase">
              Realtime Engine active
            </span>
          </div>
        </div>
      }
      extra={<CollapseToggle open={open} onToggle={toggle} label="My Intelligent College Matches" />}
      styles={{ body: open ? undefined : { display: "none" } }}
      variant="borderless"
      className="shadow-md rounded-2xl border border-neutral-100 bg-linear-to-b from-white to-blue-50/10"
    >
      {/* Loading first paint */}
      {loading && matches.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : matches.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Add your target states and majors to see matched colleges."
        />
      ) : (
        <Row gutter={[16, 16]}>
          {matches.map((match) => {
            const isSaved = savedIds.includes(match.unitid);
            const isCompared = isCollegeCompared(match.id);
            const location =
              match.city && match.state
                ? `${match.city}, ${match.state}`
                : match.city || match.state || "";
            const sticker = match.inStateSticker;

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={match.id}>
                <Card
                  variant="outlined"
                  hoverable
                  className="rounded-2xl h-full overflow-hidden border-neutral-150 shadow-xs"
                  styles={{
                    body: {
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    },
                  }}
                >
                  {/* Header: name, location, ownership */}
                  <div className="px-4 pt-3.5 pb-3 bg-linear-to-br from-blue-50/80 to-white border-b border-neutral-100">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className="text-sm font-extrabold text-neutral-800 line-clamp-2 leading-snug flex-1 min-h-[2.5rem]"
                        title={match.name}
                      >
                        {match.name}
                      </h4>
                      <Tag
                        color={match.isPrivate ? "purple" : "blue"}
                        style={{ borderRadius: "6px", margin: 0 }}
                        className="text-[10px] font-bold uppercase tracking-wider shrink-0"
                      >
                        {match.isPrivate ? "Private" : "Public"}
                      </Tag>
                    </div>
                    {location && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5 font-medium">
                        <GlobalOutlined className="text-[#3b5bdb]" />
                        {location}
                      </p>
                    )}
                  </div>

                  <div className="px-4 py-3 flex-1 flex flex-col gap-3">
                    {/* Matched program + degree level */}
                    {(match.programTitle || match.degreeLevel) && (
                      <div className="flex flex-wrap gap-1.5">
                        {match.programTitle && (
                          <span className="inline-flex items-start gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
                            <ReadOutlined className="mt-0.5 shrink-0" />
                            <span className="break-words leading-snug">
                              {match.programTitle}
                            </span>
                          </span>
                        )}
                        {match.degreeLevel && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                            <TrophyOutlined className="shrink-0" />
                            {match.degreeLevel}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hero figure: in-state on-campus sticker price — the same
                        total the Tuition & Costs tab shows. */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/80 block">
                        In-State Sticker Price
                      </span>
                      {sticker === undefined ? (
                        <span className="text-sm font-semibold text-emerald-700/60">
                          Loading…
                        </span>
                      ) : sticker?.published ? (
                        <span className="text-xl font-extrabold text-emerald-700 leading-tight">
                          {fmtMoney(sticker.total)}
                          <span className="text-xs font-semibold text-emerald-700/70">
                            {" "}
                            /yr
                          </span>
                        </span>
                      ) : (
                        <Tooltip
                          title={notPublishedReason(sticker?.missing ?? [])}
                        >
                          <span className="text-sm font-semibold text-emerald-700/80 cursor-help">
                            {NOT_PUBLISHED}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {/* Secondary metrics */}
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs m-0">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
                          Acceptance
                        </dt>
                        <dd className="m-0 font-bold text-neutral-800">
                          {fmtPercent(match.acceptanceRate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
                          Graduation
                        </dt>
                        <dd className="m-0 font-bold text-neutral-800">
                          {fmtPercent(match.graduationRate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
                          1st-yr retention
                        </dt>
                        <dd className="m-0 font-bold text-neutral-800">
                          {formatPercentOrNotPublished(match.retentionRate, 1)}
                        </dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
                          1-yr salary
                          {match.medianSalary1yrMethod && (
                            <EarningsMethodBadge
                              method={match.medianSalary1yrMethod}
                            />
                          )}
                        </dt>
                        <dd className="m-0 font-bold text-neutral-800">
                          {fmtMoney(match.medianSalary1yr)}
                          {match.medianSalary1yr !== null && "/yr"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-neutral-100 flex items-center gap-2">
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      onClick={() => goToDetails(match)}
                      className="flex-1 font-semibold"
                      style={{ borderRadius: "6px" }}
                    >
                      View details
                    </Button>
                    <Tooltip
                      title={
                        isCompared
                          ? "Remove from comparison"
                          : "Add to comparison block"
                      }
                    >
                      <Button
                        type={isCompared ? "primary" : "default"}
                        ghost={isCompared}
                        icon={<SyncOutlined spin={isCompared} />}
                        aria-label={
                          isCompared
                            ? "Remove from comparison"
                            : "Add to comparison"
                        }
                        onClick={() => toggleCompare(match)}
                        className={
                          isCompared ? "" : "border-neutral-200 text-neutral-400"
                        }
                        size="small"
                        shape="circle"
                      />
                    </Tooltip>
                    <Tooltip
                      title={
                        isSaved
                          ? "Already in saved colleges"
                          : "Save this college"
                      }
                    >
                      <Button
                        danger={isSaved}
                        icon={isSaved ? <HeartFilled /> : <HeartOutlined />}
                        aria-label={isSaved ? "Saved" : "Save college"}
                        onClick={() => toggleSave(match)}
                        className={
                          isSaved ? "" : "border-neutral-200 text-neutral-400"
                        }
                        size="small"
                        shape="circle"
                      />
                    </Tooltip>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Card>
  );
}
