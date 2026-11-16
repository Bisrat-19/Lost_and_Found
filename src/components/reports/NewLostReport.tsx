"use client";

import { Card } from "@heroui/react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SecretLinkBox } from "@/components/ui/SecretLinkBox";
import { ReportForm, type CreatedReport } from "./ReportForm";

/** Lost form → on success, swap to the private link screen. */
export function NewLostReport() {
  const [created, setCreated] = useState<CreatedReport | null>(null);

  if (!created?.token) {
    return <ReportForm type="LOST" onCreated={setCreated} />;
  }

  const path = `/matches/${created.token}`;
  const url = `${window.location.origin}${path}`;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Your report is saved</Card.Title>
        <Card.Description>
          We&apos;ll compare it with every found item, including ones reported later. Open your
          private link any time to see matches.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <SecretLinkBox url={url} />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={path}>See my matches</ButtonLink>
          <ButtonLink href="/found" variant="secondary">
            Browse found items
          </ButtonLink>
        </div>
      </Card.Content>
    </Card>
  );
}
