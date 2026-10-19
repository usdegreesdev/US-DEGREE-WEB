"use client";

import React, { useEffect, useState } from "react";
import { Card, Table, Button, Empty, Alert, Space } from "antd";
import { SendOutlined, LinkOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { fetchApplyClicks, ApplyClick } from "@/lib/auth/api";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

const PAGE_SIZE = 10;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The apply-click rows are raw analytics records, so any column can be null
// (a program-less "Apply Now" carries no cip_code/degree, for example).
function orDash(value: string | null | undefined) {
  return value && value.trim() !== "" ? (
    value
  ) : (
    <span className="text-neutral-300">—</span>
  );
}

/**
 * "Applied List" — the current user's Apply Now click history from
 * usd_apply_clicks. Sits beside Saved Colleges in the profile dashboard.
 */
export default function AppliedListSection() {
  const router = useRouter();
  const [clicks, setClicks] = useState<ApplyClick[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchApplyClicks(page, PAGE_SIZE);
        if (!active) return;
        setClicks(data.clicks);
        setTotal(data.total);
      } catch (err) {
        console.error("Failed to load applied list:", err);
        if (active)
          setError("Could not load your applied list. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, retryToken]);

  const columns: ColumnsType<ApplyClick> = [
    {
      title: "University Name",
      dataIndex: "universityName",
      key: "universityName",
      width: 220,
      render: (value: string | null) => (
        <span className="font-semibold text-neutral-700">{orDash(value)}</span>
      ),
    },
    {
      title: "Program Name",
      dataIndex: "degree",
      key: "degree",
      width: 220,
      render: (value: string | null) => (
        <span className="font-semibold text-neutral-700">{orDash(value)}</span>
      ),
    },
    {
      title: "Degree Level",
      dataIndex: "credentialTitle",
      key: "credentialTitle",
      width: 150,
      render: (value: string | null) => (
        <span className="text-neutral-600">{orDash(value)}</span>
      ),
    },
    {
      title: "Website",
      key: "schoolUrl",
      width: 120,
      render: (_value, record) => {
        const safeUrl = toSafeHttpUrl(record.schoolUrl);
        return (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<LinkOutlined />}
            disabled={!safeUrl}
            href={safeUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold rounded-lg"
          >
            Visit
          </Button>
        );
      },
    },
    {
      title: "Visited On",
      dataIndex: "clickedAt",
      key: "clickedAt",
      width: 180,
      render: (value: string) => (
        <span className="whitespace-nowrap text-neutral-600">
          {formatDateTime(value)}
        </span>
      ),
    },
  ];

  return (
    <Card
      id="applied_list_section"
      title={
        <div className="flex items-center gap-2 py-1">
          <SendOutlined className="text-[#3F51B5]" />
          <span className="font-bold">Visited List ({total})</span>
        </div>
      }
      variant="borderless"
      className="shadow-md rounded-2xl border border-neutral-100 h-full"
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          title="Something went wrong"
          description={error}
          action={
            <Button
              size="small"
              danger
              onClick={() => setRetryToken((n) => n + 1)}
            >
              Retry
            </Button>
          }
        />
      ) : (
        <Table<ApplyClick>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={clicks}
          loading={loading}
          scroll={{ x: 1120 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-sm font-semibold text-neutral-500">
                    You haven&apos;t applied to any programs yet.
                  </span>
                }
              >
                <Space>
                  <Button
                    type="primary"
                    onClick={() => router.push("/search")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl"
                  >
                    Explore Programs
                  </Button>
                </Space>
              </Empty>
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            responsive: true,
          }}
        />
      )}
    </Card>
  );
}
