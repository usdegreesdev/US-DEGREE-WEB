"use client";

import { Dropdown, Avatar } from "antd";
import type { MenuProps } from "antd";

import ProBadge from "@/components/common/ProBadge";

interface UserMenuProps {
  items: MenuProps["items"];
  avatarInitial: string;
  firstName: string;
  isPro?: boolean;
}

export default function UserMenu({
  items,
  avatarInitial,
  firstName,
  isPro = false,
}: UserMenuProps) {
  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <button
        type="button"
        className="hidden sm:inline-flex items-center gap-2.5 rounded-full border border-slate-200 hover:bg-slate-50 pl-2 pr-4 py-1.5 transition-colors cursor-pointer"
      >
        <Avatar
          size={32}
          style={{
            backgroundColor: "#3b5bdb",
            fontWeight: 600,
            ...(isPro && {
              boxShadow: "0 0 0 2px #fff, 0 0 0 4px var(--color-pro-ring)",
            }),
          }}
        >
          {avatarInitial}
        </Avatar>
        <span className="text-[15px] font-semibold text-slate-600">
          Hi, {firstName}
        </span>
        {isPro && <ProBadge />}
      </button>
    </Dropdown>
  );
}
