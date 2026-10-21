"use client";

import React, { useRef, useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Space,
  Steps,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { StudentProfile } from "../../../types/profile";
import { PROGRAM_OPTIONS } from "../../../data/profileOptions";
import { useStates, useDegreeLevels } from "../../../lib/referenceData";

type ProfileFormValues = Omit<StudentProfile, "createdDate" | "lastLogin">;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSave: (values: ProfileFormValues) => void | Promise<void>;
}

// The three steps and the field names each one is responsible for. Field
// names drive both per-step validation (form.validateFields) and the Steps
// indicator labels.
const STEP_FIELDS: string[][] = [
  ["fullName", "email", "phone", "address"],
  ["highSchoolName", "graduationYear", "gpa", "satScore", "actScore"],
  [
    "preferredStates",
    "preferredPrograms",
    "preferredDegreeLevel",
    "preferredCollegeType",
  ],
];

const MIN_GRADUATION_YEAR = 2000;
const GRADUATION_YEAR_MESSAGE = "Please enter a valid graduation year.";

// Whole number >= 2000; no upper bound so future graduation years are allowed.
const isValidGraduationYear = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= MIN_GRADUATION_YEAR;

const STEP_TITLES = [
  "Student Profile Information",
  "High School & Test Performance",
  "Match Preferences Board",
];

