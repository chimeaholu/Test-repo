import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const amountSchema = z.number().positive();

export const fundingOpportunityStatusSchema = z.enum(["open", "funded", "closed", "completed"]);
export const investmentStatusSchema = z.enum(["active", "matured", "withdrawn"]);

export const fundingOpportunityCreateInputSchema = z
  .object({
    farm_id: z.string().min(1),
    currency: currencySchema,
    title: z.string().min(3).max(160),
    description: z.string().min(12).max(2000),
    funding_goal: amountSchema,
    expected_return_pct: z.number().positive().max(100),
    timeline_months: z.number().int().positive().max(120),
    min_investment: amountSchema,
    max_investment: amountSchema,
  })
  .strict();

export const investmentCreateInputSchema = z
  .object({
    opportunity_id: z.string().min(1),
    amount: amountSchema,
    currency: currencySchema,
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const investmentWithdrawInputSchema = z
  .object({
    investment_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const fundingOpportunityReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    opportunity_id: z.string().min(1),
    farm_id: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    currency: currencySchema,
    title: z.string().min(1),
    description: z.string().min(1),
    funding_goal: amountSchema,
    current_amount: z.number().min(0),
    expected_return_pct: z.number().min(0),
    timeline_months: z.number().int().positive(),
    status: fundingOpportunityStatusSchema,
    min_investment: amountSchema,
    max_investment: amountSchema,
    percent_funded: z.number().min(0).max(100),
    remaining_amount: z.number().min(0),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const investmentReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    investment_id: z.string().min(1),
    opportunity_id: z.string().min(1),
    investor_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    amount: amountSchema,
    currency: currencySchema,
    status: investmentStatusSchema,
    invested_at: isoTimestampSchema,
    expected_return_date: isoTimestampSchema.nullable(),
    actual_return_amount: z.number().nullable(),
    penalty_amount: z.number().min(0),
    expected_return_amount: z.number().nullable(),
    updated_at: isoTimestampSchema,
    opportunity: fundingOpportunityReadSchema.nullable(),
  })
  .strict();

export const fundingOpportunityCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(fundingOpportunityReadSchema),
  })
  .strict();

export const investmentCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(investmentReadSchema),
  })
  .strict();

export const fundingOpportunityCreateInputContract = defineContract({
  id: "finance.funding_opportunity_create_input",
  name: "FundingOpportunityCreateInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: fundingOpportunityCreateInputSchema,
  description: "Farmer-owned AgroFund opportunity creation payload with wallet-safe currency metadata.",
  traceability: ["QG-04", "CJ-005"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const investmentCreateInputContract = defineContract({
  id: "finance.investment_create_input",
  name: "InvestmentCreateInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: investmentCreateInputSchema,
  description: "Investor funding payload for moving wallet balance into an active AgroFund position.",
  traceability: ["QG-04", "EP-005"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const investmentWithdrawInputContract = defineContract({
  id: "finance.investment_withdraw_input",
  name: "InvestmentWithdrawInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: investmentWithdrawInputSchema,
  description: "Withdrawal payload for unwinding an active AgroFund position with deterministic penalty handling.",
  traceability: ["QG-04", "EP-005"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const fundingOpportunityReadContract = defineContract({
  id: "finance.funding_opportunity_read",
  name: "FundingOpportunityRead",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: fundingOpportunityReadSchema,
  description: "AgroFund opportunity read payload with live funding progress fields.",
  traceability: ["QG-04"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const investmentReadContract = defineContract({
  id: "finance.investment_read",
  name: "InvestmentRead",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: investmentReadSchema,
  description: "AgroFund investment read payload joined to the sourced funding opportunity.",
  traceability: ["QG-04"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const fundingOpportunityCollectionContract = defineContract({
  id: "finance.funding_opportunity_collection",
  name: "FundingOpportunityCollection",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: fundingOpportunityCollectionSchema,
  description: "Collection payload for public and owner-scoped AgroFund opportunity views.",
  traceability: ["QG-04"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export const investmentCollectionContract = defineContract({
  id: "finance.investment_collection",
  name: "InvestmentCollection",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: investmentCollectionSchema,
  description: "Collection payload for investor-scoped AgroFund portfolio views.",
  traceability: ["QG-04"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md"],
});

export type FundingOpportunityStatus = z.infer<typeof fundingOpportunityStatusSchema>;
export type InvestmentStatus = z.infer<typeof investmentStatusSchema>;
export type FundingOpportunityCreateInput = z.infer<typeof fundingOpportunityCreateInputSchema>;
export type InvestmentCreateInput = z.infer<typeof investmentCreateInputSchema>;
export type InvestmentWithdrawInput = z.infer<typeof investmentWithdrawInputSchema>;
export type FundingOpportunityRead = z.infer<typeof fundingOpportunityReadSchema>;
export type InvestmentRead = z.infer<typeof investmentReadSchema>;
export type FundingOpportunityCollection = z.infer<typeof fundingOpportunityCollectionSchema>;
export type InvestmentCollection = z.infer<typeof investmentCollectionSchema>;
