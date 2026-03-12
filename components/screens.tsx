"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  deleteApiData,
  getApiData,
  patchApiData,
  postApiData,
} from "../lib/api";
import {
  clearStoredSession,
  getStoredSession,
  type AuthSession,
} from "../lib/auth";
import {
  formatCount,
  formatCurrency,
  formatDateLabel,
  formatPercent,
  formatShortDay,
} from "../lib/format";

type ThemeMode = "light" | "dark";
type MetricTone = "positive" | "warning" | "info" | "danger" | "neutral";
type DataStatus = "loading" | "live" | "error";
type SalesTrendRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

type Metric = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricTone;
};

type Pill = {
  label: string;
  active?: boolean;
};

type RowItem = {
  title: string;
  meta: string;
  value?: string;
  badge?: string;
  tone?: MetricTone;
};

type ProgressItem = {
  label: string;
  value: string;
  percent: number;
  tone?: MetricTone;
};

type QuickAction = {
  label: string;
  helper: string;
};

type IconName =
  | "dashboard"
  | "transactions"
  | "menu"
  | "customers"
  | "expenses"
  | "reports"
  | "settings"
  | "bell"
  | "logout"
  | "trend"
  | "receipt"
  | "bank"
  | "bag";

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: IconName;
};

type DashboardOverviewPayload = {
  metrics: {
    total_sales: number;
    total_expenses: number;
    net_profit: number;
    transaction_count: number;
  };
  sales_trend: Array<{ period: string; total: number | string }>;
  payment_breakdown: Array<{ name: string | null; total: number | string }>;
  top_products: Array<{
    name: string;
    total_quantity: number | string;
    revenue: number | string;
  }>;
  recent_expenses: ExpenseRecord[];
};

type DashboardScreenPayload = {
  theme: string;
  overview: DashboardOverviewPayload;
};

type OrderItemRecord = {
  id: number;
  quantity: number;
  unit_price?: number | string;
  extra_price?: number | string;
  subtotal: number | string;
  notes?: string | null;
  product?: { id: number; name: string };
  variant?: { id: number; variant_name: string | null } | null;
};

type OrderRecord = {
  id: number;
  order_date: string;
  order_type: string;
  table_no: string | null;
  status: string;
  total_amount: number | string;
  discount_value: number | string;
  final_total: number | string;
  notes?: string | null;
  user?: { id: number; name: string | null } | null;
  customer?: { id: number; name: string | null } | null;
  payment_method?: { id: number; name: string | null } | null;
  paymentMethod?: { id: number; name: string | null } | null;
  items: OrderItemRecord[];
};

type TransaksiPayload = {
  metrics: {
    active_orders: number;
    pending_payment: number;
    completed_transactions: number;
  };
  orders: OrderRecord[];
  payment_breakdown: Array<{ name: string; orders_count: number }>;
  cashier_summary: Array<{ name: string; transaction_count: number }>;
};

type VariantRecord = {
  id: number;
  variant_name: string;
  extra_price: number | string;
};

type ProductRecord = {
  id: number;
  name: string;
  description: string;
  base_price: number | string;
  category: string;
  image_url?: string | null;
  is_active: boolean;
  variants?: VariantRecord[];
};

type CategoryRecord = {
  id: number;
  name: string;
};

type PaymentMethodRecord = {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
};

type UserRecord = {
  id: number;
  name: string;
  email?: string;
  role: string;
  created_at?: string;
};

type MenuPayload = {
  metrics: {
    total_products: number;
    active_variants: number;
    active_categories: number;
  };
  categories: CategoryRecord[];
  products: ProductRecord[];
  category_breakdown: Array<{ category: string; total: number | string }>;
  popular_variants: Array<{
    variant_name: string;
    usage_count: number | string;
  }>;
};

type CustomerRecord = {
  id: number;
  name: string;
  address?: string | null;
  phone_number?: string | null;
  orders_count?: number;
  orders_sum_final_total?: number | string | null;
};

type CustomerPayload = {
  metrics: {
    total_customers: number;
    repeat_order_rate: number;
  };
  priority_customers: CustomerRecord[];
  latest_feedback: {
    source: string;
    message: string;
  };
};

type CustomerOrderFilter = "all" | "ordered" | "repeat" | "no-order";
type CustomerSortKey =
  | "name"
  | "phone_number"
  | "orders_count"
  | "orders_sum_final_total";

type ExpenseRecord = {
  id: number;
  description: string;
  amount: number | string;
  expense_date: string;
  category: string;
  status: string;
  user?: { id: number; name: string } | null;
};

type PengeluaranPayload = {
  metrics: {
    total_expenses: number;
    pending_approval: number;
  };
  expenses: ExpenseRecord[];
  users: UserRecord[];
  by_category: Array<{ category: string; total: number | string }>;
};

type LaporanPayload = {
  summary: DashboardOverviewPayload;
  channel_mix: {
    channel_mix: Array<{
      order_type: string;
      total_orders: number;
      total_amount: number | string;
    }>;
    daily_profit: Array<{
      period: string;
      sales_total: number | string;
      expense_total: number | string;
    }>;
  };
};

type PengaturanPayload = {
  outlet: {
    name: string;
    address: string;
    operational_hours: string;
  };
  payment_methods: PaymentMethodRecord[];
  devices: Array<{ name: string; status: string }>;
  notifications: {
    low_stock_alert: boolean;
    daily_sales_summary: boolean;
    large_expense_approval: boolean;
  };
};

type KasirPayload = {
  cashier: {
    id: number;
    name: string;
    role: string;
    shift_label: string;
  } | null;
  meta: {
    draft_code: string;
    tax_rate: number;
    sync_status: string;
    version: string;
  };
  categories: string[];
  products: ProductRecord[];
  customers: CustomerRecord[];
  payment_methods: PaymentMethodRecord[];
  recent_orders: OrderRecord[];
};

type CollectionResponse<T> = {
  data: T[];
};

type MutationResponse<T> = {
  message: string;
  data?: T;
};

type ProductVariantDraft = {
  clientKey: string;
  id?: number;
  variant_name: string;
  extra_price: string;
};

type ProductDraft = {
  name: string;
  description: string;
  category: string;
  base_price: string;
  image_url: string;
  image_file: File | null;
  remove_image: boolean;
  is_active: boolean;
  variants: ProductVariantDraft[];
};

type CustomerDraft = {
  name: string;
  address: string;
  phone_number: string;
};

type ExpenseDraft = {
  user_id: string;
  description: string;
  amount: string;
  expense_date: string;
  category: string;
  status: string;
};

type PaymentMethodDraft = {
  name: string;
  type: string;
  is_active: boolean;
};

type UserDraft = {
  name: string;
  email: string;
  password: string;
  role: string;
};

type CategoryDraft = {
  name: string;
};

type CartLine = {
  key: string;
  product_id: number;
  name: string;
  category: string;
  quantity: number;
  base_price: number;
  variant_id: number | null;
  variant_name: string | null;
  extra_price: number;
  variants: VariantRecord[];
};

type ReceiptLine = {
  name: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type ReceiptPrintPayload = {
  order_label: string;
  order_date: string;
  order_type: string;
  cashier_name: string;
  customer_name: string;
  payment_method_name: string;
  items: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
};

const adminNav: NavItem[] = [
  {
    key: "dashboard-light",
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
  },
  { key: "kasir", label: "Kasir", path: "/kasir", icon: "transactions" },
  { key: "menu", label: "Manajemen Menu", path: "/menu", icon: "menu" },
  {
    key: "pengeluaran",
    label: "Pengeluaran",
    path: "/pengeluaran",
    icon: "expenses",
  },
  {
    key: "transaksi",
    label: "Transaksi",
    path: "/transaksi",
    icon: "transactions",
  },
  { key: "laporan", label: "Laporan", path: "/laporan", icon: "reports" },
  { key: "customer", label: "Pelanggan", path: "/customer", icon: "customers" },
  {
    key: "pengaturan",
    label: "Pengaturan",
    path: "/pengaturan",
    icon: "settings",
  },
];

const periodTabs: Pill[] = [
  { label: "Hari Ini", active: true },
  { label: "7 Hari" },
  { label: "Bulan Ini" },
];

const quickActions: QuickAction[] = [
  {
    label: "Sinkronkan data backend",
    helper: "Tarik ringkasan terbaru dari Laravel API.",
  },
  {
    label: "Cek transaksi tertunda",
    helper: "Lihat order yang belum selesai dibayar.",
  },
  {
    label: "Pantau performa outlet",
    helper: "Bandingkan penjualan, produk, dan pengeluaran.",
  },
];

function emptyVariantDraft(): ProductVariantDraft {
  return { clientKey: crypto.randomUUID(), variant_name: "", extra_price: "0" };
}

function emptyProductDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    category: "Makanan",
    base_price: "0",
    image_url: "",
    image_file: null,
    remove_image: false,
    is_active: true,
    variants: [emptyVariantDraft()],
  };
}

function emptyCategoryDraft(): CategoryDraft {
  return {
    name: "Makanan",
  };
}

function emptyCustomerDraft(): CustomerDraft {
  return {
    name: "",
    address: "",
    phone_number: "",
  };
}

function emptyExpenseDraft(defaultUserId = ""): ExpenseDraft {
  return {
    user_id: defaultUserId,
    description: "",
    amount: "0",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Operasional",
    status: "pending",
  };
}

function emptyPaymentMethodDraft(): PaymentMethodDraft {
  return {
    name: "",
    type: "cash",
    is_active: true,
  };
}