export default function EditProfileModal({
  open,
  onClose,
  profile,
  onSave,
}: EditProfileModalProps) {
  const [form] = Form.useForm();
  const graduationYear = Form.useWatch("graduationYear", form);
  const canDecrementYear =
    typeof graduationYear === "number" && graduationYear > MIN_GRADUATION_YEAR;
  const [currentStep, setCurrentStep] = useState(0);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastStepIndex = STEP_FIELDS.length - 1;

  // Timestamp of the last step change. The "Next Step" and "Save Changes"
  // buttons occupy the same on-screen spot, so a fast double-click can land
  // its second click on "Save Changes" the instant it swaps in — submitting
  // the form right after advancing to the final step. Ignore a submit that
  // fires immediately after a step change; it's almost certainly that ghost
  // click, not a deliberate save.
  const lastStepChangeAt = useRef(0);

  // Canonical reference data sourced from the backend (never hardcoded).
  const { states, loading: statesLoading } = useStates();
  const { degreeLevels, loading: degreeLevelsLoading } = useDegreeLevels();

  // No manual reset-to-step-1 needed on close: the Modal's `destroyOnHidden`
  // unmounts this component when it closes, so `currentStep` naturally starts
  // back at 0 next time it opens. Resetting it here instead would flash step
  // 1 on screen while the close animation is still playing.
  const handleClose = () => {
    if (saving) return; // don't let the mask/X-button close mid-save
    onClose();
  };

  const handleNext = async () => {
    // Guard against a double-click (or a re-fired click before state settles)
    // advancing currentStep past the last index, which would leave every
    // step's content hidden — the modal body looks like it "disappeared".
    if (validating) return;
    setValidating(true);
    try {
      await form.validateFields(STEP_FIELDS[currentStep]);
      lastStepChangeAt.current = Date.now();
      setCurrentStep((step) => Math.min(step + 1, lastStepIndex));
    } catch {
      // Validation failed — antd already shows inline errors on the offending
      // fields, so there's nothing else to do here. Swallowing this avoids an
      // unhandled promise rejection (which would otherwise surface as a
      // full-screen dev-mode error overlay).
    } finally {
      setValidating(false);
    }
  };

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const handleFinish = async (values: ProfileFormValues) => {
    // Ignore a submit that fires within the ghost-click window right after
    // the button swapped from "Next Step" to "Save Changes" (see the ref's
    // comment above).
    if (Date.now() - lastStepChangeAt.current < 400) return;
    if (saving) return;
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined className="text-blue-500" />
          <span className="font-extrabold">
            Edit Profile & Academic Records
          </span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnHidden
      className="rounded-3xl overflow-hidden"
    >
      <Steps
        current={currentStep}
        size="small"
        className="pt-4"
        items={STEP_TITLES.map((title) => ({ title }))}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={profile}
        className="pt-6"
      >
        {/* Step 1: Student Profile Information */}
        <div style={{ display: currentStep === 0 ? "block" : "none" }}>
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            Contact & Location Settings
          </h3>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[
                  { required: true, message: "Please input your full name" },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="e.g. Alex" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Primary Email Address"
                extra="This is the email linked to your account. To update it, use the 'Change Email Address' option in Security Settings."
              >
                <Input prefix={<MailOutlined />} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Contact Phone (Optional)">
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="e.g. +1 (555) 000-0000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="address"
                label="Mailing/Postal address (Optional)"
              >
                <Input prefix={<HomeOutlined />} placeholder="City, State" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Step 2: High School & Test Performance */}
        <div style={{ display: currentStep === 1 ? "block" : "none" }}>
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            Secondary High School Information
          </h3>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="highSchoolName"
                label="High School Name"
                rules={[
                  { required: true, message: "High school name is required" },
                ]}
              >
                <Input placeholder="Enter Your High School" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item
                name="graduationYear"
                label="Graduation Year"
                validateTrigger={["onChange", "onBlur"]}
                rules={[
                  {
                    validator: (_, value) =>
                      isValidGraduationYear(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(GRADUATION_YEAR_MESSAGE)),
                  },
                ]}
              >
                {/* `min` is deliberately not set: antd would clamp typed values
                    (e.g. -1 -> 2000) and hide the validation error. The down
                    arrow is disabled via CSS at the minimum / when empty, and
                    the validator enforces the range. */}
                <InputNumber
                  step={1}
                  precision={0}
                  placeholder="e.g. 2026"
                  className={`w-full ${
                    canDecrementYear
                      ? ""
                      : "[&_.ant-input-number-action-down]:pointer-events-none [&_.ant-input-number-action-down]:opacity-40"
                  }`}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item
                name="gpa"
                label="Cumulative GPA"
                rules={[
                  { required: true, message: "GPA is required" },
                  {
                    type: "number",
                    min: 0,
                    max: 4,
                    message: "GPA must be between 0.0 and 4.0",
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  max={4}
                  step={0.01}
                  precision={2}
                  placeholder="e.g. 3.75"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-6 mb-3">
            Standard Exam Results
          </h3>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="satScore"
                label="SAT Score"
                rules={[
                  { required: true, message: "SAT Score is required" },
                  {
                    type: "number",
                    min: 400,
                    max: 1600,
                    message: "Enter a SAT score between 400 and 1600",
                  },
                ]}
              >
                <InputNumber
                  min={400}
                  max={1600}
                  step={10}
                  precision={0}
                  placeholder="e.g. 1350"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="actScore" label="ACT Composite (Optional)">
                <InputNumber
                  min={1}
                  max={36}
                  precision={0}
                  placeholder="Not taken"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Step 3: Match Preferences Board */}
        <div style={{ display: currentStep === 2 ? "block" : "none" }}>
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            Match preferences board details
          </h3>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="preferredStates"
                label="Target States (Multiple)"
              >
                {/* Options from GET /states: show full name, store 2-letter code. */}
                <Select
                  mode="multiple"
                  placeholder="Select Preferred States"
                  className="w-full"
                  loading={statesLoading}
                  options={states.map((s) => ({
                    value: s.code,
                    label: s.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="preferredPrograms"
                label="Target Curriculums / Majors"
              >
                <Select
                  mode="multiple"
                  placeholder="Select Majors"
                  className="w-full"
                  options={PROGRAM_OPTIONS.map((p) => ({ value: p, label: p }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="preferredDegreeLevel"
                label="Target Degree Level"
              >
                {/* Options from GET /degree-levels in backend order; the canonical
                    string is both the value submitted and the label shown. */}
                <Select
                  options={degreeLevels.map((d) => ({ value: d, label: d }))}
                  loading={degreeLevelsLoading}
                  placeholder="Select Degree"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="preferredCollegeType"
                label="Preferred College Type"
              >
                {/* Stored to the backend `preferred_college_type` column. Clearable
                    so the user can express "no preference" (empty value). */}
                <Select
                  allowClear
                  placeholder="Public or Private"
                  className="w-full"
                  options={[
                    { value: "Public", label: "Public" },
                    { value: "Private", label: "Private" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
          <div>
            {currentStep > 0 && (
              <Button onClick={handleBack} disabled={saving}>
                Back
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            {currentStep < lastStepIndex ? (
              <Button type="primary" loading={validating} onClick={handleNext}>
                Next Step
              </Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            )}
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
