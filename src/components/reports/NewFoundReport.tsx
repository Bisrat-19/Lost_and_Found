"use client";

import { Button, Card } from "@heroui/react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ReportCard } from "./ReportCard";
import { ReportForm, type CreatedReport } from "./ReportForm";

/** Found form → on success, show what was published and offer to report another. */
export function NewFoundReport() {
  const [created, setCreated] = useState<CreatedReport | null>(null);
  // Changing the key remounts the form with empty fields
  const [formKey, setFormKey] = useState(0);

  if (!created) {
    return <ReportForm key={formKey} type="FOUND" onCreated={setCreated} />;
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Thank you! The item is now listed</Card.Title>
        <Card.Description>
          People who lost something similar will see it in their matches. This is what the public
          list shows (no contact details):
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <ReportCard report={created.report} />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onPress={() => {
              setCreated(null);
              setFormKey((k) => k + 1);
            }}
          >
            Report another item
          </Button>
          <ButtonLink href="/found" variant="ghost">
            See all found items
          </ButtonLink>
        </div>
      </Card.Content>
    </Card>
  );
}
