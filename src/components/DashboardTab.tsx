import MetricCard from "./MetricCard";
import { Sparkles, CalendarRange } from "lucide-react";
import type { Invoice, InvoiceStatus } from "../data/mockInvoices";
import { WEEK_LABELS } from "../data/mockInvoices";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const statusStyles: Record<Extract<InvoiceStatus, "Overdue" | "Due soon" | "Upcoming">, string> = {
  Overdue: "bg-rose-50 text-rose-700 border-rose-100",
  "Due soon": "bg-amber-50 text-amber-700 border-amber-100",
  Upcoming: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

type Props = {
  dateRange: string;
  invoices: Invoice[];
};

export default function DashboardTab({ dateRange, invoices }: Props) {
  const payable = invoices.filter((inv) => inv.status !== "Paid");

  const now = new Date("2024-12-01T00:00:00Z"); // fixed “today” for consistent demo calculations
  const daysDiff = (due: string) => {
    const diff = new Date(due).getTime() - now.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const dueIn7 = payable.filter((inv) => {
    const d = daysDiff(inv.dueDate);
    return d >= 0 && d <= 7;
  });

  const dueIn30 = payable.filter((inv) => {
    const d = daysDiff(inv.dueDate);
    return d >= 0 && d <= 30;
  });

  const overdue = payable.filter((inv) => inv.status === "Overdue");

  const upcomingNotPaid = payable.filter((inv) => inv.status !== "Overdue");
  const largestUpcoming =
    upcomingNotPaid.length > 0
      ? upcomingNotPaid.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev))
      : null;

  const attentionInvoices = payable
    .filter((inv) => inv.status === "Overdue" || daysDiff(inv.dueDate) <= 5)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const weekTotals = Object.entries(
    payable.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.weekId] = (acc[inv.weekId] ?? 0) + inv.amount;
      return acc;
    }, {}),
  ).map(([weekId, total]) => ({
    label: WEEK_LABELS[weekId] ?? weekId,
    amount: total,
  }));

  const maxOutgoing = weekTotals.length ? Math.max(...weekTotals.map((w) => w.amount)) : 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-cyan-600">Overview</p>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">A clear, AI-supported view of what&apos;s due, what&apos;s overdue, and where to focus.</p>
        </div>
        <button className="inline-flex items-center rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-cyan-50">
          <CalendarRange className="mr-2 h-4 w-4 text-cyan-600" />
          {dateRange}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Due in next 7 days"
          amount={currency.format(dueIn7.reduce((sum, inv) => sum + inv.amount, 0))}
          hint={`${dueIn7.length} invoices to keep on track`}
          gradientIndex={0}
        />
        <MetricCard
          title="Due in next 30 days"
          amount={currency.format(dueIn30.reduce((sum, inv) => sum + inv.amount, 0))}
          hint={`${dueIn30.length} invoices in this window`}
          gradientIndex={1}
        />
        <MetricCard
          title="Overdue"
          amount={currency.format(overdue.reduce((sum, inv) => sum + inv.amount, 0))}
          hint={`${overdue.length} invoices to resolve`}
          gradientIndex={2}
        />
        <MetricCard
          title="Largest upcoming bill"
          amount={largestUpcoming ? currency.format(largestUpcoming.amount) : "£0"}
          hint={
            largestUpcoming
              ? `${largestUpcoming.supplier} · Due ${formatDate(largestUpcoming.dueDate)}`
              : "No large bills this cycle"
          }
          gradientIndex={3}
          kicker="watch"
        />
      </div>

      <div className="space-y-6">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-lg font-semibold text-slate-900">Needs your attention</p>
            <p className="text-sm text-slate-500">Top invoices that are overdue or coming due.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Supplier", "Invoice #", "Amount", "Due", "Status", "Category"].map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionInvoices.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.supplier}</td>
                    <td className="px-3 py-2 text-slate-600">{item.invoiceNumber}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{currency.format(item.amount)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(item.dueDate)}</td>
                    <td className="px-3 py-2">
                      {item.status !== "Paid" && item.status !== "Archived" && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[item.status as Extract<InvoiceStatus, "Overdue" | "Due soon" | "Upcoming">]
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-blue-50 to-purple-50 p-4 shadow-[0_18px_28px_rgba(0,184,255,0.12)]">
          <div className="flex items-start gap-3 text-sm text-slate-800">
            <Sparkles className="mt-1 h-5 w-5 text-cyan-600" />
            <div className="space-y-2">
              <p>You have £8,500 due in the next 7 days across 6 invoices. Biggest exposure is Supplier X with £3,200 due on 3 Dec.</p>
              <p>Utilities and marketing drive most near-term spend. Resolve Aurora Marketing and Northwind Utilities to prevent service gaps.</p>
              <p className="text-slate-600">
                View the full cashflow timeline in the Cashflow tab for week-by-week detail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
