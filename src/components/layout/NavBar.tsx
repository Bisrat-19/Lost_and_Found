import NextLink from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LiveIndicator } from "./LiveIndicator";

export function NavBar() {
  return (
    <header className="border-b border-default-200">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <NextLink href="/" className="text-lg font-semibold tracking-tight">
            Lost &amp; Found
          </NextLink>
          <LiveIndicator />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/found" variant="ghost" size="sm">
            Found items
          </ButtonLink>
          <ButtonLink href="/lost/new" variant="secondary" size="sm">
            I lost something
          </ButtonLink>
          <ButtonLink href="/found/new" variant="primary" size="sm">
            I found something
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
