import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-3 sm:px-5 lg:px-6", className)}>{children}</div>;
}

/** Standard page wrapper: container + vertical rhythm. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <Container className={cn("space-y-4 py-4 sm:py-6", className)}>{children}</Container>;
}
