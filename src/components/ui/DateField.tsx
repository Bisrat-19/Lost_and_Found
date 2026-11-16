"use client";

import {
  Calendar,
  DateField as HeroDateField,
  DatePicker,
  Description,
  FieldError,
  Label,
  Skeleton,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
import { useSyncExternalStore } from "react";
import { MAX_REPORT_AGE_DAYS } from "@/lib/constants";

const noopSubscribe = () => () => {};

/**
 * Today's date as "YYYY-MM-DD", read only in the browser. During prerender it
 * is null (reading the clock there is not allowed with Cache Components), so
 * the picker renders without limits and gets them right after hydration.
 * The server-side zod schema enforces the same range either way.
 */
function useToday(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => today(getLocalTimeZone()).toString(),
    () => null,
  );
}

type DateFieldProps = {
  label: string;
  name: string;
  /** "YYYY-MM-DD" or null. Plain strings keep form state simple and serialisable. */
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  description?: string;
  isRequired?: boolean;
};

function toDateValue(v: string | null): DateValue | null {
  if (!v) return null;
  try {
    return parseDate(v);
  } catch {
    return null;
  }
}

/** Date picker limited to the last MAX_REPORT_AGE_DAYS days, matching the zod rule. */
export function DateField({
  label,
  name,
  value,
  onChange,
  error,
  description,
  isRequired,
}: DateFieldProps) {
  const todayStr = useToday();

  // The HeroUI calendar reads the clock while rendering, so it can't be
  // prerendered. Show a same-size placeholder until we're in the browser.
  if (!todayStr) {
    return (
      <div className="flex flex-col gap-1" aria-busy="true">
        <span className="text-sm font-medium">{label}</span>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  const max = parseDate(todayStr);
  const min = max.subtract({ days: MAX_REPORT_AGE_DAYS });

  return (
    <DatePicker
      name={name}
      value={toDateValue(value)}
      onChange={(d) => onChange(d ? d.toString() : null)}
      minValue={min}
      maxValue={max}
      isRequired={isRequired}
      isInvalid={Boolean(error)}
      validationBehavior="aria"
    >
      <Label>{label}</Label>
      <HeroDateField.Group fullWidth>
        <HeroDateField.Input>
          {(segment) => <HeroDateField.Segment segment={segment} />}
        </HeroDateField.Input>
        <HeroDateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </HeroDateField.Suffix>
      </HeroDateField.Group>
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && description ? <Description>{description}</Description> : null}
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
