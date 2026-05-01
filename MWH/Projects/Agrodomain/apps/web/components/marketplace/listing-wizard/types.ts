export type ListingWizardStepId = "basic" | "pricing" | "media" | "review";

export type ListingPricingType = "fixed" | "negotiable" | "auction";

export type ListingDeliveryMode = "pickup" | "delivery" | "both";

export type ListingPhotoDraft = {
  id: string;
  name: string;
  previewUrl: string;
  mimeType: string;
  rotation: number;
  size: number;
};

export type ListingWizardDraft = {
  title: string;
  commodity: string;
  varietyGrade: string;
  category: string;
  description: string;
  priceAmount: string;
  priceCurrency: string;
  quantityTons: string;
  minimumOrderQuantity: string;
  pricingType: ListingPricingType;
  availabilityStart: string;
  availabilityEnd: string;
  locationPreset: string;
  locationManual: string;
  deliveryMode: ListingDeliveryMode;
  photos: ListingPhotoDraft[];
};

export type ListingWizardFieldErrors = Partial<Record<string, string>>;
