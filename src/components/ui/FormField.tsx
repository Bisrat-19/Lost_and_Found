"use client";

import { Description, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  description?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  isRequired?: boolean;
  /** Render a multi-line TextArea instead of a single-line Input. */
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
};

/** Text input / textarea with label, help text and a server- or client-side error. */
export function FormField({
  label,
  name,
  value,
  onChange,
  error,
  description,
  placeholder,
  type = "text",
  isRequired,
  multiline,
  rows = 4,
  maxLength,
}: FormFieldProps) {
  return (
    <TextField
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isInvalid={Boolean(error)}
      validationBehavior="aria" // we show our own zod errors, not browser bubbles
      fullWidth
    >
      <Label>{label}</Label>
      {multiline ? (
        <TextArea placeholder={placeholder} rows={rows} maxLength={maxLength} />
      ) : (
        <Input placeholder={placeholder} maxLength={maxLength} />
      )}
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && description ? <Description>{description}</Description> : null}
    </TextField>
  );
}
