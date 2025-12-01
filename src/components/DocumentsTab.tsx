import { useMemo, useRef, useState } from "react";
import { Mail, UploadCloud, FileText } from "lucide-react";
import type { Invoice, InvoiceSource, InvoiceStatus } from "../data/mockInvoices";
import type { DateRangeFilter } from "../utils/dateRangeFilter";
import { isInvoiceInDateRange } from "../utils/dateRangeFilter";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const formatInvoiceDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getIssueDate = (invoice: Invoice): string | undefined => invoice.issue_date ?? invoice.issueDate;
const getDueDate = (invoice: Invoice): string | undefined => invoice.due_date ?? invoice.dueDate;

const statusStyles: Record<Extract<InvoiceStatus, "Overdue" | "Due soon" | "Upcoming" | "Paid">, string> = {
  Overdue: "bg-rose-50 text-rose-700 border-rose-100",
  "Due soon": "bg-amber-50 text-amber-700 border-amber-100",
  Upcoming: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Paid: "bg-slate-100 text-slate-700 border-slate-200",
};

const sourceStyles: Record<InvoiceSource, string> = {
  Upload: "bg-cyan-50 text-cyan-700 border-cyan-100",
  Email: "bg-indigo-50 text-indigo-700 border-indigo-100",
};

type Props = {
  invoices: Invoice[];
  onMarkPaid: (id: string) => void;
  onArchive: (id: string) => void;
  onInvoiceCreatedFromUpload?: (invoice: Invoice) => void;
  onArchiveInvoice?: (id: number | string) => void;
};

