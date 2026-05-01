import { ListingDetailPageClient } from "@/components/marketplace/listing-detail-page";

type ListingDetailProps = {
  params: Promise<{ listingId: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { listingId } = await params;
  return <ListingDetailPageClient listingId={listingId} />;
}
