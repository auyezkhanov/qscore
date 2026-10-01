import { useEffect, useState, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { MAX_GOALS, clampGoals } from "./predictionApi";

/**
 * Goals picker: big −/+ buttons around a typeable number. Arrow keys step,
 * Home/End jump to 0/max. With `onLocked` set (signed out) every interaction
 * calls it instead of changing the value.
 */
export function ScoreStepper({
  value,
  onChange,
  teamName,
  onLocked,
}: {
  value: number;
  onChange: (n: number) => void;
  teamName: string;
  onLocked?: () => void;
}) {
  const { t } = useI18n();
  // Text being typed; synced back whenever the committed value changes.
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const step = (delta: number) => (onLocked ? onLocked() : onChange(clampGoals(value + delta)));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const keys: Record<string, () => void> = {
      ArrowUp: () => step(1),
      ArrowDown: () => step(-1),
      Home: () => (onLocked ? onLocked() : onChange(0)),
      End: () => (onLocked ? onLocked() : onChange(MAX_GOALS)),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition hover:bg-surface-3 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={btn} onClick={() => step(-1)} disabled={!onLocked && value <= 0} aria-label={t("predictor.decrease", { team: teamName })}>
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={t("predictor.goalsFor", { team: teamName })}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={MAX_GOALS}
        readOnly={Boolean(onLocked)}
        value={text}
        maxLength={2}
        onClick={onLocked}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          setText(digits);
          if (digits !== "") onChange(clampGoals(Number(digits)));
        }}
        onBlur={() => setText(String(value))}
        className={cn(
          "h-11 w-11 rounded-xl border border-line bg-surface text-center text-xl font-extrabold tnum outline-none transition",
          "focus:border-brand focus:ring-2 focus:ring-brand/20",
          onLocked && "cursor-pointer",
        )}
      />
      <button type="button" className={btn} onClick={() => step(1)} disabled={!onLocked && value >= MAX_GOALS} aria-label={t("predictor.increase", { team: teamName })}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
