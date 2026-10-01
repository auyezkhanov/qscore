import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type State = { error: Error | null };

/** Last-resort guard so a rendering bug in one page doesn't blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    // Outside the i18n tree on purpose: this must render even if providers fail.
    const ru = document.documentElement.lang !== "en";
    return (
      <div className="mx-auto my-16 max-w-md px-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">
          <AlertTriangle size={22} />
        </div>
        <p className="font-semibold">{ru ? "Что-то пошло не так" : "Something went wrong"}</p>
        <button type="button" onClick={() => location.reload()} className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg">
          {ru ? "Перезагрузить страницу" : "Reload page"}
        </button>
      </div>
    );
  }
}
