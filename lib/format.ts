const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = typeof value === "string" ? Number(value) : value ?? 0;
  return currencyFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatCount(value: number | string | null | undefined): string {
  const numericValue = typeof value === "string" ? Number(value) : value ?? 0;
  return numberFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatPercent(value: number | string | null | undefined, digits = 0): string {
  const numericValue = typeof value === "string" ? Number(value) : value ?? 0;
  return `${(Number.isFinite(numericValue) ? numericValue : 0).toFixed(digits)}%`;
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatShortDay(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "")
    .slice(0, 3);
}
