import type { Invoice } from "../data/mockInvoices";

export type DateRangeFilter = "all" | "last_30_days" | "last_90_days" | "last_12_months";

const getInvoiceDate = (invoice: Invoice): Date | null => {
  const raw =
    invoice.dueDateIso ??
    (invoice as any).due_date_iso ?? // backward compatibility for backend snake_case
    invoice.due_date ??
    invoice.dueDate ??
    invoice.issueDate ??
    invoice.issue_date;

  if (!raw) return null;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const isInvoiceInDateRange = (invoice: Invoice, range: DateRangeFilter, now: Date): boolean => {
  if (range === "all") return true;
  const date = getInvoiceDate(invoice);
  if (!date) return false;

  const rangeMap: Record<Exclude<DateRangeFilter, "all">, number> = {
    last_30_days: 30,
    last_90_days: 90,
    last_12_months: 365,
  };

  const days = rangeMap[range] ?? 0;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= start && date <= now;
};

export const formatRangeLabel = (range: DateRangeFilter, now: Date): string => {
  if (range === "all") return "All time";
  const daysBack = range === "last_30_days" ? 30 : range === "last_90_days" ? 90 : 365;
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(now)}`;
};

export const parseInvoiceDateForDisplay = (invoice: Invoice): string => {
  const date =
    invoice.dueDateIso ??
    (invoice as any).due_date_iso ??
    invoice.due_date ??
    invoice.dueDate ??
    invoice.issueDate ??
    invoice.issue_date;
  if (!date) return "—";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
