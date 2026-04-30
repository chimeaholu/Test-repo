import { NegotiationInboxClient } from "@/features/negotiation/negotiation-inbox";

type NegotiationThreadPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listingId?: string }>;
};

export default async function NegotiationThreadPage({ params, searchParams }: NegotiationThreadPageProps) {
  const [{ id }, { listingId }] = await Promise.all([params, searchParams]);
  return <NegotiationInboxClient initialListingId={listingId} initialThreadId={id} />;
}