export default function DocumentsTab({
  invoices,
  onMarkPaid,
  onArchive,
  onInvoiceCreatedFromUpload,
  onArchiveInvoice,
}: Props) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [emailConnected, setEmailConnected] = useState(true);
  const [emailPaused, setEmailPaused] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "All",
    category: "All",
    source: "All",
    supplier: "",
    dateRange: "last_90_days" as DateRangeFilter,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredDocuments = useMemo(
    () =>
      invoices
        .filter((doc) => isInvoiceInDateRange(doc, filters.dateRange, new Date()))
        .filter((doc) => {
          const statusMatch = filters.status === "All" || doc.status === filters.status;
          const categoryMatch = filters.category === "All" || doc.category === filters.category;
          const sourceMatch = filters.source === "All" || doc.source === filters.source;
          const supplierMatch =
            filters.supplier.trim().length === 0 ||
            doc.supplier.toLowerCase().includes(filters.supplier.trim().toLowerCase());
          return statusMatch && categoryMatch && sourceMatch && supplierMatch;
        }),
    [invoices, filters],
  );

  const selectedDoc = useMemo(
    () => invoices.find((doc) => doc.id === selectedDocId) ?? null,
    [invoices, selectedDocId],
  );

  const apiBases = (() => {
    if (typeof window === "undefined") return [""];
    const isDev = window.location.port === "5175" || window.location.hostname === "localhost";
    return isDev ? [""] : ["/cashflow-api", "http://185.151.29.141:3002"];
  })();

  const toggleEmailStatus = () => {
    setEmailConnected((prev) => !prev);
    setEmailPaused(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
      setUploadStatus("uploading");
      setUploadMessage("Uploading invoice…");
      try {
        const endpoints = apiBases.map((base) => `${base}/api/upload-invoice`);
        let success = false;
        let data: any = null;

        for (const url of endpoints) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(url, {
              method: "POST",
              body: formData,
            });
            if (!response.ok) {
              console.error("Upload failed", response.status, "at", url);
              continue;
            }
            data = await response.json();
            success = true;
            break;
          } catch (err) {
            console.error("Upload error at", url, err);
          }
        }

        if (!success) {
          setUploadStatus("error");
          setUploadMessage("Upload failed. Please try again.");
          return;
        }

        console.log("Upload success:", data);
        setUploadStatus("success");
        setUploadMessage("File uploaded successfully.");
        if (data?.invoice && onInvoiceCreatedFromUpload) {
          onInvoiceCreatedFromUpload(data.invoice as Invoice);
        }
      } catch (error) {
        console.error("Upload error", error);
        setUploadStatus("error");
        setUploadMessage("Upload failed. Please check your connection and try again.");
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-cyan-600">Documents</p>
        <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
        <p className="text-slate-500">Keep every invoice in one place. AI reads them for you and keeps cashflow current.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div
            className="flex h-full flex-col rounded-2xl border border-dashed border-cyan-200 bg-slate-50/80 p-6 shadow-sm"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,image/*"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 shadow-sm">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-900">Drop invoices here or click to upload</p>
                <p className="text-sm text-slate-500">
                  PDF, JPG, PNG, DOCX supported. Every file is scanned by AI and added to your cashflow view automatically.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-600"
                  onClick={handleFileSelect}
                  type="button"
                >
                  Click to upload
                </button>
                <button
                  className="rounded-lg border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-cyan-50"
                  onClick={handleFileSelect}
                  type="button"
                >
                  Browse folder
                </button>
              </div>
              {uploadStatus !== "idle" && uploadMessage && (
                <p className="text-sm text-slate-600">{uploadMessage}</p>
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="h-full rounded-2xl border border-cyan-200 bg-white p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">Automatic email capture</p>
                <p className="text-sm text-slate-500">Kalyan AI monitors your invoice inbox and files new bills without manual work.</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  emailConnected ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                <span className="mr-1 h-2 w-2 rounded-full bg-current opacity-80" />
                {emailConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <button
              className="w-full rounded-lg border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm hover:bg-cyan-50"
              onClick={toggleEmailStatus}
            >
              {emailConnected ? "Reconnect inbox" : "Connect email inbox"}
            </button>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-cyan-600" />
                <span className="font-medium text-slate-800">Email capture status</span>
              </div>
              <button
                className={`rounded-full px-3 py-1 text-xs font-semibold ${emailPaused ? "bg-slate-200 text-slate-700" : "bg-cyan-500 text-white shadow-sm"}`}
                onClick={() => setEmailPaused((prev) => !prev)}
              >
                {emailPaused ? "Paused" : "Active"}
              </button>
            </div>
            <button
              className="w-full rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
              onClick={() => setEmailConnected((prev) => !prev)}
            >
              {emailConnected ? "Disconnect" : "Reconnect"} inbox
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-5 text-sm">
            <div className="md:col-span-1">
              <p className="text-xs uppercase text-slate-500">Date range</p>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={filters.dateRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value as DateRangeFilter }))}
              >
                <option value="last_30_days">Last 30 days</option>
                <option value="last_90_days">Last 90 days</option>
                <option value="last_12_months">Last 12 months</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Status</p>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                {["All", "Upcoming", "Overdue", "Paid", "Due soon"].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Supplier</p>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={filters.supplier}
                onChange={(e) => setFilters((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Search supplier"
              />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Category</p>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              >
                {["All", "Rent", "Utilities", "Marketing", "Staff", "Software", "Other"].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Source</p>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                value={filters.source}
                onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
              >
                {["All", "Upload", "Email"].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Date", "Supplier", "Invoice #", "Amount", "Due date", "Status", "Category", "Source", "Actions"].map((col) => (
                    <th key={col} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 text-slate-600">{formatInvoiceDate(getIssueDate(doc))}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{doc.supplier}</td>
                    <td className="px-3 py-3 text-slate-600">{doc.invoiceNumber}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{currency.format(doc.amount)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatInvoiceDate(getDueDate(doc))}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[doc.status as Extract<InvoiceStatus, "Overdue" | "Due soon" | "Upcoming" | "Paid">]
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{doc.category}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceStyles[doc.source]}`}>
                        {doc.source}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button className="text-cyan-700 hover:text-cyan-800" onClick={() => setSelectedDocId(doc.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 p-2">
          <div className="h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedDoc.supplier} · {selectedDoc.invoiceNumber}
                </p>
                <p className="text-sm text-slate-500">AI pulled the details for you. Review, adjust, and move on.</p>
              </div>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setSelectedDocId(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-xs text-slate-500">Supplier</p>
                  <p className="font-semibold text-slate-900">{selectedDoc.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Status</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      statusStyles[selectedDoc.status as Extract<InvoiceStatus, "Overdue" | "Due soon" | "Upcoming" | "Paid">]
                    }`}
                  >
                    {selectedDoc.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Source</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sourceStyles[selectedDoc.source]}`}>
                    {selectedDoc.source}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-semibold text-slate-900">{currency.format(selectedDoc.amount)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Financial details</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Issue date</p>
                    <p className="font-medium text-slate-900">{formatInvoiceDate(getIssueDate(selectedDoc))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Due date</p>
                    <p className="font-medium text-slate-900">{formatInvoiceDate(getDueDate(selectedDoc))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Subtotal</p>
                    <p className="font-medium text-slate-900">{currency.format(selectedDoc.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tax</p>
                    <p className="font-medium text-slate-900">{currency.format(selectedDoc.tax)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorisation</p>
                <div className="mt-3 space-y-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Category</span>
                    <select className="rounded-lg border border-slate-200 px-3 py-2" defaultValue={selectedDoc.category}>
                      {["Rent", "Utilities", "Marketing", "Staff", "Software", "Other"].map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Notes</span>
                    <textarea
                      className="rounded-lg border border-slate-200 px-3 py-2"
                      rows={3}
                      defaultValue={selectedDoc.notes ?? "Add internal context or routing notes here."}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI extraction</p>
                <div className="mt-3 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
                    <span>Amount due</span>
                    <span className="text-sm font-semibold">{currency.format(selectedDoc.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
                    <span>PO / invoice</span>
                    <span className="text-sm font-semibold">{selectedDoc.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
                    <span>Confidence</span>
                    <span className="text-sm font-semibold">92%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original document</p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <FileText className="h-4 w-4 text-cyan-600" />
                    <span>View or download original file</span>
                  </div>
                  <button className="rounded-lg border border-cyan-200 bg-white px-3 py-1 text-sm font-semibold text-cyan-700 hover:bg-cyan-50">
                    Open
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
                  onClick={() => onMarkPaid(selectedDoc.id)}
                >
                  Mark as paid
                </button>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    if (onArchiveInvoice) {
                      onArchiveInvoice(selectedDoc.id);
                    } else {
                      onArchive(selectedDoc.id);
                    }
                    setSelectedDocId(null);
                  }}
                >
                  Archive
                </button>
                <button className="text-slate-700 hover:text-slate-900" onClick={() => setSelectedDocId(null)}>
                  Close
                </button>
                {selectedDoc.status === "Paid" && (
                  <span className="text-sm font-semibold text-emerald-600">Marked as paid.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
