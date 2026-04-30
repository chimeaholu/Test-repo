import { FarmFieldDetailPage } from "@/components/farm/farm-field-detail-page";

export default async function FarmFieldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FarmFieldDetailPage fieldId={id} />;
}
