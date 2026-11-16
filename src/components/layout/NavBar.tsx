import NextLink from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LiveIndicator } from "./LiveIndicator";

/** Small claim-tag mark used as the logo. */
function TagMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <path
        d="M4 9.5A3.5 3.5 0 0 1 7.5 6H22l6 10-6 10H7.5A3.5 3.5 0 0 1 4 22.5Z"
        fill="var(--manila)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="16" r="2.4" fill="var(--mist)" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M9 12.5h7M9 16h7M9 19.5h4" stroke="var(--twine)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--mist)]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <NextLink href="/" className="flex items-center gap-2" aria-label="Lost & Found home">
            <TagMark />
            <span className="font-display text-lg">Lost &amp; Found</span>
          </NextLink>
          <LiveIndicator />
        </div>
        {/* Phones: one even row with short labels. Larger screens: full labels. */}
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
          <ButtonLink href="/found" variant="ghost" size="sm">
            <span className="sm:hidden">Browse</span>
            <span className="hidden sm:inline">Found items</span>
          </ButtonLink>
          <ButtonLink href="/lost/new" variant="secondary" size="sm">
            <span className="sm:hidden">I lost</span>
            <span className="hidden sm:inline">I lost something</span>
          </ButtonLink>
          <ButtonLink href="/found/new" variant="primary" size="sm">
            <span className="sm:hidden">I found</span>
            <span className="hidden sm:inline">I found something</span>
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
