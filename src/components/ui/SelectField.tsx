"use client";

import { Description, FieldError, Label, ListBox, Select } from "@heroui/react";

export type SelectOption = { id: string; label: string };

type SelectFieldProps = {
  label: string;
  name: string;
  options: readonly SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  description?: string;
  placeholder?: string;
  isRequired?: boolean;
};

/** Single-choice dropdown (category, colour, location). */
export function SelectField({
  label,
  name,
  options,
  value,
  onChange,
  error,
  description,
  placeholder = "Select one",
  isRequired,
}: SelectFieldProps) {
  return (
    <Select
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={(key) => onChange(key == null ? null : String(key))}
      isRequired={isRequired}
      isInvalid={Boolean(error)}
      validationBehavior="aria"
      fullWidth
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && description ? <Description>{description}</Description> : null}
    </Select>
  );
}
