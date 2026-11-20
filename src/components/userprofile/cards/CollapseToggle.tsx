"use client";

import React, { useEffect, useState } from "react";
import { Button } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

/**
 * Open/closed state for a profile dashboard section. The section's Card header
 * always stays rendered (so `#id` anchors still scroll to it); only the body is
 * hidden. A section also opens itself when the URL hash targets it
 * (e.g. /profile#reports_section), so deep links never land on a closed card.
 */
export function useCollapsible(id: string, defaultOpen: boolean) {
  // null = no explicit choice yet, so `defaultOpen` (which may change once the
  // profile loads) decides; a user click or a hash deep link is an explicit
  // choice and wins from then on.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? defaultOpen;

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${id}`) setChoice(true);
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    window.addEventListener("popstate", openIfTargeted);
    return () => {
      window.removeEventListener("hashchange", openIfTargeted);
      window.removeEventListener("popstate", openIfTargeted);
    };
  }, [id]);

  return { open, toggle: () => setChoice(!open) };
}

/** Compact Expand / Collapse button for a Card header (`extra` slot). */
export default function CollapseToggle({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  /** Section name, for the accessible label. */
  label: string;
}) {
  return (
    <Button
      type="text"
      size="small"
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      icon={open ? <UpOutlined /> : <DownOutlined />}
      onClick={onToggle}
      className="font-semibold text-neutral-500"
    >
      {open ? "Collapse" : "Expand"}
    </Button>
  );
}
