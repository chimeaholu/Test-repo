import { z } from "zod";

export const listingFormSchema = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters for the title"),
  commodity: z.string().trim().min(2, "Enter the commodity"),
  quantityTons: z
    .string()
    .trim()
    .min(1, "Enter the quantity")
    .refine((value) => Number(value) > 0, "Quantity must be greater than 0"),
  priceAmount: z
    .string()
    .trim()
    .min(1, "Enter the asking price")
    .refine((value) => Number(value) > 0, "Price must be greater than 0"),
  priceCurrency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code"),
  location: z.string().trim().min(2, "Enter the location"),
  summary: z.string().trim().min(12, "Add at least 12 characters of detail"),
  status: z.enum(["draft", "published", "closed"]),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export function listingRecordToFormValues(record: {
  title: string;
  commodity: string;
  quantity_tons: number;
  price_amount: number;
  price_currency: string;
  location: string;
  summary: string;
  status: "draft" | "published" | "closed";
}): ListingFormValues {
  return {
    title: record.title,
    commodity: record.commodity,
    quantityTons: String(record.quantity_tons),
    priceAmount: String(record.price_amount),
    priceCurrency: record.price_currency,
    location: record.location,
    summary: record.summary,
    status: record.status,
  };
}