function emptyUserDraft(): UserDraft {
  return {
    name: "",
    email: "",
    password: "",
    role: "cashier",
  };
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function customerSearchHaystack(customer: CustomerRecord): string {
  return [customer.name, customer.address ?? "", customer.phone_number ?? ""]
    .join(" ")
    .toLowerCase();
}

function isCashPaymentMethod(method: PaymentMethodRecord | null): boolean {
  if (!method) {
    return false;
  }

  const normalize = (value: string | null | undefined) =>
    (value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const type = normalize(method.type);
  const name = normalize(method.name);

  if (type === "cash" || type === "tunai") {
    return true;
  }

  if (name === "cash" || name === "tunai") {
    return true;
  }

  if (name.startsWith("tunai ") || name.startsWith("cash ")) {
    return true;
  }

  return false;
}

type DeleteConfirmPayload = {
  itemLabel: string;
  onConfirm: () => void | Promise<void>;
};

function useDeleteConfirmation(): {
  requestDelete: (
    itemLabel: string,
    onConfirm: () => void | Promise<void>,
  ) => void;
  deleteConfirmDialog: ReactNode;
} {
  const [payload, setPayload] = useState<DeleteConfirmPayload | null>(null);

  function closeDeleteConfirm() {
    setPayload(null);
  }

  function requestDelete(
    itemLabel: string,
    onConfirm: () => void | Promise<void>,
  ) {
    setPayload({
      itemLabel: itemLabel.trim() || "item ini",
      onConfirm,
    });
  }

  function handleConfirmDelete() {
    if (!payload) {
      return;
    }

    const action = payload.onConfirm;
    setPayload(null);
    void action();
  }

  return {
    requestDelete,
    deleteConfirmDialog: payload ? (
      <div className="receipt-modal-backdrop" role="presentation">
        <section
          className="receipt-modal section-card confirm-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Hapus"
        >
          <div className="section-header mb-2">
            <h3>Konfirmasi Hapus</h3>
            <p>Pastikan item yang dipilih benar sebelum menghapus.</p>
          </div>
          <div className="confirm-delete-modal__sheet">
            <p className="confirm-delete-modal__text">
              {`Yakin ingin menghapus ${payload.itemLabel}?`}
            </p>
            <p className="confirm-delete-modal__hint">
              Data yang dihapus tidak dapat dikembalikan.
            </p>
          </div>
          <div className="form-actions mt-2">
            <button
              className="danger-btn"
              type="button"
              onClick={handleConfirmDelete}
            >
              Ya, Hapus
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={closeDeleteConfirm}
            >
              Batal
            </button>
          </div>
        </section>
      </div>
    ) : null,
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function statusTone(status: string | null | undefined): MetricTone {
  const normalized = (status ?? "").toLowerCase();
  if (
    normalized.includes("complete") ||
    normalized.includes("approve") ||
    normalized.includes("paid") ||
    normalized.includes("online") ||
    normalized.includes("active") ||
    normalized.includes("sync")
  ) {
    return "positive";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("process") ||
    normalized.includes("check")
  ) {
    return "warning";
  }
  if (
    normalized.includes("cancel") ||
    normalized.includes("fail") ||
    normalized.includes("offline")
  ) {
    return "danger";
  }
  return "info";
}

function statusClassName(tone: MetricTone): string {
  switch (tone) {
    case "positive":
      return "status-badge status-badge--positive";
    case "warning":
      return "status-badge status-badge--warning";
    case "danger":
      return "status-badge status-badge--danger";
    case "info":
      return "status-badge status-badge--info";
    default:
      return "status-badge";
  }
}

function progressFillClassName(tone: MetricTone): string {
  return `progress-fill progress-fill--${tone}`;
}

function metricToneClassName(tone: MetricTone | undefined): string {
  return tone ? `tone-${tone}` : "tone-neutral";
}

function paymentMethodName(order: OrderRecord): string {
  return (
    order.payment_method?.name ?? order.paymentMethod?.name ?? "Belum dipilih"
  );
}

function itemSummary(order: OrderRecord): string {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${formatCount(totalItems)} item • ${paymentMethodName(order)}`;
}

function initials(name: string | null | undefined): string {
  const source = (name ?? "Guest").trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]).join("") || "G").toUpperCase();
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  const svgIcons: Partial<Record<IconName, string>> = {
    menu: "/icons/menu.svg",
    // nanti bisa tambah:
    dashboard: "/icons/dashboard.svg",
    transactions: "/icons/kasir.svg",
    reports: "/icons/laporan.svg",
    customers: "/icons/customer.svg",
    settings: "/icons/setting.svg",
    expenses: "/icons/expense.svg",
  };

  const glyphs: Record<IconName, string> = {
    dashboard: "DB",
    transactions: "TR",
    menu: "MN",
    customers: "PL",
    expenses: "PG",
    reports: "LP",
    settings: "ST",
    bell: "NT",
    logout: "EX",
    trend: "+%",
    receipt: "RC",
    bank: "BN",
    bag: "BG",
  };

  const svgPath = svgIcons[name];
  if (svgPath) {
    return (
      <img src={svgPath} alt="" aria-hidden="true" className={className} />
    );
  }

  return (
    <span aria-hidden="true" className={className}>
      {glyphs[name]}
    </span>
  );
}

function normalizeNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cartLineUnitPrice(item: CartLine): number {
  return item.base_price + item.extra_price;
}

function cartLineSubtotal(item: CartLine): number {
  return cartLineUnitPrice(item) * item.quantity;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReceiptDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOrderTypeLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function buildReceiptPayloadFromOrder(
  order: OrderRecord,
  fallbackCashierName = "Kasir",
): ReceiptPrintPayload {
  const items = order.items.map((item) => {
    const quantity = Math.max(1, item.quantity);
    const subtotal = toNumber(item.subtotal);
    const unitPriceSource =
      toNumber(item.unit_price) + toNumber(item.extra_price);
    const unitPrice =
      unitPriceSource > 0 ? unitPriceSource : subtotal / Math.max(quantity, 1);

    return {
      name: item.product?.name ?? "Menu",
      variant: item.variant?.variant_name ?? item.notes ?? null,
      quantity,
      unit_price: unitPrice,
      subtotal,
    };
  });

  return {
    order_label: `#${order.id}`,
    order_date: formatReceiptDateTime(order.order_date),
    order_type: formatOrderTypeLabel(order.order_type),
    cashier_name: order.user?.name ?? fallbackCashierName,
    customer_name: order.customer?.name ?? "Walk-in",
    payment_method_name: paymentMethodName(order),
    items,
    subtotal: toNumber(order.total_amount),
    discount: toNumber(order.discount_value),
    total: toNumber(order.final_total),
    notes: order.notes ?? null,
  };
}

function buildReceiptPayloadFromCart(args: {
  cashierName: string;
  customerName: string;
  paymentMethodName: string;
  orderType: string;
  notes: string;
  cart: CartLine[];
  subtotal: number;
  discount: number;
  total: number;
}): ReceiptPrintPayload {
  return {
    order_label: "Draft",
    order_date: formatReceiptDateTime(new Date().toISOString()),
    order_type: formatOrderTypeLabel(args.orderType),
    cashier_name: args.cashierName,
    customer_name: args.customerName,
    payment_method_name: args.paymentMethodName,
    items: args.cart.map((item) => ({
      name: item.name,
      variant: item.variant_name,
      quantity: item.quantity,
      unit_price: cartLineUnitPrice(item),
      subtotal: cartLineSubtotal(item),
    })),
    subtotal: args.subtotal,
    discount: args.discount,
    total: args.total,
    notes: args.notes.trim() || null,
  };
}

function printReceipt(payload: ReceiptPrintPayload): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const receiptRows = payload.items
    .map(
      (item) => `
        <tr>
          <td>
            <div>${escapeHtml(item.name)}</div>
            ${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}
          </td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(formatCurrency(item.unit_price))}</td>
          <td>${escapeHtml(formatCurrency(item.subtotal))}</td>
        </tr>
      `,
    )
    .join("");

  const notesBlock = payload.notes
    ? `<div class="receipt-notes"><strong>Catatan:</strong> ${escapeHtml(payload.notes)}</div>`
    : "";
  const logoUrl = `${window.location.origin}/assets/logo-sate-ayam-bento.svg`;

  const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Struk ${escapeHtml(payload.order_label)}</title>
    <style>
      @page { size: 80mm auto; margin: 2mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Courier New', monospace;
        color: #0f172a;
        font-size: 11px;
        line-height: 1.35;
      }
      .receipt {
        width: 76mm;
        margin: 0 auto;
        padding: 1mm 0;
      }
      .header {
        text-align: center;
      }
      .logo {
        width: 102px;
        max-width: 68%;
        height: auto;
        display: block;
        margin: 0 auto 3px;
      }
      .title {
        margin: 0;
        font-size: 13px;
        letter-spacing: 0.2px;
      }
      .muted {
        color: #475569;
        margin: 1px 0;
      }
      p {
        margin: 2px 0;
      }
      .divider {
        border-top: 1px dashed #1e293b;
        margin: 7px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
      }
      th,
      td {
        padding: 3px 0;
        text-align: left;
        vertical-align: top;
      }
      th {
        font-size: 10px;
      }
      th:nth-child(2),
      td:nth-child(2) {
        width: 24px;
        text-align: center;
      }
      th:nth-child(3),
      td:nth-child(3),
      th:nth-child(4),
      td:nth-child(4) {
        text-align: right;
        white-space: nowrap;
      }
      small {
        display: block;
        color: #64748b;
        font-size: 10px;
      }
      .totals p {
        display: flex;
        justify-content: space-between;
      }
      .totals p strong {
        font-size: 12px;
      }
      .receipt-notes {
        margin-top: 6px;
      }
      .footer {
        margin-top: 8px;
        text-align: center;
        font-size: 10px;
      }
      @media print {
        html,
        body {
          width: 80mm;
        }
      }
    </style>
  </head>
  <body>
    <section class="receipt">
      <header class="header">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Sate Ayam Bento" />
        <h1 class="title">Struk Pembayaran</h1>
        <p class="muted">Sate Ayam Bento</p>
      </header>
      <div class="divider"></div>
      <p><strong>Order:</strong> ${escapeHtml(payload.order_label)}</p>
      <p><strong>Waktu:</strong> ${escapeHtml(payload.order_date)}</p>
      <p><strong>Kasir:</strong> ${escapeHtml(payload.cashier_name)}</p>
      <p><strong>Pelanggan:</strong> ${escapeHtml(payload.customer_name)}</p>
      <p><strong>Tipe:</strong> ${escapeHtml(payload.order_type)}</p>
      <p><strong>Bayar:</strong> ${escapeHtml(payload.payment_method_name)}</p>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Harga</th>
            <th>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${receiptRows}
        </tbody>
      </table>
      <div class="divider"></div>
      <div class="totals">
        <p><span>Subtotal</span><span>${escapeHtml(formatCurrency(payload.subtotal))}</span></p>
        <p><span>Diskon</span><span>- ${escapeHtml(formatCurrency(payload.discount))}</span></p>
        <p><strong>Total</strong><strong>${escapeHtml(formatCurrency(payload.total))}</strong></p>
      </div>
      ${notesBlock}
      <div class="divider"></div>
      <p class="footer">Terima kasih sudah berbelanja.</p>
    </section>
  </body>
</html>`;

  const printWindow = window.open(
    "about:blank",
    "_blank",
    "width=420,height=720",
  );
  if (!printWindow) {
    return false;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 400);
    };

    if (printWindow.document.readyState === "complete") {
      setTimeout(triggerPrint, 80);
    } else {
      printWindow.addEventListener("load", () => {
        setTimeout(triggerPrint, 80);
      });
    }
  } catch {
    if (!printWindow.closed) {
      printWindow.close();
    }
    return false;
  }

  return true;
}

function useScreenData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<DataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        const payload = await getApiData<T>(path);
        if (!active || reloadKey < 0) {
          return;
        }

        setData(payload);
        setStatus("live");
      } catch (caughtError) {
        if (!active || reloadKey < 0) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unknown API error";
        setError(message);
        setStatus("error");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [path, reloadKey]);

  return {
    data,
    status,
    error,
    reload: () => setReloadKey((value) => value + 1),
  };
}

function useResourceCollection<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<DataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        const payload = await getApiData<CollectionResponse<T>>(path);
        if (!active || reloadKey < 0) {
          return;
        }

        setItems(payload.data);
        setStatus("live");
      } catch (caughtError) {
        if (!active || reloadKey < 0) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unknown API error";
        setError(message);
        setStatus("error");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [path, reloadKey]);

  return {
    items,
    setItems,
    status,
    error,
    reload: () => setReloadKey((value) => value + 1),
  };
}

function AppShell({
  title,
  subtitle,
  status,
  children,
}: {
  title: string;
  subtitle: string;
  status: DataStatus;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCompactNavigation, setIsCompactNavigation] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession) {
      router.replace("/login");
      setIsAuthReady(true);
      return;
    }

    setSession(storedSession);
    setIsAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compactNavigationQuery = window.matchMedia(
      "(max-width: 768px), (max-width: 1024px) and (orientation: portrait)",
    );
    const applyViewportMode = () => {
      setIsCompactNavigation(compactNavigationQuery.matches);
      if (!compactNavigationQuery.matches) {
        setIsSidebarOpen(false);
      }
    };

    applyViewportMode();
    compactNavigationQuery.addEventListener("change", applyViewportMode);

    return () => {
      compactNavigationQuery.removeEventListener("change", applyViewportMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isCompactNavigation || !isSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCompactNavigation, isSidebarOpen]);

  function handleSignOut() {
    setIsSidebarOpen(false);
    clearStoredSession();
    setSession(null);
    router.replace("/login");
  }

  if (!isAuthReady || !session) {
    return (
      <main className="loading-shell" aria-live="polite">
        <div className="loading-spinner" />
      </main>
    );
  }

  return (
    <div className="app-frame">
      <button
        className={
          isCompactNavigation && isSidebarOpen
            ? "sidebar-overlay sidebar-overlay--visible"
            : "sidebar-overlay"
        }
        type="button"
        aria-label="Tutup menu navigasi"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        id="app-sidebar"
        className={
          isSidebarOpen
            ? "sidebar sidebar--drawer sidebar--open"
            : "sidebar sidebar--drawer"
        }
        aria-hidden={isCompactNavigation && !isSidebarOpen}
      >
        <div className="sidebar-main">
          <div className="brand-block">
            {/* <div className="brand-logo">
              <Icon name="menu" className="brand-logo__icon" />
            </div> */}
            <div>
              <div className="brand-mark">Point of Sales</div>
              <h1 className="brand-title">
                SateAyam<span>Bento</span>
              </h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            {adminNav.map((item) => (
              <Link
                key={item.key}
                href={item.path}
                className={
                  pathname === item.path
                    ? "nav-link nav-link--active"
                    : "nav-link"
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} className="nav-icon__svg" />
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="logout-link" type="button" onClick={handleSignOut}>
            <Icon name="logout" className="logout-link__icon" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <main className="content-area">
        <div className="topbar">
          <div className="topbar-copy">
            <button
              className={
                isSidebarOpen
                  ? "sidebar-toggle sidebar-toggle--active"
                  : "sidebar-toggle"
              }
              type="button"
              aria-controls="app-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={
                isSidebarOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
              }
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              <span className="sidebar-toggle__bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>{isSidebarOpen ? "Tutup Menu" : ""}</span>
            </button>
            <h2 className="page-title">{title}</h2>
            <p className="page-subtitle">
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="profile-chip">
              <div>
                <strong>{session.user.name}</strong>
              </div>
              <div className="profile-avatar">
                {initials(session.user.name)}
              </div>
            </div>
          </div>
        </div>

        <section className="page-intro section-card">
          <div>
            <div className="eyebrow">Operational dashboard</div>
            <h3 className="section-title">{subtitle}</h3>
          </div>
          <div className="page-intro__side">
            <div
              className={statusClassName(
                status === "live"
                  ? "positive"
                  : status === "loading"
                    ? "warning"
                    : "danger",
              )}
            >
              {status}
            </div>
            <div className="date-chip">Outlet overview</div>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}

function ScreenState({
  status,
  error,
  children,
}: {
  status: DataStatus;
  error: string | null;
  children: ReactNode;
}) {
  if (status === "loading") {
    return (
      <section
        className="loading-panel"
        aria-live="polite"
        aria-label="Loading content"
      >
        <div className="loading-spinner" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="section-card">
        <div className="section-header">
          <h3>Koneksi backend gagal</h3>
          <p>
            {error ??
              "Periksa BACKEND_API_BASE_URL dan pastikan Laravel berjalan."}
          </p>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const iconMap: IconName[] = ["trend", "receipt", "bank", "bag"];

  return (
    <section className="metric-grid">
      {metrics.map((metric, index) => (
        <article key={metric.label} className="metric-card">
          <div className="metric-card__head">
            <div className="metric-icon">
              <Icon
                name={iconMap[index % iconMap.length]}
                className="metric-icon__svg"
              />
            </div>
            <em className={metricToneClassName(metric.tone)}>{metric.hint}</em>
          </div>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </section>
  );
}

function RowList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: RowItem[];
}) {
  const seenRowKeys = new Map<string, number>();

  return (
    <section className="section-card">
      <div className="section-header">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="list-stack">
        {rows.map((row) => {
          const baseKey = `${row.title}-${row.meta}-${row.value ?? ""}-${row.badge ?? ""}`;
          const occurrence = seenRowKeys.get(baseKey) ?? 0;
          seenRowKeys.set(baseKey, occurrence + 1);

          return (
            <div key={`${baseKey}-${occurrence}`} className="list-row">
              <div>
                <strong>{row.title}</strong>
                <p>{row.meta}</p>
              </div>
              <div className="list-row__right">
                {row.value ? (
                  <span className="list-value">{row.value}</span>
                ) : null}
                {row.badge ? (
                  <span className={statusClassName(row.tone ?? "info")}>
                    {row.badge}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProgressList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ProgressItem[];
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="progress-stack">
        {items.map((item) => {
          const tone = item.tone ?? "info";
          return (
            <div key={item.label} className="progress-item">
              <div className="progress-head">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
              <div className="progress-track">
                <div
                  className={progressFillClassName(tone)}
                  style={{ width: `${clampPercent(item.percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SalesChart({
  items,
  range,
  rangeLabel,
  customDate,
  onRangeChange,
  onCustomDateChange,
  dark = false,
}: {
  items: Array<{ period: string; total: number | string }>;
  range: SalesTrendRangeKey;
  rangeLabel: string;
  customDate: string;
  onRangeChange: (value: SalesTrendRangeKey) => void;
  onCustomDateChange: (value: string) => void;
  dark?: boolean;
}) {
  const chartItems =
    items.length > 0
      ? items
      : [{ period: toDateInputValue(new Date()), total: 0 }];
  const maxValue = Math.max(
    ...chartItems.map((item) => toNumber(item.total)),
    1,
  );

  return (
    <section className="section-card section-card--accent">
      <div className="chart-head">
        <div className="section-header">
          <h3>Tren penjualan & laba</h3>
          <p>{`Ringkasan omzet untuk ${rangeLabel} berdasarkan transaksi terbaru.`}</p>
        </div>
        <div className="chart-controls">
          <select
            className="chart-range-select"
            value={range}
            onChange={(event) =>
              onRangeChange(event.target.value as SalesTrendRangeKey)
            }
          >
            <option value="today">Hari Ini</option>
            <option value="yesterday">Kemarin</option>
            <option value="last7">7 Hari Terakhir</option>
            <option value="last30">30 Hari Terakhir</option>
            <option value="custom">Custom Day</option>
          </select>
          {range === "custom" ? (
            <input
              className="chart-range-date"
              type="date"
              value={customDate}
              max={toDateInputValue(new Date())}
              onChange={(event) => onCustomDateChange(event.target.value)}
            />
          ) : null}
        </div>
      </div>
      <div className={dark ? "mini-chart mini-chart--dark" : "mini-chart"}>
        {chartItems.map((item) => {
          const percent = (toNumber(item.total) / maxValue) * 100;
          const style: CSSProperties = { height: `${Math.max(percent, 10)}%` };
          return (
            <div key={item.period} className="mini-chart__bar-wrap">
              <span>{formatCurrency(item.total)}</span>
              <div className="mini-chart__bar" style={style} />
              <span>{formatShortDay(item.period)}</span>
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span>
          <i className="chart-legend__dot chart-legend__dot--soft" />
          Penjualan Kotor
        </span>
        <span>
          <i className="chart-legend__dot" />
          Laba Bersih
        </span>
      </div>
    </section>
  );
}

function DashboardTransactionsTable({ orders }: { orders: OrderRecord[] }) {
  return (
    <section className="section-card transactions-card">
      <div className="transactions-card__head">
        <h3>Transaksi terbaru</h3>
        <Link href="/transaksi" className="transactions-card__link">
          Lihat selengkapnya
        </Link>
      </div>
      <div className="transactions-table-wrap">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>ID Transaksi</th>
              <th>Pelanggan</th>
              <th>Waktu</th>
              <th>Metode</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="customer-chip">
                    <span className="customer-chip__avatar">
                      {initials(order.customer?.name)}
                    </span>
                    <span>{order.customer?.name ?? "Walk-in"}</span>
                  </div>
                </td>
                <td>
                  {new Intl.DateTimeFormat("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(order.order_date))}{" "}
                  WIB
                </td>
                <td>{paymentMethodName(order)}</td>
                <td className="transactions-table__amount">
                  {formatCurrency(order.final_total)}
                </td>
                <td>
                  <span className={statusClassName(statusTone(order.status))}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuickGrid() {
  return (
    <section className="quick-grid">
      {quickActions.map((action) => (
        <article key={action.label} className="quick-action section-card">
          <span>Aksi cepat</span>
          <strong>{action.label}</strong>
          <p>{action.helper}</p>
        </article>
      ))}
    </section>
  );
}

function DashboardScreen({
  endpoint,
  forcedTheme,
}: {
  endpoint: string;
  forcedTheme: ThemeMode;
}) {
  const { data, status, error } =
    useScreenData<DashboardScreenPayload>(endpoint);
  const transaksiState = useScreenData<TransaksiPayload>("/screens/transaksi");
  const [salesRange, setSalesRange] = useState<SalesTrendRangeKey>("last7");
  const [customDate, setCustomDate] = useState<string>(() =>
    toDateInputValue(new Date()),
  );
  const [greetingName, setGreetingName] = useState("Admin");

  useEffect(() => {
    const session = getStoredSession();
    const currentName = session?.user?.name?.trim();
    if (currentName) {
      setGreetingName(currentName);
    }
  }, []);

  const salesRangeLabel = useMemo(() => {
    if (salesRange === "today") {
      return "hari ini";
    }
    if (salesRange === "yesterday") {
      return "kemarin";
    }
    if (salesRange === "last7") {
      return "7 hari terakhir";
    }
    if (salesRange === "last30") {
      return "30 hari terakhir";
    }

    const selectedDate = parseDateInput(customDate);
    return selectedDate
      ? `custom day (${formatDateLabel(toDateInputValue(selectedDate))})`
      : "custom day";
  }, [customDate, salesRange]);

  const salesTrendItems = useMemo<
    Array<{ period: string; total: number }>
  >(() => {
    const fallbackItems = (data?.overview.sales_trend ?? []).map((item) => ({
      period: item.period,
      total: toNumber(item.total),
    }));
    const orders = transaksiState.data?.orders ?? [];
    if (orders.length === 0) {
      return fallbackItems;
    }

    const today = startOfDay(new Date());
    let startDate = today;
    let endDate = endOfDay(today);

    if (salesRange === "yesterday") {
      startDate = addDays(today, -1);
      endDate = endOfDay(startDate);
    } else if (salesRange === "last7") {
      startDate = addDays(today, -6);
    } else if (salesRange === "last30") {
      startDate = addDays(today, -29);
    } else if (salesRange === "custom") {
      const selectedDate = parseDateInput(customDate) ?? today;
      startDate = startOfDay(selectedDate);
      endDate = endOfDay(selectedDate);
    }

    const groupedTotals = new Map<string, number>();
    orders.forEach((order) => {
      const orderDate = new Date(order.order_date);
      if (Number.isNaN(orderDate.getTime())) {
        return;
      }
      if (orderDate < startDate || orderDate > endDate) {
        return;
      }

      const dayKey = toDateInputValue(orderDate);
      groupedTotals.set(
        dayKey,
        (groupedTotals.get(dayKey) ?? 0) + toNumber(order.final_total),
      );
    });

    if (
      salesRange === "today" ||
      salesRange === "yesterday" ||
      salesRange === "custom"
    ) {
      const dayKey = toDateInputValue(startDate);
      return [{ period: dayKey, total: groupedTotals.get(dayKey) ?? 0 }];
    }

    const timeline: Array<{ period: string; total: number }> = [];
    for (
      let cursor = startOfDay(startDate);
      cursor <= endDate;
      cursor = addDays(cursor, 1)
    ) {
      const dayKey = toDateInputValue(cursor);
      timeline.push({ period: dayKey, total: groupedTotals.get(dayKey) ?? 0 });
    }

    return timeline;
  }, [customDate, data, salesRange, transaksiState.data]);

  const metrics = useMemo<Metric[]>(() => {
    if (!data) {
      return [];
    }

    const overview = data.overview;
    return [
      {
        label: "Penjualan",
        value: formatCurrency(overview.metrics.total_sales),
        hint: "Akumulasi transaksi yang tercatat",
        tone: "positive",
      },
      {
        label: "Pengeluaran",
        value: formatCurrency(overview.metrics.total_expenses),
        hint: "Belanja operasional outlet",
        tone: "warning",
      },
      {
        label: "Laba bersih",
        value: formatCurrency(overview.metrics.net_profit),
        hint: "Penjualan dikurangi pengeluaran",
        tone: overview.metrics.net_profit >= 0 ? "positive" : "danger",
      },
      {
        label: "Transaksi",
        value: formatCount(overview.metrics.transaction_count),
        hint: "Jumlah order pada data saat ini",
        tone: "info",
      },
    ];
  }, [data]);

  const topProducts = useMemo<RowItem[]>(() => {
    return (data?.overview.top_products ?? []).map((product) => ({
      title: product.name,
      meta: `${formatCount(product.total_quantity)} porsi terjual`,
      value: formatCurrency(product.revenue),
      badge: "Laris",
      tone: "positive",
    }));
  }, [data]);

  const paymentItems = useMemo<ProgressItem[]>(() => {
    const items = data?.overview.payment_breakdown ?? [];
    const total =
      items.reduce((sum, item) => sum + toNumber(item.total), 0) || 1;

    return items.map((item) => ({
      label: item.name ?? "Tanpa metode",
      value: formatCurrency(item.total),
      percent: (toNumber(item.total) / total) * 100,
      tone: "info",
    }));
  }, [data]);

  const expenseRows = useMemo<RowItem[]>(() => {
    return (data?.overview.recent_expenses ?? []).map((expense) => ({
      title: expense.description,
      meta: `${expense.category} • ${formatDateLabel(expense.expense_date)}`,
      value: formatCurrency(expense.amount),
      badge: expense.status,
      tone: statusTone(expense.status),
    }));
  }, [data]);

  return (
    <AppShell
      title={
        forcedTheme === "dark"
          ? "Dashboard Dark"
          : `Selamat Datang, ${greetingName}`
      }
      subtitle=""
      status={status}
    >
      <ScreenState status={status} error={error}>
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <div className="dashboard-grid dashboard-grid--hero">
            <SalesChart
              items={salesTrendItems}
              range={salesRange}
              rangeLabel={salesRangeLabel}
              customDate={customDate}
              onRangeChange={setSalesRange}
              onCustomDateChange={setCustomDate}
              dark={forcedTheme === "dark"}
            />
            <ProgressList
              title="Produk terlaris"
              subtitle="Kontribusi menu dengan pendapatan tertinggi."
              items={topProducts.map((product, index) => ({
                label: product.title,
                value: product.meta,
                percent: Math.max(30, 85 - index * 17),
                tone: "positive",
              }))}
            />
          </div>
          <div className="dashboard-grid dashboard-grid--double">
            <ProgressList
              title="Metode pembayaran"
              subtitle="Distribusi nominal pembayaran per channel."
              items={paymentItems}
            />
            <RowList
              title="Pengeluaran terbaru"
              subtitle="Biaya terbaru yang ikut memengaruhi margin outlet."
              rows={expenseRows}
            />
          </div>
          {transaksiState.data ? (
            <DashboardTransactionsTable
              orders={transaksiState.data.orders.slice(0, 4)}
            />
          ) : null}
        </div>
      </ScreenState>
    </AppShell>
  );
}

function NoticeBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={
        tone === "success"
          ? "notice-banner notice-banner--success"
          : "notice-banner notice-banner--error"
      }
    >
      {message}
    </div>
  );
}

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="section-card form-card">
      <div className="section-header">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TransaksiLayout() {
  const screen = useScreenData<TransaksiPayload>("/screens/transaksi");
  const orders = useResourceCollection<OrderRecord>("/orders");
  const paymentMethods =
    useResourceCollection<PaymentMethodRecord>("/payment-methods");
  const [drafts, setDrafts] = useState<
    Record<number, { status: string; payment_method_id: string }>
  >({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  const metrics = useMemo<Metric[]>(() => {
    if (!screen.data) {
      return [];
    }

    return [
      {
        label: "Order aktif",
        value: formatCount(screen.data.metrics.active_orders),
        hint: "Status selain completed",
        tone: "warning",
      },
      {
        label: "Menunggu bayar",
        value: formatCount(screen.data.metrics.pending_payment),
        hint: "Butuh follow-up kasir",
        tone: "danger",
      },
      {
        label: "Selesai",
        value: formatCount(screen.data.metrics.completed_transactions),
        hint: "Order dengan status completed",
        tone: "positive",
      },
    ];
  }, [screen.data]);

  const paymentItems = useMemo<ProgressItem[]>(() => {
    const items = screen.data?.payment_breakdown ?? [];
    const total = items.reduce((sum, item) => sum + item.orders_count, 0) || 1;

    return items.map((item) => ({
      label: item.name,
      value: `${formatCount(item.orders_count)} order`,
      percent: (item.orders_count / total) * 100,
      tone: "info",
    }));
  }, [screen.data]);

  const cashierRows = useMemo<RowItem[]>(() => {
    return (screen.data?.cashier_summary ?? []).map((cashier) => ({
      title: cashier.name,
      meta: "Aktivitas kasir dari data transaksi terbaru",
      value: `${formatCount(cashier.transaction_count)} order`,
      badge: "Kasir aktif",
      tone: "positive",
    }));
  }, [screen.data]);

  const orderItems =
    orders.items.length > 0 ? orders.items : (screen.data?.orders ?? []);

  async function persistOrder(order: OrderRecord) {
    const draft = drafts[order.id];

    try {
      const response = await patchApiData<MutationResponse<OrderRecord>>(
        `/orders/${order.id}`,
        {
          status: draft?.status ?? order.status,
          payment_method_id: draft?.payment_method_id
            ? Number(draft.payment_method_id)
            : (order.payment_method?.id ?? order.paymentMethod?.id ?? null),
        },
      );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      orders.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal memperbarui order.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeOrder(orderId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/orders/${orderId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      orders.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus order.",
      );
      setSuccessMessage(null);
    }
  }

  function handlePrintOrder(order: OrderRecord) {
    const printed = printReceipt(
      buildReceiptPayloadFromOrder(order, order.user?.name ?? "Kasir"),
    );

    if (!printed) {
      setErrorMessage(
        "Popup print diblokir browser. Izinkan popup untuk mencetak struk.",
      );
      return;
    }

    setErrorMessage(null);
  }

  return (
    <AppShell
      title="Transaksi"
      subtitle="Kelola order, status pembayaran, dan histori transaksi outlet."
      status={screen.status}
    >
      <ScreenState
        status={screen.status}
        error={screen.error ?? orders.error ?? paymentMethods.error}
      >
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          <div className="dashboard-grid dashboard-grid--double transaksi-layout-grid">
            <section className="section-card transactions-card transaksi-manage-card">
              <div className="transactions-card__head">
                <h3>Kelola Transaksi</h3>
                <span className="transactions-card__link">
                  Update status dan metode bayar
                </span>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pelanggan</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Metode</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((order) => {
                      const draft = drafts[order.id];
                      return (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.customer?.name ?? "Walk-in"}</td>
                          <td className="transactions-table__amount">
                            {formatCurrency(order.final_total)}
                          </td>
                          <td>
                            <select
                              className="text-input"
                              value={draft?.status ?? order.status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [order.id]: {
                                    status: event.target.value,
                                    payment_method_id:
                                      current[order.id]?.payment_method_id ??
                                      String(
                                        order.payment_method?.id ??
                                          order.paymentMethod?.id ??
                                          "",
                                      ),
                                  },
                                }))
                              }
                            >
                              <option value="pending">pending</option>
                              <option value="processing">processing</option>
                              <option value="completed">completed</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="text-input"
                              value={
                                draft?.payment_method_id ??
                                String(
                                  order.payment_method?.id ??
                                    order.paymentMethod?.id ??
                                    "",
                                )
                              }
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [order.id]: {
                                    status:
                                      current[order.id]?.status ?? order.status,
                                    payment_method_id: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="">Belum dipilih</option>
                              {paymentMethods.items.map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="inline-actions">
                              <button
                                className="secondary-btn"
                                type="button"
                                onClick={() => void persistOrder(order)}
                              >
                                Simpan
                              </button>
                              <button
                                className="ghost-btn"
                                type="button"
                                onClick={() => handlePrintOrder(order)}
                              >
                                Print
                              </button>
                              <button
                                className="danger-btn"
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    `order #${order.id} (${order.customer?.name ?? "Walk-in"})`,
                                    () => removeOrder(order.id),
                                  )
                                }
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="content-stack content-stack--compact transaksi-summary-stack">
              <ProgressList
                title="Metode Bayar"
                subtitle="Distribusi channel pembayaran terbaru."
                items={paymentItems}
              />
              <RowList
                title="Ringkasan Kasir"
                subtitle="Kasir dengan transaksi terbanyak pada dataset saat ini."
                rows={cashierRows}
              />
            </div>
          </div>
        </div>
      </ScreenState>
    </AppShell>
  );
}

function MenuLayout() {
  const screen = useScreenData<MenuPayload>("/screens/menu");
  const products = useResourceCollection<ProductRecord>("/products");
  const categories = useResourceCollection<CategoryRecord>("/categories");
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft());
  const [categoryDraft, setCategoryDraft] =
    useState<CategoryDraft>(emptyCategoryDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  const categoryItems =
    categories.items.length > 0
      ? categories.items
      : (screen.data?.categories ?? []);

  useEffect(() => {
    if (categoryItems.length === 0) {
      return;
    }

    const hasSelectedCategory = categoryItems.some(
      (category) => category.name === draft.category,
    );
    if (!hasSelectedCategory) {
      setDraft((current) => ({
        ...current,
        category: categoryItems[0]?.name ?? "Makanan",
      }));
    }
  }, [categoryItems, draft.category]);

  const metrics = useMemo<Metric[]>(() => {
    if (!screen.data) {
      return [];
    }

    return [
      {
        label: "Total produk",
        value: formatCount(screen.data.metrics.total_products),
        hint: "Seluruh item menu yang tersimpan",
        tone: "info",
      },
      {
        label: "Varian aktif",
        value: formatCount(screen.data.metrics.active_variants),
        hint: "Pilihan tambahan per menu",
        tone: "positive",
      },
      {
        label: "Kategori",
        value: formatCount(screen.data.metrics.active_categories),
        hint: "Grup menu yang saat ini tersedia",
        tone: "warning",
      },
    ];
  }, [screen.data]);

  const categoryBreakdownItems = useMemo<ProgressItem[]>(() => {
    const items = screen.data?.category_breakdown ?? [];
    const total =
      items.reduce((sum, item) => sum + toNumber(item.total), 0) || 1;

    return items.map((item) => ({
      label: item.category,
      value: `${formatCount(item.total)} produk`,
      percent: (toNumber(item.total) / total) * 100,
      tone: "info",
    }));
  }, [screen.data]);

  const productItems =
    products.items.length > 0 ? products.items : (screen.data?.products ?? []);

  function startProductEdit(product: ProductRecord) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      base_price: String(product.base_price),
      image_url: product.image_url ?? "",
      image_file: null,
      remove_image: false,
      is_active: product.is_active,
      variants:
        (product.variants ?? []).length > 0
          ? (product.variants ?? []).map((variant) => ({
              clientKey: crypto.randomUUID(),
              id: variant.id,
              variant_name: variant.variant_name,
              extra_price: String(variant.extra_price),
            }))
          : [emptyVariantDraft()],
    });
  }

  function resetProductForm() {
    setEditingId(null);
    setDraft({
      ...emptyProductDraft(),
      category: categoryItems[0]?.name ?? "Makanan",
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = new FormData();
      payload.set("name", draft.name.trim());
      payload.set("description", draft.description.trim());
      payload.set("category", draft.category);
      payload.set("base_price", String(normalizeNumberInput(draft.base_price)));
      payload.set("is_active", draft.is_active ? "1" : "0");
      payload.set(
        "variants",
        JSON.stringify(
          draft.variants
            .filter((variant) => variant.variant_name.trim().length > 0)
            .map((variant, index) => ({
              ...(variant.id ? { id: variant.id } : {}),
              variant_name: variant.variant_name,
              extra_price: normalizeNumberInput(variant.extra_price),
              sort_order: index + 1,
            })),
        ),
      );

      if (draft.image_file) {
        payload.set("image", draft.image_file);
      }

      if (editingId && draft.remove_image && !draft.image_file) {
        payload.set("remove_image", "1");
      }

      const response = editingId
        ? await postApiData<MutationResponse<ProductRecord>>(
            `/products/${editingId}`,
            (() => {
              payload.set("_method", "PATCH");
              return payload;
            })(),
          )
        : await postApiData<MutationResponse<ProductRecord>>(
            "/products",
            payload,
          );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      resetProductForm();
      products.reload();
      categories.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan produk.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeProduct(productId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/products/${productId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      if (editingId === productId) {
        resetProductForm();
      }
      products.reload();
      categories.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus produk.",
      );
      setSuccessMessage(null);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = editingCategoryId
        ? await patchApiData<MutationResponse<CategoryRecord>>(
            `/categories/${editingCategoryId}`,
            categoryDraft,
          )
        : await postApiData<MutationResponse<CategoryRecord>>(
            "/categories",
            categoryDraft,
          );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      setCategoryDraft(emptyCategoryDraft());
      setEditingCategoryId(null);
      categories.reload();
      products.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan kategori.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeCategory(categoryId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/categories/${categoryId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      if (editingCategoryId === categoryId) {
        setCategoryDraft(emptyCategoryDraft());
        setEditingCategoryId(null);
      }
      categories.reload();
      products.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus kategori.",
      );
      setSuccessMessage(null);
    }
  }

  return (
    <AppShell
      title="Manajemen Menu"
      subtitle="Tambah, ubah, dan hapus menu"
      status={screen.status}
    >
      <ScreenState
        status={screen.status}
        error={screen.error ?? products.error ?? categories.error}
      >
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          <div className="dashboard-grid dashboard-grid--split-40-60 ">
            <FormSection
              title={editingId ? "Edit produk" : "Tambah produk"}
              subtitle="Gunakan form ini untuk mengelola katalog dan varian menu."
            >
              <form className="form-grid" onSubmit={saveProduct}>
                <label className="field">
                  <span>Nama produk</span>
                  <input
                    className="text-input"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Deskripsi</span>
                  <textarea
                    className="text-area"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Tuliskan ringkasan produk yang akan tampil di katalog."
                    required
                  />
                </label>
                <label className="field">
                  <span>Kategori</span>
                  <select
                    className="text-input"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    required
                  >
                    {categoryItems.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Harga dasar</span>
                  <input
                    className="text-input"
                    inputMode="decimal"
                    value={draft.base_price}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        base_price: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Foto produk</span>
                  <input
                    className="text-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        image_file: event.target.files?.[0] ?? null,
                        remove_image: false,
                      }))
                    }
                  />
                  <small className="field-hint">
                    Upload JPG/PNG/WebP maks 3MB. File disimpan di server
                    backend.
                  </small>
                  {draft.image_file ? (
                    <small className="field-hint">
                      File terpilih: {draft.image_file.name}
                    </small>
                  ) : null}
                  {editingId && draft.image_url ? (
                    <div className="product-image-preview">
                      <img
                        src={draft.image_url}
                        alt={draft.name || "Foto produk"}
                      />
                    </div>
                  ) : null}
                  {editingId && draft.image_url ? (
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={draft.remove_image}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            remove_image: event.target.checked,
                            image_file: event.target.checked
                              ? null
                              : current.image_file,
                          }))
                        }
                      />
                      <span>Hapus foto saat simpan</span>
                    </label>
                  ) : null}
                </label>
                <div className="field field--full">
                  <span>Varian</span>
                  <div className="variant-stack">
                    {draft.variants.map((variant, index) => (
                      <div key={variant.clientKey} className="variant-row">
                        <input
                          className="text-input"
                          placeholder="Nama varian"
                          value={variant.variant_name}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              variants: current.variants.map(
                                (item, variantIndex) =>
                                  variantIndex === index
                                    ? {
                                        ...item,
                                        variant_name: event.target.value,
                                      }
                                    : item,
                              ),
                            }))
                          }
                        />
                        <input
                          className="text-input"
                          inputMode="decimal"
                          placeholder="Extra price"
                          value={variant.extra_price}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              variants: current.variants.map(
                                (item, variantIndex) =>
                                  variantIndex === index
                                    ? {
                                        ...item,
                                        extra_price: event.target.value,
                                      }
                                    : item,
                              ),
                            }))
                          }
                        />
                        <button
                          className="danger-btn danger-btn--small"
                          type="button"
                          onClick={() => {
                            const variantLabel =
                              variant.variant_name?.trim() ||
                              `varian #${index + 1}`;
                            requestDelete(`varian ${variantLabel}`, () => {
                              setDraft((current) => ({
                                ...current,
                                variants:
                                  current.variants.length > 1
                                    ? current.variants.filter(
                                        (_, variantIndex) =>
                                          variantIndex !== index,
                                      )
                                    : [emptyVariantDraft()],
                              }));
                            });
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        variants: [...current.variants, emptyVariantDraft()],
                      }))
                    }
                  >
                    Tambah varian
                  </button>
                </div>
                <label className="checkbox-row field--full">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  <span>Aktif dijual</span>
                </label>
                <div className="form-actions field--full">
                  <button className="primary-btn" type="submit">
                    {editingId ? "Simpan perubahan" : "Tambah produk"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={resetProductForm}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormSection>
            <section className="section-card transactions-card">
              <div className="transactions-card__head">
                <h3>Daftar produk</h3>
                <span className="transactions-card__link">
                  {formatCount(productItems.length)} item
                </span>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Kategori</th>
                      <th>Harga</th>
                      <th>Varian</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productItems.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div>
                            <strong>{product.name}</strong>
                            <p>{product.description}</p>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td className="transactions-table__amount">
                          {formatCurrency(product.base_price)}
                        </td>
                        <td>{formatCount(product.variants?.length ?? 0)}</td>
                        <td>
                          <span
                            className={statusClassName(
                              product.is_active ? "positive" : "warning",
                            )}
                          >
                            {product.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => startProductEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              className="danger-btn"
                              type="button"
                              onClick={() =>
                                requestDelete(`produk ${product.name}`, () =>
                                  removeProduct(product.id),
                                )
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <div className="dashboard-grid dashboard-grid--double">
            <FormSection
              title={editingCategoryId ? "Edit kategori" : "Tambah kategori"}
              subtitle="Kategori default dimulai dari Makanan dan akan muncul di dropdown produk."
            >
              <form className="form-grid" onSubmit={saveCategory}>
                <label className="field field--full">
                  <span>Nama kategori</span>
                  <input
                    className="text-input"
                    value={categoryDraft.name}
                    onChange={(event) =>
                      setCategoryDraft({ name: event.target.value })
                    }
                    required
                  />
                </label>
                <div className="form-actions field--full mb-4">
                  <button className="primary-btn" type="submit">
                    {editingCategoryId ? "Simpan kategori" : "Tambah kategori"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setCategoryDraft(emptyCategoryDraft());
                      setEditingCategoryId(null);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
              <div className="list-stack">
                {categoryItems.map((category) => (
                  <div key={category.id} className="list-row">
                    <div>
                      <strong>{category.name}</strong>
                      <p>Tersedia untuk dropdown kategori produk</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setCategoryDraft({ name: category.name });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() =>
                          requestDelete(`kategori ${category.name}`, () =>
                            removeCategory(category.id),
                          )
                        }
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
            <div className="content-stack content-stack--compact">
              <ProgressList
                title="Sebaran kategori"
                subtitle="Komposisi produk per kategori."
                items={categoryBreakdownItems}
              />
              <RowList
                title="Varian terpopuler"
                subtitle="Varian yang paling sering muncul di order item."
                rows={(screen.data?.popular_variants ?? []).map((variant) => ({
                  title: variant.variant_name,
                  meta: "Berdasarkan histori order backend",
                  value: `${formatCount(variant.usage_count)} kali`,
                  badge: "Top pick",
                  tone: "positive",
                }))}
              />
            </div>
          </div>
        </div>
      </ScreenState>
    </AppShell>
  );
}

function CustomerLayout() {
  const screen = useScreenData<CustomerPayload>("/screens/customer");
  const customers = useResourceCollection<CustomerRecord>("/customers");
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomerDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<CustomerOrderFilter>("all");
  const [sortKey, setSortKey] = useState<CustomerSortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  const metrics = useMemo<Metric[]>(() => {
    if (!screen.data) {
      return [];
    }

    return [
      {
        label: "Total customer",
        value: formatCount(screen.data.metrics.total_customers),
        hint: "Kontak yang pernah bertransaksi",
        tone: "info",
      },
      {
        label: "Repeat order rate",
        value: formatPercent(screen.data.metrics.repeat_order_rate, 1),
        hint: "Customer dengan 2+ order",
        tone:
          screen.data.metrics.repeat_order_rate >= 40 ? "positive" : "warning",
      },
    ];
  }, [screen.data]);

  const customerItems =
    customers.items.length > 0
      ? customers.items
      : (screen.data?.priority_customers ?? []);

  const visibleCustomerItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = customerItems.filter((customer) => {
      const orderCount = toNumber(customer.orders_count ?? 0);
      const matchesQuery =
        !query || customerSearchHaystack(customer).includes(query);
      const matchesFilter =
        orderFilter === "all" ||
        (orderFilter === "ordered" && orderCount > 0) ||
        (orderFilter === "repeat" && orderCount >= 2) ||
        (orderFilter === "no-order" && orderCount === 0);

      return matchesQuery && matchesFilter;
    });

    const compareText = (left: string, right: string) =>
      left.localeCompare(right, "id", { numeric: true, sensitivity: "base" });

    const sorted = filtered.slice().sort((left, right) => {
      let result = 0;

      if (sortKey === "name") {
        result = compareText(left.name, right.name);
      }

      if (sortKey === "phone_number") {
        result = compareText(left.phone_number ?? "", right.phone_number ?? "");
      }

      if (sortKey === "orders_count") {
        result = toNumber(left.orders_count) - toNumber(right.orders_count);
      }

      if (sortKey === "orders_sum_final_total") {
        result =
          toNumber(left.orders_sum_final_total) -
          toNumber(right.orders_sum_final_total);
      }

      if (result === 0) {
        result = compareText(left.name, right.name);
      }

      if (result === 0) {
        result = left.id - right.id;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [customerItems, orderFilter, searchQuery, sortDirection, sortKey]);

  function toggleCustomerSort(nextSortKey: CustomerSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  function getSortSymbol(column: CustomerSortKey): string {
    if (sortKey !== column) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  }

  function getAriaSort(
    column: CustomerSortKey,
  ): "ascending" | "descending" | "none" {
    if (sortKey !== column) {
      return "none";
    }

    return sortDirection === "asc" ? "ascending" : "descending";
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = {
        name: draft.name,
        address: draft.address || null,
        phone_number: draft.phone_number || null,
      };

      const response = editingId
        ? await patchApiData<MutationResponse<CustomerRecord>>(
            `/customers/${editingId}`,
            payload,
          )
        : await postApiData<MutationResponse<CustomerRecord>>(
            "/customers",
            payload,
          );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      setDraft(emptyCustomerDraft());
      setEditingId(null);
      customers.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan customer.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeCustomer(customerId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/customers/${customerId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      customers.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus customer.",
      );
      setSuccessMessage(null);
    }
  }

  return (
    <AppShell
      title="Pelanggan"
      subtitle="Manajemen Pelanggan"
      status={screen.status}
    >
      <ScreenState
        status={screen.status}
        error={screen.error ?? customers.error}
      >
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          <div className="dashboard-grid dashboard-grid--split-40-60">
            <FormSection
              title={editingId ? "Edit pelanggan" : "Tambah pelanggan"}
              subtitle="Data pelanggan ini juga dipakai pada halaman kasir untuk assign order."
            >
              <form className="form-grid" onSubmit={saveCustomer}>
                <label className="field field--full">
                  <span>Nama</span>
                  <input
                    className="text-input"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Alamat</span>
                  <textarea
                    className="text-area"
                    value={draft.address}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field field--full">
                  <span>Nomor telepon</span>
                  <input
                    className="text-input"
                    value={draft.phone_number}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        phone_number: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="form-actions field--full">
                  <button className="primary-btn" type="submit">
                    {editingId ? "Simpan perubahan" : "Tambah pelanggan"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setDraft(emptyCustomerDraft());
                      setEditingId(null);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormSection>
            <section className="section-card transactions-card">
              <div className="transactions-card__head">
                <h3>Daftar pelanggan</h3>
                <span className="transactions-card__link">
                  {formatCount(visibleCustomerItems.length)} /{" "}
                  {formatCount(customerItems.length)} kontak
                </span>
              </div>
              <div className="transactions-toolbar">
                <label className="transactions-toolbar__field transactions-toolbar__field--search">
                  <span>Search pelanggan</span>
                  <input
                    className="text-input"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari nama, telepon, atau alamat..."
                  />
                </label>
                <label className="transactions-toolbar__field">
                  <span>Filter order</span>
                  <select
                    className="text-input"
                    value={orderFilter}
                    onChange={(event) =>
                      setOrderFilter(event.target.value as CustomerOrderFilter)
                    }
                  >
                    <option value="all">Semua pelanggan</option>
                    <option value="ordered">Pernah order</option>
                    <option value="repeat">Repeat order (2+)</option>
                    <option value="no-order">Belum pernah order</option>
                  </select>
                </label>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th aria-sort={getAriaSort("name")}>
                        <button
                          className="table-sort-btn"
                          type="button"
                          onClick={() => toggleCustomerSort("name")}
                        >
                          <span>Nama</span>
                          <span
                            className="table-sort-btn__icon"
                            aria-hidden="true"
                          >
                            {getSortSymbol("name")}
                          </span>
                        </button>
                      </th>
                      <th aria-sort={getAriaSort("phone_number")}>
                        <button
                          className="table-sort-btn"
                          type="button"
                          onClick={() => toggleCustomerSort("phone_number")}
                        >
                          <span>Telepon</span>
                          <span
                            className="table-sort-btn__icon"
                            aria-hidden="true"
                          >
                            {getSortSymbol("phone_number")}
                          </span>
                        </button>
                      </th>
                      <th aria-sort={getAriaSort("orders_count")}>
                        <button
                          className="table-sort-btn"
                          type="button"
                          onClick={() => toggleCustomerSort("orders_count")}
                        >
                          <span>Total order</span>
                          <span
                            className="table-sort-btn__icon"
                            aria-hidden="true"
                          >
                            {getSortSymbol("orders_count")}
                          </span>
                        </button>
                      </th>
                      <th aria-sort={getAriaSort("orders_sum_final_total")}>
                        <button
                          className="table-sort-btn"
                          type="button"
                          onClick={() =>
                            toggleCustomerSort("orders_sum_final_total")
                          }
                        >
                          <span>Nominal</span>
                          <span
                            className="table-sort-btn__icon"
                            aria-hidden="true"
                          >
                            {getSortSymbol("orders_sum_final_total")}
                          </span>
                        </button>
                      </th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCustomerItems.length > 0 ? (
                      visibleCustomerItems.map((customer) => (
                        <tr key={customer.id}>
                          <td>{customer.name}</td>
                          <td>{customer.phone_number ?? "-"}</td>
                          <td>{formatCount(customer.orders_count ?? 0)}</td>
                          <td className="transactions-table__amount">
                            {formatCurrency(
                              customer.orders_sum_final_total ?? 0,
                            )}
                          </td>
                          <td>
                            <div className="inline-actions">
                              <button
                                className="secondary-btn"
                                type="button"
                                onClick={() => {
                                  setEditingId(customer.id);
                                  setDraft({
                                    name: customer.name,
                                    address: customer.address ?? "",
                                    phone_number: customer.phone_number ?? "",
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="danger-btn"
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    `pelanggan ${customer.name}`,
                                    () => removeCustomer(customer.id),
                                  )
                                }
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="transactions-table__empty" colSpan={5}>
                          Tidak ada pelanggan yang sesuai pencarian/filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <section className="section-card section-card--accent">
            <div className="section-header">
              <h3>Suara pelanggan</h3>
              <p>Insight singkat yang dikirim backend untuk panel customer.</p>
            </div>
            <div className="insight-banner">
              <span>{screen.data?.latest_feedback.source ?? "Review"}</span>
              <p className="feedback-quote">
                “{screen.data?.latest_feedback.message ?? "Belum ada feedback."}
                ”
              </p>
            </div>
          </section>
        </div>
      </ScreenState>
    </AppShell>
  );
}

function PengeluaranLayout() {
  const screen = useScreenData<PengeluaranPayload>("/screens/pengeluaran");
  const expenses = useResourceCollection<ExpenseRecord>("/expenses");
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpenseDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  useEffect(() => {
    if (!draft.user_id && (screen.data?.users ?? []).length > 0) {
      setDraft((current) => ({
        ...current,
        user_id: String(screen.data?.users[0]?.id ?? ""),
      }));
    }
  }, [draft.user_id, screen.data?.users]);

  const metrics = useMemo<Metric[]>(() => {
    if (!screen.data) {
      return [];
    }

    return [
      {
        label: "Total pengeluaran",
        value: formatCurrency(screen.data.metrics.total_expenses),
        hint: "Akumulasi semua biaya outlet",
        tone: "warning",
      },
      {
        label: "Pending approval",
        value: formatCount(screen.data.metrics.pending_approval),
        hint: "Butuh persetujuan lanjutan",
        tone: screen.data.metrics.pending_approval > 0 ? "danger" : "positive",
      },
    ];
  }, [screen.data]);

  const categoryItems = useMemo<ProgressItem[]>(() => {
    const items = screen.data?.by_category ?? [];
    const total =
      items.reduce((sum, item) => sum + toNumber(item.total), 0) || 1;

    return items.map((item) => ({
      label: item.category,
      value: formatCurrency(item.total),
      percent: (toNumber(item.total) / total) * 100,
      tone: "warning",
    }));
  }, [screen.data]);

  const expenseItems =
    expenses.items.length > 0 ? expenses.items : (screen.data?.expenses ?? []);

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = {
        user_id: Number(draft.user_id),
        description: draft.description,
        amount: normalizeNumberInput(draft.amount),
        expense_date: draft.expense_date,
        category: draft.category,
        status: draft.status,
      };

      const response = editingId
        ? await patchApiData<MutationResponse<ExpenseRecord>>(
            `/expenses/${editingId}`,
            payload,
          )
        : await postApiData<MutationResponse<ExpenseRecord>>(
            "/expenses",
            payload,
          );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      setEditingId(null);
      setDraft(emptyExpenseDraft(String(screen.data?.users[0]?.id ?? "")));
      expenses.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan pengeluaran.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeExpense(expenseId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/expenses/${expenseId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      expenses.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus pengeluaran.",
      );
      setSuccessMessage(null);
    }
  }

  return (
    <AppShell
      title="Pengeluaran"
      subtitle="Kelola biaya pengeluaran"
      status={screen.status}
    >
      <ScreenState
        status={screen.status}
        error={screen.error ?? expenses.error}
      >
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          <div className="dashboard-grid dashboard-grid--double">
            <FormSection
              title={editingId ? "Edit pengeluaran" : "Tambah pengeluaran"}
              subtitle="Biaya baru akan langsung masuk ke ringkasan laporan dan dashboard."
            >
              <form className="form-grid" onSubmit={saveExpense}>
                <label className="field">
                  <span>User</span>
                  <select
                    className="text-input"
                    value={draft.user_id}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        user_id: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Pilih user</option>
                    {(screen.data?.users ?? []).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Kategori</span>
                  <input
                    className="text-input"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Deskripsi</span>
                  <input
                    className="text-input"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Tanggal</span>
                  <input
                    className="text-input"
                    type="date"
                    value={draft.expense_date}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        expense_date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Nominal</span>
                  <input
                    className="text-input"
                    inputMode="decimal"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Status</span>
                  <select
                    className="text-input"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <div className="form-actions field--full">
                  <button className="primary-btn" type="submit">
                    {editingId ? "Simpan perubahan" : "Tambah pengeluaran"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(
                        emptyExpenseDraft(
                          String(screen.data?.users[0]?.id ?? ""),
                        ),
                      );
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormSection>
            <section className="section-card transactions-card">
              <div className="transactions-card__head">
                <h3>Daftar pengeluaran</h3>
                <span className="transactions-card__link">
                  {formatCount(expenseItems.length)} item
                </span>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Deskripsi</th>
                      <th>Kategori</th>
                      <th>User</th>
                      <th>Tanggal</th>
                      <th>Nominal</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseItems.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.description}</td>
                        <td>{expense.category}</td>
                        <td>{expense.user?.name ?? "-"}</td>
                        <td>{formatDateLabel(expense.expense_date)}</td>
                        <td className="transactions-table__amount">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => {
                                setEditingId(expense.id);
                                setDraft({
                                  user_id: String(
                                    expense.user?.id ??
                                      screen.data?.users[0]?.id ??
                                      "",
                                  ),
                                  description: expense.description,
                                  amount: String(expense.amount),
                                  expense_date: expense.expense_date.slice(
                                    0,
                                    10,
                                  ),
                                  category: expense.category,
                                  status: expense.status,
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="danger-btn"
                              type="button"
                              onClick={() =>
                                requestDelete(
                                  `pengeluaran ${expense.description}`,
                                  () => removeExpense(expense.id),
                                )
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <ProgressList
            title="Pengeluaran per kategori"
            subtitle="Kategori biaya terbesar pada dataset saat ini."
            items={categoryItems}
          />
        </div>
      </ScreenState>
    </AppShell>
  );
}

function LaporanLayout() {
  const { data, status, error } =
    useScreenData<LaporanPayload>("/screens/laporan");

  const metrics = useMemo<Metric[]>(() => {
    if (!data) {
      return [];
    }

    return [
      {
        label: "Omzet",
        value: formatCurrency(data.summary.metrics.total_sales),
        hint: "Bersumber dari summary laporan",
        tone: "positive",
      },
      {
        label: "Beban",
        value: formatCurrency(data.summary.metrics.total_expenses),
        hint: "Diambil dari expense summary",
        tone: "warning",
      },
      {
        label: "Net profit",
        value: formatCurrency(data.summary.metrics.net_profit),
        hint: "Margin outlet yang terlapor",
        tone: data.summary.metrics.net_profit >= 0 ? "positive" : "danger",
      },
    ];
  }, [data]);

  return (
    <AppShell title="Laporan" subtitle="Laporan Keuangan" status={status}>
      <ScreenState status={status} error={error}>
        <div className="content-stack">
          <MetricGrid metrics={metrics} />
          <div className="dashboard-grid dashboard-grid--double">
            <RowList
              title="Channel mix"
              subtitle="Kontribusi transaksi berdasarkan tipe order."
              rows={(data?.channel_mix.channel_mix ?? []).map((item) => ({
                title: item.order_type,
                meta: `${formatCount(item.total_orders)} transaksi`,
                value: formatCurrency(item.total_amount),
                badge: "Channel",
                tone: "info",
              }))}
            />
            <RowList
              title="Daily profit snapshot"
              subtitle="Perbandingan penjualan dan beban per periode."
              rows={(data?.channel_mix.daily_profit ?? []).map((item) => ({
                title: formatDateLabel(item.period),
                meta: `Expense ${formatCurrency(item.expense_total)}`,
                value: formatCurrency(item.sales_total),
                badge: "Daily",
                tone:
                  toNumber(item.sales_total) >= toNumber(item.expense_total)
                    ? "positive"
                    : "warning",
              }))}
            />
          </div>
        </div>
      </ScreenState>
    </AppShell>
  );
}

function PengaturanLayout() {
  const screen = useScreenData<PengaturanPayload>("/screens/pengaturan");
  const paymentMethods =
    useResourceCollection<PaymentMethodRecord>("/payment-methods");
  const users = useResourceCollection<UserRecord>("/users");
  const [draft, setDraft] = useState<PaymentMethodDraft>(
    emptyPaymentMethodDraft(),
  );
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  async function saveMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = {
        name: draft.name,
        type: draft.type,
        is_active: draft.is_active,
      };

      const response = editingId
        ? await patchApiData<MutationResponse<PaymentMethodRecord>>(
            `/payment-methods/${editingId}`,
            payload,
          )
        : await postApiData<MutationResponse<PaymentMethodRecord>>(
            "/payment-methods",
            payload,
          );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      setDraft(emptyPaymentMethodDraft());
      setEditingId(null);
      paymentMethods.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan metode pembayaran.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeMethod(methodId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/payment-methods/${methodId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      paymentMethods.reload();
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus metode pembayaran.",
      );
      setSuccessMessage(null);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = {
        name: userDraft.name,
        email: userDraft.email,
        ...(userDraft.password ? { password: userDraft.password } : {}),
        role: userDraft.role,
      };

      const response = editingUserId
        ? await patchApiData<MutationResponse<UserRecord>>(
            `/users/${editingUserId}`,
            payload,
          )
        : await postApiData<MutationResponse<UserRecord>>("/users", payload);

      setSuccessMessage(response.message);
      setErrorMessage(null);
      setUserDraft(emptyUserDraft());
      setEditingUserId(null);
      users.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menyimpan user.",
      );
      setSuccessMessage(null);
    }
  }

  async function removeUser(userId: number) {
    try {
      const response = await deleteApiData<MutationResponse<null>>(
        `/users/${userId}`,
      );
      setSuccessMessage(response.message);
      setErrorMessage(null);
      users.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menghapus user.",
      );
      setSuccessMessage(null);
    }
  }

  const methodItems =
    paymentMethods.items.length > 0
      ? paymentMethods.items
      : (screen.data?.payment_methods ?? []);
  const userItems = users.items;

  return (
    <AppShell
      title="Pengaturan"
      subtitle="Atur payment method, lihat perangkat outlet, dan pantau notifikasi."
      status={screen.status}
    >
      <ScreenState
        status={screen.status}
        error={screen.error ?? paymentMethods.error ?? users.error}
      >
        <div className="content-stack">
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          <div className="dashboard-grid dashboard-grid--triple">
            <section className="section-card">
              <div className="section-header">
                <h3>Outlet</h3>
                <p>Identitas operasional yang dikirim backend.</p>
              </div>
              <div className="field-block mt-4">
                <span>Nama outlet</span>
                <div>{screen.data?.outlet.name}</div>
              </div>
              <div className="field-block my-2">
                <span>Alamat</span>
                <div>{screen.data?.outlet.address}</div>
              </div>
              <div className="field-block">
                <span>Jam operasional</span>
                <div>{screen.data?.outlet.operational_hours}</div>
              </div>
            </section>
            <FormSection
              title={editingId ? "Edit metode bayar" : "Tambah metode bayar"}
              subtitle="Metode aktif akan langsung muncul di kasir dan transaksi."
            >
              <form className="form-grid" onSubmit={saveMethod}>
                <label className="field field--full">
                  <span>Nama</span>
                  <input
                    className="text-input"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Tipe</span>
                  <input
                    className="text-input"
                    value={draft.type}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="checkbox-row field--full">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  <span>Aktif digunakan</span>
                </label>
                <div className="form-actions field--full">
                  <button className="primary-btn" type="submit">
                    {editingId ? "Simpan perubahan" : "Tambah metode"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setDraft(emptyPaymentMethodDraft());
                      setEditingId(null);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormSection>
            <RowList
              title="Perangkat outlet"
              subtitle="Status device sinkronisasi dan printer."
              rows={(screen.data?.devices ?? []).map((device) => ({
                title: device.name,
                meta: "Status terakhir dari payload backend",
                badge: device.status,
                tone: statusTone(device.status),
              }))}
            />
          </div>
          <div className="dashboard-grid dashboard-grid--double">
            <section className="section-card transactions-card">
              <div className="transactions-card__head">
                <h3>Metode pembayaran</h3>
                <span className="transactions-card__link">
                  {formatCount(methodItems.length)} metode
                </span>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table ">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Tipe</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodItems.map((method) => (
                      <tr key={method.id}>
                        <td>{method.name}</td>
                        <td>{method.type}</td>
                        <td>
                          <span
                            className={statusClassName(
                              method.is_active ? "positive" : "warning",
                            )}
                          >
                            {method.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => {
                                setEditingId(method.id);
                                setDraft({
                                  name: method.name,
                                  type: method.type,
                                  is_active: method.is_active,
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="danger-btn"
                              type="button"
                              onClick={() =>
                                requestDelete(
                                  `metode pembayaran ${method.name}`,
                                  () => removeMethod(method.id),
                                )
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="section-card section-card--accent">
              <div className="section-header">
                <h3>Notifikasi</h3>
                <p>Toggle ini membaca nilai boolean dari backend pengaturan.</p>
              </div>
              <div className="detail-sheet">
                <div className="toggle-row">
                  <span>Low stock alert</span>
                  <div
                    className={
                      screen.data?.notifications.low_stock_alert
                        ? "toggle toggle--enabled"
                        : "toggle"
                    }
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
                <div className="toggle-row">
                  <span>Daily sales summary</span>
                  <div
                    className={
                      screen.data?.notifications.daily_sales_summary
                        ? "toggle toggle--enabled"
                        : "toggle"
                    }
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
                <div className="toggle-row">
                  <span>Large expense approval</span>
                  <div
                    className={
                      screen.data?.notifications.large_expense_approval
                        ? "toggle toggle--enabled"
                        : "toggle"
                    }
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="dashboard-grid dashboard-grid--double">
            <FormSection
              title={editingUserId ? "Edit user" : "Tambah user"}
              subtitle="Kelola akun admin dan kasir dari halaman pengaturan."
            >
              <form className="form-grid" onSubmit={saveUser}>
                <label className="field field--full">
                  <span>Nama</span>
                  <input
                    className="text-input"
                    value={userDraft.name}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field field--full">
                  <span>Email</span>
                  <input
                    className="text-input"
                    type="email"
                    value={userDraft.email}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Password {editingUserId ? "(opsional)" : ""}</span>
                  <input
                    className="text-input"
                    type="password"
                    value={userDraft.password}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required={!editingUserId}
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select
                    className="text-input"
                    value={userDraft.role}
                    onChange={(event) =>
                      setUserDraft((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="cashier">cashier</option>
                  </select>
                </label>
                <div className="form-actions field--full">
                  <button className="primary-btn" type="submit">
                    {editingUserId ? "Simpan user" : "Tambah user"}
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setUserDraft(emptyUserDraft());
                      setEditingUserId(null);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormSection>
            <section className="section-card transactions-card">
              <div className="transactions-card__head">
                <h3>User</h3>
                <span className="transactions-card__link">
                  {formatCount(userItems.length)} akun
                </span>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userItems.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email ?? "-"}</td>
                        <td>{user.role}</td>
                        <td>
                          {user.created_at
                            ? formatDateLabel(user.created_at)
                            : "-"}
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setUserDraft({
                                  name: user.name,
                                  email: user.email ?? "",
                                  password: "",
                                  role: user.role,
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="danger-btn"
                              type="button"
                              onClick={() =>
                                requestDelete(`user ${user.name}`, () =>
                                  removeUser(user.id),
                                )
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </ScreenState>
    </AppShell>
  );
}

function KasirLayout() {
  const screen = useScreenData<KasirPayload>("/screens/kasir");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [orderType, setOrderType] = useState("dine_in");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"nominal" | "percentage">(
    "nominal",
  );
  const [discountValue, setDiscountValue] = useState("0");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptPrintPayload | null>(
    null,
  );
  const [receiptPreview, setReceiptPreview] =
    useState<ReceiptPrintPayload | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerResultOpen, setIsCustomerResultOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerDraft, setCustomerDraft] =
    useState<CustomerDraft>(emptyCustomerDraft());
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerModalError, setCustomerModalError] = useState<string | null>(
    null,
  );
  const [cashPaidValue, setCashPaidValue] = useState("");
  const customerSearchRef = useRef<HTMLDivElement | null>(null);
  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation();

  useEffect(() => {
    if (
      !selectedPaymentMethodId &&
      (screen.data?.payment_methods ?? []).length > 0
    ) {
      setSelectedPaymentMethodId(
        String(screen.data?.payment_methods[0]?.id ?? ""),
      );
    }
  }, [screen.data?.payment_methods, selectedPaymentMethodId]);

  useEffect(() => {
    const closeResultListOnOutsideClick = (event: MouseEvent) => {
      if (!customerSearchRef.current) {
        return;
      }

      if (!customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerResultOpen(false);
      }
    };

    document.addEventListener("mousedown", closeResultListOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeResultListOnOutsideClick);
    };
  }, []);

  const categories = useMemo(
    () => ["Semua", ...(screen.data?.categories ?? [])],
    [screen.data?.categories],
  );
  const customerOptions = screen.data?.customers ?? [];
  const selectedCustomer = useMemo(
    () =>
      customerOptions.find(
        (customer) => String(customer.id) === selectedCustomerId,
      ) ?? null,
    [customerOptions, selectedCustomerId],
  );
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) {
      return customerOptions.slice(0, 10);
    }

    return customerOptions
      .filter((customer) => customerSearchHaystack(customer).includes(query))
      .slice(0, 15);
  }, [customerOptions, customerQuery]);

  const filteredProducts = useMemo(() => {
    return (screen.data?.products ?? []).filter((product) => {
      const matchesCategory =
        activeCategory === "Semua" || product.category === activeCategory;
      const haystack = `${product.name} ${product.category}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, screen.data?.products, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + cartLineSubtotal(item), 0),
    [cart],
  );
  const discountAmount = useMemo(() => {
    const raw = normalizeNumberInput(discountValue);
    return discountType === "percentage" ? (subtotal * raw) / 100 : raw;
  }, [discountType, discountValue, subtotal]);
  const grandTotalPreview = Math.max(subtotal - discountAmount, 0);
  const selectedPaymentMethod =
    (screen.data?.payment_methods ?? []).find(
      (method) => String(method.id) === selectedPaymentMethodId,
    ) ?? null;
  const isCashPayment = useMemo(
    () => isCashPaymentMethod(selectedPaymentMethod),
    [selectedPaymentMethod],
  );
  const cashPaidAmount = normalizeNumberInput(cashPaidValue);
  const cashChangeAmount = cashPaidAmount - grandTotalPreview;

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerQuery(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (!isCashPayment) {
      setCashPaidValue("");
    }
  }, [isCashPayment]);

  function addProduct(product: ProductRecord) {
    const firstVariant = product.variants?.[0] ?? null;
    const key = `${product.id}:${firstVariant?.id ?? 0}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...current,
        {
          key,
          product_id: product.id,
          name: product.name,
          category: product.category,
          quantity: 1,
          base_price: toNumber(product.base_price),
          variant_id: firstVariant?.id ?? null,
          variant_name: firstVariant?.variant_name ?? null,
          extra_price: toNumber(firstVariant?.extra_price ?? 0),
          variants: product.variants ?? [],
        },
      ];
    });
  }

  function selectCustomer(customer: CustomerRecord | null) {
    setSelectedCustomerId(customer ? String(customer.id) : "");
    setCustomerQuery(customer?.name ?? "");
    setIsCustomerResultOpen(false);
  }

  function openCustomerModal() {
    setCustomerModalError(null);
    setCustomerDraft({
      name: customerQuery.trim(),
      address: "",
      phone_number: "",
    });
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setIsCustomerModalOpen(false);
    setCustomerModalError(null);
    setCustomerDraft(emptyCustomerDraft());
  }

  async function saveCustomerFromKasir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: customerDraft.name.trim(),
      address: customerDraft.address.trim() || null,
      phone_number: customerDraft.phone_number.trim() || null,
    };

    if (!payload.name) {
      setCustomerModalError("Nama pelanggan wajib diisi.");
      return;
    }

    setIsSavingCustomer(true);
    try {
      const response = await postApiData<MutationResponse<CustomerRecord>>(
        "/customers",
        payload,
      );

      const nextCustomer = response.data;
      if (nextCustomer) {
        selectCustomer(nextCustomer);
      } else {
        setSelectedCustomerId("");
        setCustomerQuery(payload.name);
      }

      setSuccessMessage(response.message);
      setErrorMessage(null);
      closeCustomerModal();
      screen.reload();
    } catch (caughtError) {
      setCustomerModalError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menambahkan pelanggan.",
      );
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function submitOrder() {
    if (!screen.data?.cashier) {
      setErrorMessage("Kasir aktif belum tersedia di backend.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("Keranjang masih kosong.");
      return;
    }

    if (!selectedPaymentMethodId) {
      setErrorMessage("Pilih metode pembayaran terlebih dahulu.");
      return;
    }

    if (isCashPayment && cashPaidAmount < grandTotalPreview) {
      setErrorMessage("Nominal pembayaran tunai kurang dari total akhir.");
      return;
    }

    const cartSnapshot = cart.map((item) => ({ ...item }));
    const customerName =
      (selectedCustomer?.name ?? customerQuery.trim()) || "Walk-in";
    const paymentMethodName = selectedPaymentMethod?.name ?? "Belum dipilih";

    setIsSubmitting(true);

    try {
      const response = await postApiData<MutationResponse<OrderRecord>>(
        "/orders",
        {
          user_id: screen.data.cashier.id,
          customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
          payment_method_id: Number(selectedPaymentMethodId),
          order_date: new Date().toISOString(),
          order_type: orderType,
          table_no: null,
          notes: notes.trim() || null,
          discount_type:
            normalizeNumberInput(discountValue) > 0 ? discountType : null,
          discount_value: normalizeNumberInput(discountValue),
          items: cart.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            notes: item.variant_name,
          })),
        },
      );

      setSuccessMessage(response.message);
      setErrorMessage(null);
      const nextReceipt = response.data
        ? buildReceiptPayloadFromOrder(response.data, screen.data.cashier.name)
        : buildReceiptPayloadFromCart({
            cashierName: screen.data.cashier.name,
            customerName,
            paymentMethodName,
            orderType,
            notes,
            cart: cartSnapshot,
            subtotal,
            discount: discountAmount,
            total: grandTotalPreview,
          });
      setLastReceipt(nextReceipt);
      setReceiptPreview(nextReceipt);
      setCart([]);
      setNotes("");
      setDiscountValue("0");
      setCashPaidValue("");
      screen.reload();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal membuat order kasir.",
      );
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeReceiptPreview() {
    setReceiptPreview(null);
  }

  function handlePrintReceiptPreview() {
    const activeReceipt = receiptPreview ?? lastReceipt;
    if (!activeReceipt) {
      setErrorMessage("Belum ada struk yang bisa dicetak.");
      return;
    }

    const printed = printReceipt(activeReceipt);
    if (!printed) {
      setErrorMessage(
        "Popup print diblokir browser. Izinkan popup untuk mencetak struk.",
      );
      return;
    }

    setErrorMessage(null);
  }

  return (
    <AppShell
      title="Kasir"
      subtitle="Kasir System - Sate Ayam Bento"
      status={screen.status}
    >
      <ScreenState status={screen.status} error={screen.error}>
        <div className="content-stack">
          <NoticeBanner tone="success" message={successMessage} />
          <NoticeBanner tone="error" message={errorMessage} />
          {deleteConfirmDialog}
          {receiptPreview ? (
            <div className="receipt-modal-backdrop" role="presentation">
              <section
                className="receipt-modal section-card"
                role="dialog"
                aria-modal="true"
                aria-label="Detail Pesanan"
              >
                <div className="section-header mb-2">
                  <h3>Detail Pesanan</h3>
                  <p>Pesanan berhasil dibuat. Cetak struk atau tutup pop up.</p>
                </div>
                <div className="receipt-modal__sheet">
                  <div className="receipt-modal__row">
                    <span>Nama Pelanggan</span>
                    <strong>{receiptPreview.customer_name}</strong>
                  </div>
                  <div className="receipt-modal__row">
                    <span>Metode Pembayaran</span>
                    <strong>{receiptPreview.payment_method_name}</strong>
                  </div>
                  <div className="receipt-modal__row">
                    <span>Tipe Order</span>
                    <strong>{receiptPreview.order_type}</strong>
                  </div>
                  <div className="receipt-modal__row">
                    <span>Subtotal</span>
                    <strong>{formatCurrency(receiptPreview.subtotal)}</strong>
                  </div>
                  <div className="receipt-modal__row">
                    <span>Diskon</span>
                    <strong>{formatCurrency(receiptPreview.discount)}</strong>
                  </div>
                  <div className="receipt-modal__row receipt-modal__row--total">
                    <span>Total Pembayaran</span>
                    <strong>{formatCurrency(receiptPreview.total)}</strong>
                  </div>
                </div>
                <div className="form-actions mt-2">
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={handlePrintReceiptPreview}
                  >
                    Print Struk
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={closeReceiptPreview}
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          ) : null}
          {isCustomerModalOpen ? (
            <div className="receipt-modal-backdrop" role="presentation">
              <section
                className="receipt-modal section-card customer-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Tambah Pelanggan"
              >
                <div className="section-header mb-2">
                  <h3>Tambah Pelanggan</h3>
                  <p>
                    Tambahkan pelanggan baru tanpa pindah ke halaman pelanggan.
                  </p>
                </div>
                <NoticeBanner tone="error" message={customerModalError} />
                <form
                  className="form-grid"
                  onSubmit={(event) => void saveCustomerFromKasir(event)}
                >
                  <label className="field field--full">
                    <span>Nama pelanggan</span>
                    <input
                      className="text-input"
                      value={customerDraft.name}
                      onChange={(event) =>
                        setCustomerDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field field--full">
                    <span>Alamat</span>
                    <textarea
                      className="text-area"
                      value={customerDraft.address}
                      onChange={(event) =>
                        setCustomerDraft((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field field--full">
                    <span>Nomor telepon</span>
                    <input
                      className="text-input"
                      value={customerDraft.phone_number}
                      onChange={(event) =>
                        setCustomerDraft((current) => ({
                          ...current,
                          phone_number: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="form-actions field--full mt-2">
                    <button
                      className="primary-btn"
                      type="submit"
                      disabled={isSavingCustomer}
                    >
                      {isSavingCustomer ? "Menyimpan..." : "Simpan pelanggan"}
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={closeCustomerModal}
                      disabled={isSavingCustomer}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </section>
            </div>
          ) : null}
          <div className="cashier-shell">
            <section className="cashier-cart section-card">
              <div className="cashier-cart__head">
                <div>
                  <h3>Keranjang Belanja</h3>
                  <p>{screen.data?.cashier?.name ?? "Kasir"}</p>
                </div>
                <span className="draft-chip">
                  {screen.data?.meta.draft_code}
                </span>
              </div>
              <div className="cashier-form-stack">
                <label className="field field--full">
                  <span>Pelanggan</span>
                  <div className="customer-picker" ref={customerSearchRef}>
                    <div className="customer-picker__search">
                      <input
                        className="text-input"
                        placeholder="Cari nama, alamat, atau nomor telepon..."
                        value={customerQuery}
                        onFocus={() => setIsCustomerResultOpen(true)}
                        onChange={(event) => {
                          setCustomerQuery(event.target.value);
                          setSelectedCustomerId("");
                          setIsCustomerResultOpen(true);
                        }}
                      />
                      {isCustomerResultOpen ? (
                        <div className="customer-picker__results">
                          <button
                            className="customer-picker__option"
                            type="button"
                            onClick={() => selectCustomer(null)}
                          >
                            <span className="customer-picker__primary">
                              Pelanggan Umum
                            </span>
                            <span className="customer-picker__secondary">
                              Gunakan pelanggan walk-in
                            </span>
                          </button>
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              className="customer-picker__option"
                              type="button"
                              onClick={() => selectCustomer(customer)}
                            >
                              <span className="customer-picker__primary">
                                {customer.name}
                              </span>
                              <span className="customer-picker__secondary">
                                {[customer.address, customer.phone_number]
                                  .filter(Boolean)
                                  .join(" • ") || "Tanpa alamat/telepon"}
                              </span>
                            </button>
                          ))}
                          {filteredCustomers.length === 0 ? (
                            <div className="customer-picker__empty">
                              Pelanggan tidak ditemukan.
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      className="customer-picker__add-btn"
                      type="button"
                      onClick={openCustomerModal}
                      aria-label="Tambah pelanggan"
                      title="Tambah pelanggan"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M15 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="9.5"
                          cy="8"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M18 8v6M15 11h6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </label>
                <div className="form-grid form-grid--compact">
                  <label className="field field--full">
                    <span>Tipe order</span>
                    <select
                      className="text-input"
                      value={orderType}
                      onChange={(event) => setOrderType(event.target.value)}
                    >
                      <option value="dine_in">Dine In</option>
                      <option value="takeaway">Take Away</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="cashier-cart__items mt-4">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    Pilih produk untuk mulai membuat order.
                  </div>
                ) : (
                  cart.map((item) => (
                    <article key={item.key} className="cashier-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.variant_name ?? "Tanpa varian"}</p>
                      </div>
                      <div className="cashier-item__controls">
                        <div className="quantity-stepper">
                          <button
                            type="button"
                            onClick={() =>
                              setCart((current) =>
                                current.map((entry) =>
                                  entry.key === item.key
                                    ? {
                                        ...entry,
                                        quantity: Math.max(
                                          1,
                                          entry.quantity - 1,
                                        ),
                                      }
                                    : entry,
                                ),
                              )
                            }
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCart((current) =>
                                current.map((entry) =>
                                  entry.key === item.key
                                    ? { ...entry, quantity: entry.quantity + 1 }
                                    : entry,
                                ),
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                        {item.variants.length > 0 ? (
                          <select
                            className="text-input"
                            value={String(item.variant_id ?? "")}
                            onChange={(event) =>
                              setCart((current) =>
                                current.map((entry) => {
                                  if (entry.key !== item.key) {
                                    return entry;
                                  }

                                  const selectedVariant =
                                    entry.variants.find(
                                      (variant) =>
                                        String(variant.id) ===
                                        event.target.value,
                                    ) ?? null;
                                  return {
                                    ...entry,
                                    key: `${entry.product_id}:${selectedVariant?.id ?? 0}`,
                                    variant_id: selectedVariant?.id ?? null,
                                    variant_name:
                                      selectedVariant?.variant_name ?? null,
                                    extra_price: toNumber(
                                      selectedVariant?.extra_price ?? 0,
                                    ),
                                  };
                                }),
                              )
                            }
                          >
                            {item.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.variant_name}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <span className="cashier-item__price">
                          {formatCurrency(cartLineSubtotal(item))}
                        </span>
                        <button
                          className="danger-btn danger-btn--small"
                          type="button"
                          onClick={() => {
                            const cartLabel = item.variant_name
                              ? `${item.name} (${item.variant_name})`
                              : item.name;
                            requestDelete(`item ${cartLabel}`, () => {
                              setCart((current) =>
                                current.filter(
                                  (entry) => entry.key !== item.key,
                                ),
                              );
                            });
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="cashier-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="cashier-summary__discount">
                  <select
                    className="text-input"
                    value={discountType}
                    onChange={(event) =>
                      setDiscountType(
                        event.target.value as "nominal" | "percentage",
                      )
                    }
                  >
                    <option value="nominal">Disc Rp</option>
                    <option value="percentage">Disc %</option>
                  </select>
                  <input
                    className="text-input"
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                  />
                </div>
                <label className="field field--full">
                  <span>Catatan order</span>
                  <textarea
                    className="text-area"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <label className="field field--full">
                  <span>Metode pembayaran</span>
                  <select
                    className="text-input"
                    value={selectedPaymentMethodId}
                    onChange={(event) =>
                      setSelectedPaymentMethodId(event.target.value)
                    }
                  >
                    {(screen.data?.payment_methods ?? []).map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isCashPayment ? (
                  <label className="field field--full">
                    <span>Nominal pembayaran</span>
                    <input
                      className="text-input"
                      inputMode="numeric"
                      placeholder="50.000"
                      value={cashPaidValue}
                      onChange={(event) => setCashPaidValue(event.target.value)}
                    />
                  </label>
                ) : null}
                <div className="cashier-total">
                  <span>Total Akhir</span>
                  <strong>{formatCurrency(grandTotalPreview)}</strong>
                </div>
                {isCashPayment ? (
                  <small className="cashier-total__change">
                    Kembalian: {formatCurrency(Math.max(cashChangeAmount, 0))}
                  </small>
                ) : null}
                {isCashPayment && cashChangeAmount < 0 ? (
                  <small className="cashier-total__warning">
                    Kurang bayar {formatCurrency(Math.abs(cashChangeAmount))}
                  </small>
                ) : null}
                <div className="form-actions field--full">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setCart([])}
                  >
                    Reset
                  </button>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => void submitOrder()}
                    disabled={
                      isSubmitting ||
                      (isCashPayment && cashPaidAmount < grandTotalPreview)
                    }
                  >
                    {isSubmitting ? "Menyimpan..." : "Bayar"}
                  </button>
                </div>
              </div>
            </section>
            <section className="cashier-products section-card">
              <div className="cashier-products__toolbar">
                <div>
                  <h3>{screen.data?.cashier?.name ?? "Kasir"}</h3>
                  <p>{screen.data?.cashier?.shift_label ?? "Shift aktif"}</p>
                </div>
                <div className="cashier-meta">
                  <span>{screen.data?.meta.sync_status}</span>
                  <span>{screen.data?.meta.version}</span>
                </div>
              </div>
              <label className="field field--full">
                <span>Cari menu</span>
                <input
                  className="text-input"
                  placeholder="Cari menu atau kode produk..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="filter-pills">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={
                      activeCategory === category
                        ? "pill-button pill-button--active"
                        : "pill-button"
                    }
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="cashier-product-grid">
                {filteredProducts.map((product) => {
                  const productName =
                    typeof product.name === "string" ? product.name : "Produk";

                  return (
                    <button
                      key={product.id}
                      className="cashier-product-card"
                      type="button"
                      onClick={() => addProduct(product)}
                    >
                      <div className="cashier-product-card__media">
                        {product.image_url ? (
                          <img
                            className="cashier-product-card__img"
                            src={product.image_url}
                            alt={productName}
                            loading="lazy"
                          />
                        ) : (
                          <span className="cashier-product-card__placeholder">
                            {productName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="cashier-product-card__copy">
                        <strong>{product.name}</strong>
                        <span>{formatCurrency(product.base_price)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </ScreenState>
    </AppShell>
  );
}

export function DashboardLightScreen() {
  return <DashboardScreen endpoint="/screens/dashboard" forcedTheme="light" />;
}

export function TransaksiScreen() {
  return <TransaksiLayout />;
}

export function MenuScreen() {
  return <MenuLayout />;
}

export function CustomerScreen() {
  return <CustomerLayout />;
}

export function PengeluaranScreen() {
  return <PengeluaranLayout />;
}

export function LaporanScreen() {
  return <LaporanLayout />;
}

export function PengaturanScreen() {
  return <PengaturanLayout />;
}

export function KasirScreen() {
  return <KasirLayout />;
}
