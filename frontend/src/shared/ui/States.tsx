import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, SearchX } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">{icon}</div>}
      <p className="text-[15px] font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-ink-3">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      className={className}
      icon={<AlertTriangle size={22} />}
      title={t("common.error.title")}
      text={t("common.error.text")}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw size={14} />
            {t("common.retry")}
          </Button>
        )
      }
    />
  );
}

export function NotFoundState({ titleKey = "notFound.title" }: { titleKey?: TranslationKey }) {
  const { t } = useI18n();
  return (
    <div className="card mx-auto max-w-lg">
      <EmptyState
        icon={<SearchX size={22} />}
        title={t(titleKey)}
        text={t("notFound.text")}
        action={
          <Link to="/" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-fg hover:opacity-90">
            {t("notFound.home")}
          </Link>
        }
      />
    </div>
  );
}

/**
 * Renders the loading / error / not-found / success branches of a query.
 * Keeps pages free of the "skeleton forever when the request failed" trap.
 */
export function QueryState<T>({
  query,
  loading,
  notFound,
  children,
  errorClassName,
}: {
  query: UseQueryResult<T>;
  loading: ReactNode;
  /** Rendered for a 404 from the API; defaults to the generic error state. */
  notFound?: ReactNode;
  children: (data: T) => ReactNode;
  errorClassName?: string;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.isError) {
    if (notFound && query.error instanceof ApiError && query.error.isNotFound) return <>{notFound}</>;
    return <ErrorState className={errorClassName} onRetry={() => void query.refetch()} />;
  }
  return <>{loading}</>;
}
