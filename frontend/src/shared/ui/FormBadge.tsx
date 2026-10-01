import type { ReactNode } from "react";
import type { FormResult } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";

const COLORS: Record<FormResult, string> = {
  W: "bg-win text-white",
  D: "bg-draw text-white",
  L: "bg-loss text-white",
};

/** Coloured W/D/L pill. `label` overrides the letter (e.g. with a score "2-1"). */
export function FormBadge({ result, label, className }: { result: FormResult; label?: ReactNode; className?: string }) {
  const { t, lang } = useI18n();
  const letter = lang === "ru" ? { W: "В", D: "Н", L: "П" }[result] : result;
  return (
    <span
      title={t(`form.${result}` as const)}
      className={cn("inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[11px] font-bold tnum", COLORS[result], className)}
    >
      {label ?? letter}
    </span>
  );
}
