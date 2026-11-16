"use client";

import { Alert, Button, Card, Form, toast } from "@heroui/react";
import { useState, type FormEvent } from "react";
import { DateField } from "@/components/ui/DateField";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { CATEGORIES, CATEGORY_LABELS, COLORS, DESCRIPTION_MAX, LOCATIONS } from "@/lib/constants";
import { createReportSchema, toFieldErrors, type FieldErrors } from "@/lib/schemas";
import type { PublicReport } from "@/lib/types";

export type ReportType = "LOST" | "FOUND";

export type CreatedReport = { report: PublicReport; token?: string };

type Values = {
  category: string | null;
  color: string | null;
  location: string | null;
  date: string | null;
  description: string;
  contact: string;
};

const EMPTY: Values = {
  category: null,
  color: null,
  location: null,
  date: null,
  description: "",
  contact: "",
};

const UNKNOWN_COLOR = "unknown";

const categoryOptions = CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] }));
const colorOptions = [
  { id: UNKNOWN_COLOR, label: "I don't know / not sure" },
  ...COLORS.map((c) => ({ id: c, label: c[0].toUpperCase() + c.slice(1) })),
];
const locationOptions = LOCATIONS.map(({ id, label }) => ({ id, label }));

const COPY = {
  LOST: {
    date: "When did you lose it?",
    location: "Where did you last have it?",
    descriptionHint:
      "Brand, size, stickers, what was inside. The more detail, the better the matches.",
    contact: "Your email or phone",
    contactHint: "Kept private. Never shown on the public list.",
    submit: "Report lost item",
  },
  FOUND: {
    date: "When did you find it?",
    location: "Where did you find it?",
    descriptionHint:
      "Describe it, but leave out one unique detail (e.g. a serial number) so the owner can prove it's theirs.",
    contact: "Your email or phone (optional)",
    contactHint: "Only shown to the owner of a strong match. Leave empty if you hand it to the office.",
    submit: "Report found item",
  },
} as const;

/** One form for both report types. Validates on the client, then the server validates again. */
export function ReportForm({
  type,
  onCreated,
}: {
  type: ReportType;
  onCreated: (result: CreatedReport) => void;
}) {
  const copy = COPY[type];
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Clear a field's error as soon as the user edits it
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = {
      type,
      ...values,
      color: values.color === UNKNOWN_COLOR ? null : values.color,
    };

    // Instant feedback; the server runs the same schema again.
    const parsed = createReportSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 400 && data.errors) {
        setErrors(data.errors);
        return;
      }
      if (!res.ok) {
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        return;
      }

      toast.success(type === "LOST" ? "Lost report saved" : "Found report saved");
      onCreated(data as CreatedReport);
    } catch {
      setErrors({ form: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Card.Content>
        <Form className="flex flex-col gap-5" onSubmit={onSubmit} validationBehavior="aria">
          {errors.form ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Couldn&apos;t save the report</Alert.Title>
                <Alert.Description>{errors.form}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="What is it?"
              name="category"
              options={categoryOptions}
              value={values.category}
              onChange={(v) => set("category", v)}
              error={errors.category}
              isRequired
            />
            <SelectField
              label="Colour"
              name="color"
              options={colorOptions}
              value={values.color}
              onChange={(v) => set("color", v)}
              error={errors.color}
              placeholder="Main colour"
            />
            <SelectField
              label={copy.location}
              name="location"
              options={locationOptions}
              value={values.location}
              onChange={(v) => set("location", v)}
              error={errors.location}
              isRequired
            />
            <DateField
              label={copy.date}
              name="date"
              value={values.date}
              onChange={(v) => set("date", v)}
              error={errors.date}
              isRequired
            />
          </div>

          <FormField
            label="Description"
            name="description"
            multiline
            value={values.description}
            onChange={(v) => set("description", v)}
            error={errors.description}
            description={`${copy.descriptionHint} (${values.description.length}/${DESCRIPTION_MAX})`}
            placeholder={
              type === "LOST"
                ? "e.g. Black backpack with a laptop charger inside, small keychain on the zip"
                : "e.g. Dark backpack found on a bench near the library entrance"
            }
            maxLength={DESCRIPTION_MAX}
            isRequired
          />

          <FormField
            label={copy.contact}
            name="contact"
            value={values.contact}
            onChange={(v) => set("contact", v)}
            error={errors.contact}
            description={copy.contactHint}
            placeholder="name@university.edu or +251 9..."
            isRequired={type === "LOST"}
          />

          <Button type="submit" isPending={submitting} size="lg" className="self-start">
            {submitting ? "Saving…" : copy.submit}
          </Button>
        </Form>
      </Card.Content>
    </Card>
  );
}
