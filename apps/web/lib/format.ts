/**
 * Format a number as USD currency string.
 * Examples: formatUSD(1234.5) → "$1,234.50", formatUSD(0.5) → "$0.50"
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
