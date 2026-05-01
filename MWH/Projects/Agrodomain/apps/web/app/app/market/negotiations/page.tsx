import { NegotiationInboxClient } from "@/features/negotiation/negotiation-inbox";

type NegotiationsPageProps = {
  searchParams: Promise<{ listingId?: string; threadId?: string }>;
};

export default async function NegotiationsPage({ searchParams }: NegotiationsPageProps) {
  const params = await searchParams;
  return <NegotiationInboxClient initialListingId={params.listingId} initialThreadId={params.threadId} />;
}
