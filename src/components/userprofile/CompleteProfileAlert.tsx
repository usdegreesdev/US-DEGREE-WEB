/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

"use client";

import React from "react";
import { Alert, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

interface CompleteProfileAlertProps {
  onOpenEdit: () => void;
}

/**
 * A beginner-friendly prompt banner that invites new users to complete their profile.
 */
export default function CompleteProfileAlert({
  onOpenEdit,
}: CompleteProfileAlertProps) {
  return (
    <Alert
      type="info"
      closable
      className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-3.5 sm:p-5 shadow-xs mb-6 sm:mb-8"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
          <div className="flex-1 min-w-0 pr-0 sm:pr-2">
            <span className="block text-sm sm:text-base font-bold text-slate-900 leading-snug">
              Complete your profile to get personalized recommendations
            </span>
            <span className="block text-xs sm:text-sm text-slate-600 font-normal mt-1 leading-relaxed max-w-2xl">
              Add your academic details and preferences so we can match you with
              the right colleges.
            </span>
          </div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onOpenEdit}
            className="w-full sm:w-auto shrink-0 h-10 sm:h-9 font-semibold text-xs sm:text-sm rounded-xl shadow-xs"
          >
            Complete your profile
          </Button>
        </div>
      }
    />
  );
}
