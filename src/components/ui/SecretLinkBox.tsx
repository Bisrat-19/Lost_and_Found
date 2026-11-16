"use client";

import { Alert, Button, Input, Label, TextField, toast } from "@heroui/react";

/** Shows the private matches link after a lost report, with a copy button. */
export function SecretLinkBox({ url }: { url: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.danger("Couldn't copy. Select the link and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <TextField value={url} isReadOnly fullWidth>
          <Label>Your private link</Label>
          <Input className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        </TextField>
        <Button variant="secondary" onPress={copy}>
          Copy
        </Button>
      </div>
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Save this link</Alert.Title>
          <Alert.Description>
            It is the only way to see your matches. Anyone with the link can see them, so don&apos;t
            share it publicly.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}
