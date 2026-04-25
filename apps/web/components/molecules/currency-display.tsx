import { clsx } from "clsx";

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency = "GHS",
  locale = "en-GH",
  className,
}: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

  return <span className={className}>{formatted}</span>;
}
