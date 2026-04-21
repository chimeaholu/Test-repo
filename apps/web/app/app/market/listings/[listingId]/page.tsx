import { ListingDetailClient } from "@/features/listings/listing-slice";

type ListingDetailProps = {
  params: Promise<{ listingId: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { listingId } = await params;
  return <ListingDetailClient listingId={listingId} />;
}
