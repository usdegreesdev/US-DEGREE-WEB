"use client";

import React, { useEffect, useState } from "react";
import { Card, Table, Tag, Button, Empty, Alert, Space, message } from "antd";
import { FileTextOutlined, DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import {
  fetchReports,
  fetchReport,
  emailReport,
  ReportSummary,
} from "@/lib/auth/api";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

const PAGE_SIZE = 10;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Matches the filename the backend serves via Content-Disposition on
// GET /report/:reportId/download (see report.ts: `report-${reportId}.pdf`).
function pdfNameFor(report: ReportSummary): string {
  return `report-${report.reportId}.pdf`;
}

export default function MyReportsSection() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReports(page, PAGE_SIZE);
        setReports(data.reports);
        setTotal(data.total);
      } catch (err) {
        console.error("Failed to load report history:", err);
        setError("Could not load your reports. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, retryToken]);

  // Signed download URLs expire in 10-15 minutes, so always fetch a fresh one
  // right before opening it rather than trusting whatever the list returned.
  const handleDownload = async (reportId: string) => {
    setDownloadingId(reportId);
    try {
      const detail = await fetchReport(reportId);
      const safeUrl = toSafeHttpUrl(detail.downloadUrl);
      if (!safeUrl) {
        message.error("Could not download this report. Please try again.");
        return;
      }
      const win = window.open(safeUrl, "_blank", "noopener,noreferrer");
      if (!win) message.error("Please allow pop-ups to download the report.");
    } catch (err) {
      console.error("Failed to get download link:", err);
      message.error("Could not download this report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  // NOTE (backend): requires POST /report/:reportId/email — the backend
  // should look up the requesting user's registered email, generate/reuse a
  // signed download link the same way GET /report/:reportId does, and send a
  // message templated with the report name (`report-${reportId}.pdf`), its
  // createdAt, and the compared college names. No such endpoint exists yet;
  // emailReport() in lib/auth/api.ts assumes this contract.
  const handleEmailReport = async (report: ReportSummary) => {
    setEmailingId(report.reportId);
    try {
      await emailReport(report.reportId);
      message.success("Download link sent to your registered email.");
    } catch (err) {
      console.error("Failed to email report:", err);
      message.error("Could not email this report. Please try again.");
    } finally {
      setEmailingId(null);
    }
  };

  const columns: ColumnsType<ReportSummary> = [
    {
      title: "No.",
      key: "index",
      width: 56,
      render: (_value, _record, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "Report",
      key: "report",
      width: 170,
      render: (_value, record) => (
        <span className="font-semibold text-neutral-700 break-all">
          {pdfNameFor(record)}
        </span>
      ),
    },

    {
      title: "Compared Colleges",
      key: "colleges",
      width: 260,
      render: (_value, record) => (
        <div className="flex flex-wrap gap-1.5">
          {record.colleges.map((college, index) => (
            <Tag
              key={`${college.unitid}-${index}`}
              className="rounded-full font-medium text-xs px-2.5 py-0.5"
            >
              {college.name}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value: string) => (
        <span className="whitespace-nowrap">{formatDateTime(value)}</span>
      ),
    },
    {
      title: "",
      key: "download",
      width: 160,
      render: (_value, record) => (
        <div className="flex flex-col gap-2 w-full">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloadingId === record.reportId}
            onClick={() => handleDownload(record.reportId)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl whitespace-nowrap w-full"
          >
            Download
          </Button>
          <Button
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icons/icons8-sent.gif"
                alt=""
                className="w-4 h-4 object-contain"
              />
            }
            loading={emailingId === record.reportId}
            onClick={() => handleEmailReport(record)}
            className="font-bold rounded-xl whitespace-nowrap w-full border-blue-200 text-blue-600 hover:!text-blue-700 hover:!border-blue-400"
          >
            Send to Mail
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      id="reports_section"
      title={
        <div className="flex items-center gap-2 py-1">
          <FileTextOutlined className="text-[#3F51B5]" />
          <span className="font-bold">My Reports</span>
        </div>
      }
      variant="borderless"
      className="shadow-md rounded-2xl border border-neutral-100"
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
        <Table<ReportSummary>
          rowKey="reportId"
          columns={columns}
          dataSource={reports}
          loading={loading}
          scroll={{ x: 850 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-sm font-semibold text-neutral-500">
                    No reports have generated yet.
                  </span>
                }
              >
                <Space>
                  <Button
                    type="primary"
                    onClick={() => router.push("/compare")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl"
                  >
                    Generate Your First Report
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
