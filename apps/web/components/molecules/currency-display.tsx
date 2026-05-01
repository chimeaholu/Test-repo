import { clsx } from "clsx";

import { formatCurrency } from "@/lib/i18n/format";

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
  const formatted = formatCurrency(amount, {
    currency: currency as "GHS" | "NGN" | "USD" | "JMD",
    locale,
  });

  return <span className={clsx(className)}>{formatted}</span>;
}
