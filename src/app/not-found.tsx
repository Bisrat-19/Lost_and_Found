import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-4xl">This page isn&apos;t here</h1>
      <p className="text-muted text-lg">
        The address may be mistyped, or the page was moved. You can browse found items or post a
        report from the home page.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/">Go to the home page</ButtonLink>
        <ButtonLink href="/found" variant="secondary">
          Browse found items
        </ButtonLink>
      </div>
    </div>
  );
}
