"use client";

import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Alert,
  Button,
  Space,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { DEACTIVATION_REASONS } from "../../../data/profileOptions";
import type { DeactivationPayload } from "../../../lib/auth/api";

interface DeactivateAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: DeactivationPayload) => void | Promise<void>;
}

export default function DeactivateAccountModal({
  open,
  onClose,
  onConfirm,
}: DeactivateAccountModalProps) {
  const [form] = Form.useForm();
  const [understandDeactivateCheckbox, setUnderstandDeactivateCheckbox] =
    useState(false);
  const [deactivateReasonCode, setDeactivateReasonCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetLocalState = () => {
    setUnderstandDeactivateCheckbox(false);
    setDeactivateReasonCode("");
    form.resetFields();
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetLocalState();
    onClose();
  };

  const handleConfirm = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      // Invalid/missing fields are surfaced inline by the form.
      return;
    }

    const selected = DEACTIVATION_REASONS.find(
      (r) => r.value === values.deactivationReason,
    );

    const payload: DeactivationPayload = {
      reason_code: values.deactivationReason,
      reason_label: selected?.label ?? values.deactivationReason,
      other_reason:
        values.deactivationReason === "5" ? values.otherReason : undefined,
      improvement_feedback: values.improvement || undefined,
      acknowledged: true,
    };

    setIsSubmitting(true);
    try {
      await onConfirm(payload);
      resetLocalState();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined className="text-red-500" />
          <span className="font-extrabold text-red-600">
            Close Account & Erase Records
          </span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      mask={{ closable: !isSubmitting }}
      closable={!isSubmitting}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="pt-4 space-y-4">
        <Alert
          title="This decision triggers irreversible data erasure. There is no grace period for restoration."
          type="warning"
          showIcon
          className="text-xs rounded-xl"
        />

        <Form.Item
          name="deactivationReason"
          label="Required: Please let us know why you are choosing to deactivate"
          rules={[
            { required: true, message: "Please select a deactivation reason" },
          ]}
        >
          <Select
            options={DEACTIVATION_REASONS}
            placeholder="Select a reason"
            onChange={(val: string) => setDeactivateReasonCode(val)}
          />
        </Form.Item>

        {deactivateReasonCode === "5" && (
          <Form.Item
            name="otherReason"
            label="Describe other reasons"
            rules={[
              {
                required: true,
                message: "Please enter details for validation",
              },
            ]}
          >
            <Input.TextArea placeholder="Type reason detail here..." rows={3} />
          </Form.Item>
        )}

        <Form.Item
          name="improvement"
          label="What could we have improved? (Optional)"
        >
          <Input.TextArea
            placeholder="Feedbacks helps us build better unbiased tools..."
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="understandConfirm"
          valuePropName="checked"
          rules={[
            {
              validator: (_: unknown, value: unknown) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(
                        "You must confirm awareness checkbox to proceed",
                      ),
                    ),
            },
          ]}
        >
          <Checkbox
            checked={understandDeactivateCheckbox}
            onChange={(e: { target: { checked: boolean } }) =>
              setUnderstandDeactivateCheckbox(e.target.checked)
            }
            className="text-xs text-neutral-600 leading-snug"
          >
            I understand that my account settings, lists, and matches
            calculations may be permanently removed.
          </Checkbox>
        </Form.Item>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            danger
            type="primary"
            loading={isSubmitting}
            disabled={!understandDeactivateCheckbox}
            onClick={handleConfirm}
            style={{ borderRadius: "8px" }}
          >
            Deactivate My Account
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
