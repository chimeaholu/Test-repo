import { InsuranceClaimDetail } from "@/components/insurance/insurance-claim-detail";

type InsuranceClaimPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsuranceClaimPage({ params }: InsuranceClaimPageProps) {
  const { id } = await params;
  return <InsuranceClaimDetail claimId={id} />;
}
