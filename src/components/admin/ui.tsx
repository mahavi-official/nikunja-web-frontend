"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * The CMS's building blocks.
 *
 * The public site is set in a display serif on generous white; the CMS is the
 * same palette put to work — denser, squarer corners, sans throughout, and
 * saffron reserved strictly for the primary action in any given view. An
 * editor should be able to find the one button that commits their work without
 * reading anything.
 */

/* ── buttons ───────────────────────────────────────────────── */

type Tone = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

const TONES: Record<Tone, string> = {
  primary: "bg-flame-500 text-white hover:bg-flame-600 active:bg-flame-700 shadow-sm",
  secondary: "bg-surface text-ink border border-line-strong hover:border-navy-400 hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink",
  danger: "bg-transparent text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40",
  subtle: "bg-navy-50 text-navy-800 hover:bg-navy-100 dark:bg-navy-900/50 dark:text-navy-100 dark:hover:bg-navy-900",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
};

export function adminButtonClass(tone: Tone = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    TONES[tone],
    SIZES[size],
    extra
  );
}

export function AdminButton({
  tone = "primary",
  size = "md",
  loading = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      className={adminButtonClass(tone, size, className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function AdminLinkButton({
  href,
  tone = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  tone?: Tone;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={adminButtonClass(tone, size, className)}>
      {children}
    </Link>
  );
}

/* ── surfaces ──────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-surface-raised shadow-[0_1px_2px_rgb(11_20_48_/_0.04)]",
        className
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="font-sans text-[0.9375rem] font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-6">
      {breadcrumb?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-ink-muted">
            {breadcrumb.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-flame-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumb.length - 1 ? <span aria-hidden>/</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/* ── form fields ───────────────────────────────────────────── */

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors " +
  "placeholder:text-ink-muted focus:border-flame-400 focus:outline-none focus:ring-2 focus:ring-flame-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1 text-[0.8125rem] font-medium text-ink"
        >
          {label}
          {required ? (
            <span className="text-flame-600" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-[0.8125rem] text-red-600">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8125rem] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "resize-y leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-flame-500" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-4"
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Free-text list, entered one at a time. Used for tags and keywords. */
export function TokenInput({
  values,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    // Case-insensitive, because "Kartik" and "kartik" are one tag to a reader.
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-line-strong bg-surface px-2.5 py-2 focus-within:border-flame-400 focus-within:ring-2 focus-within:ring-flame-500/20">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-lg bg-navy-50 py-1 pr-1 pl-2.5 text-[0.8125rem] font-medium text-navy-800 dark:bg-navy-900/60 dark:text-navy-100"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              aria-label={`Remove ${value}`}
              className="grid size-5 place-items-center rounded text-navy-500 transition-colors hover:bg-navy-200/60 hover:text-navy-900 dark:hover:bg-navy-800"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          list={suggestions.length ? listId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          // Committing on blur stops a typed-but-unentered tag being silently
          // dropped when the editor tabs straight to Save.
          onBlur={() => add(draft)}
          placeholder={values.length ? "" : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-muted"
        />
        {suggestions.length ? (
          <datalist id={listId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
      </div>
    </div>
  );
}

/* ── status ────────────────────────────────────────────────── */

export function StatusPill({
  status,
}: {
  status: "PUBLISHED" | "DRAFT" | "ACTIVE" | "SUSPENDED" | "WHITELISTED" | "SCHEDULED";
}) {
  const tones: Record<string, string> = {
    PUBLISHED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    DRAFT: "bg-sand-100 text-sand-600 dark:bg-navy-900 dark:text-navy-200",
    SCHEDULED: "bg-flame-50 text-flame-700 dark:bg-flame-950/60 dark:text-flame-300",
    WHITELISTED: "bg-navy-50 text-navy-700 dark:bg-navy-900 dark:text-navy-100",
    SUSPENDED: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase",
        tones[status]
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function RolePill({ role }: { role: string }) {
  const tones: Record<string, string> = {
    SUPER_ADMIN: "bg-flame-500 text-white",
    ADMIN: "bg-navy-800 text-white dark:bg-navy-600",
    EDITOR: "bg-navy-50 text-navy-800 dark:bg-navy-900 dark:text-navy-100",
    MEMBER: "bg-surface-sunken text-ink-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase",
        tones[role] ?? tones.MEMBER
      )}
    >
      {role.replace("_", " ").toLowerCase()}
    </span>
  );
}

/* ── tables ────────────────────────────────────────────────── */

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
      {/* Admin tables are wide by nature; scroll the table, never the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-surface-sunken px-4 py-3 text-left text-[0.6875rem] font-semibold tracking-wider text-ink-muted uppercase",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle", className)}>{children}</td>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center text-sm text-ink-muted">
        {children}
      </td>
    </tr>
  );
}

/* ── feedback ──────────────────────────────────────────────── */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{error}</span>
      {onRetry ? (
        <AdminButton tone="secondary" size="sm" onClick={onRetry}>
          Retry
        </AdminButton>
      ) : null}
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3 text-[0.8125rem] text-navy-800 dark:border-navy-800 dark:bg-navy-950/60 dark:text-navy-100">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ── toasts ────────────────────────────────────────────────── */

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<{
  notify: (message: string, tone?: "success" | "error") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      tone === "error" ? 7000 : 4000
    );
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-100 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "animate-rise pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
              toast.tone === "error"
                ? "bg-red-600 text-white"
                : "bg-navy-900 text-white dark:bg-navy-700"
            )}
          >
            {toast.tone === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0 text-flame-400" aria-hidden />
            )}
            <span className="min-w-0">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

/* ── modal ─────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  } as const;

  return (
    <div className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-navy-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-rise relative my-auto w-full rounded-2xl border border-line bg-surface-raised shadow-2xl",
          widths[size]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        {children ? <div className="px-5 py-5">{children}</div> : null}

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Confirmation for anything that destroys data. Deliberately a hook returning
 * a promise rather than a component with callbacks — a delete handler reads as
 * a straight line that way.
 */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: { title: string; body: string; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => {
        setState({
          title: options.title,
          body: options.body,
          confirmLabel: options.confirmLabel ?? "Delete",
          resolve,
        });
      }),
    []
  );

  const settle = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const dialog = (
    <Modal
      open={!!state}
      onClose={() => settle(false)}
      title={state?.title ?? ""}
      size="sm"
      footer={
        <>
          <AdminButton tone="ghost" onClick={() => settle(false)}>
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800"
            onClick={() => settle(true)}
          >
            {state?.confirmLabel}
          </AdminButton>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">{state?.body}</p>
    </Modal>
  );

  return { confirm, dialog };
}

/* ── pagination ────────────────────────────────────────────── */

export function AdminPagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (next: number) => void;
}) {
  if (totalPages <= 1) {
    return total ? (
      <p className="px-1 py-3 text-[0.8125rem] text-ink-muted">
        {total} {total === 1 ? "item" : "items"}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <p className="text-[0.8125rem] text-ink-muted">
        Page {page} of {totalPages} · {total} items
      </p>
      <div className="flex items-center gap-2">
        <AdminButton tone="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </AdminButton>
        <AdminButton
          tone="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </AdminButton>
      </div>
    </div>
  );
}
