import Link from "next/link";
import { SectionHeading, SurfaceCard } from "@/components/ui-primitives";

export function PlaceholderPage(props: {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <SurfaceCard>
      <SectionHeading eyebrow={props.eyebrow} title={props.title} body={props.body} />
      {props.ctaLabel && props.ctaHref ? (
        <div className="actions-row">
          <Link className="button-primary" href={props.ctaHref}>
            {props.ctaLabel}
          </Link>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
