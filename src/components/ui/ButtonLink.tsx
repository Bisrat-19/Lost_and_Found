import NextLink from "next/link";
import { buttonVariants } from "@heroui/react";
import type { ComponentProps } from "react";

type ButtonLinkProps = ComponentProps<typeof NextLink> & {
  variant?: "primary" | "secondary" | "tertiary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

/** A Next.js <Link> styled as a HeroUI button (keeps client-side navigation). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <NextLink
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
