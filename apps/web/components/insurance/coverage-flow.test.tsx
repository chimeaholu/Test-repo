import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CoverageFlow } from "@/components/insurance/coverage-flow";

describe("coverage flow", () => {
  it("calculates a premium and submits the selected field purchase", async () => {
    const onPurchase = vi.fn().mockResolvedValue(undefined);

    render(
      <CoverageFlow
        availableBalance={5000}
        currency="GHS"
        fields={[
          {
            crop_type: "Maize",
            district: "Tamale Metropolitan",
            farm_id: "farm-001",
            farm_name: "Asante Maize Fields",
            hectares: 12.5,
            latitude: null,
            longitude: null,
            risk_level: "guarded",
          },
        ]}
        onPurchase={onPurchase}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("4000"), { target: { value: "4200" } });
    fireEvent.click(screen.getByText("Review and purchase"));

    expect(onPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        coverage_amount: 4200,
        coverage_type: "comprehensive",
        field_id: "farm-001",
      }),
    );
    expect(await screen.findByText(/Coverage activated for Asante Maize Fields\./)).toBeInTheDocument();
  });
});
