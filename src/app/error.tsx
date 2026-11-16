"use client";

import { Button } from "@heroui/react";
import { ButtonLink } from "@/components/ui/ButtonLink";

/** Shown when a page fails to load (e.g. the database is down). */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-4xl">This page didn&apos;t load</h1>
      <p className="text-muted text-lg">
        Something went wrong on our side while loading it. Your reports are safe. Try again in a
        moment.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onPress={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
