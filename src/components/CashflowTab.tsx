import MetricCard from "./MetricCard";
import { AlertCircle, BarChart3, Gauge, CheckCircle2 } from "lucide-react";
import type { Invoice, InvoiceStatus } from "../data/mockInvoices";
import { WEEK_LABELS } from "../data/mockInvoices";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const statusStyles: Record<InvoiceStatus, string> = {
  Overdue: "bg-rose-50 text-rose-700 border-rose-100",
  "Due soon": "bg-amber-50 text-amber-700 border-amber-100",
  Upcoming: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Paid: "bg-slate-100 text-slate-700 border-slate-200",
  Archived: "bg-slate-100 text-slate-500 border-slate-200",
};

type Props = {
  dateRange: string;
  invoices: Invoice[];
};

// Risk thresholds for weekly totals
const RISK_THRESHOLDS = {
  high: 6500,
  medium: 3500,
};

export default function CashflowTab({ dateRange, invoices }: Props) {
  const unpaid = invoices.filter((inv) => inv.status !== "Paid" && inv.status !== "Archived");

  const weekTotals = unpaid.reduce<Record<string, { total: number; invoices: Invoice[] }>>((acc, inv) => {
    const bucket = acc[inv.weekId] ?? { total: 0, invoices: [] };
    bucket.total += inv.amount;
    bucket.invoices.push(inv);
    acc[inv.weekId] = bucket;
    return acc;
  }, {});

  const weekList = Object.entries(weekTotals).map(([weekId, data]) => {
    const risk =
      data.total >= RISK_THRESHOLDS.high ? "High" : data.total >= RISK_THRESHOLDS.medium ? "Medium" : "Low";
    return {
      weekId,
      label: WEEK_LABELS[weekId] ?? weekId,
      total: data.total,
      invoices: data.invoices,
      risk,
    };
  });

  const overdueCount = invoices.filter((inv) => inv.status === "Overdue").length;
  const outgoingTrend = weekList.map((w) => ({ label: w.label, amount: w.total }));
  const maxOutgoing = outgoingTrend.length ? Math.max(...outgoingTrend.map((item) => item.amount)) : 1;
  const totalOutgoing = unpaid.reduce((sum, inv) => sum + inv.amount, 0);
  const highestWeek = weekList.length ? Math.max(...weekList.map((w) => w.total)) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-cyan-600">Cashflow</p>
        <h1 className="text-3xl font-bold text-slate-900">Cashflow</h1>
        <p className="text-slate-500">Spot cash spikes before they hit your bank. ({dateRange})</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total outgoing"
          amount={currency.format(totalOutgoing)}
          hint="Selected date range"
          gradientIndex={0}
          kicker="live"
        />
        <MetricCard
          title="Highest weekly outgoing"
          amount={currency.format(highestWeek)}
          hint="Based on due weeks"
          gradientIndex={1}
        />
        <MetricCard
          title="Overdue invoices"
          amount={`${overdueCount}`}
          hint="Count of overdue invoices"
          gradientIndex={2}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Cashflow timeline</p>
            <p className="text-sm text-slate-500">Week-by-week view so you can smooth payments and avoid surprises.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {outgoingTrend.map((point) => {
              const height = Math.max(40, (point.amount / maxOutgoing) * 160);
              return (
                <div key={point.label} className="flex-1">
                  <div className="flex h-44 items-end justify-center rounded-xl border border-cyan-100 bg-gradient-to-t from-white via-cyan-50 to-purple-50">
                    <div
                      className="w-10 rounded-lg bg-gradient-to-t from-cyan-500 via-sky-500 to-fuchsia-500 shadow-[0_12px_30px_rgba(14,165,233,0.35)]"
                      style={{ height }}
                    />
                  </div>
                  <p className="pt-2 text-center text-xs font-semibold text-slate-500">{point.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="pb-2">
            <p className="text-lg font-semibold text-slate-900">By week</p>
            <p className="text-sm text-slate-500">Totals and risk for each week. Drill in to see which invoices drive spend.</p>
          </div>
          <div className="space-y-3">
            {weekList.map((week) => (
              <div key={week.label} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{week.label}</p>
                    <p className="text-xs text-slate-500">Total due that week</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">{currency.format(week.total)}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        week.risk === "High"
                          ? "border-rose-100 bg-rose-50 text-rose-700"
                          : week.risk === "Medium"
                            ? "border-amber-100 bg-amber-50 text-amber-700"
                            : "border-emerald-100 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {week.risk} risk
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {week.invoices.map((item, idx) => (
                    <div
                      key={`${item.supplier}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100 text-slate-700">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.supplier}</p>
                          <p className="text-xs text-slate-500">Due {formatDate(item.dueDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{currency.format(item.amount)}</span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[item.status]}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-4 shadow-[0_18px_28px_rgba(0,184,255,0.12)]">
          <div className="flex items-start gap-2 text-sm text-slate-800">
            <AlertCircle className="mt-0.5 h-4 w-4 text-rose-500" />
            <p>Week of 9 Dec is heavy (£7,800). Consider staggering Aurora Marketing and Supplier X to smooth the week.</p>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-800">
            <Gauge className="mt-0.5 h-4 w-4 text-amber-500" />
            <p>Utilities are tracking 12% higher this month. Renegotiate Northwind Utilities or enable autopay with a cap.</p>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <p>Use the early-pay discount with Streamline Legal to trim £95 and free cash later in the month.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
